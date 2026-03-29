# Telier — Documento Operacional de Rebuild do Frontend

## 1. Objetivo deste documento

Este documento existe para orientar a reconstrução do frontend do Telier de forma controlada, previsível e completa. O objetivo não é “melhorar” a base atual com remendos. O objetivo é construir uma nova interface consistente, performática e estável, reaproveitando a identidade visual existente e preservando o backend e os contratos que já funcionam.

Este documento deve ser tratado como fonte de verdade para o rebuild. Ele não é uma sugestão. Ele define o que deve ser feito, o que não pode ser feito, como cada fase deve ser executada, quais critérios precisam ser atendidos e quais desvios são proibidos.

Qualquer IA executora deve seguir este documento literalmente. Não improvisar. Não reinterpretar objetivos. Não substituir decisões aqui definidas por preferências próprias. Não simplificar escopo sem autorização explícita.

---

## 2. Decisão estratégica

### 2.1 O que será feito

Será feito um **rebuild controlado do frontend**, em paralelo à base atual.

Isso significa:

- manter backend, autenticação, banco e contratos HTTP existentes sempre que possível;
- construir uma nova aplicação frontend com arquitetura correta;
- migrar a experiência do usuário para a nova aplicação por fases;
- remover a UI antiga somente no final, quando houver paridade mínima comprovada.

### 2.2 O que não será feito

Não fazer nenhuma das opções abaixo:

- redesign incremental sobre a base antiga;
- “limpeza gradual” do código legado como estratégia principal;
- mistura entre componentes novos e antigos na mesma árvore principal;
- manutenção paralela longa de duas linguagens visuais diferentes;
- refactor cosmético sem mudança estrutural;
- reescrever backend sem necessidade real;
- trocar a identidade visual do Telier por uma estética nova.

### 2.3 Motivo da decisão

A base atual apresenta sintomas típicos de acúmulo de dívida por evolução fragmentada:

- interface inconsistente entre páginas;
- acoplamento alto entre lógica e renderização;
- comportamento irregular;
- bugs e lentidão percebida;
- refactors anteriores implementados pela metade;
- excesso de markup e estilos locais;
- dificuldade de previsão para IAs executoras.

Nessas condições, continuar iterando sobre a base antiga tem alta chance de consumir mais tempo e ainda preservar instabilidade estrutural.

---

## 3. Princípios obrigatórios de produto

As decisões abaixo já estão fechadas e não devem ser reabertas durante a execução.

### 3.1 Estrutura geral do produto

- **Tarefas** é a tela principal do produto.
- O sistema deve abrir em **Tarefas**.
- A tela de Tarefas é a superfície operacional central.
- **Projetos** é uma tela de consulta e localização, não uma segunda home.
- **Grupo** é uma camada de organização acima de Projeto.
- **Projeto** é um agrupamento de tarefas + registros do projeto.
- **Grupo** é um agrupamento de projetos + registros do grupo + resumo agregado.
- **Administração** só aparece para administradores.

### 3.2 Relação entre entidades

- **Grupo** contém projetos.
- **Projeto** contém tarefas.
- **Tarefa** é a unidade operacional diária.
- **Registros** podem existir em Projeto e Grupo.
- Registros têm três tipos: **Decisão**, **Pendência** e **Observação**.
- Registros usam lista única com tipo visível.
- Pendências abertas vêm primeiro.
- Pendências resolvidas vão para seção de concluídas no fim.
- Registros podem virar tarefa por ação direta.

### 3.3 Regras da tela de Tarefas

- tela principal do sistema;
- topo essencial, não dashboard;
- criação rápida discreta acima da lista;
- filtros essenciais: Projeto, Prioridade, Facilidade;
- filtro por pessoa não entra no fluxo padrão do usuário comum;
- visualização padrão por blocos:
  - Em andamento
  - Em espera
  - A fazer
  - Concluídas
- ordem exata dos blocos:
  1. Em andamento
  2. Em espera
  3. A fazer
  4. Concluídas
