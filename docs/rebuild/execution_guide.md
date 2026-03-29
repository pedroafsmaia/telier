# Telier — Guia Formal de Execução do Rebuild (Versão Final: Windsurf Pro + Codex)

## 1. Finalidade deste documento

Este documento formaliza a execução completa do rebuild do frontend do Telier usando:

- **Windsurf Pro** como executor principal;
- **Codex** como revisor obrigatório de cada fase.

Este guia define:

1. a estratégia correta de execução;
2. o passo a passo formal do rebuild;
3. qual motor usar no Windsurf em cada tipo de fase;
4. a ordem oficial dos prompts;
5. os prompts completos de implementação, autoauditoria, revisão e correção;
6. o conteúdo do arquivo `AGENTS.md` que deve ficar na raiz do repositório.

Este documento deve ser seguido literalmente. Ele não é um guia genérico. Ele é o procedimento operacional oficial para executar o rebuild sem deixar espaço para implementação pela metade.

---

# 2. Estratégia oficial de execução

## 2.1 Ferramentas e papéis

### Windsurf Pro
Papel oficial:
- ler o repositório;
- ler o plano operacional do rebuild;
- implementar cada fase;
- alterar/criar arquivos;
- rodar comandos;
- entregar relatório de aderência;
- executar autoauditoria antes da revisão externa.

### Codex
Papel oficial:
- revisar o trabalho feito no Windsurf;
- comparar o resultado com o plano operacional e com o `AGENTS.md`;
- apontar falhas concretas;
- dizer explicitamente se a fase está aprovada ou não;
- listar as correções mínimas necessárias.

## 2.2 Regra principal

**Windsurf implementa. Codex revisa. Windsurf corrige.**

Nunca fazer:
- Windsurf e Codex implementando a mesma fase ao mesmo tempo;
- Codex “completando” a fase em vez de revisar;
- pular revisão porque a interface “parece pronta”.

## 2.3 Fluxo obrigatório de cada fase

Toda fase deve seguir exatamente esta sequência:

1. enviar prompt de implementação ao Windsurf;
2. ao finalizar, enviar prompt de autoauditoria ao Windsurf;
3. depois enviar prompt de revisão ao Codex;
4. se o Codex reprovar ou apontar desvios, enviar prompt de correção ao Windsurf;
5. só então passar à próxima fase.

## 2.4 Regra de tamanho de escopo

Nunca juntar duas fases no mesmo prompt.

Cada prompt deve atacar somente uma fase fechada.

---

# 3. Motores do Windsurf — estratégia oficial

## 3.1 Regra geral

No Windsurf Pro, use:

- **o modelo premium mais forte disponível no Cascade** para implementar a primeira versão de cada fase importante;
- **SWE-1.5** para inspeção rápida, follow-ups, pequenas correções, limpeza, wiring e ajustes localizados;
- **Arena** apenas em fases críticas e só se houver dúvida real entre duas abordagens.

## 3.2 Regra prática de seleção de motor

### Use o modelo premium mais forte disponível no Cascade para:
- Fase 0 (mapeamento e preparação, se o repositório estiver confuso)
- Fase 1
- Fase 2
- Fase 3
- Fase 4
- Fase 5
- Fase 6
- Fase 10
- Fase 11

Essas fases exigem mais raciocínio estrutural e têm maior risco de implementação incompleta.

### Use SWE-1.5 para:
- exploração rápida do repositório;
- leitura localizada de arquivos;
- follow-ups curtos;
- pequenas correções pós-review;
- ajustes de styling já definidos;
- limpeza e consistência;
- Fases 7, 8 e parte da 9, se o escopo estiver bem fechado.

### Use Arena apenas se:
- a Fase 3 ou 4 parecer ter duas soluções arquiteturais muito diferentes;
- você quiser comparar duas abordagens antes de consolidar uma;
- você estiver disposto a ainda revisar o resultado com Codex depois.

## 3.3 Regra de segurança

Se houver dúvida sobre qual motor usar, use esta regra:

- **primeira execução da fase** = modelo premium mais forte;
- **ajustes menores depois** = SWE-1.5.

---

# 4. Arquivos obrigatórios no repositório

## 4.1 Arquivo obrigatório na raiz

Criar na raiz do repositório:

```text
AGENTS.md
```

## 4.2 Arquivo obrigatório do plano operacional

Manter no repositório:

```text
docs/rebuild/operational-masterplan.md
```

## 4.3 Função desses arquivos

`AGENTS.md` define as regras operacionais permanentes para qualquer agente.

`docs/rebuild/operational-masterplan.md` é a fonte de verdade do rebuild em nível de arquitetura, fases, critérios e proibições.

---

# 5. Conteúdo oficial do `AGENTS.md`

Copiar exatamente o conteúdo abaixo para a raiz do repositório.

