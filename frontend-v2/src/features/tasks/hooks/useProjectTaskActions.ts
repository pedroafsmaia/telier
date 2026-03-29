import { useTaskActionState } from './useTaskActionState';
import type { ActiveTimeSession, TaskListItem } from '../types';

interface UseProjectTaskActionsParams {
  projectId: string;
  tasks: TaskListItem[];
  activeSessions: ActiveTimeSession[];
  currentUserId?: string;
}

export function useProjectTaskActions({
  projectId,
  tasks,
  activeSessions,
  currentUserId,
}: UseProjectTaskActionsParams) {
  return useTaskActionState({
    tasks,
    activeSessions,
    currentUserId,
    fixedProjectId: projectId,
  });
}
