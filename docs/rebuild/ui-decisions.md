# Telier — Decisões de UI e Produto

## 1. Decisões estratégicas de produto

### 1.1 Papéis das áreas do produto

- **Tarefas** é a tela principal do sistema e o centro operacional do produto.
- **Projeto** é um agrupamento de tarefas + registros do projeto.
- **Grupo** é um agrupamento de projetos + registros do grupo + resumo agregado.
- **Administração** só aparece para administradores.

### 1.2 Estrutura conceitual obrigatória

- **Tarefa = centro operacional**
- **Projeto = agrupamento de tarefas**
- **Grupo = agrupamento de projetos**

## 2. Tela principal de Tarefas

### 2.1 Características obrigatórias

- Tela principal do sistema (primeira tela após login)
- Não é dashboard pesado
- Topo essencial, sem métricas decorativas
- Criação rápida discreta acima da lista
- Filtros essenciais: Projeto, Prioridade, Facilidade

### 2.2 Estrutura de blocos

Visualização padrão por blocos, nesta ordem exata:

1. **Em andamento**
2. **Em espera**  
3. **A fazer**
4. **Concluídas**

Regras dos blocos:
- Blocos vazios não aparecem
- Todos os blocos podem ser recolhidos
- Existe modo alternativo "Agrupar por projeto"
- Mesmo no modo agrupado, concluídas continuam separadas no fim

### 2.3 Linha da tarefa

Cada linha deve mostrar (sem abrir drawer):

- **título** (principal)
- **prazo** em data exata curta
- **prioridade** textual
- **facilidade** textual
- **projeto**
- **responsáveis** como avatares/iniciais
- **indicador discreto** de compartilhamento quando aplicável
- **botão iniciar/retomar** sempre visível na extrema direita
- **ação de concluir** diretamente na linha

### 2.4 Comportamentos obrigatórios

- Clicar no corpo da tarefa abre drawer lateral
- O drawer abre em leitura primeiro
- Clicar em editar muda o mesmo drawer para modo edição
- Não usar modal adicional para edição da tarefa
- Iniciar/retomar tempo funciona direto da linha
- Concluir tarefa funciona direto da linha
- Tarefa com timer ativo recebe destaque forte
- Timer ativo também aparece na barra global no topo

### 2.5 Status da tarefa

Status oficiais:
- **A fazer**
- **Em andamento**  
- **Em espera**
- **Concluída**

Regras de status:
- Status aparece como texto + cor
- "Em espera" exige observação contextual
- Na lista, a observação completa não aparece, apenas indicador
- A observação completa fica no drawer

### 2.6 Visibilidade por usuário

- **Usuário comum** vê apenas:
  - Tarefas que criou
  - Tarefas compartilhadas com ele
- **Administrador** tem visão global

### 2.7 Criação rápida

- Campos mínimos obrigatórios: Título + Projeto
- Acima da lista principal
- Não deve virar mini-formulário pesado
- Discreta, não rouba protagonismo visual do topo

## 3. Drawer da tarefa

### 3.1 Estrutura obrigatória

O drawer deve conter, nesta ordem:

1. Cabeçalho da tarefa
2. Metadados principais
3. Pessoas ligadas à tarefa  
4. Bloco de tempo
5. Observação de espera, se houver
6. Ações

### 3.2 Modos de operação

- **Padrão**: abre em leitura
- **Edição**: botão "Editar" ativa modo edição no mesmo drawer
- **Layout estável**: não muda estrutura entre leitura e edição
- **Proibição**: não abrir modal adicional para editar

### 3.3 Campos obrigatórios

Deve ser possível visualizar e editar:

- Título
- Projeto
- Status  
- Prioridade
- Facilidade
- Responsáveis
- Criado por (apenas leitura)
- Observação de espera
- Informações principais da tarefa

### 3.4 Bloco de tempo

Ordem exata no bloco de tempo:

1. **Quem está com timer ativo agora**
2. **Sessões recentes**
3. **Total acumulado da tarefa**