```md
# AGENTS.md — Regras operacionais do rebuild do frontend do Telier

## Objetivo

Este repositório está passando por um rebuild controlado do frontend do Telier.

A meta não é aplicar remendos na interface antiga. A meta é reconstruir o frontend com arquitetura correta, preservando o backend e reaproveitando a identidade visual existente.

## Fonte de verdade

Toda implementação deve seguir rigorosamente:
- o documento operacional de rebuild do frontend;
- as decisões já fechadas de produto e UX;
- a arquitetura por fases definida para o rebuild.

Se houver conflito entre conveniência de implementação e o plano operacional, vence o plano operacional.

## Estratégia obrigatória

- manter backend, autenticação e contratos existentes sempre que possível;
- reconstruir o frontend em base nova, separada da UI legada;
- migrar por fases;
- remover o legado apenas quando houver paridade mínima comprovada.

## Papéis das áreas do produto

- **Tarefas** é a tela principal do sistema e o centro operacional do produto.
- **Projeto** é um agrupamento de tarefas + registros do projeto.
- **Grupo** é um agrupamento de projetos + registros do grupo + resumo agregado.
- **Administração** só aparece para administradores.

## Decisões obrigatórias de produto

### Tela principal
- o sistema abre em **Tarefas**;
- Tarefas não é dashboard pesado;
- topo essencial;
- criação rápida discreta acima da lista;
- filtros essenciais: Projeto, Prioridade e Facilidade.

### Blocos da tela de Tarefas
Ordem obrigatória:
1. Em andamento
2. Em espera
3. A fazer
4. Concluídas

Regras:
- blocos vazios não aparecem;
- todos os blocos podem ser recolhidos;
- existe modo alternativo “Agrupar por projeto”;
- mesmo nesse modo, concluídas continuam separadas no fim.

### Linha da tarefa
Cada linha deve mostrar:
- título;
- prazo em data exata curta;
- prioridade textual;
- facilidade textual;
- projeto;
- responsáveis como avatares/iniciais;
- indicador discreto de compartilhamento quando aplicável;
- botão iniciar/retomar sempre visível na extrema direita;
- ação de concluir diretamente na linha.

### Ações e abertura da tarefa
- clicar no corpo da tarefa abre drawer lateral;
- o drawer abre em leitura primeiro;
- clicar em editar muda o mesmo drawer para modo edição;
- não usar modal adicional para edição da tarefa.

### Status da tarefa
Status oficiais:
- A fazer
- Em andamento
- Em espera
- Concluída

Regras:
- status aparece como texto + cor;
- “Em espera” exige ou destaca observação contextual;
- na lista, a observação completa não aparece, apenas indicador;
- a observação completa fica no drawer.

### Tempo e cronômetro
- um usuário só pode ter um timer ativo por vez;
- uma tarefa pode ter timers ativos de múltiplos usuários diferentes;
- ao tentar iniciar outro timer, abrir confirmação explícita;
- parar timer abre fluxo leve de ajuste/observação;
- timer ativo tem destaque forte na lista;
- timer ativo também fica visível em barra global no topo em qualquer página.

### Pessoas na tarefa
- “Criado por” existe como metadado histórico;
- “Responsáveis” é a lista operacional de pessoas ligadas à tarefa;
- não existe distinção prática entre responsável e colaborador;
- pessoas vinculadas têm a mesma autoridade operacional;
- admin tem poder ampliado por visão global.

### Visibilidade por usuário
- usuário comum vê apenas tarefas que criou ou que foram compartilhadas com ele;
- administrador tem visão global.

### Projeto e Grupo
Projeto e Grupo devem seguir a mesma arquitetura, mudando apenas a escala.

**Projeto**:
- resumo curto no topo;
- ação principal: Nova tarefa;
- seção recolhível de registros;
- lista compacta de tarefas.

**Grupo**:
- resumo agregado curto no topo;
- ação principal: Novo projeto;
- seção recolhível de registros;
- lista compacta de projetos.

### Registros
Tipos oficiais:
- Decisão
- Pendência
- Observação

Regras:
- lista única com tipo visível;
- pendências abertas primeiro;
- concluídas no fim;
- seção recolhível;
- abre automaticamente apenas quando houver pendências abertas;
- registro pode virar tarefa por ação direta.

## Regras obrigatórias de design

### Identidade visual
Preservar a identidade visual existente do Telier.

Manter:
- linguagem institucional;
- sobriedade;
- superfícies neutras;
- clareza técnica;
- densidade controlada.

Não introduzir:
- estética SaaS genérica;
- gradientes decorativos;
- glassmorphism;
- blur dominante;
- excesso de sombras suaves;
- visual “moderno” alheio à linguagem atual do produto.

### Uso de cor
Reforçar cor de forma funcional.

Regras:
- superfícies continuam majoritariamente neutras;
- cor entra com mais força em estados e ações;
- estados têm prioridade sobre superfícies inteiras no uso de cor;
- cor não é decoração.

Aplicar cor principalmente em:
- status;
- prioridade;
- alerta de atraso;
- pendências;
- timer ativo;
- foco, seleção e feedback.

## Regras obrigatórias de implementação

### Proibições absolutas
Não fazer:
- inline style na nova UI;
- placeholders, stubs ou comportamento falso em fluxos centrais;
- mistura de componentes novos e antigos dentro da mesma tela nova;
- redesign autoral fora da identidade existente;
- mudanças desnecessárias no backend;
- contratos novos sem necessidade comprovada;
- telas fora da arquitetura definida.

### Regras de código
Toda feature nova deve:
- sair de um domínio claro;
- usar camada de dados separada;
- usar adapters para esconder payload cru do backend;
- usar primitives visuais compartilhados;
- tratar loading, error e empty state;
- evitar funções gigantes com regra de negócio e renderização misturadas.

### Estrutura conceitual obrigatória
- Tarefa = centro operacional;
- Projeto = agrupamento de tarefas;
- Grupo = agrupamento de projetos.

### Qualidade mínima
Não considerar qualquer fase concluída se:
- algum fluxo principal estiver pela metade;
- houver comportamento falso;
- houver componente fora do sistema visual;
- houver dependência indevida da UI antiga.

## Resultado esperado

Ao final do rebuild, o Telier deve funcionar como um sistema coeso, com:
- Tarefas realmente operacional;
- Projeto e Grupo como contêineres em escalas diferentes;
- timer global claro e confiável;
- menos bugs e menos lag percebido;
- frontend previsível para evolução futura com IA.
```

