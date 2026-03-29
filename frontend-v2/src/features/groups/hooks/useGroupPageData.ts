import { useMemo } from 'react';
import { useProjects } from '../../projects';
import { useGroup } from '../queries';
import { useGroupRecords } from '../../records';

interface UseGroupPageDataParams {
  groupId: string;
}

export function useGroupPageData({ groupId }: UseGroupPageDataParams) {
  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId);
  const projectParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('grupo_id', groupId || '__no_group__');
    return params;
  }, [groupId]);
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects(projectParams);

  const {
    records,
    isLoading: recordsLoading,
    error: recordsError,
  } = useGroupRecords(projects.map((project) => project.id));

  return {
    group,
    projects,
    records,
    isLoading: groupLoading || projectsLoading || recordsLoading,
    hasError: Boolean(groupError || projectsError || recordsError),
  };
}
