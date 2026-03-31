import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState } from '../../../design/primitives';
import { TaskStatus } from '../../../lib/enums';
import type { ActiveTimeSession, TaskListItem } from '../types';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: TaskListItem[];
  activeSessions?: ActiveTimeSession[];
  currentUserId?: string;
  onTaskClick: (task: TaskListItem) => void;
  onStartTimer: (task: TaskListItem) => void;
  onStopTimer: (sessionId: string, task: TaskListItem) => void;
  onComplete: (task: TaskListItem) => void;
  viewMode?: 'blocks' | 'project';
  presentation?: 'default' | 'compact-status';
  density?: 'default' | 'compact';
  className?: string;
}

interface TaskBlock {
  title: string;
  status: TaskStatus;
  toneClassName: string;
}

const taskBlocks: TaskBlock[] = [
  {
    title: 'Em andamento',
    status: TaskStatus.IN_PROGRESS,
    toneClassName: 'text-info-700',
  },
  {
    title: 'Em espera',
    status: TaskStatus.WAITING,
    toneClassName: 'text-warning-700',
  },
  {
    title: 'A fazer',
    status: TaskStatus.TODO,
    toneClassName: 'text-text-primary',
  },
  {
    title: 'Concluídas',
    status: TaskStatus.DONE,
    toneClassName: 'text-success-700',
  },
];

function getSectionKey(prefix: 'status' | 'project', value: string) {
  return `${prefix}:${value}`;
}