---

# 6. Ordem formal de execução do rebuild

Executar exatamente nesta ordem:

1. Fase 0 — Congelamento, mapeamento e preparação
2. Fase 1 — Fundação visual e técnica
3. Fase 2 — Camada de dados, adapters e contratos internos
4. Fase 3 — Tela principal de Tarefas
5. Fase 4 — Drawer da tarefa e fluxos de tempo
6. Fase 5 — Página de Projeto
7. Fase 6 — Página de Grupo
8. Fase 7 — Tela índice de Projetos
9. Fase 8 — Tela índice de Grupos
10. Fase 9 — Administração mínima
11. Fase 10 — Formulários estruturados e fluxos completos
12. Fase 11 — Flag, paridade e corte do legado

Nunca pular revisão. Nunca juntar fases.

---

# 7. Blocos fixos de prompt

## 7.1 Bloco fixo para Windsurf

Colar no início de todo prompt de implementação ou correção no Windsurf:

```text
Você está executando um rebuild controlado do frontend do Telier.

Fonte de verdade:
- siga rigorosamente o documento operacional de rebuild do frontend;
- siga rigorosamente o arquivo AGENTS.md do repositório;
- não improvise;
- não simplifique escopo;
- não marque a fase como concluída se qualquer fluxo principal estiver incompleto;
- preserve a identidade visual existente do Telier;
- não introduza estética SaaS genérica;
- não use estilos inline;
- não use placeholders, stubs ou comportamento falso em fluxos centrais;
- não misture componentes novos com componentes antigos dentro da mesma tela nova;
- não altere o backend sem necessidade explícita e comprovada;
- não altere contratos do backend sem mapear impacto;
- não crie novos padrões visuais se já existir primitive adequada;
- trate erro, loading e empty state de forma explícita;
- prefira implementação explícita, simples e previsível;
- mantenha Tarefas como centro operacional do produto;
- mantenha Projeto e Grupo como a mesma arquitetura em escalas diferentes.

Modo de trabalho obrigatório:
1. primeiro, inspecione os arquivos relevantes da fase;
2. depois, resuma em poucas linhas o plano de ataque;
3. só então implemente;
4. rode validações;
5. entregue relatório final no formato pedido.

Formato obrigatório da resposta final:
1. arquivos criados;
2. arquivos alterados;
3. o que foi implementado;
4. como cada critério de aceite foi atendido;
5. comandos rodados;
6. riscos ou pendências reais, se existirem.
```

## 7.2 Bloco fixo para Codex

Colar no início de todo prompt de revisão no Codex:

```text
Faça uma revisão técnica e de aderência ao plano operacional do rebuild do frontend do Telier.

Seu papel é revisar, não reimplementar.

Regras:
- compare a implementação com o plano operacional da fase;
- compare a implementação com o arquivo AGENTS.md do repositório;
- aponte somente problemas reais, concretos e verificáveis;
- não elogie genericamente;
- não invente escopo novo fora da fase;
- não sugira redesign autoral;
- não considere a fase concluída se houver qualquer fluxo principal incompleto;
- procure especialmente por implementação pela metade, placeholders, inconsistências visuais, violações de arquitetura e acoplamento indevido ao legado.

Entregue a revisão neste formato:
1. veredito geral: APROVADA ou NÃO APROVADA;
2. aderência ao escopo da fase;
3. itens obrigatórios atendidos;
4. desvios concretos;
5. riscos técnicos;
6. correções mínimas necessárias para aprovação.

Se a fase estiver incompleta, diga explicitamente que ela não deve ser considerada concluída.
```

## 7.3 Bloco fixo de autoauditoria para Windsurf

Enviar sempre ao final da implementação de cada fase, antes da revisão no Codex:

```text
Faça uma autoauditoria crítica desta fase.

Quero que você tente provar que a implementação está incompleta.

Entregue:
1. quais partes da fase poderiam ter sido implementadas pela metade;
2. quais arquivos ou fluxos merecem revisão especial;
3. quais critérios de aceite ainda correm risco;
4. qualquer ponto que você considera frágil ou potencialmente inconsistente.
```

---

# 8. Prompts por fase

## Fase 0 — Congelamento, mapeamento e preparação

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções pequenas depois: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 0 — Congelamento, mapeamento e preparação.

Objetivo da fase:
Preparar o rebuild do frontend do Telier sem iniciar implementação visual completa. Esta fase deve congelar a UI antiga como referência funcional, mapear contratos e consolidar as decisões do rebuild no repositório.

Execute exatamente o seguinte:

1. inspecione o repositório atual e localize:
- frontend atual;
- rotas principais;
- endpoints consumidos pela UI;
- documentos existentes de redesign/rebuild;
- qualquer arquivo de instrução já existente para agentes.

