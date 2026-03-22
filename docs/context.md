# Telier — Contexto do projeto

## O que é

Telier é um sistema web de gestão de projetos desenvolvido para escritórios de arquitetura. É uma SPA (Single Page Application) hospedada no Cloudflare Pages, com API no Cloudflare Workers e banco de dados D1 (SQLite). O acesso é por usuário e senha — sem email, sem cadastro externo. É um sistema interno, local, para equipes pequenas.

O nome vem de "ateliê", o espaço de trabalho do arquiteto.

---

## Problema que resolve

O usuário principal é um arquiteto com TDAH e altas habilidades que trabalha como projetista num escritório universitário com supervisor e outros colegas. O sistema foi desenhado para reduzir atrito cognitivo no início e retomada de tarefas, registrar o tempo de trabalho de forma precisa, e permitir colaboração sem depender de ferramentas externas complexas.

Decisões de UX foram tomadas pensando nesse perfil: entrada rápida, uma tarefa em foco por vez, retomada sem perda de contexto, e registro de tempo integrado.

---

## Stack

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Frontend   | HTML + CSS + JS puro (SPA)        |
| Backend    | Cloudflare Workers (Edge Runtime) |
| Banco      | Cloudflare D1 (SQLite)            |
| Hospedagem | Cloudflare Pages                  |
| Fonte      | Inter + DM Mono                   |

---

## Estrutura do repositório

```
/
├── src/
│   ├── index.html      # Frontend completo
│   └── worker.js       # API REST
├── db/
│   └── schema.sql      # Schema D1
├── docs/
│   ├── context.md      # Este arquivo
│   └── deploy.md       # Instruções de deploy
├── wrangler.toml       # Config Cloudflare
├── .gitignore
└── README.md
```

---

## Modelo de dados

### Tabelas principais

**usuarios** — membros do sistema
- `id` TEXT PK
- `nome` TEXT — nome de exibição
- `login` TEXT UNIQUE — nome de usuário para autenticação (armazena onde outros sistemas usariam email)
- `senha_hash` TEXT — PBKDF2 com salt (100k iterações)
- `papel` TEXT — `admin` ou `membro`

**projetos**
- `id` TEXT PK (prefixo `prj_`)
- `nome`, `fase`, `status`, `prioridade`, `prazo`, `area_m2`
- `dono_id` — FK usuarios
- Status possíveis: `Em andamento`, `Aguardando aprovação`, `Pausado`, `Concluído`, `Arquivado`
- Fase: `Estudo preliminar`, `Anteprojeto`, `Projeto básico`, `Projeto executivo`, `Em obra`
- **Projetos só podem ser excluídos após serem arquivados**

**permissoes_projeto** — editores convidados por projeto
- `projeto_id`, `usuario_id` — PK composta

**tarefas**
- `id` TEXT PK (prefixo `tsk_`)
- `nome`, `status`, `prioridade`, `dificuldade`, `data`, `foco`
- `projeto_id`, `dono_id`
- Status: `A fazer`, `Em andamento`, `Bloqueada`, `Concluída`
- Dificuldade: `Simples`, `Moderada`, `Complexa`
- `foco` INTEGER (0/1) — tarefa em destaque do usuário no projeto (só uma por usuário por projeto)

**colaboradores_tarefa** — colaboradores além do dono
- `tarefa_id`, `usuario_id` — PK composta

**sessoes_tempo** — registros do cronômetro
- `id` TEXT PK (prefixo `ste_`)
- `tarefa_id`, `usuario_id`
- `inicio` TEXT — ISO datetime UTC
- `fim` TEXT — NULL se cronômetro ainda rodando
- Horas líquidas calculadas descontando intervalos

**intervalos** — pausas dentro de uma sessão de tempo
- `id` TEXT PK (prefixo `int_`)
- `sessao_id`
- `tipo` TEXT — campo livre (ex: "Lanche", "Reunião", "Problema técnico")
- `inicio`, `fim` TEXT — editáveis retroativamente

**decisoes** — registro de decisões e referências por projeto
- `id` TEXT PK (prefixo `dec_`)
- `projeto_id`, `dono_id`, `descricao`, `data`

**sessoes** — tokens de autenticação
- `id` TEXT — token de 128 bits (32 hex chars)
- `usuario_id`, `expira_em` — sessões expiram em 30 dias

---

## Modelo de permissões

| Papel            | O que pode fazer |
|------------------|-----------------|
| **Admin**        | Tudo — ver, editar e excluir qualquer recurso |
| **Dono do projeto** | Criar e editar o próprio projeto; convidar editores; excluir se arquivado |
| **Editor do projeto** | Editar projeto específico (convidado via permissoes_projeto) |
| **Dono da tarefa** | Criar, editar e excluir a própria tarefa; adicionar colaboradores; marcar foco; cronometrar |
| **Colaborador da tarefa** | Mudar status da tarefa; cronometrar; ver suas próprias sessões |
| **Membro** | Visualizar projetos compartilhados com ele (dono ou editor) |