- blocos vazios não aparecem;
- todos os blocos podem ser recolhidos;
- existe modo alternativo “Agrupar por projeto”;
- mesmo nesse modo, concluídas continuam separadas no fim.

### 3.4 Regras da tarefa

- clicar no corpo da tarefa abre painel lateral;
- o painel lateral abre em leitura primeiro;
- clicar em editar muda o mesmo painel para modo edição;
- ação principal visível na lista: iniciar/retomar tempo;
- botão de iniciar/retomar sempre visível na extrema direita;
- concluir tarefa pode acontecer direto da lista;
- concluir tarefa significa mudar o status da tarefa, não encerrar o conceito de trabalho acumulado;
- tarefa pode ter múltiplas sessões de tempo antes de ser concluída;
- tarefa pode estar compartilhada com múltiplas pessoas;
- tarefas compartilhadas aparecem normalmente na lista de quem recebeu;
- compartilhamento não cria seção separada;
- tarefa compartilhada recebe apenas um indicador discreto de colaboração.

### 3.5 Visibilidade por usuário

- usuário comum vê apenas:
  - tarefas que criou;
  - tarefas compartilhadas com ele.
- administrador tem visão global.
- iniciar timer não adiciona automaticamente a pessoa à tarefa;
- para iniciar timer, a pessoa já precisa estar vinculada.

### 3.6 Pessoas na tarefa

- “Criado por” existe como metadado histórico;
- “Responsáveis” é a lista operacional de pessoas ligadas à tarefa;
- não existe distinção prática entre responsável e colaborador;
- todos os vinculados têm a mesma autoridade operacional;
- administrador tem poder ampliado por visão global, não por papel diferente dentro da tarefa.

### 3.7 Status da tarefa

Os status oficiais da tarefa são:

- A fazer
- Em andamento
- Em espera
- Concluída

Regras:

- status deve aparecer como **texto + cor**;
- “Em espera” precisa estar vinculado a observação contextual visível no painel lateral;
- na lista, “Em espera” mostra indicador de bloqueio, não o texto completo da observação;
- a observação completa fica no painel lateral.

### 3.8 Tempo e cronômetro

- uma tarefa pode ter timers ativos de múltiplos usuários diferentes;
- um usuário só pode ter um timer ativo por vez;
- ao tentar iniciar outro timer, o sistema pede confirmação explícita;
- tarefa com timer ativo deve ter destaque forte;
- além do destaque na lista, deve existir elemento global fixo visível no topo em qualquer página;
- parar timer abre fluxo leve de ajuste/observação;
- o bloco de tempo no painel lateral da tarefa deve mostrar, nesta ordem:
  1. quem está com timer ativo agora;
  2. sessões recentes;
  3. total acumulado da tarefa.

### 3.9 Projeto e Grupo

Projeto e Grupo devem ter arquitetura semelhante, mudando apenas a escala.

**Projeto**:
- resumo curto no topo;
- seção recolhível de registros;
- lista compacta de tarefas;
- ação principal: Nova tarefa.

**Grupo**:
- resumo agregado curto no topo;
- seção recolhível de registros;
- lista compacta de projetos;
- ação principal: Novo projeto.

Regra da seção de registros:
- fica recolhível;
- abre sozinha apenas quando houver pendências abertas;
- caso contrário, começa fechada.

### 3.10 Navegação

Ordem da navegação principal:
- Tarefas
- Projetos
- Grupos
- Administração

Regras:
- sidebar simples;
- destaque apenas da página atual;
- sem mini-dashboard na navegação.

---

## 4. Princípios obrigatórios de design

### 4.1 A identidade visual existente deve ser preservada

A identidade visual do Telier já está definida e deve ser reaproveitada. O rebuild não é autorização para reinventar o visual do produto.

Manter:
- caráter institucional;
- sobriedade;
- neutralidade de superfície;
- linguagem técnica;
- clareza funcional.

Não introduzir:
- estética SaaS genérica;
- gradientes decorativos;
- glassmorphism;
- blur forte;
- elementos “glossy”;
- excesso de animação;
- sombras macias dominantes;
- paleta colorida demais;
- design “dribbblizado”.

