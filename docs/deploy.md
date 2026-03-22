# Instruções de Deploy

## Via interface gráfica (sem terminal)

### Passo 1 — Criar o banco D1

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Menu lateral: **Workers & Pages → D1 SQL Database**
3. **Create database** → Nome: `telier-db` → **Create**
4. Na aba **Console**, cole o conteúdo de `db/schema.sql` e clique **Execute**
5. Anote o **Database ID** (necessário no Passo 3)

### Passo 2 — Criar o Worker

1. **Workers & Pages → Create → Create Worker**
2. Nome: `telier-api` → **Deploy**
3. **Edit code** → apague tudo → cole `src/worker.js` → **Deploy**
4. Anote a URL (ex: `https://telier-api.USUARIO.workers.dev`)

### Passo 3 — Conectar Worker ao banco

1. Na página do Worker → **Settings → Bindings → Add binding**
2. Tipo: **D1 Database** / Variable name: `DB` / Database: `telier-db`
3. **Save and deploy**

### Passo 4 — Configurar CORS

1. Ainda em **Settings → Variables and Secrets → Add variable**
2. Nome: `ALLOWED_ORIGIN` / Valor: URL do seu Pages (preencher após Passo 6)
3. **Save and deploy**

### Passo 5 — Configurar o frontend

Abra `src/index.html` e substitua:
```js
const API = 'SUBSTITUA_PELA_URL_DO_SEU_WORKER';
```
pela URL real do Worker (do Passo 2).

### Passo 6 — Publicar o frontend no Pages

1. Suba o repositório no GitHub
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Selecione o repositório → **Begin setup**
4. Build settings:
   - Framework preset: **None**
   - Build command: *(deixar vazio)*
   - Build output directory: `src`
5. **Save and Deploy**
6. Copie a URL gerada (ex: `https://telier.pages.dev`) e volte ao Passo 4 para preencher o `ALLOWED_ORIGIN`

### Passo 7 — Criar a conta admin

Acesse o site — ele detecta automaticamente que não há admin e abre a tela de configuração inicial. Preencha nome, usuário e senha.

---

## Via terminal (wrangler CLI)

```bash
# Instalar wrangler
npm install -g wrangler

# Autenticar
wrangler login

# Criar banco
wrangler d1 create telier-db

# Aplicar schema
wrangler d1 execute telier-db --file=db/schema.sql

# Editar wrangler.toml com o database_id retornado acima

# Deploy do Worker
wrangler deploy

# Deploy do frontend
wrangler pages deploy src/ --project-name=telier
```