2. crie a base documental do rebuild, com arquivos equivalentes a:
- docs/rebuild/architecture.md
- docs/rebuild/routes-and-contracts.md
- docs/rebuild/ui-decisions.md

3. nesses documentos, consolide:
- decisão de rebuild controlado do frontend;
- manutenção do backend atual;
- papel de Tarefas, Projeto, Grupo e Administração;
- regras de timer, registros, status, visibilidade de tarefas e identidade visual;
- mapeamento inicial de rotas e contratos consumidos pela UI.

4. crie a nova base da aplicação frontend separada da UI antiga, em pasta nova apropriada, por exemplo:
- frontend-v2/
ou equivalente coerente com o repositório.

5. não implemente ainda telas completas do produto. Nesta fase, limite-se a:
- bootstrap da nova app;
- estrutura básica de diretórios;
- configuração mínima para a nova aplicação existir e compilar.

6. não altere o backend, exceto se for absolutamente necessário para o bootstrap da nova app. Se não for necessário, não toque no backend.

Critérios de aceite obrigatórios:
- a nova aplicação existe em pasta separada;
- a UI antiga continua intacta como referência funcional;
- os documentos do rebuild foram criados e preenchidos;
- rotas e contratos principais consumidos pela UI foram mapeados;
- ainda não existe implementação adiantada de telas fora do escopo.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 0 — Congelamento, mapeamento e preparação.

Revise se a implementação:
- criou a base documental do rebuild;
- criou a nova aplicação em pasta separada;
- mapeou rotas e contratos principais;
- evitou implementar telas completas antes da hora;
- manteve a UI antiga como referência.

Procure especialmente:
- documentação superficial;
- bootstrap incompleto;
- ausência de mapeamento real dos contratos;
- adiantamento indevido de escopo;
- mistura entre legado e nova base.

Se houver falhas, liste as correções mínimas exatas.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados na revisão do Codex para a Fase 0.

Regras:
- não avance para a Fase 1;
- não expandir escopo;
- corrigir apenas o necessário para que a Fase 0 possa ser considerada concluída;
- atualizar documentação se houver inconsistências.

Depois de corrigir, entregue:
1. problemas corrigidos;
2. arquivos alterados;
3. como cada ponto da revisão foi resolvido;
4. comandos rodados.
```

---

## Fase 1 — Fundação visual e técnica

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- follow-ups menores: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 1 — Fundação visual e técnica.

Objetivo da fase:
Construir a fundação correta da nova UI do Telier, sem ainda implementar as telas de domínio completas.

Implemente exatamente:

1. estrutura base da nova app:
- providers globais;
- router;
- AppShell;
- Sidebar;
- Topbar mínima;
- GlobalTimerBar placeholder real no topo global.

2. ordem correta da navegação:
- Tarefas
- Projetos
- Grupos
- Administração
Administração deve ficar preparada para exibição condicional por permissão.

3. sistema de design base:
- tokens visuais coerentes com a identidade atual do Telier;
- primitives reutilizáveis;
- nenhuma tela nova com estilo inline;
- nada de visual autoral fora da identidade existente.

4. implemente no mínimo estas primitives:
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

5. crie páginas placeholder estruturais para:
- Tarefas
- Projetos
- Grupos
- Administração
Essas páginas podem ser placeholders estruturais, mas devem usar a fundação real e não podem ter comportamento falso em fluxos centrais.

6. implemente tratamento visual base para:
- loading
- error
- empty state

Não fazer nesta fase:
- implementar a tela real de Tarefas;
- implementar drawer real da tarefa;
- implementar páginas completas de Projeto ou Grupo;
- improvisar layout final de domínio.

Critérios de aceite obrigatórios:
- shell funcional;
- navegação funcional;
- timer global visível em qualquer rota da nova app;
- primitives criadas e utilizáveis;
- identidade visual preservada;
- zero inline style na nova base;
- páginas estruturais compilando corretamente.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 1 — Fundação visual e técnica.

Revise se a implementação:
- criou shell funcional;
- implementou navegação na ordem correta;
- criou GlobalTimerBar no topo global;
- criou o conjunto de primitives exigido;
- respeitou a identidade visual existente;
- evitou estilo inline;
- não adiantou escopo de telas de domínio.

Procure especialmente:
- primitives incompletas;
- componentes que parecem específicos demais e não reutilizáveis;
- visual desalinhado com a identidade do Telier;
- placeholders estruturais pobres;
- acoplamento ao legado;
- erros silenciosos ou ausência de tratamento base de loading/error/empty state.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 1.

Regras:
- não avançar para a Fase 2;
- não criar tela de domínio completa;
- consolidar a fundação;
- garantir que todas as primitives obrigatórias estejam realmente prontas para uso.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada ponto do Codex foi resolvido;
4. validações rodadas.
```

---

## Fase 2 — Camada de dados, adapters e contratos internos

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções pontuais: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 2 — Camada de dados, adapters e contratos internos.

Objetivo da fase:
Criar a camada de dados do frontend-v2 de forma previsível, desacoplada e coerente com o backend atual, sem expor confusões de nomenclatura legada na UI nova.

Implemente exatamente:

1. cliente HTTP base da nova app;
2. organização por domínio para:
- tasks
- projects
- groups
- records
- admin (estrutura mínima, se aplicável)

