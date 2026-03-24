# AGENTS.md

## Projeto
Telier é um sistema interno para um escritório de arquitetura universitário.
O sistema é usado diariamente para time tracking e gestão leve de projetos institucionais.
O contexto inclui múltiplos campi, hospitais, clínicas universitárias e outras unidades da instituição.

Este produto não deve parecer:
- template de SaaS genérico
- dashboard decorativo
- app pessoal de produtividade
- interface com “cara de IA”

Este produto deve parecer:
- institucional
- sóbrio
- técnico
- confiável
- maduro
- preciso
- preparado para uso contínuo por equipe

---

## Objetivo geral das mudanças
Toda alteração deve aproximar o Telier de uma plataforma interna de coordenação de projetos institucionais, com foco em:
- clareza operacional
- rastreabilidade
- continuidade do trabalho
- registro de tempo confiável
- gestão de projetos com baixa fricção
- consistência visual e estrutural
- base técnica sustentável

---

## Princípios de produto
Sempre seguir estes princípios:

1. A informação operacional vem antes da decoração.
2. O usuário deve entender o estado do trabalho em poucos segundos.
3. O registro de tempo precisa ser rápido, claro e rastreável.
4. A lista de tarefas é o núcleo do trabalho.
5. O sistema deve facilitar retomada de contexto.
6. O projeto deve ser uma unidade operacional clara.
7. Administração e operação devem ser separadas.
8. Poucas regras visuais, aplicadas com rigor, são melhores do que muitos efeitos.
9. Tudo que parecer efeito de template deve ser evitado.
10. A interface deve refletir um escritório de arquitetura institucional, não uma startup.

---

## Direção de UX
Ao alterar fluxos, telas ou componentes, seguir estas regras:

- Uma ação principal por contexto.
- Ações secundárias devem ir para menus, não poluir a interface.
- Concluídas devem ficar recolhidas por padrão quando fizer sentido.
- Hover nunca pode ser dependência crítica para ação importante.
- Modais devem ser usados com parcimônia; preferir edição inline ou drawer quando fizer mais sentido.
- A interface deve reduzir carga cognitiva.
- A informação crítica deve aparecer antes de metadados secundários.
- Tarefas e tempo devem ter prioridade sobre recursos periféricos.
- Presença online e recursos “ao vivo” não devem ser protagonistas.
- “Foco” deve ser assistivo, não o centro do produto.

---

## Arquitetura de informação alvo
A navegação principal do produto deve convergir para esta estrutura:

- Hoje
- Projetos
- Tempo
- Pessoas
- Administração

Evitar criar novas áreas principais sem necessidade real.

Diretrizes:
- "Hoje" é a entrada operacional do usuário.
- "Projetos" é a base de navegação dos projetos institucionais.
- "Tempo" é a área consolidada de sessões e relatórios operacionais.
- "Pessoas" é uma visão de distribuição do trabalho, não uma tela de vigilância.
- "Administração" é backoffice, separado da operação.

---

## Regras de UI
A linguagem visual deve ser sóbria, opaca, técnica e controlada.

### Deve evitar fortemente
- glassmorphism dominante
- blur excessivo
- glow
- gradientes como assinatura principal
- visual de “AI SaaS”
- cardização exagerada
- uso excessivo de badges, chips e pills
- emojis na interface
- ícones improvisados
- hero sections desnecessárias
- superfícies muito infladas ou decorativas

### Deve priorizar
- painéis funcionais
- listas densas
- tabelas claras
- hierarquia tipográfica forte
- alinhamento preciso
- contraste bem controlado
- poucos acentos visuais
- estados consistentes
- componentes reutilizáveis

### Paleta
- base neutra, mineral, sóbria
- um acento principal usado com disciplina
- evitar combinação azul/roxo genérica como identidade central

### Tipografia
- priorizar legibilidade e hierarquia
- evitar excesso de microtexto
- evitar excesso de uppercase
- texto secundário deve continuar legível
- tipografia mono apenas para tempo, códigos e identificadores técnicos quando necessário

### Radius, sombras e espaçamento
- cantos moderados
- sombras discretas
- sem glow
- usar escala consistente de espaçamento
- evitar valores arbitrários espalhados pelo código

---

## Regras para telas principais

### Hoje
A tela "Hoje" deve responder rapidamente:
- no que estou trabalhando agora
- o que vence antes
- o que precisa de atenção
- o que devo retomar

Deve conter apenas o essencial:
- tarefa ativa
- cronômetro ativo
- retomada
- prazos próximos
- pendências
- projetos em andamento

Não transformar "Hoje" em dashboard inflado.

### Projetos
A listagem de projetos deve ser operacional.
Priorizar:
- nome
- unidade/campus
- fase
- status
- prazo
- responsável
- progresso
- risco

Evitar cartões carregados com excesso de metadados.

### Workspace do projeto
A tela do projeto deve parecer um workspace de operação.
Priorizar:
- cabeçalho compacto
- contexto do projeto
- tarefas como área principal
- painel lateral para metadados, decisões e tempo

Abas ou seções preferenciais:
- Visão geral
- Tarefas
- Tempo
- Decisões

