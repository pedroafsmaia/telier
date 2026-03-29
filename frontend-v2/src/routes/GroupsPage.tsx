import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { useAuth } from '../lib/auth';
import { GroupStatus } from '../lib/enums';
import { useCreateGroup, useGroups, GroupFormDrawer } from '../features/groups';
import { SectionHeader, EmptyState, Button, SearchField, Select, Panel, Badge } from '../design/primitives';
import type { CreateGroupPayload } from '../features/groups';

function getStatusLabel(status: string): string {
  switch (status) {
    case GroupStatus.ACTIVE:
      return 'Ativo';
    case GroupStatus.PAUSED:
      return 'Pausado';
    case GroupStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return status;
  }
}

function getStatusVariant(status: string): 'default' | 'warning' | 'error' {
  switch (status) {
    case GroupStatus.PAUSED:
      return 'warning';
    case GroupStatus.ARCHIVED:
      return 'error';
    default:
      return 'default';
  }
}

export function GroupsPage() {
  const navigate = useNavigate();
  const { isLoading: authLoading, currentUserId } = useAuth();
  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useGroups();
  const createGroupMutation = useCreateGroup();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Todos os status' },
      { value: GroupStatus.ACTIVE, label: getStatusLabel(GroupStatus.ACTIVE) },
      { value: GroupStatus.PAUSED, label: getStatusLabel(GroupStatus.PAUSED) },
      { value: GroupStatus.ARCHIVED, label: getStatusLabel(GroupStatus.ARCHIVED) },
    ],
    [],
  );

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (
        searchQuery &&
        !group.nome.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(group.descricao || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (selectedStatus && group.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [groups, searchQuery, selectedStatus]);

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    const createdGroup = await createGroupMutation.mutateAsync(payload);
    navigate(`/grupos/${createdGroup.id}`);
  };

  if (authLoading || groupsLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <SectionHeader title="Grupos" subtitle="Carregando..." />
          <div className="mt-8">
            <EmptyState title="Carregando grupos..." description="Buscando lista de grupos." />
          </div>
        </div>
      </AppShell>
    );
  }

  if (groupsError) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <SectionHeader title="Grupos" subtitle="Erro ao carregar" />
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar grupos"
              description="Nao foi possivel buscar os grupos. Tente recarregar a pagina."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SectionHeader
          title="Grupos"
          subtitle="Consulta e localizacao rapida"
          actions={
            <Button variant="primary" onClick={() => setIsGroupFormOpen(true)}>
              Novo grupo
            </Button>
          }
        />

        <div className="mt-6">
          <Panel>
            <div className="space-y-4">
              <SearchField
                placeholder="Buscar grupo por nome ou descricao"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full py-3 text-base"
              />

              <div>
                <Select
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  aria-label="Filtro por status"
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-6 space-y-3">
          {filteredGroups.length === 0 ? (
            <EmptyState
              title="Nenhum grupo encontrado"
              description="Ajuste a busca ou filtro para localizar outro grupo."
            />
          ) : (
            filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => navigate(`/grupos/${group.id}`)}
                className="w-full text-left"
              >
                <Panel className="transition-colors hover:bg-surface-secondary">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-medium text-text-primary">{group.nome}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{group.descricao || 'Sem descricao'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-text-tertiary">Abrir</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant={getStatusVariant(group.status)}>
                      {getStatusLabel(group.status)}
                    </Badge>
                    <span className="text-xs text-text-tertiary">
                      {group.totalProjetos} projeto{group.totalProjetos === 1 ? '' : 's'}
                    </span>
                  </div>
                </Panel>
              </button>
            ))
          )}
        </div>
      </div>

      {isGroupFormOpen ? (
        <GroupFormDrawer
          isOpen={isGroupFormOpen}
          mode="create"
          isSubmitting={createGroupMutation.isPending}
          onClose={() => setIsGroupFormOpen(false)}
          onSubmit={handleCreateGroup}
        />
      ) : null}
    </AppShell>
  );
}

