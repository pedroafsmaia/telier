# Telier — Mapeamento de Rotas e Contratos

## 1. Rotas atuais do frontend

### 1.1 Estrutura de roteamento atual

O sistema usa hash-based routing com as seguintes rotas mapeadas em `src/app.js`:

```javascript
// Rotas principais
#/tarefas                    → Tarefas (página principal)
#/projetos                   → Lista de projetos  
#/grupos                     → Lista de grupos
#/admin/{tab}                → Administração

// Rotas de detalhe
#/tarefas/{taskId}/{projectId} → Tarefa específica
#/projetos/{projectId}       → Projeto específico
#/grupos/{groupId}           → Grupo específico
```

### 1.2 Comportamento de roteamento

- **Fallback**: Rotas inválidas redirecionam para `#/tarefas`
- **Preservação**: Última rota de dashboard é salva em localStorage
- **Atualização**: `window.refreshCurrentRoute()` para recarregamento programático

### 1.3 Navegação sidebar

Ordem fixa na sidebar:
1. **Tarefas** - Centro operacional do sistema
2. **Projetos** - Consulta e localização de projetos
3. **Grupos** - Consulta e localização de grupos
4. **Administração** - Apenas para administradores

## 2. Endpoints Backend consumidos

### 2.1 Autenticação e Usuários

```http
# Autenticação
POST   /api/auth/login           → Login de usuário
POST   /api/auth/logout          → Logout
POST   /api/auth/register        → Cadastro público
POST   /api/auth/setup           → Setup inicial admin
GET    /api/auth/me              → Dados do usuário atual
POST   /api/auth/trocar-senha    → Troca de senha obrigatória
GET    /api/auth/needs-setup     → Verifica se precisa setup

# Usuários  
GET    /api/usuarios             → Lista de usuários (admin)
POST   /api/usuarios             → Criar usuário (admin)
PUT    /api/usuarios/{id}/papel  → Alterar papel (admin)
PUT    /api/usuarios/{id}/senha  → Alterar senha (admin)
```

### 2.2 Projetos

```http
GET    /api/projetos              → Lista de projetos
POST   /api/projetos              → Criar projeto
GET    /api/projetos/{id}         → Detalhe do projeto
PUT    /api/projetos/{id}         → Editar projeto completo
PATCH  /api/projetos/{id}         → Editar parcial
DELETE /api/projetos/{id}         → Excluir projeto
POST   /api/projetos/{id}/permissoes    → Adicionar permissão
DELETE /api/projetos/{id}/sair           → Sair do projeto
DELETE /api/projetos/{id}/permissoes/{uid} → Remover permissão

Query params suportados em `GET /api/projetos`:
- `status` (opcional)
- `as_member` (opcional)
- `grupo_id` (opcional, filtra projetos pelo grupo no backend)
```

### 2.3 Grupos

```http
GET    /api/grupos               → Lista de grupos
POST   /api/grupos               → Criar grupo
GET    /api/grupos/{id}          → Detalhe do grupo
PUT    /api/grupos/{id}          → Editar grupo completo
PATCH  /api/grupos/{id}          → Editar parcial
DELETE /api/grupos/{id}          → Excluir grupo
POST   /api/grupos/{id}/permissoes     → Adicionar permissão
DELETE /api/grupos/{id}/sair            → Sair do grupo
DELETE /api/grupos/{id}/permissoes/{uid} → Remover permissão
```

### 2.4 Tarefas

```http
GET    /api/tarefas/minhas       → Tarefas do usuário
GET    /api/tarefas/operacao-hoje → Tarefas operacionais de hoje
GET    /api/projetos/{id}/tarefas → Tarefas de um projeto
POST   /api/projetos/{id}/tarefas → Criar tarefa
PUT    /api/tarefas/{id}         → Editar tarefa
PATCH  /api/tarefas/{id}/status  → Mudar status
DELETE /api/tarefas/{id}         → Excluir tarefa
POST   /api/tarefas/{id}/duplicar → Duplicar tarefa
PUT    /api/tarefas/{id}/foco    → Focar/desfocar tarefa
DELETE /api/tarefas/{id}/foco    → Remover foco
GET    /api/tarefas/{id}/colaboradores → Colaboradores da tarefa
POST   /api/tarefas/{id}/colaboradores → Adicionar colaborador
DELETE /api/tarefas/{id}/sair           → Sair da tarefa
DELETE /api/tarefas/{id}/colaboradores/{uid} → Remover colaborador
```

### 2.5 Tempo e Cronômetros