3. para cada domínio principal, crie:
- api.ts
- queries.ts
- adapters.ts
- types.ts

4. normalize os contratos internos para a UI nova:
- “complexidade” deve ser exposta como “facilidade” na interface;
- “criadoPor” deve ficar semanticamente separado de “responsaveis”;
- status, prioridade e facilidade devem usar enums internos claros;
- aliases legados devem ficar escondidos dentro de adapters.

5. implemente política inicial de queries/mutations:
- loading explícito;
- error explícito;
- invalidação ou atualização de cache nas mutations relevantes.

6. crie exemplos mínimos de consumo desses dados em páginas placeholder ou componentes de teste da nova base, apenas para validar a integração, sem ainda construir a tela completa de Tarefas.

Não fazer nesta fase:
- tela final de Tarefas;
- drawer final da tarefa;
- formulários completos.

Critérios de aceite obrigatórios:
- camada de dados existe por domínio;
- UI nova não consome payload cru diretamente;
- nomenclatura interna da nova UI está limpa e coerente;
- adapters escondem confusões do legado;
- a base está pronta para a Fase 3 sem gambiarras.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 2 — Camada de dados, adapters e contratos internos.

Revise se a implementação:
- criou camada de dados por domínio;
- criou api.ts, queries.ts, adapters.ts e types.ts;
- separou corretamente contratos internos do payload cru;
- escondeu aliases legados dentro dos adapters;
- normalizou “complexidade” para “facilidade” na interface;
- separou “criadoPor” de “responsaveis”;
- estruturou loading/error/mutations de forma previsível.

Procure especialmente:
- acoplamento direto da UI ao backend cru;
- adapters superficiais;
- types inconsistentes;
- enums espalhados;
- ausência de política clara de invalidação/atualização.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 2.

Regras:
- não avançar para a Fase 3;
- não implementar ainda a tela final de Tarefas;
- consolidar a camada de dados;
- remover qualquer acoplamento bruto detectado.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 3 — Tela principal de Tarefas

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- se quiser comparar duas abordagens: **Arena opcional**
- correções e follow-ups: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 3 — Tela principal de Tarefas.

Objetivo da fase:
Reconstruir a tela principal operacional do Telier dentro da nova app, com comportamento real, sem dashboard pesado e sem depender da UI antiga.

Implemente exatamente:

1. cabeçalho enxuto de Tarefas;
2. criação rápida discreta acima da lista;
3. busca;
4. filtros essenciais:
- Projeto
- Prioridade
- Facilidade

5. modo padrão de visualização por blocos, nesta ordem:
- Em andamento
- Em espera
- A fazer
- Concluídas

Regras obrigatórias:
- blocos vazios não aparecem;
- todos os blocos podem ser recolhidos;
- concluídas sempre no fim;
- modo alternativo “Agrupar por projeto” deve existir;
- mesmo nesse modo, concluídas continuam separadas no fim.

6. cada linha de tarefa deve mostrar:
- título
- prazo em data exata curta
- prioridade textual
- facilidade textual
- projeto
- responsáveis como avatares/iniciais
- indicador discreto de compartilhamento, quando aplicável
- botão iniciar/retomar sempre visível na extrema direita
- ação de concluir diretamente na linha

7. comportamento obrigatório:
- clicar no corpo da tarefa abre o drawer (mesmo que alguns detalhes do drawer sejam finalizados na Fase 4, a abertura e integração precisam existir);
- iniciar/retomar tempo direto da linha;
- concluir tarefa direto da linha;
- tarefa com timer ativo recebe destaque forte;
- timer ativo também aparece na barra global;
- usuário comum vê apenas tarefas próprias ou compartilhadas;
- administrador tem visão global.

8. regra de “Em espera”:
- status texto + cor;
- indicador de observação de bloqueio;
- não mostrar o texto completo da observação na linha.

9. criação rápida:
- campos mínimos: Título + Projeto;
- acima da lista principal;
- sem virar mini-formulário pesado.

Não fazer:
- transformar Tarefas em dashboard;
- usar métricas decorativas;
- puxar componentes da UI antiga;
- deixar comportamento falso.

Critérios de aceite obrigatórios:
- a nova tela de Tarefas já serve como base real de operação;
- filtros funcionam;
- criação rápida funciona;
- agrupamento por projeto funciona;
- iniciar/retomar, concluir e abrir drawer funcionam;
- zero inline style;
- zero stub em fluxo principal.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 3 — Tela principal de Tarefas.

Revise se a implementação:
- respeita Tarefas como centro operacional;
- evita dashboard pesado;
- implementa os blocos na ordem correta;
- faz blocos vazios sumirem;
- permite recolher blocos;
- implementa agrupamento por projeto;
- mantém concluídas separadas no fim;
- mostra corretamente os dados da linha de tarefa;
- torna iniciar/retomar claramente a ação principal;
- destaca fortemente a tarefa com timer ativo;
- limita a visibilidade do usuário comum às tarefas próprias/compartilhadas.

Procure especialmente:
- lista poluída;
- hierarquia fraca de ações;
- comportamento pela metade;
- uso de visual diferente do sistema;
- drawer não integrado;
- filtros ou criação rápida mal resolvidos.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 3.

