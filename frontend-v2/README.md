# Telier Frontend v2

Nova base do frontend do Telier para o rebuild controlado.

## Estado atual

- Fase em andamento no repositorio: Fase 11 - flag, paridade e corte controlado do legado
- A nova UI continua separada da superficie legada
- O backend, autenticacao e contratos seguem compartilhados
- O legado continua preservado ate validacao real da paridade minima

## Objetivo desta base

Esta aplicacao existe para substituir a UI antiga de forma controlada, sem remendos na interface legada e sem alterar desnecessariamente o backend.

## Stack

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS

## Comandos principais

Na pasta `frontend-v2`:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

Na raiz do repositorio:

```bash
npm run lint:rebuild
npm run build:rebuild
npm run smoke:rebuild
npm run smoke:legacy
```

`npm run smoke:rebuild` agora consegue subir uma trilha local completa sem URL externa:

- sobe o Worker local em `127.0.0.1:8787`
- gera build do `frontend-v2` apontando para a API local
- sobe preview local em `127.0.0.1:4173`
- cria conta admin de smoke se o banco local estiver vazio
- executa login e navegacao principal no navegador

Se `REBUILD_BASE_URL`, `LOGIN_USER` e `LOGIN_PASS` forem informados, o mesmo script tambem pode validar um ambiente externo.

## Variaveis de ambiente

Use `frontend-v2/.env.example` como referencia.

Variaveis da Fase 11:

- `VITE_TELIER_UI_MIGRATION_MODE=legacy|validation|rebuild`
- `VITE_TELIER_LEGACY_URL=` endereco explicito da superficie legada para handoff durante a validacao

## Regras operacionais da Fase 11

- `legacy` fecha a nova UI por padrao e nao aceita bypass local para rebuild
- `validation` permite alternancia controlada entre legado e rebuild
- `rebuild` assume a nova UI como superficie principal
- checklist de paridade e criterios de corte estao em `docs/rebuild/phase-11-parity-checklist.md`
- a smoke automatizada reduz risco tecnico, mas nao substitui validacao operacional real da paridade

## Escopo coberto nesta base

- login real na nova UI
- rotas protegidas
- shell principal
- tarefas, projetos, grupos e administracao minima
- mecanismo de migracao controlada
- handoff explicito para o legado

## Fora do escopo desta fase

- remocao destrutiva do legado sem validacao real
- alteracao de contratos do backend sem necessidade comprovada
- declaracao de paridade concluida antes da validacao operacional
