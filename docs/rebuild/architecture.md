# Telier — Arquitetura do Rebuild do Frontend

## 1. Decisão estratégica

### 1.1 O que será feito

Será feito um **rebuild controlado do frontend**, em paralelo à base atual.

Isso significa:
- manter backend, autenticação, banco e contratos HTTP existentes sempre que possível;
- construir uma nova aplicação frontend com arquitetura correta;
- migrar a experiência do usuário para a nova aplicação por fases;
- remover a UI antiga somente no final, quando houver paridade mínima comprovada.

### 1.2 O que não será feito

Não fazer nenhuma das opções abaixo:
- redesign incremental sobre a base antiga;
- "limpeza gradual" do código legado como estratégia principal;
- mistura entre componentes novos e antigos na mesma árvore principal;
- manutenção paralela longa de duas linguagens visuais diferentes;
- refactor cosmético sem mudança estrutural;
- reescrever backend sem necessidade real;
- trocar a identidade visual do Telier por uma estética nova.

### 1.3 Motivo da decisão

A base atual apresenta sintomas típicos de acúmulo de dívida por evolução fragmentada:
- interface inconsistente entre páginas;
- acoplamento alto entre lógica e renderização;
- comportamento irregular;
- bugs e lentidão percebida;
- refactors anteriores implementados pela metade;
- excesso de markup e estilos locais;
- dificuldade de previsão para IAs executoras.

Nessas condições, continuar iterando sobre a base antiga tem alta chance de consumir mais tempo e ainda preservar instabilidade estrutural.

## 2. Stack técnico

### 2.1 Escolhas obrigatórias

Usar:
- **Vite** - Build tool rápido e moderno
- **React** - Biblioteca UI declarativa
- **TypeScript** - Tipagem estática para previsibilidade
- **React Router** - Navegação declarativa
- **TanStack Query** - Cache e sincronização de servidor
- **Zustand** (somente se necessário) - Estado global mínimo
- **Tailwind CSS + tokens CSS** - Estilos previsíveis e mantíveis

### 2.2 Proibições técnicas

Não usar:
- Next.js (excesso de abstração para este caso)
- Redux (complexidade desnecessária)
- arquitetura excessivamente abstrata
- component libraries genéricas pesadas como base visual
- CSS-in-JS (risco de inconsistência visual)

### 2.3 Justificativa das escolhas

**Vite + React + TypeScript**: Combinação madura, performática e com excelente DX para rebuild controlado.

**TanStack Query**: Essencial para lidar com cache, invalidação e sincronização com o backend existente sem complexidade desnecessária.

**Tailwind + tokens CSS**: Garante consistência visual com a identidade existente do Telier, evita CSS caótico e permite evolução controlada.

## 3. Estrutura de diretórios alvo

```
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

## 4. Contrato interno de dados

### 4.1 Normalizações obrigatórias

A nova UI não deve refletir confusões de nomenclatura da base antiga.

Obrigatório normalizar:
- `complexidade` -> `facilidade` na interface;
- `criadoPor` separado de `responsaveis`;
- aliases legados tratados em adaptadores;
- status, prioridade e facilidade com enums internos claros;
- contratos de tempo desacoplados da forma antiga quando necessário.

### 4.2 Enums internos

```typescript
// lib/enums.ts
export enum TaskStatus {
  TODO = 'a-fazer',
  IN_PROGRESS = 'em-andamento',
  WAITING = 'em-espera',
  DONE = 'concluida'
}

export enum Priority {
  LOW = 'baixa',
  MEDIUM = 'media',
  HIGH = 'alta',
  URGENT = 'urgente'
}

export enum Ease {
  VERY_EASY = 'muito-facil',
  EASY = 'facil',
  MEDIUM = 'medio',
  HARD = 'dificil',
  VERY_HARD = 'muito-dificil'
}

export enum RecordType {
  DECISION = 'decisao',
  PENDING = 'pendencia',
  NOTE = 'observacao'
}
```

## 5. Estado global

### 5.1 O que pode ser global

Só pode existir estado global para o que realmente é transversal:
- sessão do usuário;
- timer global ativo;
- preferências mínimas de visualização, se necessário.

### 5.2 O que deve ficar local

Todo o resto deve ficar local ao domínio ou sob cache de query:
- estado de formulários;
- filtros de tela;
- seleções temporárias;
- UI states específicos de páginas.

## 6. Performance

### 6.1 Obrigatório

A nova UI precisa ser naturalmente mais rápida e previsível do que a antiga.

Obrigatório:
- listas com renderização estável (React.memo, useMemo onde necessário);
- evitar re-render desnecessário;
- não recalcular estruturas pesadas em toda renderização;
- não refazer fetch sem necessidade;
- skeletons estáveis durante carregamento;
- evitar layout shift grosseiro.

### 6.2 Métricas alvo

- Primeira renderização < 1.5s
- Navegação entre páginas < 500ms
- Timer updates em tempo real sem lag
- Listas grandes com virtualização se necessário

## 7. Segurança e permissões

### 7.1 Continuidade do backend

Manter exatamente os mesmos contratos de autenticação e permissões do backend existente:
- Token Bearer JWT
- Papéis: admin, membro
- Permissões por recurso (projetos, grupos, tarefas)

### 7.2 Frontend safeguards

- Guards de rota para áreas administrativas
- Verificação de permissão antes de renderizar ações
- Fallbacks gracefully para usuários sem permissão

## 8. Design system

### 8.1 Tokens visuais

Baseado na identidade existente do Telier:
- Cores funcionais (status, prioridade, alertas)
- Tipografia institucional (Inter + DM Mono)
- Densidade controlada
- Superfícies neutras

### 8.2 Primitives

Todos os componentes visuais devem derivar das primitives definidas em `design/primitives/`. Nenhum componente deve implementar estilo próprio ou inline.

### 8.3 Tema

Suporte a tema claro/escuro mantendo a identidade institucional. Cores institucionais preservadas em ambos os temas.

## 9. Migração e coexistência

### 9.1 Estratégia de migração

1. Nova app construída em paralelo
2. Flag feature para alternar entre UIs
3. Migração gradual por área
4. Corte do legado apenas com paridade comprovada

### 9.2 Compartilhamento de recursos

- Backend: compartilhado 100%
- Autenticação: compartilhada 100%
- Banco: compartilhado 100%
- Assets: migrados gradualmente

## 10. Qualidade e manutenibilidade

### 10.1 Padrões de código

- TypeScript strict mode
- ESLint + Prettier
- Componentes com tipagem completa
- Testes em camadas críticas

### 10.2 Documentação

- README com setup e desenvolvimento
- Componentes documentados com JSDoc
- Guia de contribuição para novas features

## 11. Riscos e mitigações

### 11.1 Riscos técnicos

- **Complexidade do backend existente**: Mitigado com adapters bem definidos
- **Performance da migração**: Mitigado com flag feature e rollback rápido
- **Perda de features**: Mitigado com mapeamento exato e testes de paridade

### 11.2 Riscos de produto

- **Rejeição pelos usuários**: Mitigado com preservação da identidade visual
- **Quebra de fluxos críticos**: Mitigado com testes exaustivos e migração gradual
- **Dívida técnica na nova base**: Mitigado com arquitetura limpa desde o início

## 12. Sucesso

### 12.1 Critérios de sucesso

- Performance superior à UI atual
- Zero regressões funcionais
- Manutenção simplificada
- Evolução previsível com IA

### 12.2 Métricas de sucesso

- Tempo de carregamento 50% menor
- Bugs reportados 80% menor
- Tempo de feature-to-production 60% menor
- Satisfação do usuário mantida ou aumentada
