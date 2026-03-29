import { useProject } from '../queries';
import { useProjectTasks, useActiveSessions } from '../../tasks/queries';
import { useProjectRecords } from '../../records/queries';

interface UseProjectPageDataParams {
  projectId: string;
  currentUserId?: string;
}

export function useProjectPageData({ projectId, currentUserId }: UseProjectPageDataParams) {
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useProjectTasks(projectId, currentUserId);
  const { data: records = [], isLoading: recordsLoading, error: recordsError } = useProjectRecords(projectId);
  const { data: activeSessions = [] } = useActiveSessions();

  return {
    project,
    tasks,
    records,
    activeSessions,
    isLoading: projectLoading || tasksLoading || recordsLoading,
    hasError: Boolean(projectError || tasksError || recordsError),
  };
}
