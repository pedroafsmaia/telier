-- Telier — Schema D1 v4
-- Execute no painel Cloudflare D1 > Console

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,  -- nome de usuário para acesso ao sistema
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'membro',
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS projetos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  fase TEXT NOT NULL DEFAULT 'Estudo preliminar',
  status TEXT NOT NULL DEFAULT 'Em andamento',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  prazo TEXT,
  area_m2 REAL,                    -- área em metros quadrados
  dono_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS permissoes_projeto (
  projeto_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'editor',
  criado_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (projeto_id, usuario_id),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY,
  projeto_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'A fazer',
  prioridade TEXT NOT NULL DEFAULT 'Média',
  dificuldade TEXT NOT NULL DEFAULT 'Moderada',
  -- horas_decorridas removido: agora calculado via sessoes_tempo
  data TEXT,
  foco INTEGER NOT NULL DEFAULT 0,
  dono_id TEXT NOT NULL,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (dono_id) REFERENCES usuarios(id)
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

-- Sessões de cronômetro: cada vez que alguém inicia/para o timer
CREATE TABLE IF NOT EXISTS sessoes_tempo (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  inicio TEXT NOT NULL,            -- ISO datetime UTC
  fim TEXT,                        -- NULL = cronômetro ainda rodando
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Intervalos dentro de uma sessão (lanche, reunião, problema técnico, etc.)
CREATE TABLE IF NOT EXISTS intervalos (
  id TEXT PRIMARY KEY,
  sessao_id TEXT NOT NULL,
  tipo TEXT NOT NULL,              -- campo livre
  inicio TEXT NOT NULL,            -- ISO datetime UTC
  fim TEXT,                        -- NULL = intervalo ainda aberto
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sessao_id) REFERENCES sessoes_tempo(id) ON DELETE CASCADE
);

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
