// Componente de teste para validar a camada de dados da Fase 2
// Este componente demonstra o consumo correto dos dados através dos adapters

import { 
  useMyTasks, 
  useActiveSessions, 
  useDailySummary,
} from '../features/tasks';
import { useProjects } from '../features/projects';
import { 
  ProjectStatus
} from '../lib/enums';
import { 
  TaskStatus, 
  Priority, 
  Ease,
  getTaskStatusLabel,
  getPriorityLabel,
  getEaseLabel
} from '../lib/enums';
import { useGroups } from '../features/groups';
import { 
  GroupStatus 
} from '../lib/enums';
import { useCurrentSession } from '../features/admin';

function LoadingState({ label }: { label: string }) {
  return (
    <div className="p-4 bg-surface-secondary rounded-lg animate-pulse">
      <div className="text-text-muted text-sm">Carregando {label}...</div>
    </div>
  );
}

function ErrorState({ label, message }: { label: string; message: string }) {
  return (
    <div className="p-4 bg-status-error/10 border border-status-error rounded-lg">
      <div className="text-status-error text-sm font-medium">Erro ao carregar {label}</div>
      <div className="text-text-muted text-xs mt-1">{message}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-4 bg-surface-secondary rounded-lg">
      <div className="text-text-muted text-sm">Nenhum(a) {label} encontrado(a)</div>
    </div>
  );
}