Regras do bloco de tempo:
- Mostrar claramente múltiplos timers ativos de colaboradores diferentes
- Mostrar histórico recente legível
- Exibir total acumulado sem exagero visual

### 3.5 Regras de timer

- Um usuário só pode ter um timer ativo por vez
- Ao tentar iniciar outro timer, abrir confirmação explícita
- Parar timer abre fluxo leve de ajuste/observação
- Fluxo não pode travar usuário com formulário pesado

## 4. Tempo e cronômetro

### 4.1 Regras globais

- Um usuário só pode ter um timer ativo por vez
- Uma tarefa pode ter timers ativos de múltiplos usuários diferentes
- Ao tentar iniciar outro timer, abrir confirmação explícita
- Parar timer abre fluxo leve de ajuste/observação

### 4.2 Destaque visual

- Timer ativo tem destaque forte na lista
- Timer ativo também fica visível em barra global no topo em qualquer página
- Barra global fixa mostra todos os timers ativos do usuário

### 4.3 Fluxo de parada

- Parar timer abre fluxo leve de ajuste/observação
- Não deve ser burocrático
- Deve permitir adicionar observações rápidas

## 5. Página de Projeto

### 5.1 Estrutura obrigatória

A página do projeto deve conter:

- **Resumo curto** no topo
- **Ação principal**: Nova tarefa
- **Seção recolhível** de registros
- **Lista compacta** de tarefas abaixo

### 5.2 Resumo curto

Mostrar apenas o essencial operacional:

- Nome do projeto
- Grupo
- Fase
- Status  
- Prazo
- Progresso simples

Não incluir:
- Dashboard pesado
- Múltiplos KPIs decorativos
- Painéis redundantes

### 5.3 Registros do projeto

Regras:
- Lista única
- Tipos: Decisão, Pendência, Observação
- Pendências abertas primeiro
- Concluídas no fim
- Seção recolhível
- Começa aberta só quando houver pendências abertas
- Cada registro pode virar tarefa por ação direta

### 5.4 Lista de tarefas

Regras:
- Mesma gramática de comportamento da tela principal de Tarefas
- Densidade um pouco mais compacta
- Drawer da tarefa é o mesmo da tela principal
- Criação rápida de tarefa nessa página deve ter projeto travado

## 6. Página de Grupo

### 6.1 Estrutura obrigatória

A página do grupo deve conter:

- **Resumo agregado curto** no topo
- **Ação principal**: Novo projeto
- **Seção recolhível** de registros
- **Lista compacta** de projetos

### 6.2 Resumo agregado

Mostrar apenas:

- Nome do grupo
- Status
- Quantidade de projetos
- Leitura agregada simples do andamento
- Possível indicador de prazo mais crítico, se existir

### 6.3 Registros do grupo

Mesmas regras do projeto:
- Decisão, Pendência, Observação
- Pendências abertas primeiro
- Concluídas no fim
- Seção recolhível
- Abre automaticamente apenas quando houver pendências abertas

### 6.4 Lista de projetos

Regras:
- Cards compactos
- Linguagem visual paralela à lista de tarefas em outra escala
- Leitura rápida
- Clique leva para página completa do projeto
- Ação de novo projeto nessa página já nasce com grupo travado

## 7. Tela de Projetos

### 7.1 Características

Projetos não é home operacional. Portanto, não incluir:

- Painel "Hoje"
- Duplicação da lógica de Tarefas
- Widgets decorativos
- Dashboard pesado
- Blocos de execução diária

### 7.2 Estrutura obrigatória

- Cabeçalho enxuto
- Botão **Novo projeto**
- Busca forte e visível
- Filtros essenciais:
  - Grupo
  - Status  
  - Fase
- Lista de projetos em cards compactos

### 7.3 Objetivo

Encontrar rapidamente um projeto, abrir um projeto, sem competir com Tarefas.

## 8. Tela de Grupos

### 8.1 Estrutura obrigatória

- Cabeçalho enxuto
- Botão **Novo grupo**
- Busca
- Filtro por status
- Lista de grupos