Evitar transformar o projeto em agregador confuso de mini-módulos.

### Tarefas
Tarefas são o núcleo do sistema.
A visualização principal deve favorecer clareza, densidade e rapidez de ação.
Preferir tabela como modo principal.
Ações secundárias em menu.
Tempo e status devem ser fáceis de ver e operar.

### Tempo
Tempo deve ser tratado como dimensão operacional séria.
A área de tempo deve permitir:
- leitura clara
- filtro por período, projeto, pessoa e unidade
- sessões confiáveis
- edição segura
- visão consolidada

### Pessoas
A área de pessoas deve mostrar distribuição do trabalho sem estética de vigilância.
Foco em:
- carga
- pendências
- horas recentes
- alocação recente

### Administração
A área administrativa deve ser separada da operação.
Priorizar:
- usuários
- papéis
- permissões
- estruturas institucionais
- auditoria
- configurações relevantes

---

## Regras de domínio
Ao evoluir o modelo de dados, considerar que o contexto institucional pode exigir:

- campus
- unidade
- tipo de unidade
- setor demandante
- disciplina principal
- fase institucional
- criticidade
- tipo de intervenção
- responsável técnico
- status de aprovação

Evitar manter o domínio simplificado demais se isso prejudicar filtros, relatórios ou aderência ao uso real.

---

## Regras técnicas gerais
Toda mudança deve reduzir fragilidade estrutural e aumentar clareza.

### Objetivos técnicos
- reduzir acoplamento
- reduzir dependência de arquivos monolíticos
- separar UI, domínio, serviços e utilitários
- padronizar nomenclaturas
- melhorar legibilidade do código
- facilitar evolução futura
- preservar comportamento existente durante refatorações incrementais

### Regras
- não criar novos arquivos monolíticos
- preferir modularização incremental
- não misturar lógica de negócio, renderização e acesso a dados no mesmo bloco quando for possível separar
- evitar duplicação
- extrair componentes e utilitários reutilizáveis
- padronizar contratos e nomes
- documentar decisões estruturais importantes
- não fazer reescrita cega sem preservar entendimento do fluxo atual

### Frontend
Direção preferencial:
- React + TypeScript + Vite, se a migração estiver em andamento
- design system explícito
- componentes reutilizáveis
- estrutura por pages, features, components e lib
- estado previsível
- evitar renderização baseada em string quando houver alternativa melhor
- eliminar handlers inline sempre que possível
- reduzir uso inseguro ou excessivo de `innerHTML`

### Backend
Direção preferencial:
- modularização por domínio
- separar rotas, serviços, repositórios e validações
- padronizar respostas
- fortalecer autorização
- tornar queries mais legíveis e sustentáveis

### Banco e segurança
- não depender de ajuste de schema em runtime como estratégia principal
- usar migrations explícitas
- fortalecer autenticação e armazenamento de senha
- rever rate limiting e validações
- preservar integridade dos dados

---

## Nomenclatura e consistência
Sempre preferir consistência a variações locais.
Ao encontrar naming inconsistente, corrigir de forma coordenada.

Exemplos de problemas a evitar:
- dois nomes para o mesmo conceito
- rótulos de status com flexões conflitantes
- atributos duplicados com semântica sobreposta
- mistura entre tom informal e tom institucional

Ao renomear, atualizar:
- tipos
- contratos
- UI
- persistência
- documentação
- testes relevantes

---

## Critério de pronto para qualquer mudança
Uma tarefa só deve ser considerada concluída se:

1. O resultado estiver alinhado com o contexto institucional do Telier.
2. A interface parecer mais madura e menos genérica do que antes.
3. A solução reduzir ruído visual, não aumentar.
4. O fluxo principal ficar mais claro, não mais complexo.
5. O código ficar mais organizado, não mais acoplado.
6. Os estados principais estiverem tratados:
   - normal
   - loading
   - vazio
   - erro
   - sucesso, quando aplicável
7. O comportamento existente importante continuar funcionando.
8. Os checks relevantes do projeto forem executados.

---

## Como executar mudanças
Ao trabalhar em tarefas maiores:

1. Entender a tela, fluxo ou módulo atual.
2. Identificar objetivo de produto da área.
3. Aplicar esta direção de produto e UI.
4. Implementar de forma incremental.
5. Validar comportamento principal.
6. Documentar trade-offs se houver.

Evitar:
- mudanças cosméticas sem ganho estrutural
- refatorações amplas sem delimitação
- reintroduzir padrões visuais que o projeto quer abandonar
- espalhar exceções locais de estilo ou arquitetura

---

## Prioridades permanentes
Quando houver dúvida entre duas soluções, preferir a que:
- aumenta clareza operacional
- reduz ruído visual
- melhora rastreabilidade
- simplifica o uso diário
- organiza melhor o código
- aproxima o sistema de um produto institucional maduro

---

## Instrução final
Trate o Telier como uma plataforma operacional interna de arquitetura universitária.
Toda decisão de design, UX e engenharia deve reforçar:
- sobriedade
- precisão
- continuidade
- confiabilidade
- maturidade institucional

Não introduza soluções com aparência de template genérico, dashboard decorativo ou app de produtividade pessoal.