### 4.2 Uso de cor

Cor deve ser reforçada sem trair a identidade existente.

Regra:
- superfícies continuam predominantemente neutras;
- cor entra com mais força em **estados** e **ações**;
- estados têm prioridade sobre superfícies inteiras no uso de cor;
- cor não serve para decoração, serve para orientação.

Aplicações corretas de cor:
- status da tarefa;
- prioridade;
- alerta de atraso;
- pendência aberta;
- timer ativo;
- feedback de ação;
- seleção e foco;
- item ativo na navegação.

Aplicações incorretas de cor:
- transformar cards inteiros em blocos saturados;
- pintar páginas inteiras;
- usar fundos muito fortes em toda superfície;
- confundir prioridade, status e facilidade com o mesmo tratamento cromático.

### 4.3 Tipografia e densidade

A UI deve ser legível, compacta e madura.

- texto principal claro e estável;
- números, tempo e dados técnicos podem manter linguagem mais técnica;
- cabeçalhos não devem ser grandes demais;
- listas devem privilegiar escaneabilidade;
- cards compactos devem parecer institucionais, não “cards de app moderno” excessivamente soltos.

---

## 5. Regras obrigatórias de implementação

Essas regras existem para evitar que a execução “ande pela metade”.

### 5.1 Proibições absolutas

A IA executora não pode:

- usar estilo inline na nova UI;
- duplicar visualmente os mesmos padrões em componentes diferentes;
- inventar uma segunda linguagem visual;
- misturar componentes da UI antiga com a nova em produção da mesma tela;
- fazer mudanças grandes no backend sem necessidade comprovada;
- alterar contratos backend sem antes mapear impacto;
- criar componente sem antes verificar se já existe primitive equivalente;
- deixar “TODO”, “placeholder”, “stub” ou comportamento falso em fluxos principais;
- manter `catch(() => [])`, `catch(() => null)` ou equivalente em fluxos que deveriam ter erro visível;
- usar bibliotecas pesadas sem necessidade;
- usar modais em cascata quando o fluxo pede drawer;
- criar telas com estrutura diferente da definida neste documento.

### 5.2 Regras de qualidade estrutural

Toda feature nova do frontend deve:

- sair de um domínio claro (`features/tasks`, `features/projects`, etc.);
- usar camada de dados separada;
- usar contrato interno já normalizado;
- usar primitives visuais compartilhados;
- tratar loading, error e empty state;
- usar semântica de componente previsível;
- evitar funções gigantes com renderização, regra de negócio e dados misturados.

### 5.3 Estado global

Só pode existir estado global para o que realmente é transversal:
- sessão do usuário;
- timer global ativo;
- preferências mínimas de visualização, se necessário.

Todo o resto deve ficar local ao domínio ou sob cache de query.

### 5.4 Performance

A nova UI precisa ser naturalmente mais rápida e previsível do que a antiga.

Obrigatório:
- listas com renderização estável;
- evitar re-render desnecessário;
- não recalcular estruturas pesadas em toda renderização;
- não refazer fetch sem necessidade;
- skeletons estáveis durante carregamento;
- evitar layout shift grosseiro.

---

## 6. Arquitetura técnica recomendada

### 6.1 Stack

Usar:
- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Zustand somente se necessário para estado global mínimo
- Tailwind + tokens CSS **ou** CSS Modules + tokens CSS

Recomendação preferencial para IA executora:
- **Tailwind + tokens CSS**, por previsibilidade e menor risco de CSS caótico.

Não usar:
- Next.js
- Redux
- arquitetura excessivamente abstrata
- component libraries genéricas pesadas como base visual

### 6.2 Estrutura de diretórios alvo

