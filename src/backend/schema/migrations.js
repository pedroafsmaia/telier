// FONTE DE VERDADE EM RUNTIME: este arquivo controla toda a evolução do schema.
// Novo banco: cada versão de V1 em diante é aplicada sequencialmente.
// Banco existente: apenas versões não aplicadas são executadas.
// db/schema.sql é o snapshot canônico de desenvolvimento (para consulta e init manual via D1 Console).
export async function ensureAllSchemas(env) {
  if (env._schemaChecked) return;
  // Fallsafe para garantir que a tabela de controle exista
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  const getVersion = async () => {
    try {
      const row = await env.DB.prepare('SELECT MAX(version) as v FROM schema_migrations').first();
      return row?.v || 0;
    } catch {
      return 0; // se tabela falhou ao criar
    }
  };

  const v = await getVersion();
  let currentStep = v;

  const runMigration = async (version, sqlArray) => {
    if (currentStep >= version) return;
    console.log(`[schema] rodando migração v${version}...`);
    try {
      for (const sql of sqlArray) {
        await env.DB.prepare(sql).run();
      }
      await env.DB.prepare('INSERT INTO schema_migrations (version) VALUES (?)').bind(version).run();
      currentStep = version;
    } catch (e) {
      console.error(`[schema] Falha na migração v${version}:`, e.message);
    }
  };

  // V1: Tabelas núcleo de auth.
  // sessoes.criado_em é NOT NULL — o worker sempre fornece o valor explicitamente (D1 não avalia DEFAULT em INSERT).
  await runMigration(1, [
    `CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nome TEXT NOT NULL, login TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL, deve_trocar_senha INTEGER NOT NULL DEFAULT 0, papel TEXT NOT NULL DEFAULT 'membro', criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS sessoes (id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT NOT NULL, expira_em TEXT NOT NULL)`,
  ]);

  // V2: Tabelas de Domínio Primárias
  await runMigration(2, [
    `CREATE TABLE IF NOT EXISTS grupos_projetos (id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT, status TEXT NOT NULL DEFAULT 'Ativo', dono_id TEXT NOT NULL REFERENCES usuarios(id), ordem INTEGER DEFAULT 0, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS permissoes_grupo (grupo_id TEXT NOT NULL REFERENCES grupos_projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (grupo_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS projetos (id TEXT PRIMARY KEY, nome TEXT NOT NULL, fase TEXT NOT NULL DEFAULT 'Estudo preliminar', status TEXT NOT NULL DEFAULT 'Em andamento', prioridade TEXT NOT NULL DEFAULT 'Média', prazo TEXT, area_m2 REAL, grupo_id TEXT REFERENCES grupos_projetos(id) ON DELETE SET NULL, dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`
  ]);
  
  // V3: Segurança granular de Projetos, Notificações
  await runMigration(3, [
    `CREATE TABLE IF NOT EXISTS permissoes_projeto (projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, nivel TEXT NOT NULL DEFAULT 'editor', origem TEXT NOT NULL DEFAULT 'manual', criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (projeto_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS recusas_projeto (projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (projeto_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS notificacoes (id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, tipo TEXT NOT NULL, escopo TEXT NOT NULL, entidade_id TEXT, titulo TEXT NOT NULL, mensagem TEXT, ator_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL, lida_em TEXT, criado_em TEXT DEFAULT (datetime('now')))`
  ]);

  // V4: Tarefas, Sessoes_tempo, Intervalos, Templates, Decisões
  await runMigration(4, [
    `CREATE TABLE IF NOT EXISTS tarefas (id TEXT PRIMARY KEY, projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, nome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'A fazer', prioridade TEXT NOT NULL DEFAULT 'Média', dificuldade TEXT NOT NULL DEFAULT 'Moderada', descricao TEXT, data TEXT, foco INTEGER NOT NULL DEFAULT 0, dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS templates_tarefa (id TEXT PRIMARY KEY, nome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'A fazer', prioridade TEXT NOT NULL DEFAULT 'Média', dificuldade TEXT NOT NULL DEFAULT 'Moderada', descricao TEXT, criado_por TEXT NOT NULL REFERENCES usuarios(id), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS colaboradores_tarefa (tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, adicionado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (tarefa_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS sessoes_tempo (id TEXT PRIMARY KEY, tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id), inicio TEXT NOT NULL, fim TEXT, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS intervalos (id TEXT PRIMARY KEY, sessao_id TEXT NOT NULL REFERENCES sessoes_tempo(id) ON DELETE CASCADE, tipo TEXT NOT NULL, inicio TEXT NOT NULL, fim TEXT, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS decisoes (id TEXT PRIMARY KEY, projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, descricao TEXT NOT NULL, data TEXT DEFAULT (date('now')), dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')))`
  ]);

  // V5: Criar os índices caso não existam no array
  await runMigration(5, [
    `CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes(expira_em)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_permissoes_projeto_usuario ON permissoes_projeto(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_permissoes_grupo_usuario ON permissoes_grupo(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_data ON notificacoes(usuario_id, criado_em DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida_em)`,
    `CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tarefa ON sessoes_tempo(tarefa_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_fim ON sessoes_tempo(fim)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_ativa ON sessoes_tempo(usuario_id) WHERE fim IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_intervalos_sessao ON intervalos(sessao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_colab_tarefa ON colaboradores_tarefa(tarefa_id)`
  ]);

  // V6: Removendo colunas espalhadas e unificações (os try/catch originais)
  // SQLite D1 não suporta ADD COLUMN IF NOT EXISTS nativamente de forma limpa,
  // então faremos os ALTER espalhados serem engolidos via query helper no runner de migração, 
  // caso o schema original já tenha as colunas (pois a versão 1-4 roda sem elas para compat com v0 do banco e v6 injecta).
  const runSoftAlters = async () => {
    const alters = [
      'ALTER TABLE projetos ADD COLUMN grupo_id TEXT REFERENCES grupos_projetos(id) ON DELETE SET NULL',
      'ALTER TABLE grupos_projetos ADD COLUMN descricao TEXT',
      'ALTER TABLE grupos_projetos ADD COLUMN status TEXT DEFAULT "Ativo"',
      'ALTER TABLE permissoes_projeto ADD COLUMN origem TEXT DEFAULT "manual"',
      'ALTER TABLE tarefas ADD COLUMN descricao TEXT',
      'ALTER TABLE usuarios ADD COLUMN deve_trocar_senha INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE sessoes ADD COLUMN criado_em TEXT DEFAULT NULL'
    ];
    for (const alt of alters) {
      try { await env.DB.prepare(alt).run(); } catch {}
    }
  };
  
  if (currentStep < 6) {
    console.log(`[schema] rodando migração soft alters v6...`);
    await runSoftAlters();
    try { await env.DB.prepare('UPDATE permissoes_projeto SET origem = "manual" WHERE origem IS NULL').run(); } catch {}
    await env.DB.prepare('INSERT INTO schema_migrations (version) VALUES (6)').run();
    currentStep = 6;
  }
  
  // V7: Índices Operacionais de Paginação e Relatórios
  await runMigration(7, [
    `CREATE INDEX IF NOT EXISTS idx_projetos_grupo_status ON projetos(grupo_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_dono ON tarefas(projeto_id, dono_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projetos_dono ON projetos(dono_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_tarefa ON sessoes_tempo(usuario_id, tarefa_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_inicio_fim ON sessoes_tempo(inicio, fim)`
  ]);
  
  // V8: Índices de notificacoes ausentes do snapshot V5 original
  // Nota: D1/SQLite não suporta DESC em colunas de índice composto via CREATE INDEX
  await runMigration(8, [
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_data ON notificacoes(usuario_id, criado_em)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida_em)`
  ]);

  // Limpeza Oportunista (Não Conta como Migration)
  env.DB.prepare("DELETE FROM sessoes WHERE expira_em < datetime('now', '-1 day')").run().catch(() => {});
  env._schemaChecked = true;
}
