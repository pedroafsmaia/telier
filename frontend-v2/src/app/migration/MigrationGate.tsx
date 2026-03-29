import type { ReactNode } from 'react';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { Button, Panel } from '../../design/primitives';
import { implementedParityItems, parityChecklist, pendingRealValidationItems, validatedParityItems } from './parityChecklist';
import { useMigration } from './MigrationContext';

function getModeLabel(mode: 'legacy' | 'validation' | 'rebuild'): string {
  if (mode === 'legacy') return 'Legado ativo';
  if (mode === 'rebuild') return 'Corte final';
  return 'Validacao controlada';
}

export function MigrationStatusBanner() {
  const { mode, hasOverride, openLegacy, clearOverride, canUseRebuildOverride } = useMigration();

  return (
    <Panel className="border-border-primary bg-surface-secondary" padding="sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">Migracao do frontend</p>
          <p className="text-sm font-medium text-text-primary">
            {getModeLabel(mode)}. {implementedParityItems}/{parityChecklist.length} fluxos estao implementados no codigo e {validatedParityItems}/{parityChecklist.length} foram validados em uso real.
          </p>
          <p className="text-sm text-text-secondary">
            {pendingRealValidationItems} fluxos ainda aguardam validacao real. O legado permanece preservado e nenhum corte destrutivo foi automatizado nesta fase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={ArrowLeftRight} onClick={openLegacy}>
            Abrir legado
          </Button>
          {hasOverride && canUseRebuildOverride ? (
            <Button variant="ghost" size="sm" onClick={clearOverride}>
              Voltar para flag padrao
            </Button>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-secondary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Checklist documentado
          </span>
        </div>
      </div>
    </Panel>
  );
}

export function MigrationGate({ children }: { children: ReactNode }) {
  const { mode, activeSurface, activateRebuildPreview, clearOverride, openLegacy, canUseRebuildOverride, hasOverride } = useMigration();

  if (activeSurface === 'rebuild') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface-secondary px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <Panel className="w-full border-border-primary" padding="lg">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">Fase 11</p>
              <h1 className="text-2xl font-semibold text-text-primary">Nova UI atras de flag de migracao</h1>
              <p className="text-sm leading-6 text-text-secondary">
                O modo atual esta configurado como <strong>{mode}</strong>. O legado continua sendo a superficie padrao ate a validacao de paridade em uso real.
              </p>
            </div>

            <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-4 text-sm text-text-secondary">
              {canUseRebuildOverride
                ? 'Use a nova UI apenas para validacao controlada. O retorno ao legado permanece imediato e nao destrutivo.'
                : 'A flag de ambiente esta fechada. Nesta configuracao nao existe bypass local para abrir a nova UI.'}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canUseRebuildOverride ? (
                <Button variant="primary" onClick={activateRebuildPreview}>
                  Continuar na nova UI
                </Button>
              ) : null}
              <Button variant="secondary" onClick={openLegacy}>
                Abrir legado
              </Button>
              {hasOverride && canUseRebuildOverride ? (
                <Button variant="ghost" onClick={clearOverride}>
                  Limpar override local
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