```text
frontend-v2/
  src/
    app/
      router.tsx
      providers.tsx
      layout/
        AppShell.tsx
        Sidebar.tsx
        Topbar.tsx
        GlobalTimerBar.tsx
    design/
      tokens.css
      primitives/
        Button.tsx
        IconButton.tsx
        Input.tsx
        Select.tsx
        SearchField.tsx
        Badge.tsx
        StatusTag.tsx
        PriorityTag.tsx
        EaseTag.tsx
        Panel.tsx
        SectionHeader.tsx
        EmptyState.tsx
        Skeleton.tsx
        Drawer.tsx
        AvatarStack.tsx
        TimerPill.tsx
        CollapsibleSection.tsx
    features/
      tasks/
        api.ts
        queries.ts
        types.ts
        adapters.ts
        components/
        pages/
        panels/
      projects/
        api.ts
        queries.ts
        types.ts
        adapters.ts
        components/
        pages/
      groups/
        api.ts
        queries.ts
        types.ts
        adapters.ts
        components/
        pages/
      records/
        api.ts
        queries.ts
        types.ts
        adapters.ts
        components/
      admin/
        api.ts
        queries.ts
        types.ts
        adapters.ts
        components/
        pages/
    lib/
      http.ts
      dates.ts
      format.ts
      guards.ts
      enums.ts
    routes/
      TasksPage.tsx
      TaskRoute.tsx
      ProjectsPage.tsx
      ProjectPage.tsx
      GroupsPage.tsx
      GroupPage.tsx
      AdminPage.tsx
```

### 6.3 Contrato interno de dados

A nova UI não deve refletir confusões de nomenclatura da base antiga.

Obrigatório normalizar:
- `complexidade` -> `facilidade` na interface;
- `criadoPor` separado de `responsaveis`;
- aliases legados tratados em adaptadores;
- status, prioridade e facilidade com enums internos claros;
- contratos de tempo desacoplados da forma antiga quando necessário.

---

## 7. Fase 0 — Congelamento e preparação

### 7.1 Objetivo

Congelar a base antiga como referência funcional e preparar o terreno para a nova aplicação.

### 7.2 Escopo obrigatório

- criar uma pasta/app nova para o frontend rebuild;
- documentar rotas atuais usadas pela UI antiga;
- documentar endpoints efetivamente usados;
- consolidar decisões de produto já fechadas;
- impedir entrada de novas features na UI antiga, exceto correções críticas.

### 7.3 Entregáveis obrigatórios

Criar:
- `docs/rebuild/architecture.md`
- `docs/rebuild/routes-and-contracts.md`
- `docs/rebuild/ui-decisions.md`
- base nova `frontend-v2/` ou equivalente

### 7.4 Critérios de aceite

A fase só termina quando:
- a nova app existe e compila;
- as decisões deste documento estão salvas em arquivo dentro do repositório;
- rotas e endpoints principais estão mapeados;
- a UI antiga está congelada para novas features.

### 7.5 Proibição específica

Não começar a desenhar telas reais antes de concluir essa fase.

---

## 8. Fase 1 — Fundação visual e técnica

### 8.1 Objetivo

Criar o alicerce correto do novo frontend antes de qualquer tela completa.

### 8.2 Escopo obrigatório

Implementar:
- boot da nova app;
- providers globais;
- router;
- AppShell;
- Sidebar;
- Topbar mínima;
- GlobalTimerBar placeholder real;
- tokens visuais;
- primitives base;
- sistema global de loading, error e empty state.

### 8.3 Primitives obrigatórios

Todos estes componentes devem existir antes de telas completas:
- Button
- IconButton
- Input
- Select
- SearchField
- Badge
- StatusTag
- PriorityTag
- EaseTag
- Panel
- SectionHeader
- EmptyState
- Skeleton
- Drawer
- AvatarStack
- TimerPill
- CollapsibleSection

### 8.4 Critérios de aceite

A fase só termina quando:
- nenhuma tela nova usa estilo inline;
- AppShell funciona em todas as rotas placeholder;
- timer global aparece fixo no topo;
- sidebar tem ordem correta das áreas;
- item ativo da navegação fica claro;
- componentes base refletem a identidade visual atual do Telier;
- erro não é silenciado.

### 8.5 Proibição específica

Não improvisar componente visual específico de tela se ele pode ser construído combinando primitives.

---

## 9. Fase 2 — Camada de dados e normalização

### 9.1 Objetivo