Regras:
- não avançar para a Fase 4;
- não expandir para funcionalidades fora da tela de Tarefas;
- priorizar aderência total aos blocos, interações e regras de visibilidade.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada ponto da revisão foi resolvido;
4. validações rodadas.
```

---

## Fase 4 — Drawer da tarefa e fluxos de tempo

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- se houver dúvida de abordagem: **Arena opcional**
- correções depois: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 4 — Drawer da tarefa e fluxos de tempo.

Objetivo da fase:
Transformar o drawer da tarefa em um fluxo completo de leitura, edição e acompanhamento de tempo.

Implemente exatamente:

1. drawer da tarefa com esta ordem:
- cabeçalho da tarefa
- metadados principais
- pessoas ligadas à tarefa
- bloco de tempo
- observação de espera, se houver
- ações

2. modo padrão:
- leitura primeiro

3. botão “Editar”:
- muda o mesmo drawer para modo edição
- não abrir modal adicional
- layout deve permanecer estável

4. no drawer, deve ser possível visualizar e editar pelo menos:
- título
- projeto
- status
- prioridade
- facilidade
- responsáveis
- criado por
- observação de espera
- informações principais da tarefa

5. bloco de tempo na ordem exata:
- quem está com timer ativo agora
- sessões recentes
- total acumulado da tarefa

6. regras de timer:
- um usuário só pode ter um timer ativo por vez;
- uma tarefa pode ter timers ativos de usuários diferentes ao mesmo tempo;
- se o usuário tentar iniciar outro timer, abrir confirmação explícita;
- parar timer abre fluxo leve de ajuste/observação;
- esse fluxo deve ser rápido e não burocrático.

7. integrar o drawer com a tela de Tarefas já criada na Fase 3.

Critérios de aceite obrigatórios:
- drawer operacional real;
- leitura e edição no mesmo painel;
- tempo ativo, tempo recente e total acumulado claramente legíveis;
- observação de espera corretamente tratada;
- troca de timer com confirmação funcionando;
- parar timer com fluxo leve funcionando.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 4 — Drawer da tarefa e fluxos de tempo.

Revise se a implementação:
- estruturou corretamente o drawer;
- mantém leitura primeiro e edição no mesmo painel;
- mostra claramente pessoas, status e metadados;
- implementa o bloco de tempo na ordem correta;
- diferencia timer ativo, sessões recentes e total acumulado;
- respeita a regra de timer único por usuário;
- abre confirmação ao trocar timer;
- para o timer com fluxo leve de ajuste/observação.

Procure especialmente:
- drawer confuso;
- edição que quebra layout;
- bloco de tempo mal hierarquizado;
- regras de timer inconsistentes;
- dependência de modal adicional.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 4.

Regras:
- não avançar para Projeto;
- não expandir o escopo para formulários gerais;
- corrigir apenas o que impede o drawer de ser considerado concluído.

Entregue:
1. arquivos alterados;
2. problemas corrigidos;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 5 — Página de Projeto

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções depois: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 5 — Página de Projeto.

Objetivo da fase:
Implementar Projeto como contêiner de tarefas + registros, seguindo a arquitetura definida no plano operacional.

Implemente exatamente:

1. página de Projeto com:
- resumo curto no topo
- ação principal “Nova tarefa”
- seção recolhível de registros
- lista compacta de tarefas abaixo

2. resumo curto do projeto mostrando apenas:
- nome
- grupo
- fase
- status
- prazo
- progresso simples

3. registros do projeto:
- lista única
- tipos: Decisão, Pendência, Observação
- pendências abertas primeiro
- concluídas no fim
- seção recolhível
- abre automaticamente apenas quando houver pendências abertas
- cada registro pode virar tarefa por ação direta

4. lista compacta de tarefas:
- mesma gramática da tela de Tarefas
- densidade mais compacta
- usar o mesmo drawer da Fase 4
- criação de tarefa nessa página com projeto travado

5. a página não pode virar dashboard pesado.

Critérios de aceite obrigatórios:
- Projeto funciona claramente como agrupamento de tarefas;
- registros e tarefas convivem sem competição visual;
- ação principal “Nova tarefa” está correta e contextual;
- nova tarefa nasce dentro do projeto;
- a página já parece da mesma família visual de Grupo.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 5 — Página de Projeto.

Revise se a implementação:
- trata Projeto como contêiner de tarefas + registros;
- mantém resumo curto e não dashboard;
- cria seção recolhível de registros com a lógica correta;
- usa tipos Decisão, Pendência e Observação;
- ordena pendências abertas primeiro;
- permite transformar registro em tarefa;
- usa lista compacta de tarefas coerente com a home;
- trava o projeto na criação de tarefa contextual.

Procure especialmente:
- excesso de informação no topo;
- registros mal integrados;
- competição visual entre registros e tarefas;
- quebra de coerência com a arquitetura definida.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 5.

Regras:
- não avançar para Grupo;
- não transformar Projeto em painel analítico;
- consolidar a lógica de contêiner de tarefas + registros.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 6 — Página de Grupo

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções depois: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 6 — Página de Grupo.

Objetivo da fase:
Implementar Grupo como contêiner de projetos + registros + resumo agregado, seguindo a mesma arquitetura do Projeto em outra escala.

Implemente exatamente:

1. página de Grupo com:
- resumo agregado curto no topo
- ação principal “Novo projeto”
- seção recolhível de registros
- lista compacta de projetos

2. resumo agregado mostrando apenas:
- nome do grupo
- status
- quantidade de projetos
- leitura agregada simples do andamento
- indicador de prazo crítico, se aplicável

3. registros do grupo:
- tipos: Decisão, Pendência, Observação
- lista única
- pendências abertas primeiro
- concluídas no fim
- seção recolhível
- abre automaticamente apenas quando houver pendências abertas

4. lista compacta de projetos:
- coerente visualmente com a arquitetura do Projeto em outra escala
- leitura rápida
- clique leva à página completa do projeto
- ação “Novo projeto” nessa página já nasce com grupo travado

Critérios de aceite obrigatórios:
- Grupo e Projeto parecem a mesma família arquitetural em escalas diferentes;
- resumo agregado é curto;
- projetos ficam legíveis e escaneáveis;
- registros funcionam corretamente;
- novo projeto contextual funciona.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 6 — Página de Grupo.

Revise se a implementação:
- preserva a mesma arquitetura do Projeto em outra escala;
- mantém resumo curto e agregado;
- usa registros corretamente;
- torna a lista de projetos compacta e escaneável;
- faz a ação principal ser “Novo projeto”;
- contextualiza corretamente a criação de projeto dentro do grupo.

Procure especialmente:
- Grupo tratado como simples filtro;
- perda de paralelismo com Projeto;
- resumo excessivamente analítico;
- lista de projetos pesada ou incoerente.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 6.

Regras:
- não avançar para a tela índice de Projetos;
- preservar o paralelismo Grupo ↔ Projeto;
- corrigir apenas os desvios apontados.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 7 — Tela índice de Projetos

### Motor recomendado no Windsurf
- primeira execução: **SWE-1.5**, se a base já estiver estável
- se a fase ficar mais complexa do que o esperado: **modelo premium mais forte**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 7 — Tela índice de Projetos.

Objetivo da fase:
Implementar a tela de Projetos como área de consulta e localização rápida, e não como segunda home operacional.

Implemente exatamente:

1. cabeçalho enxuto;
2. botão “Novo projeto”;
3. busca forte e visível;
4. filtros essenciais:
- Grupo
- Status
- Fase

5. lista de projetos em cards compactos.

Não incluir:
- dashboard
- painel “Hoje”
- métricas decorativas
- blocos operacionais de tarefa
- duplicação da home de Tarefas

Critérios de aceite obrigatórios:
- encontrar projeto é rápido;
- abrir projeto é direto;
- a tela não compete com Tarefas;
- visual limpo e coerente com o restante do rebuild.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 7 — Tela índice de Projetos.

Revise se a implementação:
- trata Projetos como consulta/localização;
- evita virar segunda home;
- implementa busca e filtros corretos;
- usa cards compactos coerentes;
- mantém a ação principal correta.

Procure especialmente:
- excesso de metadados nos cards;
- dashboard indevido;
- duplicidade de função com Tarefas;
- lista difícil de escanear.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 7.

Regras:
- não avançar para Grupos;
- não adicionar elementos operacionais indevidos;
- corrigir aderência da tela de Projetos à sua função de localização.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 8 — Tela índice de Grupos

### Motor recomendado no Windsurf
- primeira execução: **SWE-1.5**, se a base estiver estável
- se necessário: **modelo premium mais forte**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 8 — Tela índice de Grupos.

Objetivo da fase:
Implementar a tela de Grupos como área de localização rápida de grupos, com busca e filtro simples, sem virar painel analítico pesado.

Implemente exatamente:

1. cabeçalho enxuto;
2. botão “Novo grupo”;
3. busca;
4. filtro por status;
5. lista de grupos.

Critérios de aceite obrigatórios:
- encontrar grupo é rápido;
- abrir grupo é direto;
- a tela permanece leve;
- não há excesso de métricas ou comparativos densos.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 8 — Tela índice de Grupos.

Revise se a implementação:
- prioriza encontrar grupos rapidamente;
- mantém busca e filtro simples;
- evita virar painel analítico;
- usa lista coerente com a arquitetura geral.

Procure especialmente:
- excesso de complexidade;
- cards pesados;
- perda de foco da função da tela.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 8.

Regras:
- não avançar para Administração;
- manter Grupos leve e focada em localização;
- corrigir apenas o que impede aprovação.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 9 — Administração mínima

### Motor recomendado no Windsurf
- primeira execução: **SWE-1.5** se a permissão estiver simples
- se a fase crescer: **modelo premium mais forte**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 9 — Administração mínima.

Objetivo da fase:
Criar a área administrativa mínima do rebuild, isolando capacidades globais sem contaminar a experiência do usuário comum.

Implemente exatamente:

1. exibição condicional da área Administração apenas para admin;
2. visão global mínima de tarefas, projetos e grupos para admin;
3. filtros adicionais necessários ao contexto administrativo, incluindo filtro por pessoa;
4. capacidade de acessar entidades de todos os usuários.

Não transformar esta fase em painel gigante. Implementar apenas o mínimo administrativo necessário para independência da UI antiga.

Critérios de aceite obrigatórios:
- usuários comuns não veem Administração;
- admin tem visão global;
- controles administrativos não vazam para o fluxo comum;
- a nova UI cobre o mínimo administrativo necessário.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 9 — Administração mínima.

Revise se a implementação:
- esconde Administração de usuários comuns;
- oferece visão global para admin;
- adiciona filtros compatíveis com uso administrativo;
- evita contaminar o restante do produto com controles administrativos.

Procure especialmente:
- permissão mal aplicada;
- controles administrativos visíveis fora de contexto;
- painel excessivo sem necessidade.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 9.

Regras:
- não avançar para formulários completos;
- não expandir Administração além do mínimo da fase;
- corrigir permissão, visibilidade e visão global.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 10 — Formulários estruturados e fluxos completos

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções pequenas: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 10 — Formulários estruturados e fluxos completos.

Objetivo da fase:
Fechar os fluxos de criação e edição restantes de forma consistente, sem improvisos por contexto.

Implemente exatamente os formulários e fluxos estruturados para:
- Novo grupo
- Novo projeto
- Nova tarefa (fluxo completo, além da criação rápida)
- Novo registro
- Edição de grupo
- Edição de projeto

Regras obrigatórias:
- criação rápida continua existindo apenas para tarefa;
- grupo e projeto usam formulário estruturado;
- o formulário de projeto é o mesmo na tela de Projetos e na página de Grupo;
- quando criado dentro de um Grupo, o grupo vem travado;
- quando criada dentro de um Projeto, a tarefa vem com projeto travado;
- não criar versões divergentes do mesmo formulário por contexto.

Critérios de aceite obrigatórios:
- formulários visualmente consistentes;
- comportamento previsível;
- sem duplicação desnecessária de fluxo;
- sem improviso local por página.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 10 — Formulários estruturados e fluxos completos.

Revise se a implementação:
- criou formulários coerentes entre si;
- preservou criação rápida apenas para tarefa;
- usou o mesmo formulário de projeto em contextos diferentes;
- travou corretamente grupo/projeto quando o contexto exige;
- evitou duplicação de formulário ou lógica por tela.

Procure especialmente:
- formulários divergentes;
- contexto mal travado;
- inconsistências visuais;
- fluxos pela metade.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 10.

Regras:
- não avançar para migração final;
- consolidar formulários;
- remover qualquer duplicação ou divergência entre contextos.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

## Fase 11 — Flag, paridade e corte do legado

### Motor recomendado no Windsurf
- primeira execução: **modelo premium mais forte disponível**
- correções localizadas: **SWE-1.5**

### Prompt de implementação para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Fase alvo: Fase 11 — Flag, paridade e corte do legado.

Objetivo da fase:
Preparar a substituição segura da UI antiga pela nova, usando flag de migração, checklist de paridade e remoção controlada do legado.

Implemente exatamente:

1. mecanismo de ativação controlada da nova UI;
2. checklist de paridade mínima documentado e verificável;
3. integração necessária para alternar entre legado e nova UI, se ainda necessário durante validação;
4. remoção do código morto apenas quando a paridade mínima estiver claramente atendida.

Checklist mínimo que precisa estar coberto:
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

Não remover o legado cegamente. Só cortar o que puder ser comprovadamente substituído.

Critérios de aceite obrigatórios:
- existe flag ou mecanismo equivalente de migração;
- checklist de paridade está documentado;
- o corte do legado é controlado e não destrutivo;
- não há remoção prematura de funcionalidade.

Entregue a resposta final no formato obrigatório.
```

