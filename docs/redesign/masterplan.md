# Telier — Masterplan de Redesign

> Documento mestre para condução do redesign do Telier v2.
> Uso pessoal, referência para Codex e guia de execução.
> Última consolidação: março 2026.
> Local recomendado no repositório: `docs/redesign/masterplan.md`
> Arquivo complementar obrigatório na raiz: `AGENTS.md`

---

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Local no repositório](#1a-local-no-repositório)
3. [Contexto do produto](#2-contexto-do-produto)
4. [Diagnóstico atual](#3-diagnóstico-atual)
5. [Problemas identificados](#4-problemas-identificados)
6. [Objetivos da v2](#5-objetivos-da-v2)
7. [Tese de redesign](#6-tese-de-redesign)
8. [Princípios de produto](#7-princípios-de-produto)
9. [Direção de UX/UI](#8-direção-de-uxui)
10. [Arquitetura de informação](#9-arquitetura-de-informação)
11. [Estrutura das telas](#10-estrutura-das-telas)
12. [Sistema visual](#11-sistema-visual)
13. [Design system](#12-design-system)
14. [Arquitetura técnica alvo](#13-arquitetura-técnica-alvo)
15. [Plano de execução por fases](#14-plano-de-execução-por-fases)
16. [Sequência de PRs](#15-sequência-de-prs)
17. [Como este documento deve ser usado](#16-como-este-documento-deve-ser-usado)
18. [Prompts para Codex](#17-prompts-para-codex)
19. [Instruções persistentes do repositório (`AGENTS.md`)](#18-instruções-persistentes-do-repositório-agentsmd)
20. [Checklist de uso com Codex](#19-checklist-de-uso-com-codex)
21. [Próximos passos](#20-próximos-passos)

---

## 1. Resumo executivo

O Telier é um sistema interno de gestão de projetos e time tracking para um escritório de arquitetura universitário. O sistema atual funciona como MVP, mas apresenta fragilidades visuais, estruturais e técnicas que impedem sua consolidação como produto institucional maduro.

O redesign v2 propõe:

- **Reposicionar** o produto como plataforma interna de coordenação de projetos institucionais — não como app de produtividade pessoal ou dashboard decorativo.
- **Redesenhar** a linguagem visual inteira, eliminando a estética de "template SaaS" e "cara de IA".
- **Redefinir** a arquitetura de informação em cinco eixos claros: Hoje, Projetos, Tempo, Pessoas e Administração.
- **Centralizar** tarefas e tempo como núcleo operacional do sistema.
- **Modularizar** frontend e backend, saindo da dependência de arquivos monolíticos.
- **Adequar** o domínio ao contexto universitário multiunidade (campi, hospitais, clínicas).

A execução está planejada em 9 fases incrementais, com 12 PRs sequenciais, cada uma com critérios de aceite definidos.

---


## 1A. Local no repositório

Os dois arquivos canônicos de orientação para agentes devem ser:

- `AGENTS.md` na raiz do repositório
- `docs/redesign/masterplan.md` dentro de `docs/redesign/`

O `AGENTS.md` deve ser curto e apontar para `docs/redesign/masterplan.md`.
O `masterplan.md` deve concentrar o contexto completo do redesign e da execução com Codex.

---

## 2. Contexto do produto

### O que é

O Telier é um sistema web interno para um escritório de arquitetura vinculado a uma universidade. O nome vem de "ateliê", o espaço de trabalho do arquiteto.

### Escopo institucional

O escritório atende exclusivamente a instituição, mas o escopo é amplo: múltiplos campi, hospitais, clínicas universitárias e unidades acadêmicas e assistenciais.

### Funções centrais

- Time tracking (cronômetro integrado, sessões e intervalos).
- Gestão leve de projetos (fases, status, prazos, responsáveis).
- Acompanhamento de tarefas (prioridade, complexidade, foco).
- Visibilidade operacional do trabalho da equipe.

### Perfil operacional principal

Usuário técnico que trabalha com múltiplos projetos simultâneos, precisa retomar contexto rapidamente, registrar tempo com baixa fricção e navegar por informação operacional sem excesso de carga cognitiva.

### Stack atual

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Frontend   | HTML + CSS + JS puro (SPA)        |
| Backend    | Cloudflare Workers (Edge Runtime) |
| Banco      | Cloudflare D1 (SQLite)            |
| Hospedagem | Cloudflare Pages                  |
| Fontes     | Inter + DM Mono                   |

### Estrutura atual do repositório

```
/
├── src/
│   ├── index.html      # Frontend completo (~4200 linhas)
│   └── worker.js       # API REST (~2210 linhas)
├── db/
│   └── schema.sql      # Schema D1
├── docs/
│   ├── context.md
│   └── deploy.md
├── wrangler.toml
└── README.md
```

### Identidade desejada do produto

O sistema deve transmitir: profissionalismo, maturidade, confiabilidade, precisão e continuidade operacional.

O sistema **não deve parecer**: template de SaaS genérico, dashboard decorativo, app pessoal de produtividade, interface com "cara de IA", ferramenta improvisada ou experimental.

O sistema **deve parecer**: institucional, sóbrio, técnico, confiável, maduro, preciso, preparado para uso contínuo por equipe.

---

## 3. Diagnóstico atual

### Síntese

O sistema atual está mais próximo de um MVP sofisticado do que de um produto maduro. Demonstra trabalho e ambição funcional, mas ainda não transmite o rigor visual, estrutural e operacional esperado.

Percepção predominante:

- Produto funcional, mas visualmente genérico.
- Linguagem de SaaS moderno demais.
- Excesso de sinais estéticos previsíveis.
- Pouca disciplina hierárquica.
- Arquitetura de frontend e backend frágeis para evolução contínua.

### Problema central

Falta de direção clara. O sistema tenta ser, ao mesmo tempo, dashboard analítico, app de produtividade pessoal, ferramenta colaborativa, painel administrativo, sistema de gestão de projetos e ambiente "ao vivo". O resultado é uma experiência inchada, com excesso de camadas visuais e pouca clareza de protagonismo.

### Veredito

O sistema ainda parece amador no sentido de produto (não de esforço). Transmite utilidade, mas pouca confiança estética e pouca maturidade. Está mais próximo de um protótipo funcional ambicioso do que de um software institucional consolidado.

O caminho não é apenas "polir a UI atual". O caminho é:

1. Reposicionar o produto.
2. Redefinir a arquitetura de informação.
3. Reconstruir a linguagem visual.
4. Modularizar a base técnica.

---

## 4. Problemas identificados

### 4.1 Linguagem visual

A interface usa fortemente um repertório visual associado a templates modernos e interfaces "com cara de IA":

- Glassmorphism, blur, gradientes azul/roxo, superfícies translúcidas, glow.
- Pills/chips para quase tudo.
- Segmented controls arredondados em excesso.
- Toolbar com vidro fosco.
- Cartões heroicos.
- Excesso de suavidade visual sem propósito funcional.

Resultado: sensação de produto genérico, template moderno previsível, software sem identidade, visual pouco institucional.

### 4.2 Percepção de "cara de IA" / amadorismo

**Repertório visual genérico:** blur, gradientes, glow e transparência em excesso, padrão de templates IA/SaaS.

**Excesso de badges e chips:** fase, status, prioridade, prazo, área, foco, compartilhamento, urgência — todos com peso visual semelhante. Gera competição visual, pouca hierarquia real, leitura cansativa.

**Mistura de tons:** expressões como "Começar meu dia", "Mapa de Foco", "Ao vivo", "Meu foco" convivem com áreas administrativas. Identidade híbrida e pouco madura.

**Protagonismo excessivo de módulos periféricos:** presença online e "ao vivo" recebem mais destaque do que deveriam.

**Componentes e ações em excesso por card:** muitos cards tentam resumir dados demais ao mesmo tempo.

**Sinais de acabamento informal:** uso de emoji, ícones improvisados, menus e ações demais por bloco, micro-interações pouco relevantes.

### 4.3 UX

**Dashboard inchado:** a home tenta mostrar tudo ao mesmo tempo — retomada, foco, projetos, grupos, filtros, alertas, status, ações, compartilhamentos, blocos operacionais e administrativos. Alta carga cognitiva.

**Projetos muito "cardizados":** cada card tenta exibir fase, status, prioridade, prazo, área, progresso, responsável, urgência, compartilhamento e ações. O card vira mini-dashboard em vez de resumo claro.

**Página de projeto sobrecarregada:** hero, resumo executivo, métricas, tarefas, mapa de foco, relatório, ao vivo, decisões, sessões — tudo na mesma tela. Enfraquece o foco operacional.

**Conceito de "foco" superexpandido:** foco global, banner de foco, mapa de foco, retomada, destaque no projeto. Uma boa ideia espalhada demais.

**Tempo espalhado demais:** cronômetro aparece em tarefa, dock, dashboard, projeto, tempo e "ao vivo". Fragiliza a clareza do registro de horas.

**Excesso de superfícies e pouca centralidade:** muitas áreas, mas nem sempre fica claro o que é principal, o que é secundário e qual a ação central da tela.

### 4.4 Arquitetura de informação

Estrutura extensa demais e pouco hierarquizada. Muitas áreas com peso parecido: dashboard, grupos, projetos, tarefas, foco, mapa de foco, ao vivo, central admin, compartilhamentos, relatórios, presença.

### 4.5 Problemas técnicos

#### Frontend

Frontend concentrado em arquivo monolítico (`src/index.html`, ~4200 linhas) misturando estrutura, estilo, renderização, lógica de estado, handlers de evento e consumo de API.

Consequências: baixa modularidade, manutenção difícil, alto risco de regressão, dificuldade de escalar.

Fragilidades específicas: muitos `onclick=` inline, uso extensivo de `innerHTML`, grande quantidade de estado global, mistura de padrões de renderização, acoplamento excessivo entre UI e domínio.

#### Backend

Backend concentrado em arquivo grande (`src/worker.js`, ~2210 linhas), com rotas, queries, regras de negócio, autorização e detalhes operacionais misturados. Prejudica clareza, manutenção, testabilidade e escalabilidade.

#### Banco e segurança

- Estratégia de senha fraca para longo prazo.
- Ajustes de schema em runtime (via `AUTO_SCHEMA_SYNC`).
- Rate limiting frágil/in-memory.
- Nomenclaturas inconsistentes.
- Crescimento do domínio sem estruturação equivalente.

---

## 5. Objetivos da v2

1. Redesenhar a linguagem visual inteira.
2. Redefinir a arquitetura de informação.
3. Reorganizar as principais telas em torno do uso diário real.
4. Reduzir protagonismo de módulos periféricos.
5. Transformar tarefas e tempo no eixo principal do sistema.
6. Modularizar o frontend.
7. Endurecer autenticação, migrações e organização do backend.
8. Criar base sustentável para evolução futura.
9. Adequar o domínio ao contexto de arquitetura universitária multiunidade.
10. Eliminar a sensação de template SaaS genérico e "cara de IA".

---

## 6. Tese de redesign

O Telier v2 não deve ser tratado como "um app de produtividade mais elegante". Deve ser reposicionado como uma **plataforma interna de coordenação de projetos institucionais**.

### O centro do produto deixa de ser

- Produtividade individual teatralizada.

### O centro do produto passa a ser

- Coordenação técnica.
- Registro de tempo confiável.
- Rastreabilidade.
- Visibilidade operacional.
- Continuidade de projetos institucionais complexos.

### Referência errada

- Startup SaaS, dashboard promocional, app pessoal.

### Referência certa

- Sistema interno de operação, software institucional maduro, ferramenta técnica de gestão e acompanhamento.

---

## 7. Princípios de produto

Toda decisão de UX, UI, estrutura e arquitetura deve seguir estes princípios:

1. A informação operacional vem antes da decoração.
2. O usuário deve entender o estado do trabalho em poucos segundos.
3. O registro de tempo precisa ser rápido, claro e rastreável.
4. A lista de tarefas é o núcleo do trabalho.
5. O sistema deve facilitar a retomada de contexto.
6. O projeto deve ser uma unidade operacional clara.
7. Administração e operação devem ser separadas.
8. Poucas regras visuais, aplicadas com rigor, são melhores do que muitos efeitos.
9. Tudo que parecer efeito de template deve ser evitado.
10. A interface deve refletir um escritório de arquitetura institucional, não uma startup.
11. O sistema deve parecer durável, não "fashion".
12. A consistência importa mais do que o virtuosismo visual.

---

## 8. Direção de UX/UI

### 8.1 Direção geral

O produto deve parecer: institucional, sóbrio, técnico, confiável, preciso, contido, silencioso.

Deve evitar: teatralidade visual, excesso de animação, aparência de template, ornamentação desnecessária, protagonismo excessivo de elementos secundários.

### 8.2 Regras de UX

- Uma ação principal por contexto.
- Ações secundárias devem ir para menus.
- Concluídas devem ficar recolhidas por padrão quando fizer sentido.
- Hover nunca pode ser dependência crítica.
- Modais devem ser usados com parcimônia; preferir edição inline ou drawer.
- A interface deve reduzir carga cognitiva.
- Informação crítica deve aparecer antes de metadados secundários.
- Tempo e tarefas são mais importantes do que presença e "ao vivo".
- "Foco" deve ser assistivo, não o centro do produto.
- O sistema deve ser rápido de ler, não apenas "bonito".

### 8.3 Regras de UI

**A linguagem visual deve ser:** opaca, sóbria, técnica, controlada, hierárquica, legível.

**Evitar fortemente:** glassmorphism dominante, blur excessivo, glow, gradientes como identidade, cards inflados, chip para tudo, estética "AI SaaS", hero sections desnecessárias, emojis, ícones improvisados.

**Priorizar:** painéis funcionais, listas densas, tabelas claras, alinhamento preciso, hierarquia tipográfica forte, poucos acentos visuais, componentes reutilizáveis, estados claros.

---

## 9. Arquitetura de informação

### Navegação principal (v2)

| Área             | Propósito                                                          |
|------------------|--------------------------------------------------------------------|
| **Hoje**         | Entrada operacional do usuário. Responde: no que estou trabalhando, o que vence, o que precisa de atenção, o que retomar. |
| **Projetos**     | Base principal de navegação e acompanhamento dos projetos.         |
| **Tempo**        | Área consolidada de sessões, filtros e análise operacional de horas. |
| **Pessoas**      | Visão de distribuição do trabalho, sem estética de vigilância.     |
| **Administração**| Backoffice separado da operação.                                   |

### O que deve deixar de ser eixo principal

- Mapa de Foco como módulo independente protagonista.
- "Ao vivo" como área central.
- Central Admin misturada à home.
- Excesso de widgets concorrentes na tela inicial.

---

## 10. Estrutura das telas

### 10.1 Tela "Hoje"

**Objetivo:** entrada operacional do dia.

**Deve mostrar:** tarefa ativa, cronômetro ativo, retomada, prazos próximos, pendências e bloqueios, projetos em andamento.

**Não deve ter:** hero grande, decoração excessiva, gradientes dramáticos, excesso de chips, dashboard inflado.

### 10.2 Tela "Projetos"

**Objetivo:** base operacional para encontrar e acompanhar projetos.

**Priorizar:** nome, campus/unidade, fase, status, prazo, responsável, progresso, risco.

**Evitar:** cartões carregados demais, resumo excessivo por projeto, excesso de destaque para metadados secundários.

### 10.3 Workspace do projeto

**Objetivo:** centro real de operação do projeto.

**Estrutura desejada:**

- Cabeçalho compacto.
- Faixa de status/contexto.
- Área principal com tarefas.
- Painel lateral com metadados, decisões e tempo.

**Seções recomendadas:** Visão geral, Tarefas, Tempo, Decisões.

**Diretrizes:** remover protagonismo do "Mapa de Foco" e de "Ao vivo". Fazer a tela parecer workspace operacional. Evitar excesso de mini-módulos concorrentes.

### 10.4 Tarefas

Tarefas são o núcleo do sistema. A visualização principal deve favorecer clareza, densidade controlada, leitura rápida, ação rápida e consistência.

**Modo principal:** tabela.

**Colunas da tabela:** tarefa, responsável, colaboradores, prioridade, complexidade, status, prazo/data, tempo acumulado, ação principal.

**Regras:** ações secundárias em menu, concluídas recolhidas por padrão, hover não pode ser dependência crítica, forte legibilidade, cronômetro explícito e simples.

### 10.5 Tempo

Tempo deve ser tratado como dimensão operacional séria.

A área deve permitir: leitura clara, filtro por período/projeto/pessoa/unidade, sessões confiáveis, edição segura, visão consolidada.

Não deve ser apenas um painel bonito — deve ser útil para operação e gestão.

### 10.6 Pessoas

A área de pessoas deve mostrar distribuição do trabalho sem parecer vigilância.

Foco em: carga, horas recentes, pendências, alocação recente, estado operacional simples.

Evitar estética de "quem está online agora" como eixo principal.

### 10.7 Administração

Área administrativa separada da operação.

Priorizar: usuários, papéis, permissões, estruturas institucionais, auditoria, parametrizações relevantes.

### 10.8 Ajuste do modelo de domínio

O contexto universitário e multiunidade exige evolução do domínio. A v2 deve considerar a introdução gradual de:

**Campos/atributos em projetos:** campus, unidade, tipo de unidade, setor demandante, disciplina principal, fase institucional, criticidade, tipo de intervenção, área, responsável técnico, status de aprovação, número/processo interno.

**Estruturas auxiliares:** campi, unidades, tipos de projeto, disciplinas, etapas institucionais, categorias de demanda.

Objetivo: melhorar aderência ao uso real, filtros, relatórios e percepção de seriedade.

---

## 11. Sistema visual

### 11.1 Linguagem geral

A interface deve ser: opaca, sóbria, ortogonal, precisa, silenciosa, controlada.

Deve evitar: transparência dominante, blur, gradientes como assinatura, "efeito premium genérico", exagero decorativo.

### 11.2 Paleta

**Base:** neutra, mineral — cinza grafite, cinza frio, off-white.

**Acento:** uma cor principal usada com disciplina. Sugestões: azul profundo, verde petróleo ou terracota escuro.

**Evitar:** identidade principal azul/roxo genérica.

### 11.3 Tipografia

Continuar com Inter é aceitável. DM Mono ou outra mono deve ser restrita a números de tempo, códigos e identificadores técnicos.

A escala tipográfica deve: reduzir microtipos, reforçar hierarquia, manter legibilidade, evitar excesso de uppercase, tornar texto secundário legível de verdade.

### 11.4 Espaçamento

Escala rígida: 4, 8, 12, 16, 24, 32, 40, 48.

Evitar: valores arbitrários, espaçamento "fofo" excessivo, inconsistência entre telas.

### 11.5 Bordas e sombras

Radius moderado. Sombras discretas. Sem glow. Sem aparência de cartões excessivamente flutuantes.

---

## 12. Design system

### 12.1 Tokens

- Cores
- Tipografia
- Espaçamento
- Radius
- Borda
- Sombra
- Z-index
- Transições
- Estados

### 12.2 Componentes base

Button, IconButton, Input, Textarea, Select, Checkbox, Switch, Tabs, Badge, StatusTag, Card, Panel, Table, EmptyState, Modal, Drawer, Toast, DropdownMenu, DateField, SearchField, FilterBar, Stat, Pagination, Tooltip, ConfirmDialog.

### 12.3 Componentes de domínio

ProjectRow, ProjectStatus, TaskTable, TaskRow, TimerControl, TimerDock, TimeSessionList, DecisionList, UserAvatar, AssignmentCell, DeadlineIndicator, RiskIndicator, ProjectHeader, ProjectMetaPanel.

### 12.4 Requisitos de cada componente

- Variações.
- Estados (normal, hover, active, disabled, loading, error).
- Comportamento responsivo.
- Consistência de uso.
- Acessibilidade mínima.
- Documentação de uso quando necessário.

---

## 13. Arquitetura técnica alvo

### 13.1 Direção geral

Sair da dependência de arquivos monolíticos. Reduzir acoplamento, separar UI/domínio/serviços/utilitários, padronizar nomenclaturas, melhorar clareza estrutural, facilitar evolução futura, preservar comportamento existente durante refatoração incremental.

### 13.2 Frontend

**Direção preferencial:** React + TypeScript + Vite.

**Estrutura sugerida:**

```
src/
├── app/           # Configuração geral, providers, router
├── pages/         # Páginas por rota
├── features/      # Módulos de funcionalidade
├── components/    # Componentes reutilizáveis (design system)
├── lib/           # Utilitários, API client, formatação
├── styles/        # Tokens, tema, globals
└── types/         # Tipos TypeScript
```

**Princípios:** design system explícito, componentes reutilizáveis, estado previsível, evitar renderização baseada em string, eliminar handlers inline, reduzir uso inseguro de `innerHTML`.

Mesmo se a stack não for trocada imediatamente, a lógica de modularização deve seguir essa direção.

### 13.3 Backend

Manter Workers + D1 é aceitável. Refatorar por domínios:

| Domínio    | Responsabilidade                 |
|------------|----------------------------------|
| auth       | Autenticação e sessões           |
| users      | Gestão de usuários               |
| projects   | Projetos e permissões            |
| tasks      | Tarefas e colaboradores          |
| time       | Sessões de tempo e intervalos    |
| decisions  | Decisões e referências           |
| admin      | Administração e auditoria        |

Separar: rotas, serviços, repositórios, validações, autorização.

### 13.4 Banco e segurança

- Migrations explícitas (parar de depender de ajuste de schema em runtime).
- Fortalecer autenticação e armazenamento de senha.
- Rever rate limiting.
- Rever validações.
- Preservar integridade dos dados.
- Normalizar nomenclaturas.

### 13.5 Backlog técnico detalhado

**Frontend:**

- Quebrar o arquivo monolítico atual.
- Migrar estilo para tokens.
- Criar layout principal.
- Substituir renderização baseada em string por componentes.
- Eliminar `onclick` inline.
- Reduzir `innerHTML`.
- Padronizar nomenclaturas de estado e rótulos.
- Centralizar chamadas de API.
- Criar utilitários de formatação.
- Criar testes mínimos de fluxo.

**Backend:**

- Quebrar o arquivo monolítico atual.
- Extrair middlewares.
- Extrair autorização.
- Extrair validação.
- Organizar queries por domínio.
- Criar migrations.
- Rever estratégia de autenticação.
- Rever rate limit.
- Padronizar respostas da API.

**Domínio:**

- Normalizar `dificuldade` / `complexidade`.
- Normalizar rótulos inconsistentes de status.
- Preparar entidades de campus/unidade.
- Preparar filtros institucionais.
- Rever regra de múltiplos cronômetros.

### 13.6 Decisões técnicas a tomar cedo

| Decisão | Recomendação |
|---------|--------------|
| Manter Workers + D1? | Sim. |
| Migrar frontend para React + TypeScript? | Sim. |
| Permitir múltiplos cronômetros simultâneos? | Não por padrão. |
| Introduzir campos institucionais agora ou depois? | Agora, ao menos campus e unidade. |
| Manter tema escuro? | Sim, mas com rigor e sem dramatização visual. |

---

## 14. Plano de execução por fases

### Fase 0 — Congelamento e preparação

**Objetivo:** criar base segura para mudar sem quebrar tudo.

**Entregas:** branch `redesign/v2`, snapshot do estado atual, inventário de telas e fluxos, mapa de componentes atuais, lista de endpoints, inconsistências de nomenclatura, checklist de riscos, definição inicial de schema e contratos para campus e unidade.

**Critério de aceite:** estado atual documentado e congelado.

---

### Fase 1 — Direção visual, design system e base de domínio

**Objetivo:** criar a nova gramática visual.

**Entregas:** tokens, tema, componentes base, guidelines de densidade, estados, tipografia, grid, preparação da base visual e estrutural para campos institucionais como campus e unidade.

**Critério de aceite:** nova camada visual aprovada antes da reescrita pesada das telas.

---

### Fase 2 — Reestruturação da navegação

**Objetivo:** implantar a nova arquitetura de informação.

**Entregas:** nav principal nova, roteamento novo, separação entre Hoje/Projetos/Tempo/Pessoas/Administração, rebaixamento de módulos periféricos.

**Critério de aceite:** estrutura do sistema compreensível sem explicação.

---

### Fase 3 — Home "Hoje"

**Objetivo:** entregar a nova entrada operacional.

**Entregas:** tarefa ativa, retomada, prazos, pendências, projetos ativos.

**Critério de aceite:** a home ajuda a iniciar o dia com leitura rápida e clara.

---

### Fase 4 — Projetos

**Objetivo:** reescrever a listagem e o workspace.

**Entregas:** lista de projetos nova, workspace novo, cabeçalho compacto, painel lateral, visão geral, tarefas, tempo, decisões.

**Critério de aceite:** a tela de projeto parece um workspace, não um dashboard inflado.

---

### Fase 5 — Tarefas e cronômetro

**Objetivo:** tornar o núcleo operacional excelente.

**Entregas:** tabela de tarefas nova, cronômetro mais claro, tratamento melhor de ações, concluídas recolhidas, menus e edição revisados.

**Critério de aceite:** registrar horas e atualizar tarefa é rápido, inequívoco e consistente.

---

### Fase 6 — Tempo e pessoas

**Objetivo:** estruturar acompanhamento operacional.

**Entregas:** tela de tempo consolidada, edição segura de sessões, tela de pessoas com carga e pendências, resumos úteis.

**Critério de aceite:** gestão de tempo deixa de ser espalhada e vira área confiável.

---

### Fase 7 — Administração e expansão do domínio institucional

**Objetivo:** aprofundar a aderência do sistema ao contexto universitário.

**Entregas:** UI administrativa para campus e unidade, estruturas auxiliares adicionais, admin limpa, papéis e permissões mais claros.

**Critério de aceite:** o sistema passa a refletir com mais completude a realidade institucional, já apoiado sobre schema e contratos definidos nas fases iniciais.

---

### Fase 8 — Hardening técnico

**Objetivo:** deixar a base sustentável.

**Entregas:** frontend modular, backend modular, autenticação endurecida, migrations, lint, tipagem, testes básicos, contratos consistentes.

**Critério de aceite:** o projeto deixa de depender de arquivos gigantes como centro estrutural.

---

## 15. Sequência de PRs

| #  | PR                                                 | Fase |
|----|----------------------------------------------------|------|
| 1  | Infraestrutura de redesign e inventário            | 0    |
| 2  | Design tokens, tema e componentes base             | 1    |
| 3  | Nova navegação e shell principal                   | 2    |
| 4  | Nova página Hoje                                   | 3    |
| 5  | Nova listagem de projetos                          | 4    |
| 6  | Novo workspace do projeto                          | 4    |
| 7  | Nova tabela de tarefas e cronômetro                | 5    |
| 8  | Nova área de tempo                                 | 6    |
| 9  | Nova área de pessoas                               | 6    |
| 10 | Nova administração e entidades institucionais      | 7    |
| 11 | Refatoração modular do backend                     | 8    |
| 12 | Segurança, migrations, lint, testes e limpeza final| 8    |

---

## 16. Como este documento deve ser usado

Este arquivo deve viver no repositório em:

`docs/redesign/masterplan.md`

Ele é a fonte de verdade do redesign. Seu papel é registrar:
- visão de produto
- direção de UX/UI
- arquitetura alvo
- fases de execução
- prompts-base para o Codex
- critérios de revisão

### Relação entre os dois arquivos do repositório

- `AGENTS.md` deve ficar **na raiz do repositório** e conter apenas instruções persistentes, curtas e de alta frequência para agentes.
- `docs/redesign/masterplan.md` deve ficar em **`docs/redesign/`** e conter o contexto completo do redesign.
- O `AGENTS.md` deve apontar explicitamente para `docs/redesign/masterplan.md`.
- Toda tarefa no Codex deve mandar ler **os dois arquivos** antes de editar código.

### Como usar com o Codex

1. Ler `docs/redesign/masterplan.md` para entender a direção geral.
2. Garantir que o `AGENTS.md` esteja na raiz do repositório.
3. Escolher apenas **uma fase** ou **um PR** por vez.
4. Formular o prompt sempre com:
   - leitura prévia de `AGENTS.md`
   - leitura prévia de `docs/redesign/masterplan.md`
   - escopo fechado
   - regra do que não fazer
   - critério de aceite
5. Nunca pedir “fazer tudo”.
6. Atualizar este arquivo quando uma decisão importante de direção for realmente fechada.

### O que não fazer

- Não mover o conteúdo deste arquivo para o `AGENTS.md`.
- Não colar este documento inteiro em todo prompt.
- Não tratar este documento como texto estático externo ao projeto.
- Não pedir reescrita total cega sem fase, escopo e critério de aceite.

## 17. Prompts para Codex

### Prompt 1 — Inventário e plano técnico

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Você está trabalhando no repositório Telier. Sua tarefa é preparar a base para um redesign estrutural sem ainda reescrever as telas principais.

Objetivos:
1. Mapear a estrutura atual do frontend e backend.
2. Identificar fluxos principais, componentes implícitos, endpoints e inconsistências de nomenclatura.
3. Criar um documento técnico em `docs/redesign/redesign-audit.md` com:
   - inventário de telas
   - inventário de fluxos
   - mapa de endpoints
   - problemas de arquitetura
   - inconsistências de naming
   - riscos para a refatoração
4. Preparar a estrutura inicial de diretórios para um frontend modular, sem quebrar o funcionamento atual.
5. Não alterar comportamento do usuário ainda.

Regras:
- Não faça redesign visual ainda.
- Não mude a lógica de negócio.
- Não remova funcionalidades.
- Faça mudanças pequenas e seguras.
- Deixe comentários técnicos claros onde houver dívida estrutural.

Entregue:
- commits organizados
- documentação clara
- estrutura base pronta para as próximas fases
```

---

### Prompt 2 — Design system e shell novo

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Você está implementando a fase de design system e shell principal do Telier v2.

Contexto de produto:
- sistema interno para escritório de arquitetura universitário
- linguagem visual sóbria, técnica, institucional
- evitar qualquer aparência de template SaaS genérico
- reduzir blur, gradientes, glow e excesso de badges

Objetivos:
1. Criar tokens de cor, tipografia, espaçamento, radius e sombra.
2. Criar componentes base reutilizáveis.
3. Criar novo app shell com navegação principal:
   - Hoje
   - Projetos
   - Tempo
   - Pessoas
   - Administração
4. Manter o sistema funcional, mesmo com páginas ainda parciais.
5. Aplicar a nova linguagem visual no shell e componentes base.

Regras:
- Interface opaca, sóbria, precisa
- pouca ornamentação
- forte hierarquia tipográfica
- densidade controlada
- sem cards exuberantes
- sem gradientes como identidade principal

Entregue:
- estrutura de componentes base
- tokens
- novo layout principal
- navegação principal
- páginas placeholder consistentes para as áreas ainda não reescritas
```

---

### Prompt 3 — Nova página Hoje

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Implemente a nova página "Hoje" do Telier v2.

Objetivo da página:
ser uma entrada operacional rápida e clara para o trabalho diário.

A página deve mostrar:
1. tarefa ativa e cronômetro ativo
2. bloco de retomada
3. prazos próximos
4. pendências e bloqueios
5. projetos em andamento

Regras de UX:
- nada de hero grande
- nada de decoração excessiva
- leitura rápida
- uma ação principal por bloco
- informação crítica primeiro
- linguagem institucional e objetiva

Regras visuais:
- usar o novo design system
- evitar excesso de chips
- usar listas e painéis funcionais

Entregue:
- página completa
- estados vazios
- loading
- erros
- responsividade decente
```

---

### Prompt 4 — Nova listagem de projetos

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Reescreva a listagem de projetos do Telier v2.

Objetivo:
transformar a tela de projetos em uma lista operacional madura.

Mostrar por projeto:
- nome
- campus/unidade se disponível
- fase
- status
- prazo
- responsável
- progresso
- risco

Regras:
- menos ênfase em badges
- mais clareza estrutural
- filtros por status, unidade, responsável e prazo
- busca funcional
- densidade de informação controlada
- aparência de sistema institucional, não de dashboard decorativo

Entregue:
- listagem principal
- filtros
- busca
- estados vazios
- refinamento visual consistente
```

---

### Prompt 5 — Workspace do projeto

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Reescreva o workspace do projeto no Telier v2.

Estrutura alvo:
- cabeçalho compacto
- faixa de status/contexto
- área principal com tarefas
- painel lateral com metadados, decisões e resumo de tempo
- seções: Visão geral, Tarefas, Tempo, Decisões

Regras:
- remover protagonismo do "Mapa de Foco"
- remover protagonismo de "Ao vivo"
- fazer a tela parecer um workspace de operação
- evitar cardização excessiva
- usar tabela e painéis com hierarquia forte

Entregue:
- nova composição da tela
- nova navegação interna
- preservação da lógica existente sempre que possível
- layout consistente com o shell e design system
```

---

### Prompt 6 — Tarefas e cronômetro

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Reescreva o núcleo de tarefas e cronômetro do Telier v2.

Objetivos:
1. Fazer da tabela de tarefas o centro do uso.
2. Melhorar clareza, densidade e ações.
3. Tornar o cronômetro explícito, confiável e simples.

A tabela deve incluir:
- foco
- tarefa
- responsável
- colaboradores
- prioridade
- complexidade
- status
- prazo/data
- tempo acumulado
- ação principal

Regras:
- ações secundárias em menu
- concluídas recolhidas por padrão
- hover não pode ser dependência crítica
- forte legibilidade
- poucos elementos decorativos
- rever UX de múltiplos cronômetros simultâneos e deixar a base preparada para política de um cronômetro por usuário

Entregue:
- nova tabela
- novo controle de cronômetro
- menus de ação
- estados vazios/loading/erro
```

---

### Prompt 7 — Modularização técnica

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Inicie a modularização técnica do Telier.

Objetivos:
1. Reduzir dependência de arquivos monolíticos.
2. Separar frontend por páginas, features, componentes e utilitários.
3. Separar backend por domínios.
4. Padronizar contratos e nomenclaturas.

Regras:
- preservar comportamento existente o máximo possível
- extrair incrementalmente
- não fazer reescrita total cega
- deixar estrutura pronta para evolução futura

Entregue:
- nova árvore de diretórios
- módulos extraídos
- serviços e utilitários separados
- redução de acoplamento
- documentação das decisões
```

---

### Prompt 8 — Hardening

```text
Leia `AGENTS.md` e `docs/redesign/masterplan.md` antes de alterar qualquer arquivo. Consulte também a seção relevante deste documento para a fase atual.

Implemente a fase de hardening do Telier.

Objetivos:
1. Melhorar autenticação.
2. Criar migrations explícitas.
3. Reforçar validações.
4. Preparar lint, checagens e testes básicos.
5. Normalizar nomenclaturas inconsistentes.

Regras:
- não degradar a experiência atual
- documentar trade-offs
- deixar migração segura e reversível quando possível

Entregue:
- infraestrutura mínima de qualidade
- base de segurança mais robusta
- nomenclatura consistente
- documentação de migração
```

---

## 18. Instruções persistentes do repositório (`AGENTS.md`)

O arquivo abaixo deve ser salvo na raiz do repositório como:

`AGENTS.md`

Ele deve permanecer curto e estável. O objetivo do `AGENTS.md` não é repetir o masterplan inteiro, e sim apontar para ele e registrar apenas as instruções persistentes mais importantes para qualquer agente que atue no projeto.

```md
# AGENTS.md

## Contexto do produto
Telier é um sistema interno para um escritório de arquitetura universitário.
O produto deve parecer institucional, sóbrio, técnico e confiável.
Evitar estética de template SaaS genérico, dashboard decorativo e interface com “cara de IA”.

## Fonte de verdade do redesign
Antes de trabalhar em qualquer tarefa de redesign, leia:
`docs/redesign/masterplan.md`

## Regras de produto e UX
- Priorizar tarefas e tempo como núcleo do sistema.
- Administração deve permanecer separada da operação.
- Uma ação principal por contexto.
- Concluídas recolhidas por padrão quando fizer sentido.
- “Foco” é assistivo, não protagonista.
- Presença online e recursos “ao vivo” não devem ser centrais.

## Regras de UI
- Reduzir blur, glow, gradientes dramáticos e glassmorphism.
- Evitar chipização excessiva, cards inflados e hero sections desnecessárias.
- Priorizar painéis funcionais, listas densas, tabelas claras e hierarquia tipográfica forte.

## Regras técnicas
- Não criar novos arquivos monolíticos.
- Preferir modularização incremental.
- Preservar comportamento existente durante refatorações.
- Evitar misturar lógica de negócio, renderização e acesso a dados no mesmo bloco quando for possível separar.
- Executar os checks relevantes ao final de cada tarefa.
- Documentar trade-offs quando uma decisão estrutural importante for tomada.

## Instrução final
Quando houver dúvida entre duas soluções, preferir a que:
- aumenta clareza operacional
- reduz ruído visual
- melhora rastreabilidade
- simplifica o uso diário
- organiza melhor o código
- aproxima o sistema de um produto institucional maduro
```

## 19. Checklist de uso com Codex

### Antes de iniciar qualquer tarefa no Codex

- [ ] Garantir que `AGENTS.md` está na raiz do repositório e que `docs/redesign/masterplan.md` está versionado e atualizado.
- [ ] Verificar em qual fase do plano a tarefa se encaixa.
- [ ] Copiar o prompt correspondente da seção 17.
- [ ] Confirmar que a branch `redesign/v2` existe e está atualizada.

### Ao formular o prompt

- [ ] Incluir contexto de produto (sistema institucional, não SaaS genérico).
- [ ] Especificar o que o Codex **deve** e **não deve** fazer.
- [ ] Referenciar o design system e os princípios de produto quando relevante.
- [ ] Delimitar claramente o escopo da tarefa.

### Após a execução

- [ ] Verificar se o resultado segue a direção visual (opaco, sóbrio, técnico).
- [ ] Confirmar que não foram introduzidos padrões visuais proibidos (blur, glow, gradientes, chips em excesso).
- [ ] Verificar tratamento de estados: normal, loading, vazio, erro.
- [ ] Confirmar que o comportamento existente não quebrou.
- [ ] Verificar responsividade básica.
- [ ] Validar nomenclaturas e consistência.
- [ ] Revisar commits gerados.

### Checklist de revisão de PR

- [ ] Aderência ao `AGENTS.md` e à fase atual descrita em `docs/redesign/masterplan.md`.
- [ ] Aderência ao design system e à linguagem visual definida.
- [ ] Ausência de padrões proibidos, como blur, glow, gradientes dramáticos e chipização excessiva.
- [ ] Clareza estrutural superior à versão anterior.
- [ ] Sem regressão funcional relevante nos fluxos existentes.
- [ ] Checks do projeto executados e resultados registrados.

### Critérios de rejeição

- Introdução de glassmorphism, glow, gradientes dramáticos ou estética "AI SaaS".
- Criação de novos arquivos monolíticos.
- Mistura de lógica de negócio com renderização.
- Componentes sem tratamento de estados.
- Reintrodução de padrões visuais abandonados.
- Mudanças cosméticas sem ganho estrutural.

---

## 20. Próximos passos

1. **Salvar `AGENTS.md` na raiz do repositório** e **`docs/redesign/masterplan.md` em `docs/redesign/`**.
2. **Criar a branch `redesign/v2`** e congelar o estado atual.
3. **Executar o Prompt 1** (inventário e plano técnico) como primeira tarefa no Codex.
4. **Revisar o inventário gerado** antes de avançar para o design system.
5. **Executar o Prompt 2** (design system e shell) e validar a direção visual antes de reescrever telas.
6. **Seguir a sequência de PRs** da seção 15, fase a fase.
7. **Usar o checklist da seção 18** em cada ciclo de trabalho com o Codex.
8. **Atualizar `docs/redesign/masterplan.md`** conforme decisões forem tomadas durante a execução.

> **Decisão operacional:** schema, tipos, contratos e preparo de API para campus e unidade devem ser introduzidos nas fases iniciais do plano, preferencialmente entre a Fase 0 e a Fase 2. A UI administrativa completa e as estruturas auxiliares adicionais podem permanecer para a Fase 7.

---

## 21. Decisões fechadas (registro incremental)

### 2026-03-24 — Fase 1 (design system e shell) concluída com transição híbrida

**Decisão (curta e cumulativa):**
- `#v2-shell-root` é o shell padrão de navegação (Hoje, Projetos, Tempo, Pessoas, Administração).
- `#legacy-app-root` permanece ativo apenas como camada de contingência durante a migração.

**Motivação:**
- reduzir regressão enquanto a reescrita sai do monólito para módulos;
- manter continuidade operacional sem “big bang”.

**Trade-off aceito:**
- convivência temporária de duas camadas de UI, com custo de manutenção no curto prazo.

**Paridade mínima + checks para remover `#legacy-app-root` (critério objetivo):**
- paridade de navegação: shell v2 acessa Hoje, Projetos, Tempo, Pessoas e Administração sem depender de render do legado;
- paridade de operação: iniciar/parar cronômetro, listar tarefas pendentes e abrir projeto funcionam no shell v2 em fluxo principal;
- paridade de estados: loading, vazio e erro tratados nas telas migradas;
- checks obrigatórios aprovados no PR de remoção: `node scripts/check_backend_infra_compat.mjs` e `npm run smoke` (ou justificativa explícita de limitação de ambiente no próprio PR).

### 2026-03-24 — Fase 5.1 concluída com primeira subárea nativa de Tarefas no Projeto v2

**Decisão (curta e cumulativa):**
- A página de Projeto no v2 passa a incorporar uma subárea nativa real de Tarefas (tabela operacional) como destino principal.
- Ações avançadas de tarefa permanecem temporariamente no fluxo atual com fallback explícito por linha.

**Motivação:**
- reduzir dependência imediata da interface antiga sem migrar CRUD completo de uma vez;
- criar base segura para migração incremental de operações de tarefa com menor risco.

**Trade-off aceito:**
- enriquecimentos de colaboradores/tempo usam integração best-effort (podem aparecer como parciais nesta fase).

**Paridade mínima fechada nesta etapa:**
- leitura nativa de tarefas por projeto no shell v2;
- exibição operacional de responsável, status, prazo e complexidade/prioridade;
- fallback documentado para ações ainda não migradas.

### 2026-03-24 — Fase 5.2 concluída com endpoint agregado para snapshot de tarefas (redução de N+1)

**Decisão (curta e cumulativa):**
- O v2 passa a consumir um endpoint agregado dedicado para snapshot de tarefas do projeto (`/projetos/:id/tarefas/snapshot-v2`).
- O enriquecimento N+1 por tarefa (colaboradores/tempo) deixa de ser caminho principal no bridge.

**Motivação:**
- reduzir fragilidade e variabilidade de tempo de carregamento da subárea de tarefas no Projeto v2;
- preparar a próxima fase de ações nativas com base de dados mais previsível.

**Trade-off aceito:**
- endpoint explicitamente orientado ao v2, mantendo fallback de baixo risco para ambientes onde a rota ainda não esteja disponível.

**Paridade mínima fechada nesta etapa:**
- snapshot operacional da tabela de tarefas entregue em chamada agregada única;
- contratos legados preservados sem quebra de fluxos existentes.

### 2026-03-24 — Fase 5.3 concluída com ação nativa de status em linha no Projeto v2

**Decisão (curta e cumulativa):**
- O v2 passa a permitir mudança de status por linha na tabela de tarefas do projeto.
- A operação usa contrato já existente (`PATCH /tarefas/:id`) com recarga controlada do snapshot agregado.

**Motivação:**
- reduzir dependência imediata da interface antiga em uma ação operacional frequente;
- manter risco baixo sem migrar CRUD completo.

**Trade-off aceito:**
- atualização conservadora (com recarga de snapshot) em vez de otimista agressiva para evitar inconsistência.

**Paridade mínima fechada nesta etapa:**
- feedback de loading/erro por linha;
- estado da tabela consistente após atualização de status;
- fallback para fluxo atual preservado nas ações ainda não migradas.

### 2026-03-25 — Fase 5.4 concluída com primeiro detalhe read-first de Tarefa no v2

**Decisão (curta e cumulativa):**
- O clique de “Abrir tarefa” na tabela do Projeto v2 passa a abrir um destino nativo inicial de tarefa (read-first), sem depender imediatamente do legado.
- Ações avançadas de tarefa continuam com fallback explícito para o fluxo atual.

**Motivação:**
- reduzir mais dependência da interface atual em navegação operacional frequente;
- preparar base segura para próximas ações nativas na tarefa sem migrar CRUD completo de uma vez.

**Trade-off aceito:**
- leitura de colaboradores/tempo pode ficar parcial quando endpoints auxiliares falharem, mantendo renderização estável.

**Paridade mínima fechada nesta etapa:**
- leitura nativa de contexto principal da tarefa (status, prazo, responsável, colaboradores e resumo de tempo);
- transição reversível com botão explícito para “Abrir no fluxo atual”.

### 2026-03-25 — Fase 5.5 concluída com ação nativa de cronômetro no detalhe de Tarefa (v2)

**Decisão (curta e cumulativa):**
- O detalhe de tarefa no v2 passa a permitir iniciar/retomar e parar cronômetro sem sair imediatamente para o legado.
- A atualização de estado do cronômetro usa recarga conservadora do snapshot da tarefa após ação.

**Motivação:**
- reduzir dependência da interface atual numa ação operacional central do uso diário;
- priorizar consistência de estado sobre sensação de instantaneidade em cenário de concorrência.

**Trade-off aceito:**
- leitura de sessão ativa depende de integração adicional (`/tempo/ativas`) e pode marcar parcialidade quando essa fonte falhar.

**Paridade mínima fechada nesta etapa:**
- ação nativa de iniciar/retomar e parar cronômetro no detalhe da tarefa;
- feedback local de loading/erro e estado visual sem ambiguidade.
