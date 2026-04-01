import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { AvatarStack, Button, EmptyState, MetricStrip, SearchField, Select } from '../design/primitives';
import { GroupFormDrawer, useCreateGroup, useGroups } from '../features/groups';
import type { CreateGroupPayload } from '../features/groups';
import { GroupStatus } from '../lib/enums';
import { useAuth } from '../lib/auth';
import { formatAreaLabel, formatHoursLabel, getGroupStatusLabel, getGroupStatusToneClass } from '../lib/projectUi';

function DetailField({
  label,
  value,
  toneClassName = 'text-text-primary',
}: {
  label: string;
  value: string;
  toneClassName?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
      <p className={`mt-1 text-sm font-medium ${toneClassName}`}>{value}</p>
    </div>
  );
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
      { value: GroupStatus.ACTIVE, label: getGroupStatusLabel(GroupStatus.ACTIVE) },
      { value: GroupStatus.PAUSED, label: getGroupStatusLabel(GroupStatus.PAUSED) },
      { value: GroupStatus.ARCHIVED, label: getGroupStatusLabel(GroupStatus.ARCHIVED) },
    ],
    [],
  );

  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return groups.filter((group) => {
      if (
        normalizedQuery &&
        !group.nome.toLowerCase().includes(normalizedQuery) &&
        !(group.descricao || '').toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (selectedStatus && group.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [groups, searchQuery, selectedStatus]);

  const summary = useMemo(() => {
    return {
      total: groups.length,
      active: groups.filter((group) => group.status === GroupStatus.ACTIVE).length,
      paused: groups.filter((group) => group.status === GroupStatus.PAUSED).length,
      archived: groups.filter((group) => group.status === GroupStatus.ARCHIVED).length,
    };
  }, [groups]);

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    const createdGroup = await createGroupMutation.mutateAsync(payload);
    navigate(`/grupos/${createdGroup.id}`);
  };

  if (authLoading || groupsLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Grupos</h1>
            <p className="mt-1 text-sm text-text-secondary">Carregando...</p>
          </header>
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
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Grupos</h1>
            <p className="mt-1 text-sm text-text-secondary">Erro ao carregar</p>
          </header>
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar grupos"
              description="Não foi possível buscar os grupos. Tente recarregar a página."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="border-b border-border-secondary pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">Grupos</h1>
            </div>
            <Button variant="primary" onClick={() => setIsGroupFormOpen(true)}>
              Novo grupo
            </Button>
          </div>

          <MetricStrip
            className="mt-4"
            items={[
              { label: 'Grupos', value: summary.total },
              { label: 'Ativos', value: summary.active },
              { label: 'Pausados', value: summary.paused },
              { label: 'Arquivados', value: summary.archived },
            ]}
          />
        </header>

        <div className="mt-5 border-b border-border-secondary pb-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)]">
            <SearchField
              placeholder="Buscar grupo por nome ou descrição"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
              className="w-full py-3 text-base"
            />
            <Select
              label="Status"
              options={statusOptions}
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              aria-label="Filtro por status"
            />
          </div>

          <div className="mt-3 text-sm text-text-secondary">
            Mostrando {filteredGroups.length} de {groups.length} grupo{groups.length === 1 ? '' : 's'}.
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {filteredGroups.length === 0 ? (
            <EmptyState
              title="Nenhum grupo encontrado"
              description="Ajuste a busca ou o filtro para localizar outro grupo."
            />
          ) : (
            filteredGroups.map((group, index) => (
              <article
                key={group.id}
                className={`${index > 0 ? 'border-t border-border-secondary pt-6' : ''} space-y-4`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-text-primary">{group.nome}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{group.descricao || 'Sem descrição registrada.'}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/grupos/${group.id}`)}>
                    Abrir
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <DetailField
                    label="Status"
                    value={getGroupStatusLabel(group.status)}
                    toneClassName={getGroupStatusToneClass(group.status)}
                  />
                  <DetailField
                    label="Projetos"
                    value={`${group.totalProjetos} projeto${group.totalProjetos === 1 ? '' : 's'}`}
                  />
                  <DetailField label="Atrasados" value={String(group.projetosAtrasados)} />
                  <DetailField label="Área total" value={formatAreaLabel(group.areaTotalM2)} />
                  <DetailField label="Horas" value={formatHoursLabel(group.totalHoras)} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-secondary pt-4">
                  <div className="flex items-center gap-3">
                    <AvatarStack
                      avatars={[
                        {
                          id: group.dono.id || `owner-${group.id}`,
                          name: group.dono.nome,
                        },
                      ]}
                      max={1}
                      size="sm"
                    />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Responsável</p>
                      <p className="text-sm font-medium text-text-primary">{group.dono.nome}</p>
                    </div>
                  </div>
                </div>
              </article>
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
