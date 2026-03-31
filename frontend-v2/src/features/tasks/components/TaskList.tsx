import React, { useMemo, useState } from 'react';
import { CollapsibleSection, EmptyState } from '../../../design/primitives';
import { TaskRow } from './TaskRow';
import { TaskStatus } from '../../../lib/enums';
import type { TaskListItem, ActiveTimeSession } from '../types';

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
  sectionClassName: string;
}

const taskBlocks: TaskBlock[] = [
  {
    title: 'Em andamento',
    status: TaskStatus.IN_PROGRESS,
    sectionClassName:
      'border-info-200 bg-info-50/35 [&>div:first-child]:border-b [&>div:first-child]:border-info-100 [&>div:first-child]:bg-info-50/75 [&>div:last-child]:border-info-100',
  },
  {
    title: 'Em espera',
    status: TaskStatus.WAITING,
    sectionClassName:
      'border-warning-300 bg-warning-50/45 [&>div:first-child]:border-b [&>div:first-child]:border-warning-200 [&>div:first-child]:bg-warning-50/80 [&>div:last-child]:border-warning-200',
  },
  {
    title: 'A fazer',
    status: TaskStatus.TODO,
    sectionClassName:
      'border-border-primary bg-surface-secondary/35 [&>div:first-child]:border-b [&>div:first-child]:border-border-secondary [&>div:first-child]:bg-surface-secondary/70 [&>div:last-child]:border-border-secondary',
  },
  {
    title: 'Concluídas',
    status: TaskStatus.DONE,
    sectionClassName:
      'border-success-200 bg-success-50/35 [&>div:first-child]:border-b [&>div:first-child]:border-success-100 [&>div:first-child]:bg-success-50/80 [&>div:last-child]:border-success-100',
  },
];

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
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<TaskStatus>>(new Set());

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
      const nameCompare = left.projectName.localeCompare(right.projectName);
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return left.projectId.localeCompare(right.projectId);
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

  const toggleBlockCollapse = (status: TaskStatus, isOpen: boolean) => {
    const newCollapsed = new Set(collapsedBlocks);
    if (isOpen) {
      newCollapsed.delete(status);
    } else {
      newCollapsed.add(status);
    }
    setCollapsedBlocks(newCollapsed);
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
      <div className="space-y-3">
        {groupedCompact.map((group) => (
          <section key={group.status} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wide text-text-tertiary">{group.title}</h3>
              <span className="text-xs text-text-tertiary">{group.tasks.length}</span>
            </div>
            <div className="space-y-1.5">{group.tasks.map(renderTaskRow)}</div>
          </section>
        ))}
      </div>
    );
  };

  const renderStatusBlock = (block: TaskBlock) => {
    const blockTasks = tasksByStatus[block.status] || [];
    const activeTimersInBlock = blockTasks.reduce((count, task) => {
      return count + (activeSessionsByTaskId[task.id] || 0);
    }, 0);

    if (blockTasks.length === 0) {
      return null;
    }

    const isCollapsed = collapsedBlocks.has(block.status);

    return (
      <CollapsibleSection
        key={block.status}
        title={block.title}
        subtitle={`${blockTasks.length} tarefa${blockTasks.length !== 1 ? 's' : ''}`}
        defaultOpen={!isCollapsed}
        onToggle={(isOpen: boolean) => toggleBlockCollapse(block.status, isOpen)}
        className={`mb-5 ${block.sectionClassName}`}
        actions={
          <div className="flex items-center gap-2">
            {activeTimersInBlock > 0 ? (
              <span className="inline-flex items-center rounded-full border border-warning-200 bg-warning-100 px-2 py-1 text-[11px] font-medium text-warning-600">
                {activeTimersInBlock} timer{activeTimersInBlock === 1 ? '' : 's'} em execucao
              </span>
            ) : null}
          </div>
        }
      >
        <div className="space-y-2">{blockTasks.map(renderTaskRow)}</div>
      </CollapsibleSection>
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
        {tasksByProject.map((projectGroup) => {
          const projectTasks = projectGroup.tasks;
          const nonCompletedTasks = projectTasks.filter((task) => task.status !== TaskStatus.DONE);
          const completedTasks = projectTasks.filter((task) => task.status === TaskStatus.DONE);

          return (
            <CollapsibleSection
              key={projectGroup.projectId}
              title={projectGroup.projectName}
              subtitle={`${projectTasks.length} tarefa${projectTasks.length !== 1 ? 's' : ''}`}
              className="mb-6"
            >
              {taskBlocks
                .filter((block) => block.status !== TaskStatus.DONE)
                .map((block) => {
                  const blockTasks = nonCompletedTasks.filter((task) => task.status === block.status);

                  if (blockTasks.length === 0) return null;

                  return (
                    <div key={block.status} className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-text-secondary">
                        {block.title} ({blockTasks.length})
                      </h4>
                      <div className="space-y-2 ml-2">{blockTasks.map(renderTaskRow)}</div>
                    </div>
                  );
                })}

              {completedTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <h4 className="text-sm font-medium text-green-600 mb-2">Concluídas ({completedTasks.length})</h4>
                  <div className="space-y-2 ml-2">{completedTasks.map(renderTaskRow)}</div>
                </div>
              )}
            </CollapsibleSection>
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
          ? <>{visibleBlocks.map(renderStatusBlock)}</>
          : renderProjectGrouping()}
    </div>
  );
};