export function DataLayerTest() {
  // Teste: Sessão atual
  const sessionQuery = useCurrentSession();
  
  // Teste: Minhas tarefas (com userId para determinar compartilhamento)
  const tasksQuery = useMyTasks(sessionQuery.data?.userId);
  
  // Teste: Sessões ativas
  const activeSessionsQuery = useActiveSessions();
  
  // Teste: Resumo diário
  const dailySummaryQuery = useDailySummary();
  
  // Teste: Projetos
  const projectsQuery = useProjects();
  
  // Teste: Grupos
  const groupsQuery = useGroups();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary">
          Teste da Camada de Dados — Fase 2
        </h1>
        <p className="text-text-muted mt-1">
          Validação da integração entre queries, adapters e tipos internos.
        </p>
      </header>

      {/* Sessão Atual */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Sessão Atual</h2>
        {sessionQuery.isLoading && <LoadingState label="sessão" />}
        {sessionQuery.error && <ErrorState label="sessão" message={sessionQuery.error.message} />}
        {sessionQuery.data && (
          <div className="p-4 bg-surface-secondary rounded-lg space-y-2">
            <div className="text-sm">
              <span className="text-text-muted">Usuário:</span>{' '}
              <span className="text-text-primary font-medium">{sessionQuery.data.nome}</span>
            </div>
            <div className="text-sm">
              <span className="text-text-muted">Login:</span>{' '}
              <span className="text-text-primary">{sessionQuery.data.login}</span>
            </div>
            <div className="text-sm">
              <span className="text-text-muted">Admin:</span>{' '}
              <span className={sessionQuery.data.isAdmin ? 'text-status-success' : 'text-text-primary'}>
                {sessionQuery.data.isAdmin ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Resumo Diário */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Resumo do Dia</h2>
        {dailySummaryQuery.isLoading && <LoadingState label="resumo" />}
        {dailySummaryQuery.error && <ErrorState label="resumo" message={dailySummaryQuery.error.message} />}
        {dailySummaryQuery.data && (
          <div className="p-4 bg-surface-secondary rounded-lg flex gap-8">
            <div>
              <div className="text-2xl font-semibold text-text-primary">
                {dailySummaryQuery.data.horasHoje.toFixed(1)}h
              </div>
              <div className="text-text-muted text-sm">Horas hoje</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">
                {dailySummaryQuery.data.sessoesHoje}
              </div>
              <div className="text-text-muted text-sm">Sessões</div>
            </div>
          </div>
        )}
      </section>

      {/* Sessões Ativas */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">
          Sessões Ativas
          {activeSessionsQuery.data && (
            <span className="ml-2 text-sm text-text-muted">
              ({activeSessionsQuery.data.length})
            </span>
          )}
        </h2>
        {activeSessionsQuery.isLoading && <LoadingState label="sessões" />}
        {activeSessionsQuery.error && <ErrorState label="sessões" message={activeSessionsQuery.error.message} />}
        {activeSessionsQuery.data?.length === 0 && <EmptyState label="sessão ativa" />}
        {activeSessionsQuery.data && activeSessionsQuery.data.length > 0 && (
          <div className="space-y-2">
            {activeSessionsQuery.data.map((session) => (
              <div key={session.id} className="p-4 bg-surface-secondary rounded-lg flex items-center gap-4">
                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="text-text-primary font-medium">{session.tarefaNome}</div>
                  <div className="text-text-muted text-sm">{session.projetoNome}</div>
                </div>
                <div className="text-text-muted text-sm">{session.usuarioNome}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Minhas Tarefas */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">
          Minhas Tarefas
          {tasksQuery.data && (
            <span className="ml-2 text-sm text-text-muted">
              ({tasksQuery.data.length})
            </span>
          )}
        </h2>
        {tasksQuery.isLoading && <LoadingState label="tarefas" />}
        {tasksQuery.error && <ErrorState label="tarefas" message={tasksQuery.error.message} />}
        {tasksQuery.data?.length === 0 && <EmptyState label="tarefa" />}
        {tasksQuery.data && tasksQuery.data.length > 0 && (
          <div className="space-y-2">
            {tasksQuery.data.slice(0, 5).map((task) => (
              <div key={task.id} className="p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-text-primary font-medium">{task.nome}</div>
                    <div className="text-text-muted text-sm">{task.projetoNome}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Status normalizado */}
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      task.status === TaskStatus.DONE ? 'bg-status-success/10 text-status-success' :
                      task.status === TaskStatus.IN_PROGRESS ? 'bg-status-info/10 text-status-info' :
                      task.status === TaskStatus.WAITING ? 'bg-status-warning/10 text-status-warning' :
                      'bg-surface-tertiary text-text-muted'
                    }`}>
                      {getTaskStatusLabel(task.status)}
                    </span>
                    {/* Prioridade normalizada */}
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      task.prioridade === Priority.URGENT ? 'bg-status-error/10 text-status-error' :
                      task.prioridade === Priority.HIGH ? 'bg-status-warning/10 text-status-warning' :
                      'bg-surface-tertiary text-text-muted'
                    }`}>
                      {getPriorityLabel(task.prioridade)}
                    </span>
                    {/* Facilidade normalizada (era complexidade no backend) */}
                    <span className="px-2 py-0.5 text-xs rounded bg-surface-tertiary text-text-muted">
                      {getEaseLabel(task.facilidade)}
                    </span>
                  </div>
                </div>
                {/* Indicadores */}
                <div className="mt-2 flex gap-3 text-xs text-text-muted">
                  {task.prazo && <span>Prazo: {task.prazo}</span>}
                  {task.compartilhada && <span className="text-status-info">Compartilhada</span>}
                  {task.foco && <span className="text-status-warning">Em foco</span>}
                  {task.sessaoAtivaId && <span className="text-status-success">Timer ativo</span>}
                </div>
              </div>
            ))}
            {tasksQuery.data.length > 5 && (
              <div className="text-text-muted text-sm text-center py-2">
                + {tasksQuery.data.length - 5} tarefas
              </div>
            )}
          </div>
        )}
      </section>

      {/* Projetos */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">
          Projetos
          {projectsQuery.data && (
            <span className="ml-2 text-sm text-text-muted">
              ({projectsQuery.data.length})
            </span>
          )}
        </h2>
        {projectsQuery.isLoading && <LoadingState label="projetos" />}
        {projectsQuery.error && <ErrorState label="projetos" message={projectsQuery.error.message} />}
        {projectsQuery.data?.length === 0 && <EmptyState label="projeto" />}
        {projectsQuery.data && projectsQuery.data.length > 0 && (
          <div className="space-y-2">
            {projectsQuery.data.slice(0, 5).map((project) => (
              <div key={project.id} className="p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-text-primary font-medium">{project.nome}</div>
                    {project.grupoNome && (
                      <div className="text-text-muted text-sm">{project.grupoNome}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      project.status === ProjectStatus.ARCHIVED ? 'bg-surface-tertiary text-text-muted' :
                      project.status === ProjectStatus.DONE ? 'bg-status-success/10 text-status-success' :
                      project.status === ProjectStatus.IN_PROGRESS ? 'bg-status-info/10 text-status-info' :
                      'bg-surface-tertiary text-text-muted'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {project.tarefasConcluidas}/{project.totalTarefas} tarefas
                  {project.compartilhadoComigo && (
                    <span className="ml-3 text-status-info">Compartilhado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grupos */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">
          Grupos
          {groupsQuery.data && (
            <span className="ml-2 text-sm text-text-muted">
              ({groupsQuery.data.length})
            </span>
          )}
        </h2>
        {groupsQuery.isLoading && <LoadingState label="grupos" />}
        {groupsQuery.error && <ErrorState label="grupos" message={groupsQuery.error.message} />}
        {groupsQuery.data?.length === 0 && <EmptyState label="grupo" />}
        {groupsQuery.data && groupsQuery.data.length > 0 && (
          <div className="space-y-2">
            {groupsQuery.data.map((group) => (
              <div key={group.id} className="p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-text-primary font-medium">{group.nome}</div>
                    {group.descricao && (
                      <div className="text-text-muted text-sm line-clamp-1">{group.descricao}</div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    group.status === GroupStatus.ARCHIVED ? 'bg-surface-tertiary text-text-muted' :
                    group.status === GroupStatus.PAUSED ? 'bg-status-warning/10 text-status-warning' :
                    'bg-status-success/10 text-status-success'
                  }`}>
                    {group.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {group.totalProjetos} projetos
                  {group.projetosAtrasados > 0 && (
                    <span className="ml-3 text-status-error">{group.projetosAtrasados} atrasados</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Enums de referência */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-text-primary">Enums Internos (Referência)</h2>
        <div className="p-4 bg-surface-secondary rounded-lg space-y-4 text-sm">
          <div>
            <div className="text-text-muted mb-1">TaskStatus:</div>
            <code className="text-text-primary">
              {Object.entries(TaskStatus).map(([k, v]) => `${k}="${v}"`).join(', ')}
            </code>
          </div>
          <div>
            <div className="text-text-muted mb-1">Priority:</div>
            <code className="text-text-primary">
              {Object.entries(Priority).map(([k, v]) => `${k}="${v}"`).join(', ')}
            </code>
          </div>
          <div>
            <div className="text-text-muted mb-1">Ease (facilidade, não complexidade):</div>
            <code className="text-text-primary">
              {Object.entries(Ease).map(([k, v]) => `${k}="${v}"`).join(', ')}
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DataLayerTest;
