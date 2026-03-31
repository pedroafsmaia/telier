# Instruções de Deploy

## Via interface gráfica (sem terminal)

### Passo 1 — Criar o banco D1

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Menu lateral: **Workers & Pages ? D1 SQL Database**
3. **Create database** ? Nome: `telier-db` ? **Create**
4. Na aba **Console**, cole o conteúdo de `db/schema.sql` e clique **Execute**
5. Anote o **Database ID** (necessário no Passo 3)

### Passo 2 — Criar o Worker

1. **Workers & Pages ? Create ? Create Worker**
2. Nome: `telier-api` ? **Deploy**
3. **Edit code** ? apague tudo ? cole `src/worker.js` ? **Deploy**
4. Anote a URL (ex: `https://telier-api.USUARIO.workers.dev`)

### Passo 3 — Conectar Worker ao banco

1. Na página do Worker ? **Settings ? Bindings ? Add binding**
2. Tipo: **D1 Database** / Variable name: `DB` / Database: `telier-db`
3. **Save and deploy**

### Passo 4 — Configurar CORS

1. Ainda em **Settings ? Variables and Secrets ? Add variable**
2. Nome: `ALLOWED_ORIGIN` / Valor: URL do seu Pages (preencher após Passo 6)
3. **Save and deploy**

### Passo 5 — Publicar o frontend no Pages

1. Suba o repositório no GitHub
2. **Workers & Pages ? Create ? Pages ? Connect to Git**
3. Selecione o repositório ? **Begin setup**
4. Build settings:
   - Framework preset: **Vite**
   - Root directory: `frontend-v2`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Em Environment Variables, configure `VITE_API_BASE_URL` com a URL da API (`https://telier-api.../api`) ou mantenha `/api` quando usar proxy no mesmo domínio
6. **Save and Deploy**
7. Copie a URL gerada (ex: `https://telier.pages.dev`) e volte ao Passo 4 para preencher o `ALLOWED_ORIGIN`

### Passo 6 — Criar a conta admin

Acesse `https://SEU_PAGES/login/setup` para setup inicial quando o banco estiver vazio. Depois, o acesso normal segue em `/login`.

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

# Build do frontend
npm run build --prefix frontend-v2

# Deploy do frontend
wrangler pages deploy frontend-v2/dist --project-name=telier
```