```http
GET    /api/tempo/ativas           → Sessões ativas
GET    /api/tempo/ultima-sessao     → Última sessão do usuário
GET    /api/tempo/resumo-hoje      → Resumo de hoje
GET    /api/tempo/sessoes-recentes → Sessões recentes
GET    /api/tempo/colegas-ativos   → Colegas com sessões ativas
POST   /api/tarefas/{id}/tempo     → Iniciar sessão
GET    /api/tarefas/{id}/tempo     → Histórico de sessões da tarefa
PUT    /api/tempo/{id}/parar       → Parar sessão
PUT    /api/tempo/{id}             → Editar sessão
DELETE /api/tempo/{id}             → Excluir sessão
POST   /api/tempo/{id}/intervalos  → Adicionar intervalo
GET    /api/intervalos             → Listar intervalos
PUT    /api/intervalos/{id}        → Editar intervalo
DELETE /api/intervalos/{id}        → Excluir intervalo
```

### 2.6 Registros (Decisões, Pendências, Observações)

```http
GET    /api/projetos/{id}/decisoes → Decisões do projeto
POST   /api/projetos/{id}/decisoes → Criar decisão
PUT    /api/decisoes/{id}          → Editar decisão
DELETE /api/decisoes/{id}          → Excluir decisão
```

### 2.7 Administração

```http
GET    /api/admin/agora            → Visão administrativa agora
GET    /api/admin/timeline-hoje    → Timeline de hoje
GET    /api/admin/usuarios         → Usuários (admin)
GET    /api/admin/usuarios/{id}    → Detalhe usuário (admin)
GET    /api/admin/projetos         → Projetos (admin)
GET    /api/admin/tempo            → Tempo (admin)
GET    /api/admin/horas-por-grupo  → Horas por grupo (admin)
```

### 2.8 Status e Notificações

```http
GET    /api/status                 → Status geral do sistema
GET    /api/notificacoes           → Notificações do usuário
PUT    /api/notificacoes/lidas     → Marcar todas como lidas
# POST  /api/notificacoes/gerar-automaticas (comentado, não usado)
```

### 2.9 Templates de Tarefa

```http
GET    /api/templates-tarefa       → Listar templates
POST   /api/templates-tarefa       → Criar template
PUT    /api/templates-tarefa/{id}  → Editar template
DELETE /api/templates-tarefa/{id}  → Excluir template
```

## 3. Contratos de dados principais

### 3.1 Usuário

```typescript
interface User {
  id: string;                    // usr_xxx
  nome: string;
  usuario_login: string;
  papel: 'admin' | 'membro';
  deve_trocar_senha?: 0 | 1;
  criado_em: string;
}
```

### 3.2 Projeto

```typescript
interface Project {
  id: string;                    // prj_xxx
  nome: string;
  fase: string;
  status: string;
  prioridade: string;
  prazo?: string;
  area_m2?: number;
  grupo_id?: string;
  dono_id: string;
  editores: Array<{
    id: string;
    nome: string;
    origem: 'manual' | 'auto';
  }>;
  pode_gerenciar?: boolean;
  total_tarefas?: number;
  tarefas_concluidas?: number;
}
```

### 3.3 Grupo

```typescript
interface Group {
  id: string;                    // grp_xxx
  nome: string;
  status: string;
  descricao?: string;
  dono_id: string;
  colaboradores: Array<{
    id: string;
    nome: string;
    origem: 'manual' | 'auto';
  }>;
  pode_gerenciar?: boolean;
  _projetos?: Project[];          // Payload adicional
}
```

### 3.4 Tarefa

```typescript
interface Task {
  id: string;                    // tsk_xxx
  titulo: string;
  descricao?: string;
  status: 'a-fazer' | 'em-andamento' | 'em-espera' | 'concluida';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  complexidade: 'muito-facil' | 'facil' | 'medio' | 'dificil' | 'muito-dificil';
  projeto_id: string;
  projeto_nome: string;
  criado_por_id: string;
  criado_por_nome: string;
  responsaveis: Array<{
    id: string;
    nome: string;
  }>;
  prazo?: string;
  observacao_espera?: string;     // Para status "em-espera"
  foco_por?: string;             // ID do usuário focado
  criado_em: string;
  atualizado_em: string;
}
```

### 3.5 Sessão de Tempo

```typescript
interface TimeSession {
  id: string;                    // sess_xxx
  tarefa_id: string;
  tarefa_nome: string;
  projeto_id: string;
  projeto_nome: string;
  usuario_id: string;
  usuario_nome: string;
  inicio: string;                // datetime
  fim?: string;                   // datetime, null se ativa
  horas_liquidas: number;
  intervalos?: Array<{
    id: string;
    tipo: string;
    inicio: string;
    fim?: string;
  }>;
}
```

