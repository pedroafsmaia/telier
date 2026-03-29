-- Telier — Schema D1 (snapshot completo)
-- Este arquivo é o snapshot canônico de desenvolvimento.
-- A fonte de verdade em runtime é src/backend/schema/migrations.js
-- Para DBs novos: execute este arquivo no painel Cloudflare D1 > Console.
-- Para DBs existentes: o migrations.js aplica as versões faltantes automaticamente.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,       -- identificador de acesso (sem espaços)
  senha_hash TEXT NOT NULL,         -- formato: pbkdf2$<iter>$<salt_b64>$<hash_b64>
  deve_trocar_senha INTEGER NOT NULL DEFAULT 0,
  papel TEXT NOT NULL DEFAULT 'membro',
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  criado_em TEXT NOT NULL,          -- sempre fornecido explicitamente pelo worker
  expira_em TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes(expira_em);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);

CREATE TABLE IF NOT EXISTS grupos_projetos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  observacao_espera TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  dono_id TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS permissoes_grupo (
  grupo_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (grupo_id, usuario_id),
  FOREIGN KEY (grupo_id) REFERENCES grupos_projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permissoes_grupo_usuario ON permissoes_grupo(usuario_id);

CREATE TABLE IF NOT EXISTS projetos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  fase TEXT NOT NULL DEFAULT 'Estudo preliminar',
  status TEXT NOT NULL DEFAULT 'Em andamento',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  prazo TEXT,
  area_m2 REAL,                     -- área em metros quadrados
  grupo_id TEXT REFERENCES grupos_projetos(id) ON DELETE SET NULL,
  dono_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_projetos_dono ON projetos(dono_id);
CREATE INDEX IF NOT EXISTS idx_projetos_grupo_status ON projetos(grupo_id, status);

-- nivel: 'editor' (pode criar/editar) ou 'leitor' (somente leitura)
-- origem: 'manual' (compartilhamento direto) ou 'grupo' (herdado de grupo)
CREATE TABLE IF NOT EXISTS permissoes_projeto (
  projeto_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'editor',
  origem TEXT NOT NULL DEFAULT 'manual',
  criado_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (projeto_id, usuario_id),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permissoes_projeto_usuario ON permissoes_projeto(usuario_id);

-- Usuário pode recusar um projeto compartilhado (mesmo herdado por grupo)
CREATE TABLE IF NOT EXISTS recusas_projeto (
  projeto_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (projeto_id, usuario_id),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Notificações in-app (compartilhamentos, menções, etc.)
CREATE TABLE IF NOT EXISTS notificacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  escopo TEXT NOT NULL,
  entidade_id TEXT,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  ator_id TEXT,
  lida_em TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (ator_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario_data ON notificacoes(usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida_em);

CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY,
  projeto_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'A fazer',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  dificuldade TEXT NOT NULL DEFAULT 'Moderada',
  descricao TEXT,
  data TEXT,
  foco INTEGER NOT NULL DEFAULT 0,
  dono_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_dono ON tarefas(projeto_id, dono_id);

CREATE TABLE IF NOT EXISTS templates_tarefa (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'A fazer',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  dificuldade TEXT NOT NULL DEFAULT 'Moderada',
  descricao TEXT,
  criado_por TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- Colaboradores de uma tarefa (além do dono)
CREATE TABLE IF NOT EXISTS colaboradores_tarefa (
  tarefa_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  adicionado_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (tarefa_id, usuario_id),
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_colab_tarefa ON colaboradores_tarefa(tarefa_id);

-- Sessões de cronômetro: cada vez que alguém inicia/para o timer
CREATE TABLE IF NOT EXISTS sessoes_tempo (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  inicio TEXT NOT NULL,             -- ISO datetime UTC
  fim TEXT,                         -- NULL = cronômetro ainda rodando
  observacao TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_sessoes_tarefa ON sessoes_tempo(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_fim ON sessoes_tempo(fim);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_ativa ON sessoes_tempo(usuario_id) WHERE fim IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_tarefa ON sessoes_tempo(usuario_id, tarefa_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_inicio_fim ON sessoes_tempo(inicio, fim);

-- Intervalos dentro de uma sessão (lanche, reunião, problema técnico, etc.)
CREATE TABLE IF NOT EXISTS intervalos (
  id TEXT PRIMARY KEY,
  sessao_id TEXT NOT NULL,
  tipo TEXT NOT NULL,               -- campo livre
  inicio TEXT NOT NULL,             -- ISO datetime UTC
  fim TEXT,                         -- NULL = intervalo ainda aberto
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sessao_id) REFERENCES sessoes_tempo(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_intervalos_sessao ON intervalos(sessao_id);

CREATE TABLE IF NOT EXISTS decisoes (
  id TEXT PRIMARY KEY,
  projeto_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data TEXT DEFAULT (date('now')),
  dono_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
);