Estabilizar a comunicação com backend e criar contratos internos coerentes.

### 9.2 Escopo obrigatório

Implementar:
- `lib/http.ts`;
- queries por domínio;
- adapters por domínio;
- enums internos;
- tratamento consistente de loading/error/success;
- invalidação de cache nos fluxos principais.

### 9.3 Regras obrigatórias

- a UI nunca deve consumir diretamente payload cru do backend sem adaptação;
- nomes legados devem ser escondidos atrás de adapters;
- enums devem ser centralizados;
- toda mutation relevante deve atualizar cache ou invalidar queries corretamente.

### 9.4 Critérios de aceite

A fase só termina quando:
- Tasks, Projects, Groups e Records têm camada `api.ts`, `queries.ts` e `adapters.ts`;
- contratos internos estão tipados;
- a UI consegue renderizar placeholders conectados a dados reais sem acoplamento bruto.

---

## 10. Fase 3 — Tela principal de Tarefas

### 10.1 Objetivo

Reconstruir o coração operacional do produto.

### 10.2 Estrutura obrigatória da página

A página deve conter, nesta ordem lógica:

1. GlobalTimerBar no topo global do shell;
2. cabeçalho de Tarefas enxuto;
3. criação rápida discreta acima da lista;
4. busca;
5. filtros essenciais:
   - Projeto
   - Prioridade
   - Facilidade
6. alternância de visualização:
   - padrão por blocos
   - agrupar por projeto
7. lista principal.

### 10.3 Regra da criação rápida

Na tela principal de Tarefas:
- a criação rápida deve ficar acima da lista principal;
- não deve roubar o protagonismo visual do topo;
- campos mínimos obrigatórios:
  - Título
  - Projeto
- não adicionar outros campos obrigatórios nessa etapa.

### 10.4 Estrutura padrão da lista

A visualização padrão deve ter exatamente estes blocos, nesta ordem:
1. Em andamento
2. Em espera
3. A fazer
4. Concluídas

Regras:
- bloco vazio não aparece;
- todos os blocos podem ser recolhidos;
- Concluídas fica sempre no fim;
- agrupamento por projeto existe como modo alternativo, não padrão;
- no modo agrupado, Concluídas continua separada no fim.

### 10.5 Estrutura de cada linha de tarefa

Cada item da lista deve mostrar, sem abrir drawer:
- título;
- prazo em data exata curta;
- prioridade textual;
- facilidade textual;
- projeto;
- responsáveis em avatares/iniciais;
- indicador discreto de compartilhamento quando houver múltiplas pessoas;
- botão de iniciar/retomar tempo sempre visível na extrema direita;
- ação de concluir acessível diretamente na linha.

### 10.6 Comportamentos obrigatórios

- clicar no corpo da tarefa abre o drawer;
- iniciar/retomar tempo funciona direto da linha;
- concluir funciona direto da linha;
- tarefa com timer ativo recebe destaque forte;
- tarefa com timer ativo também aparece na barra global de tempo;
- usuário comum vê apenas tarefas próprias ou compartilhadas;
- administrador tem visão global.

### 10.7 Regra do bloco “Em espera”

Para tarefas em espera:
- status visível como texto + cor;
- indicador de observação de bloqueio visível na linha;
- observação completa só no drawer;
- não exibir texto longo do motivo na linha.

### 10.8 Critérios de aceite

A fase só termina quando:
- a página de Tarefas pode substituir a antiga em uso diário básico;
- iniciar timer, parar timer, concluir tarefa e abrir drawer funcionam sem reload bruto;
- filtros funcionam;
- criação rápida funciona;
- agrupamento por projeto funciona;
- não há inline style;
- não há stubs em fluxos principais.

### 10.9 Proibição específica

Não transformar a tela de Tarefas em dashboard com blocos de métricas pesadas.

---

## 11. Fase 4 — Drawer da tarefa

### 11.1 Objetivo

Construir o painel lateral da tarefa como centro de leitura, edição e tempo.

### 11.2 Estrutura obrigatória do drawer