### Prompt de revisão para Codex

```text
[cole aqui o bloco fixo para Codex]

Fase revisada: Fase 11 — Flag, paridade e corte do legado.

Revise se a implementação:
- criou mecanismo controlado de migração;
- documentou checklist de paridade mínima;
- evitou remoção prematura do legado;
- só cortou o que já está realmente coberto pela nova UI.

Procure especialmente:
- corte precipitado;
- ausência de checklist real;
- paridade presumida, mas não demonstrada;
- risco de regressão funcional.
```

### Prompt de correção para Windsurf

```text
[cole aqui o bloco fixo para Windsurf]

Corrija exclusivamente os problemas apontados pelo Codex na Fase 11.

Regras:
- não expandir escopo além da migração controlada;
- não remover legado sem comprovação de paridade;
- consolidar a transição com segurança.

Entregue:
1. arquivos alterados;
2. correções aplicadas;
3. como cada crítica foi resolvida;
4. validações rodadas.
```

---

# 9. Procedimento resumido de uso

Para cada fase:

1. escolher o motor recomendado no Windsurf;
2. abrir o repositório;
3. colar o prompt de implementação da fase;
4. ao terminar, colar o prompt de autoauditoria;
5. abrir o Codex;
6. colar o prompt de revisão da mesma fase;
7. se houver falhas, voltar ao Windsurf com o prompt de correção;
8. repetir até a fase ficar aprovada;
9. só então passar à fase seguinte.

---

# 10. Recomendação final de operação

A forma mais segura de conduzir o rebuild é:

- colocar `AGENTS.md` na raiz do repositório;
- colocar o plano operacional em `docs/rebuild/operational-masterplan.md`;
- usar este guia como procedimento fixo;
- usar o modelo premium mais forte do Windsurf para a primeira execução das fases críticas;
- usar SWE-1.5 para follow-ups e correções menores;
- manter Codex como revisor obrigatório.

O princípio mais importante de todo o processo é este:

**não deixar o executor transformar escopo estrutural em interface bonita pela metade.**

O rebuild só terá valor se cada fase ficar completa, coerente e realmente operacional.

