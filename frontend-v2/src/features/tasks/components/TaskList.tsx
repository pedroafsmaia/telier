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
  color: string;
}

const taskBlocks: TaskBlock[] = [
  { title: 'Em andamento', status: TaskStatus.IN_PROGRESS, color: 'text-blue-600' },
  { title: 'Em espera', status: TaskStatus.WAITING, color: 'text-yellow-600' },
  { title: 'A fazer', status: TaskStatus.TODO, color: 'text-gray-600' },
  { title: 'Concluídas', status: TaskStatus.DONE, color: 'text-green-600' },
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
    return tasks.reduce((acc, task) => {
      const projectKey = task.projetoNome;
      if (!acc[projectKey]) {
        acc[projectKey] = [];
      }
      acc[projectKey].push(task);
      return acc;
    }, {} as Record<string, TaskListItem[]>);
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
        className="mb-6"
      >
        <div className="space-y-2">{blockTasks.map(renderTaskRow)}</div>
      </CollapsibleSection>
    );
  };

  const renderProjectGrouping = () => {
    const projectNames = Object.keys(tasksByProject).sort();

    if (projectNames.length === 0) {
      return (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Não há tarefas para exibir nos filtros selecionados."
        />
      );
    }

    return (
      <div className="space-y-6">
        {projectNames.map((projectName) => {
          const projectTasks = tasksByProject[projectName];
          const nonCompletedTasks = projectTasks.filter((task) => task.status !== TaskStatus.DONE);
          const completedTasks = projectTasks.filter((task) => task.status === TaskStatus.DONE);

          return (
            <CollapsibleSection
              key={projectName}
              title={projectName}
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
                      <h4 className={`text-sm font-medium ${block.color} mb-2`}>
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