O drawer deve conter, nesta ordem:
1. cabeçalho da tarefa;
2. metadados principais;
3. pessoas ligadas à tarefa;
4. bloco de tempo;
5. observação de espera, se houver;
6. ações.

### 11.3 Regras de modo

- drawer abre em leitura;
- botão “Editar” ativa modo edição no mesmo drawer;
- não abrir modal adicional para editar;
- layout deve permanecer estável entre leitura e edição.

### 11.4 Campos obrigatórios em leitura/edição

Deve ser possível visualizar e editar, no mínimo:
- título;
- projeto;
- status;
- prioridade;
- facilidade;
- responsáveis;
- criado por;
- observação de espera;
- conclusão;
- informações principais da tarefa.

### 11.5 Bloco de tempo obrigatório

Ordem exata:
1. quem está com timer ativo agora;
2. sessões recentes;
3. total acumulado da tarefa.

Regras:
- mostrar claramente múltiplos timers ativos de colaboradores diferentes na mesma tarefa;
- mostrar histórico recente legível;
- exibir total acumulado sem exagero visual.

### 11.6 Regras de tempo

- um usuário só pode ter um timer ativo por vez;
- ao tentar iniciar outro, abrir confirmação explícita;
- parar timer abre fluxo leve de ajuste/observação;
- esse fluxo não pode travar o usuário com formulário pesado.

### 11.7 Critérios de aceite

A fase só termina quando:
- o drawer está operacional para uso real;
- leitura e edição funcionam no mesmo lugar;
- tempo ativo, tempo recente e total acumulado estão claros;
- observação de espera fica bem localizada;
- não há comportamento de fake modal ou placeholder.

---

## 12. Fase 5 — Página de Projeto

### 12.1 Objetivo

Implementar Projeto como contêiner de tarefas + registros.

### 12.2 Estrutura obrigatória

A página do projeto deve conter:
- resumo curto no topo;
- ação principal: **Nova tarefa**;
- seção recolhível de registros;
- lista compacta de tarefas abaixo.

### 12.3 Resumo curto obrigatório

O topo deve mostrar apenas o essencial operacional:
- nome do projeto;
- grupo;
- fase;
- status;
- prazo;
- progresso simples.

Não incluir:
- dashboard pesado;
- múltiplos KPIs decorativos;
- painéis redundantes com informações já visíveis em outras áreas.

### 12.4 Registros do projeto

Regras:
- lista única;
- tipos: Decisão, Pendência, Observação;
- pendências abertas primeiro;
- concluídas no fim;
- seção recolhível;
- começa aberta só quando houver pendências abertas;
- cada registro pode virar tarefa por ação direta.

### 12.5 Lista de tarefas do projeto

Regras:
- mesma gramática de comportamento da tela principal de Tarefas;
- densidade um pouco mais compacta;
- drawer da tarefa é o mesmo da Fase 4;
- criação rápida de tarefa nessa página deve ter projeto travado.

### 12.6 Critérios de aceite

A fase só termina quando:
- Projeto funciona como agrupamento claro de tarefas;
- registros e tarefas convivem sem ruído excessivo;
- nova tarefa nasce já dentro do projeto;
- a página parece parte da mesma família visual de Grupo.

---

## 13. Fase 6 — Página de Grupo

### 13.1 Objetivo

Implementar Grupo como contêiner de projetos + registros + resumo agregado.

### 13.2 Estrutura obrigatória

A página do grupo deve conter:
- resumo agregado curto no topo;
- ação principal: **Novo projeto**;
- seção recolhível de registros;
- lista compacta de projetos.

### 13.3 Resumo agregado obrigatório

Mostrar apenas:
- nome do grupo;
- status;
- quantidade de projetos;
- leitura agregada simples do andamento;
- possível indicador de prazo mais crítico, se existir.

### 13.4 Registros do grupo

Mesmas regras do projeto:
- Decisão, Pendência, Observação;
- pendências abertas primeiro;
- concluídas no fim;
- seção recolhível;
- abre automaticamente apenas quando houver pendências abertas.

### 13.5 Lista de projetos

