# Telier Component Anatomy

## 1. Propósito
- Definir a estrutura interna fixa dos principais componentes de interface do Telier.
- Eliminar ambiguidade de implementação entre telas e módulos.
- Garantir consistência visual e estrutural em mudanças futuras.

## 2. Regras gerais
- Todo componente deve manter:
  - hierarquia de leitura clara;
  - linguagem técnica e operacional;
  - ausência de elementos decorativos desnecessários.
- Proibições explícitas:
  - pills como estrutura base;
  - badges como linguagem principal de metadado;
  - duplicação da mesma informação no mesmo bloco.

## 3. Project Card (ANATOMIA FIXA)

### Estrutura obrigatória
1. **Header**
   - nome do projeto
   - contexto (grupo/campus)
2. **Grid técnico (2 colunas)**
   - Fase | Status
   - Prioridade | Prazo
   - Área | Tarefas ou Progresso
   - Formato obrigatório em cada célula:
     - LABEL
     - valor
3. **Progresso**
   - barra horizontal
   - resumo textual
4. **Responsável**
   - nome + avatar discreto
5. **Ações**
   - botão primário: Abrir
   - botão secundário: Compartilhar

### Regras
- Sem pills como estrutura de metadado.
- Cor apenas como sinal semântico (status/prazo crítico).
- Layout compacto, sem “cards dentro do card”.
- Não repetir o mesmo dado em dois blocos equivalentes.

## 4. Task Row (LINHA DE TAREFA)

### Layout obrigatório
- **Esquerda**
  - título da tarefa
  - contexto (projeto)
- **Direita**
  - metadados técnicos:
    - Status
    - Prioridade
    - Foco

Formato de leitura esperado:
- `Status: Em andamento`
- `Prioridade: Alta`

### Regras
- Não usar badges.
- Não usar chips.
- A leitura deve funcionar sem depender de cor.

## 5. Page Header

### Estrutura obrigatória
- **Linha 1**
  - esquerda: título + descrição
  - direita: ações
- **Linha 2**
  - metric strip

### Regras
- Métricas não devem aparecer como cards grandes.
- Header deve manter densidade compacta.

## 6. Metric Strip

### Estrutura obrigatória
- Faixa horizontal única.
- Múltiplos blocos no formato:
  - LABEL
  - valor

### Regras
- Não usar cards para métricas simples.
- Densidade alta com leitura rápida.
- Priorizar escaneabilidade em 1 passagem.

## 7. Sidebar

### Estrutura fixa
- **Topo**
  - Nova tarefa
  - Continuar última tarefa
- **Navegação principal**
  - Hoje
  - Minhas tarefas
  - Projetos
  - Grupos
- **Rodapé de navegação**
  - Administração

### Regras
- Sem categorias artificiais.
- Ícones e labels alinhados horizontalmente.
- Ordem e estrutura consistentes em desktop e drawer mobile.

## 8. Modal

### Estrutura obrigatória
1. **Header**
   - título
   - contexto
2. **Conteúdo**
   - campos organizados
   - padrão label + input
3. **Footer**
   - ação primária
   - ação secundária

### Regras
- Não quebrar em mobile.
- Permitir scroll interno quando necessário.
- Evitar ações espalhadas fora do rodapé do modal.

## 9. Button

### Tipos
- primário
- secundário
- ghost

### Estrutura
- texto obrigatório
- ícone opcional

### Regras
- Ícone sempre centralizado e alinhado ao texto.
- Máximo de 1 CTA primária por bloco de ação.
- Não misturar múltiplos estilos primários no mesmo contexto.

## 10. Anti-padrões
Proibido explicitamente:
- pills em tarefas, projetos e listas operacionais;
- badges decorativas como linguagem dominante;
- chips coloridos como base de metadado;
- duplicação de metadados na mesma área sem ganho de leitura.

## 11. Checklist por componente
Para cada componente alterado/criado, validar:
- segue a anatomia definida?
- usa label + valor nos metadados?
- evita pills/badges/chips como estrutura base?
- evita duplicação de informação?
- mantém consistência com o sistema atual?