function SectionToggle({
  title,
  subtitle,
  extra,
  toneClassName = 'text-text-primary',
  isOpen,
  onToggle,
  titleAs = 'h3',
}: {
  title: string;
  subtitle: string;
  extra?: string;
  toneClassName?: string;
  isOpen: boolean;
  onToggle: () => void;
  titleAs?: 'h2' | 'h3';
}) {
  const TitleTag = titleAs;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-4 rounded-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-info-200 focus-visible:ring-offset-2"
      aria-expanded={isOpen}
    >
      <div className="min-w-0">
        <TitleTag className={`text-xs font-medium uppercase tracking-[0.12em] ${toneClassName}`}>
          {title}
        </TitleTag>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {extra ? <span className="text-xs text-text-secondary">{extra}</span> : null}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeSessions = [],
  currentUserId,
  onTaskClick,
  onStartTimer,
  onStopTimer,
  onComplete,
  viewMode = 'blocks',
  presentation = 'default',
  density = 'default',
  className = '',
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const tasksByStatus = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<TaskStatus, TaskListItem[]>);
  }, [tasks]);

  const tasksByProject = useMemo(() => {
    const grouped = tasks.reduce((acc, task) => {
      if (!acc[task.projetoId]) {
        acc[task.projetoId] = {
          projectId: task.projetoId,
          projectName: task.projetoNome,
          tasks: [],
        };
      }

      acc[task.projetoId].tasks.push(task);
      return acc;
    }, {} as Record<string, { projectId: string; projectName: string; tasks: TaskListItem[] }>);

    return Object.values(grouped).sort((left, right) => {
      const nameCompare = left.projectName.localeCompare(right.projectName, 'pt-BR');
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return left.projectId.localeCompare(right.projectId, 'pt-BR');
    });
  }, [tasks]);

  const visibleBlocks = useMemo(
    () => taskBlocks.filter((block) => (tasksByStatus[block.status] || []).length > 0),
    [tasksByStatus],
  );

  const groupedCompact = useMemo(() => {
    return taskBlocks
      .map((block) => ({
        status: block.status,
        title: block.title,
        toneClassName: block.toneClassName,
        tasks: tasksByStatus[block.status] || [],
      }))
      .filter((entry) => entry.tasks.length > 0);
  }, [tasksByStatus]);

  const activeSessionsByTaskId = useMemo(() => {
    return activeSessions.reduce((acc, session) => {
      acc[session.tarefaId] = (acc[session.tarefaId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [activeSessions]);

  const getTaskSessions = (taskId: string): ActiveTimeSession[] => {
    return activeSessions.filter((session) => session.tarefaId === taskId);
  };

  const getCurrentUserSession = (taskId: string): ActiveTimeSession | undefined => {
    return activeSessions.find(
      (session) => session.tarefaId === taskId && session.usuarioId === currentUserId,
    );
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }

      return next;
    });
  };

  const renderTaskRow = (task: TaskListItem) => {
    const taskSessions = getTaskSessions(task.id);
    const currentUserSession = getCurrentUserSession(task.id);

    return (
      <TaskRow
        key={task.id}
        task={task}
        activeSessions={taskSessions}
        currentUserSession={currentUserSession}
        onClick={() => onTaskClick(task)}
        onStartTimer={() => onStartTimer(task)}
        onStopTimer={() => {
          if (currentUserSession) {
            onStopTimer(currentUserSession.id, task);
          }
        }}
        onComplete={() => onComplete(task)}
        density={density}
      />
    );
  };

  const renderCompactStatusList = () => {
    return (
      <div className="space-y-5">
        {groupedCompact.map((group) => (
          <section key={group.status} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className={`text-xs uppercase tracking-wide ${group.toneClassName}`}>{group.title}</h3>
              <span className="text-xs text-text-tertiary">{group.tasks.length}</span>
            </div>
            <div className="space-y-1.5">{group.tasks.map(renderTaskRow)}</div>
          </section>
        ))}
      </div>
    );
  };

  const renderStatusBlock = (block: TaskBlock, index: number) => {
    const blockTasks = tasksByStatus[block.status] || [];

    if (blockTasks.length === 0) {
      return null;
    }

    const sectionKey = getSectionKey('status', block.status);
    const isOpen = !collapsedSections.has(sectionKey);
    const activeTimersInBlock = blockTasks.reduce((count, task) => count + (activeSessionsByTaskId[task.id] || 0), 0);

    return (
      <section
        key={block.status}
        className={`${index > 0 ? 'border-t border-border-secondary pt-5' : ''} space-y-3`}
      >
        <SectionToggle
          title={block.title}
          subtitle={`${blockTasks.length} tarefa${blockTasks.length === 1 ? '' : 's'}`}
          extra={activeTimersInBlock > 0 ? `Timers ativos: ${activeTimersInBlock}` : undefined}
          toneClassName={block.toneClassName}
          isOpen={isOpen}
          onToggle={() => toggleSection(sectionKey)}
          titleAs="h2"
        />

        {isOpen ? <div className="space-y-2">{blockTasks.map(renderTaskRow)}</div> : null}
      </section>
    );
  };

  const renderProjectGrouping = () => {
    if (tasksByProject.length === 0) {
      return (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Não há tarefas para exibir nos filtros selecionados."
        />
      );
    }

    return (
      <div className="space-y-6">
        {tasksByProject.map((projectGroup, index) => {
          const sectionKey = getSectionKey('project', projectGroup.projectId);
          const isOpen = !collapsedSections.has(sectionKey);
          const projectTasks = projectGroup.tasks;
          const activeProjectTimers = projectTasks.reduce(
            (count, task) => count + (activeSessionsByTaskId[task.id] || 0),
            0,
          );

          return (
            <section
              key={projectGroup.projectId}
              className={`${index > 0 ? 'border-t border-border-secondary pt-6' : ''} space-y-4`}
            >
              <SectionToggle
                title={projectGroup.projectName}
                subtitle={`${projectTasks.length} tarefa${projectTasks.length === 1 ? '' : 's'}`}
                extra={activeProjectTimers > 0 ? `Timers ativos: ${activeProjectTimers}` : undefined}
                toneClassName="text-text-primary"
                isOpen={isOpen}
                onToggle={() => toggleSection(sectionKey)}
                titleAs="h2"
              />

              {isOpen ? (
                <div className="space-y-4">
                  {taskBlocks.map((block) => {
                    const blockTasks = projectTasks.filter((task) => task.status === block.status);

                    if (blockTasks.length === 0) return null;

                    return (
                      <div key={block.status} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className={`text-xs uppercase tracking-[0.12em] ${block.toneClassName}`}>{block.title}</h4>
                          <span className="text-xs text-text-tertiary">{blockTasks.length}</span>
                        </div>
                        <div className="space-y-2">{blockTasks.map(renderTaskRow)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa encontrada"
        description="Não há tarefas para exibir nos filtros selecionados."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {presentation === 'compact-status'
        ? renderCompactStatusList()
        : viewMode === 'blocks'
          ? <div className="space-y-5">{visibleBlocks.map(renderStatusBlock)}</div>
          : renderProjectGrouping()}
    </div>
  );
};