### Visibilidade de projetos
Cada usuário vê apenas os projetos onde é dono ou editor convidado. Admin vê tudo.

### Foco
O campo `foco` é por usuário por projeto — cada pessoa tem sua própria tarefa em destaque. Só o dono da tarefa pode marcar/desmarcar o foco.

### Sessões de tempo
Cada usuário vê apenas suas próprias sessões de cronômetro. Admin vê as sessões de todos. Sessões são editáveis retroativamente (início, fim, intervalos).

---

## Funcionalidades principais

### Dashboard
- Lista de projetos com filtro por status
- Card de projeto com: nome, fase, status, prioridade, prazo, área m², progresso de tarefas, dono, minha tarefa em foco
- Indicador visual de urgência para projetos com prazo em ≤7 dias
- Filtros: Todos, Em andamento, Aguardando aprovação, Pausado, Concluído, Arquivado

### Projeto
- Cabeçalho com: nome, dono, fase, status, prioridade, prazo, área m², barra de progresso, dias restantes
- Banner de foco — mostra a tarefa em foco do usuário logado
- Abas: **Lista**, **Mapa de Foco**, **Relatório**
- Seção de **Decisões e referências** (registro livre de decisões, materiais, links)
- Seção de **Registros de tempo** — expande ao clicar numa tarefa

### Aba Lista
- Tabela com: foco (pin estrela), nome, responsável, dificuldade, prioridade, status (dropdown inline), botão cronômetro, data
- Status editável inline via dropdown — restrito a dono e colaboradores
- Botões de ação visíveis no hover: colaboradores (👥), editar (✎), excluir (✕)
- Estado vazio com instrução
- Tarefas concluídas com texto riscado e atenuado, agrupadas no final

### Aba Mapa de Foco
- Lista de tarefas pendentes ordenada por prioridade → dificuldade
- Identifica a melhor tarefa para começar
- Tarefas do usuário com foco ativo destacadas
- Scopo: apenas tarefas do projeto atual

### Aba Relatório
- Grupos por status: Concluída, Em andamento, A fazer, Bloqueada
- Total de horas por grupo
- Para cada tarefa: horas líquidas do cronômetro (total + detalhamento por colaborador se houver múltiplos)

### Cronômetro
- Botão ▶ em cada linha da tabela — inicia cronômetro daquela tarefa
- Ao iniciar, aparece widget flutuante fixo no canto inferior direito
- Múltiplos cronômetros simultâneos — um card flutuante por tarefa
- Contador ao vivo atualizado a cada segundo
- Horário de início salvo no servidor — continua rodando se fechar o navegador
- Ao reabrir o site, sessões ativas são restauradas automaticamente
- Cada sessão tem: início, fim (editáveis), e lista de intervalos
- Intervalos: tipo livre, início e fim editáveis retroativamente
- Horas líquidas = duração total − soma dos intervalos

### Tema
- Modo escuro e claro — usuário escolhe pelo botão 🌙/☀️ na topbar
- Preferência salva no localStorage

### Navegação
- Topbar com breadcrumb: `Telier / Nome do projeto`
- Topbar fixa com backdrop blur

---

## Autenticação

- Login por `usuario_login` + `senha` (sem email)
- Hash PBKDF2 com salt aleatório (100k iterações SHA-256)
- Tokens de sessão com 128 bits, expiração em 30 dias
- Tela de setup automática na primeira vez (detecta ausência de admin)
- CORS restrito ao domínio configurado em `ALLOWED_ORIGIN` (env var do Worker)

---

## Decisões de design registradas

- **Sem email** — sistema interno, login por usuário e senha apenas
- **Foco por usuário** — cada pessoa tem sua própria tarefa em destaque por projeto, não global
- **Cronômetro substitui input manual** — não há campo de horas manual; tudo vem do cronômetro
- **Intervalos com tipo livre** — sem lista fixa de tipos, campo aberto
- **Projetos arquivados antes de excluir** — proteção contra exclusão acidental
- **Status de tarefa restrito** — só dono e colaboradores mudam status (não qualquer membro)
- **Mapa de Foco por projeto** — escopo local, não global
- **Visibilidade de sessões** — cada um vê as próprias; admin vê todas
- **Login armazenado no campo `login`** — sem coluna de email no schema
- **Área m² por projeto** — campo numérico único e editável
- **Área única por projeto** — um projeto tem uma área, não múltiplas

---

## Estado atual

MVP funcional. Ainda não foi publicado. Estrutura de repositório pronta para deploy no Cloudflare via `wrangler` ou pela interface gráfica do painel.

Commit inicial: `feat(init): Telier MVP — gestão de projetos, tarefas, cronômetro e permissões por usuário`