### 8.2 Objetivo

Priorizar encontrar rapidamente, não comparar por métricas densas.

## 9. Administração

### 9.1 Regras obrigatórias

- Administração só aparece para admin
- Admin tem visão global de tarefas, projetos e grupos
- Admin pode usar filtros por pessoa
- Admin pode editar tudo
- Recursos administrativos não aparecem para usuários comuns

### 9.2 Escopo mínimo

- Visão global de tarefas
- Filtros ampliados  
- Acesso a entidades de todos os usuários
- Gestão básica de pessoas, se já existir no backend

## 10. Pessoas na tarefa

### 10.1 Papéis

- **"Criado por"** existe como metadado histórico
- **"Responsáveis"** é a lista operacional de pessoas ligadas à tarefa
- Não existe distinção prática entre responsável e colaborador
- Pessoas vinculadas têm a mesma autoridade operacional
- Admin tem poder ampliado por visão global, não por papel diferente dentro da tarefa

### 10.2 Comportamento

- Para iniciar timer, a pessoa já precisa estar vinculada
- Admin pode editar tarefas mesmo não sendo vinculado
- Compartilhamento não cria seção separada na interface

## 11. Identidade visual

### 11.1 O que preservar

Manter:
- Linguagem institucional
- Sobriedade
- Superfícies neutras
- Clareza técnica  
- Densidade controlada

### 11.2 O que evitar

Não introduzir:
- Estética SaaS genérica
- Gradientes decorativos
- Glassmorphism
- Blur dominante
- Excesso de sombras suaves
- Visual "moderno" alheio à linguagem atual do produto

### 11.3 Uso de cor

Reforçar cor de forma funcional:

Regras:
- Superfícies continuam majoritariamente neutras
- Cor entra com mais força em **estados** e **ações**
- Estados têm prioridade sobre superfícies inteiras no uso de cor
- Cor não é decoração

Aplicar cor principalmente em:
- Status
- Prioridade
- Alerta de atraso
- Pendências
- Timer ativo
- Foco, seleção e feedback

## 12. Navegação

### 12.1 Ordem obrigatória

1. Tarefas
2. Projetos  
3. Grupos
4. Administração

### 12.2 Regras

- Sidebar simples
- Destaque apenas da página atual
- Sem mini-dashboard na navegação
- Sem badges decorativos

## 13. Formulários

### 13.1 Criação rápida

Existe apenas para tarefa:
- Campos mínimos: Título + Projeto
- Acima da lista principal
- Discreta

### 13.2 Formulários estruturados

Grupo e Projeto usam formulário estruturado:
- O formulário de projeto é o mesmo tanto na tela de Projetos quanto na página de Grupo
- Quando o contexto existir, grupo ou projeto vem travado corretamente

## 14. Responsividade

### 14.1 Mobile

- Sidebar vira drawer
- Lista de tarefas mantém funcionalidade principal
- Drawer da tarefa ocupa tela inteira
- Timer global permanece acessível

### 14.2 Tablet

- Layout adaptado mas mantém estrutura principal
- Toques em área de clique adequada
- Sem perda de funcionalidade

## 15. Feedback e estados

### 15.1 Loading

- Skeletons estáveis durante carregamento
- Indicadores claros de operações em andamento
- Não bloquear interface desnecessariamente

### 15.2 Error

- Erros aparecem para o usuário
- Mensagens claras e acionáveis
- Não silenciar falhas

### 15.3 Success

- Feedback claro de ações concluídas
- Atualização automática onde aplicável
- Não excessivo, apenas o necessário

## 16. Acessibilidade

### 16.1 Navegação

- Teclado funcional em toda interface
- Focus visível e claro
- Skip links para navegação principal

### 16.2 Leitores de tela

- Semântica correta dos elementos
- Labels descritivos
- Estados anunciados corretamente

### 16.3 Contraste

- Cumprir WCAG AA no mínimo
- Texto legível em todos os temas
- Estados distinguíveis por cor + forma/ícone
