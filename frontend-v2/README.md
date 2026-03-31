# Telier Frontend

Base definitiva da interface do Telier apos encerramento da migracao.

## Estado atual

- sem casca de migracao para legado;
- sem flags de superficie antiga;
- backend, autenticacao e contratos compartilhados com `src/worker.js`.

## Stack

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS

## Comandos

Na pasta `frontend-v2`:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

Na raiz:

```bash
npm run lint:rebuild
npm run build:rebuild
npm run smoke:rebuild
```

`npm run smoke:rebuild` sobe worker local + build + preview e valida login e navegacao principal.

## Variaveis de ambiente

Use `frontend-v2/.env.example` como referencia:

- `VITE_API_BASE_URL=/api`
