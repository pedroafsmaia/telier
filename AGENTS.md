# AGENTS.md

## Projeto

Telier é um sistema web interno para escritório universitário de arquitetura.
O produto combina controle de tempo com gestão leve de projetos.
A interface deve parecer institucional, técnica, madura e confiável.
Evite qualquer resultado com aparência de template SaaS genérico, dashboard genérico, startup chamativa ou “cara de IA”.

## Objetivo atual

A prioridade é aproximar a UI do Telier da proposta de redesign gerada no Stitch.
A implementação anterior ficou próxima demais do layout legado e distante da estrutura visual da referência.
O objetivo agora é reconstruir a apresentação, não apenas trocar tokens visuais.

## Fontes de verdade do redesign

Leia antes de alterar a UI:

- `docs/redesign/DESIGN.md`
- `docs/redesign/DESIGN-resumo.md`
- `docs/redesign/telier-design-system.md`
- `docs/redesign/prompt-final-claude-code.md`
- `docs/redesign/stitch-ref/` (HTMLs estáticos das telas de referência)
- `docs/redesign/studio-ref/src/` (implementação de referência derivada do Stitch)

A UI final não precisa copiar literalmente o Stitch, mas deve herdar sua gramática visual, sua hierarquia espacial, sua topologia de navegação e sua linguagem de componentes.

## Estrutura atual relevante

Arquivos principais do frontend atual:

- `src/index.html`
- `src/styles.css`
- `src/app.js`
- `src/modules/ui.js`
- `src/modules/dashboard.js`
- `src/modules/project.js`
- `src/modules/groups.js`
- `src/modules/tasks.js`
- `src/modules/timer.js`
- `src/modules/admin.js`
- `src/modules/auth.js`
- `src/modules/notifications.js`

Backend principal:

- `src/worker.js`
- `wrangler.toml`

## Direção visual obrigatória

- Sidebar persistente no desktop como elemento estrutural do shell.
- Topbar compacta, técnica e discreta.
- Layout com sensação editorial e arquitetônica, não “grid genérico de cards”.
- Ritmo vertical claro, com boa hierarquia tipográfica.
- Superfícies sóbrias, secas, com contraste controlado.
- Menos sombras; preferir borda, proporção, alinhamento e espaçamento.
- Radius contido.
- Estados visuais discretos e profissionais.
- Densidade adequada para software de operação.

## O que evitar

- Reskin tímido.
- Preservar o shell antigo só por conservadorismo.
- Blur, glow, glassmorphism, gradientes decorativos, animações chamativas.
- “Cards fofos”, excesso de sombras e excesso de arredondamento.
- Mistura visível entre componentes antigos e shell novo.
- Cabeçalhos genéricos de dashboard SaaS.
- Elementos que pareçam protótipo, template ou interface de IA.

## Regras de trabalho

- Preserve o comportamento funcional existente sempre que possível.
- Priorize refatorações de apresentação e organização visual.
- Faça mudanças por blocos arquitetônicos: shell, navegação, dashboard, listagens, detalhe de projeto, grupos, tarefas.
- Antes de editar, leia em lote os arquivos da área afetada.
- Se precisar alterar HTML estrutural em `src/index.html`, faça isso de forma deliberada e coerente com o redesign.
- Se um componente herdado denunciar visualmente a UI antiga, ajuste-o para herdar a nova linguagem.
- Evite criar features novas que desviem do objetivo principal.

### Regra obrigatória para tarefas de UI (Codex)

Ao alterar UI, layout, CSS, componentes visuais ou responsividade:

1. Ler `docs/redesign/visual-grammar.md`
2. Ler `docs/redesign/ui-review-checklist.md`
3. Ler `docs/redesign/component-anatomy.md` ao trabalhar com componentes
4. Ler `docs/redesign/interaction-states.md` ao trabalhar com comportamento de UI
5. Seguir as regras desses documentos
6. Não introduzir pills, badges ou chips decorativos como base de metadados
7. Não criar variações de componente fora da anatomia definida
8. Garantir consistência de estados e nunca deixar ação sem feedback visual
9. Ao corrigir inconsistências recorrentes, atualizar também `docs/redesign/visual-grammar.md`

## Ordem preferida de execução

1. Shell global
2. Sidebar + topbar
3. Dashboard inicial
4. Componentes base compartilhados
5. Projetos
6. Grupos
7. Tarefas
8. Ajustes finais de coerência visual

## Critérios de aceitação

Uma entrega boa deve satisfazer todos estes pontos:

- A UI deve parecer claramente inspirada pela proposta do Stitch.
- A diferença deve ser estrutural, não cosmética.
- O shell não pode parecer a interface antiga com outra paleta.
- Dashboard, projetos e tarefas devem compartilhar a mesma linguagem visual.
- O resultado deve parecer software institucional de arquitetura.
- O app deve continuar utilizável localmente.

## Comandos e verificação

Antes de concluir uma tarefa, sempre que possível:

1. Rode instalação de dependências se necessário.
2. Rode o app localmente com Wrangler.
3. Rode `npm run smoke` se o ambiente suportar.
4. Relate claramente qualquer verificação que não puder ser executada.

## Formato esperado na resposta final

Sempre responder com:

- resumo objetivo do que foi alterado
- arquivos modificados
- decisões estruturais tomadas
- verificações executadas
- pendências ou limitações restantes

Não despejar arquivos inteiros na resposta.