### 3.6 Decisão/Registro

```typescript
interface Decision {
  id: string;                    // dec_xxx
  projeto_id: string;
  titulo: string;
  descricao?: string;
  criado_por_id: string;
  criado_por_nome: string;
  criado_em: string;
  tipo: 'decisao' | 'pendencia' | 'observacao';
  resolvida?: 0 | 1;
}
```

## 4. Normalizações necessárias para nova UI

### 4.1 Nomenclatura

| Backend | Nova UI | Justificativa |
|---------|---------|---------------|
| `complexidade` | `facilidade` | Mais intuitivo para usuário |
| `criado_por_id/nome` | `criadoPor` (objeto) | Estrutura normalizada |
| `responsaveis` | `responsaveis` (array) | Já está bom |
| `editores` | `colaboradores` | Consistência |

### 4.2 Enums internos vs strings

Backend usa strings literais. Nova UI deve usar enums internos:

```typescript
// Backend: 'a-fazer' | 'em-andamento' | 'em-espera' | 'concluida'
// Nova UI: TaskStatus enum com valores correspondentes

// Backend: 'baixa' | 'media' | 'alta' | 'urgente'  
// Nova UI: Priority enum com valores correspondentes

// Backend: 'muito-facil' | 'facil' | 'medio' | 'dificil' | 'muito-dificil'
// Nova UI: Ease enum com valores correspondentes
```

### 4.3 Data/hora

Backend usa strings no formato `YYYY-MM-DD HH:MM:SS`. Nova UI deve:
- Normalizar para objetos Date internamente
- Formatar para exibição com funções utilitárias
- Enviar para backend no mesmo formato

### 4.4 IDs

Backend usa prefixos (`usr_`, `prj_`, `grp_`, `tsk_`). Nova UI deve:
- Manter os mesmos IDs para compatibilidade
- Tratar como strings opacas (não depender de prefixos)

## 5. Cache e invalidação

### 5.1 Cache atual

- **Projetos**: SessionStorage com TTL de 5 minutos
- **Tarefas**: Cache implícito no estado global
- **Sessões ativas**: Polling a cada 30 segundos

### 5.2 Estratégia para nova UI

- **TanStack Query**: Cache automático com stale-while-revalidate
- **Invalidação**: Mutations devem invalidar queries relacionadas
- **Offline**: Considerar cache offline para leitura básica

## 6. Permissões e visibilidade

### 6.1 Papéis

- **admin**: Visão global de tudo
- **membro**: Apenas itens próprios ou compartilhados

### 6.2 Regras de visibilidade

```typescript
// Usuário comum vê:
GET /api/tarefas/minhas           // Apenas próprias/compartilhadas
GET /api/projetos?as_member=1    // Apenas onde é colaborador  
GET /api/grupos?as_member=1       // Apenas onde é colaborador

// Admin vê tudo sem filtro
```

### 6.3 Guards de frontend

- Rotas admin apenas para `user.papel === 'admin'`
- Ações de editar apenas se `pode_gerenciar === true`
- Timer apenas se for colaborador da tarefa

## 7. Fluxos críticos

### 7.1 Timer

```typescript
// Iniciar timer
POST /api/tarefas/{taskId}/tempo
Body: { inicio: "2024-01-01 10:00:00" }

// Parar timer  
PUT /api/tempo/{sessionId}/parar
Body: { fim: "2024-01-01 11:00:00" }

// Regra: Um usuário só pode ter uma sessão ativa por vez
```

### 7.2 Compartilhamento

```typescript
// Adicionar colaborador em projeto
POST /api/projetos/{id}/permissoes
Body: { usuario_id: "usr_xxx" }

// Adicionar colaborador em tarefa
POST /api/tarefas/{id}/colaboradores  
Body: { usuario_id: "usr_xxx" }
```

### 7.3 Mudança de status

```typescript
// Mudar status da tarefa
PATCH /api/tarefas/{id}/status
Body: { status: "em-andamento", observacao_espera?: "texto" }
```

## 8. Considerações para migração

### 8.1 Compatibilidade

- Manter todos os endpoints existentes
- Não alterar contratos do backend
- Usar adapters para normalizar dados

### 8.2 Performance

- Reduzir número de requests (batching onde possível)
- Implementar cache inteligente
- Evitar polling excessivo (usar WebSocket se necessário)

### 8.3 Offline

- Considerar service worker para cache básico
- Permitir leitura offline de itens recentes
- Sincronização quando voltar online
