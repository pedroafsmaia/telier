# AGENTS.md — Regras operacionais do rebuild do frontend do Telier

## Objetivo

Este repositório está passando por um rebuild controlado do frontend do Telier.

A meta não é aplicar remendos na interface antiga. A meta é reconstruir o frontend com arquitetura correta, preservando o backend quando possível, reaproveitando a identidade visual existente e **eliminando completamente o legado ao final da migração**.

## Fonte de verdade

Toda implementação deve seguir rigorosamente:
- o documento operacional de rebuild do frontend;
- o masterplan de interface e produto;
- o guia de implementação de interface;
- os pacotes operacionais do Windsurf e do Codex;
- as decisões já fechadas de produto e UX.

Se houver conflito entre conveniência de implementação e o plano operacional, vence o plano operacional.

## Estratégia obrigatória

- manter backend, autenticação e contratos existentes sempre que possível;
- reconstruir o frontend em base nova, separada da UI legada;
- migrar por fases;
- remover o legado **apenas** quando houver paridade mínima comprovada;
- ao final, fazer **abandono completo do legado** e **limpeza geral do código**.

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

### Regra final de limpeza
Nenhuma migração será considerada concluída enquanto restarem:
- componentes legados sem uso;
- rotas antigas mortas;
- helpers duplicados;
- feature flags permanentes sem plano de remoção;
- estilos antigos sem referência;
- wiring legado ainda acoplado à nova experiência.

## Resultado esperado

Ao final do rebuild, o Telier deve funcionar como um sistema coeso, com:
- Tarefas realmente operacional;
- Projeto e Grupo como contêineres em escalas diferentes;
- timer global claro e confiável;
- menos bugs e menos lag percebido;
- frontend previsível para evolução futura com IA;
- **legado removido de forma completa e código limpo para manutenção futura**.