Regras:
- cards compactos;
- linguagem visual paralela à lista de tarefas em outra escala;
- leitura rápida;
- clique leva para a página completa do projeto;
- ação de novo projeto nessa página já nasce com grupo travado.

### 13.6 Critérios de aceite

A fase só termina quando:
- Grupo e Projeto parecem a mesma arquitetura em escalas diferentes;
- a leitura agregada do grupo é imediata;
- a lista de projetos é escaneável;
- o fluxo de novo projeto contextualizado funciona.

---

## 14. Fase 7 — Tela de Projetos

### 14.1 Objetivo

Implementar a área de consulta/localização de projetos.

### 14.2 Estrutura obrigatória

A tela de Projetos deve conter:
- cabeçalho enxuto;
- botão **Novo projeto**;
- busca forte e visível;
- filtros essenciais:
  - Grupo
  - Status
  - Fase
- lista de projetos em cards compactos.

### 14.3 Regras obrigatórias

Projetos não é home operacional. Portanto, não incluir:
- painel “Hoje”;
- duplicação da lógica de Tarefas;
- widgets decorativos;
- dashboard pesado;
- blocos de execução diária.

### 14.4 Critérios de aceite

A fase só termina quando:
- encontrar um projeto é rápido;
- abrir um projeto é direto;
- a tela não compete com Tarefas;
- a UI está mais limpa do que a base atual.

---

## 15. Fase 8 — Tela de Grupos

### 15.1 Objetivo

Implementar a área de consulta/localização de grupos.

### 15.2 Estrutura obrigatória

A tela de Grupos deve conter:
- cabeçalho enxuto;
- botão **Novo grupo**;
- busca;
- filtro por status;
- lista de grupos.

### 15.3 Regras obrigatórias

Grupos deve priorizar encontrar rapidamente, não comparar por métricas densas.

### 15.4 Critérios de aceite

A fase só termina quando:
- a busca é clara;
- o filtro por status funciona;
- abrir grupo é direto;
- a tela se mantém leve.

---

## 16. Fase 9 — Administração

### 16.1 Objetivo

Isolar capacidades administrativas sem contaminar a experiência do usuário comum.

### 16.2 Regras obrigatórias

- Administração só aparece para admin;
- admin tem visão global de tarefas, projetos e grupos;
- admin pode usar filtros por pessoa;
- admin pode editar tudo;
- recursos administrativos não aparecem para usuários comuns.

### 16.3 Escopo mínimo

- visão global de tarefas;
- filtros ampliados;
- acesso a entidades de todos os usuários;
- gestão básica de pessoas, se já existir no backend.

### 16.4 Critérios de aceite

A fase só termina quando:
- o admin não precisa mais da UI antiga para operar o básico;
- usuários comuns não veem controles administrativos.

---

## 17. Fase 10 — Formulários estruturados e fluxos completos

### 17.1 Objetivo

Fechar a experiência de criação/edição com consistência.

### 17.2 Formulários obrigatórios

Implementar:
- Novo grupo
- Novo projeto
- Nova tarefa
- Novo registro
- Edição de grupo
- Edição de projeto

### 17.3 Regras obrigatórias

- criação rápida existe apenas para tarefa;
- grupo e projeto usam formulário estruturado;
- o formulário de projeto é o mesmo tanto na tela de Projetos quanto na página de Grupo;
- quando o contexto existir, grupo ou projeto vem travado corretamente.

### 17.4 Critérios de aceite

A fase só termina quando:
- todos os formulários estão visualmente consistentes;
- não há duplicação desnecessária de fluxo;
- não há formulário improvisado diferente por contexto.

---

## 18. Fase 11 — Migração, flag e remoção do legado

### 18.1 Objetivo

Trocar o frontend antigo pelo novo com segurança.

### 18.2 Estratégia obrigatória

1. liberar a nova UI atrás de flag;
2. testar uso real;
3. corrigir lacunas;
4. cortar rotas antigas;
5. remover código morto.

### 18.3 Checklist de paridade mínima

