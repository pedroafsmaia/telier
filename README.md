# Telier

Sistema de gestão de projetos para escritórios de arquitetura. Desenvolvido com Cloudflare Workers + D1 + Pages.

---

## Estrutura do repositório

```
/
├── src/
│   ├── index.html      # Frontend completo (SPA)
│   └── worker.js       # API (Cloudflare Worker)
├── db/
│   └── schema.sql      # Schema do banco de dados (D1/SQLite)
├── docs/
│   └── deploy.md       # Instruções detalhadas de deploy
└── README.md
```

---

## Stack

| Camada    | Tecnologia                         |
|-----------|------------------------------------|
| Frontend  | HTML + CSS + JS puro (SPA)         |
| Backend   | Cloudflare Workers (Edge Runtime)  |
| Banco     | Cloudflare D1 (SQLite)             |
| Hospedagem| Cloudflare Pages                   |

---

## Deploy rápido

### Pré-requisitos
- Conta no [Cloudflare](https://cloudflare.com)
- `wrangler` CLI instalado: `npm install -g wrangler`
- Autenticado: `wrangler login`

### 1. Criar o banco D1

```bash
wrangler d1 create telier-db
```

Copie o `database_id` retornado.

### 2. Aplicar o schema

```bash
# Em produção
wrangler d1 execute telier-db --file=db/schema.sql

# Em desenvolvimento local
wrangler d1 execute telier-db --local --file=db/schema.sql
```

### 3. Configurar o wrangler.toml

Crie o arquivo `wrangler.toml` na raiz com:

```toml
name = "telier-api"
main = "src/worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "telier-db"
database_id = "SEU_DATABASE_ID_AQUI"

[vars]
ALLOWED_ORIGIN = "https://telier.pages.dev"
```

### 4. Deploy do Worker

```bash
wrangler deploy
```

### 5. Configurar a URL do Worker no frontend

Abra `src/index.html` e substitua na linha com `const API`:

```js
const API = 'https://telier-api.SEU_USUARIO.workers.dev';
```

### 6. Deploy do frontend no Pages

```bash
# Via CLI
wrangler pages deploy src/ --project-name=telier

# Ou conecte o repositório GitHub em dash.cloudflare.com > Pages
```

---

## Desenvolvimento local

### Iniciar o Worker localmente

```bash
wrangler dev src/worker.js --local
```

O Worker estará disponível em `http://localhost:8787`.

### Abrir o frontend localmente

Sirva o arquivo HTML com qualquer servidor estático:

```bash
# Python
python3 -m http.server 3000 --directory src

# Node (npx)
npx serve src

# VS Code: instale a extensão Live Server
```

Lembre de apontar `const API` para `http://localhost:8787` durante o desenvolvimento.

---

## Smoke test rápido (UI)

Para validar fluxos críticos do dashboard sem passar manualmente por tudo:

```bash
npm run smoke
```

Se a aplicação abrir em tela de login, rode com credenciais:

```bash
LOGIN_USER=seu_usuario LOGIN_PASS=sua_senha BASE_URL=http://localhost:3000 npm run smoke
```

Variáveis úteis:
- `BASE_URL` (padrão: `http://localhost:3000`)
- `LOGIN_USER`
- `LOGIN_PASS`
- `SMOKE_TIMEOUT_MS` (padrão: `20000`)

---

## Comandos úteis do banco (D1)

### Executar queries direto no D1

```bash
# Produção
wrangler d1 execute telier-db --command="SELECT * FROM usuarios"

# Local
wrangler d1 execute telier-db --local --command="SELECT * FROM usuarios"
```

### Criar admin via terminal (primeira vez sem acesso ao site)

```bash
wrangler d1 execute telier-db --command="
  INSERT INTO usuarios (id, nome, login, senha_hash, papel)
  VALUES ('usr_admin', 'Administrador', 'admin', 'HASH_AQUI', 'admin')
"
```

> Use o endpoint `/auth/setup` pelo site — é mais simples e seguro.

### Listar todos os usuários

```bash
wrangler d1 execute telier-db --command="SELECT id, nome, login as usuario_login, papel FROM usuarios"
```

### Redefinir senha de um usuário

A senha é hash PBKDF2 — não dá para definir manualmente via SQL de forma simples. Use:

```bash
# 1. Deletar a sessão do usuário (força logout)
wrangler d1 execute telier-db --command="DELETE FROM sessoes WHERE usuario_id = 'usr_ID_AQUI'"

# 2. Para redefinir a senha, um admin precisa deletar e recriar o usuário pelo sistema,
#    ou você pode usar a rota POST /usuarios para criar um novo com a senha desejada.
```

### Ver projetos e tarefas

```bash
# Projetos
wrangler d1 execute telier-db --command="SELECT id, nome, status, fase FROM projetos ORDER BY criado_em DESC"

# Tarefas de um projeto
wrangler d1 execute telier-db --command="SELECT id, nome, status, dono_id FROM tarefas WHERE projeto_id = 'prj_ID_AQUI'"
```

### Ver sessões de tempo ativas

```bash
wrangler d1 execute telier-db --command="
  SELECT st.id, u.nome, t.nome as tarefa, st.inicio
  FROM sessoes_tempo st
  JOIN usuarios u ON u.id = st.usuario_id
  JOIN tarefas t ON t.id = st.tarefa_id
  WHERE st.fim IS NULL
"
```

### Forçar parada de cronômetro travado

```bash
wrangler d1 execute telier-db --command="
  UPDATE sessoes_tempo SET fim = datetime('now') WHERE id = 'ste_ID_AQUI'
"
```

### Backup do banco

```bash
wrangler d1 export telier-db --output=backup_$(date +%Y%m%d).sql
```

### Inspecionar banco localmente (GUI)

```bash
wrangler d1 execute telier-db --local --command=".tables"
```

---

## Variáveis de ambiente do Worker

| Variável         | Obrigatório | Descrição                                           |
|------------------|-------------|-----------------------------------------------------|
| `DB`             | Sim         | Binding D1 — configurar em wrangler.toml            |
| `ALLOWED_ORIGIN` | Sim         | URL do Pages — ex: `https://telier.pages.dev` |

---

## Modelo de permissões

| Papel       | O que pode fazer                                              |
|-------------|---------------------------------------------------------------|
| Admin       | Tudo — ver, criar, editar e excluir qualquer recurso          |
| Dono        | Criar projetos/tarefas, editar e excluir os próprios          |
| Editor      | Editar projeto específico (convidado pelo dono)               |
| Colaborador | Cronometrar e mudar status de tarefas específicas             |
| Membro      | Visualizar todos os projetos compartilhados com ele           |

---

## Notas

- Acesso ao sistema é feito por **usuário + senha**. Não há email no sistema.
- Projetos só podem ser **excluídos** após serem **arquivados** (status = Arquivado).
- O cronômetro persiste no servidor — fechar o navegador não para o timer.
- Sessões de login expiram em **30 dias**.