Não desligar a UI antiga antes de confirmar:
- login
- navegação principal
- timer global
- iniciar sessão
- parar sessão
- abrir drawer da tarefa
- editar tarefa
- concluir tarefa
- criação rápida de tarefa
- abrir projeto
- criar projeto
- abrir grupo
- criar grupo
- usar registros em projeto
- usar registros em grupo
- visão admin mínima

### 18.4 Critério final de remoção do legado

Só remover a UI antiga quando:
- nenhuma ação crítica depender dela;
- não existirem regressões críticas abertas;
- a nova UI estiver validada em uso real.

---

## 19. Sequência obrigatória de PRs

Executar nesta ordem, salvo motivo técnico fortíssimo documentado:

1. `rebuild: bootstrap app shell and design primitives`
2. `rebuild: data layer adapters and query structure`
3. `rebuild: tasks page core layout and interactions`
4. `rebuild: task drawer time flows and editing`
5. `rebuild: project page structure and records`
6. `rebuild: group page structure and records`
7. `rebuild: projects index page`
8. `rebuild: groups index page`
9. `rebuild: admin minimum global view`
10. `rebuild: structured forms and creation flows`
11. `rebuild: migration flag parity and legacy removal`

Nenhum PR pode pular a ordem e atacar uma tela mais alta sem que a fundação e Tarefas estejam operacionais.

---

## 20. Checklist de revisão para cada PR

Todo PR deve ser revisado contra este checklist:

### 20.1 Produto
- a tela respeita a função que foi definida para ela?
- existe alguma duplicidade de função com outra área?
- há dashboard desnecessário?
- alguma decisão deste documento foi violada?

### 20.2 Visual
- a identidade atual foi respeitada?
- há uso excessivo de cor?
- há falta de cor funcional em estados importantes?
- existem padrões visuais duplicados sem necessidade?

### 20.3 Código
- há inline style?
- há lógica de negócio misturada com renderização demais?
- há estado duplicado?
- há adapters claros para o backend?
- existem placeholders ou stubs em fluxos reais?

### 20.4 UX
- a ação principal está óbvia?
- o fluxo ficou mais simples do que antes?
- existe ambiguidade de clique?
- o usuário comum consegue entender a tela sem treinamento técnico?

### 20.5 Confiabilidade
- erro aparece para o usuário?
- loading está claro?
- empty state está tratado?
- há risco de quebra silenciosa?

---

## 21. Instruções finais para qualquer IA executora

A IA executora deve assumir que o principal risco deste projeto é **fazer uma implementação parcial, visualmente aceitável e estruturalmente errada**. Portanto:

- não entregar metade da fase como se estivesse concluída;
- não mascarar ausência de comportamento real com UI bonita;
- não usar placeholders em fluxos centrais;
- não inventar atalhos fora deste plano;
- não simplificar a arquitetura de Projeto, Grupo ou Tarefa;
- não tentar “melhorar” o design inventando uma nova linguagem visual;
- não transformar Tarefas em dashboard;
- não transformar Projetos em segunda home;
- não tratar Grupo como simples filtro;
- não tratar “Em espera” como status visual vazio;
- não confundir responsável, criado por e pessoas vinculadas;
- não quebrar a regra do timer global e do timer único por usuário.

Se houver conflito entre conveniência de implementação e este documento, **vence este documento**.

Se algo parecer ambíguo, a IA deve optar pela solução que:
1. preserve a simplicidade operacional;
2. preserve a arquitetura por escalas;
3. preserve a identidade visual existente;
4. evite improvisação estrutural.

---

## 22. Resultado esperado

Ao final do rebuild, o Telier deve deixar de parecer uma coleção de telas evoluídas separadamente e passar a funcionar como um sistema coerente, com:

- uma tela principal de Tarefas realmente operacional;
- Projeto e Grupo como contêineres consistentes em escalas diferentes;
- timer global claro e confiável;
- melhor performance percebida;
- menos bugs decorrentes de acoplamento visual e comportamental;
- base mais previsível para futuras evoluções com IA.

Esse é o alvo. Qualquer implementação que não aproxime o sistema claramente desse resultado deve ser considerada insuficiente.

