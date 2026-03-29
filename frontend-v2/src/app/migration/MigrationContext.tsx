/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type MigrationMode = 'legacy' | 'validation' | 'rebuild';
export type UiSurface = 'legacy' | 'rebuild';

interface MigrationContextValue {
  mode: MigrationMode;
  activeSurface: UiSurface;
  hasOverride: boolean;
  canUseRebuildOverride: boolean;
  legacyHref: string;
  activateRebuildPreview: () => void;
  clearOverride: () => void;
  openLegacy: () => void;
}

const STORAGE_KEY = 'telier_migration_surface';
const QUERY_PARAM = 'telier_ui';

const MigrationContext = createContext<MigrationContextValue | null>(null);

function normalizeMode(value: string | undefined): MigrationMode {
  if (value === 'legacy' || value === 'validation' || value === 'rebuild') {
    return value;
  }
  return 'legacy';
}

function normalizeSurface(value: string | null | undefined): UiSurface | null {
  if (value === 'legacy' || value === 'rebuild') {
    return value;
  }
  return null;
}

function getDefaultSurface(mode: MigrationMode): UiSurface {
  return mode === 'legacy' ? 'legacy' : 'rebuild';
}

function getLegacyBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost';
  }

  const configured = import.meta.env.VITE_TELIER_LEGACY_URL?.trim();
  return configured || window.location.origin;
}

function buildLegacyHref(): string {
  return new URL('/', getLegacyBaseUrl()).toString();
}

function readStoredOverride(): UiSurface | null {
  if (typeof window === 'undefined') return null;
  return normalizeSurface(window.localStorage.getItem(STORAGE_KEY));
}

function writeStoredOverride(surface: UiSurface) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, surface);
}

function removeStoredOverride() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function readQueryOverride(): UiSurface | null {
  if (typeof window === 'undefined') return null;
  return normalizeSurface(new URLSearchParams(window.location.search).get(QUERY_PARAM));
}

export function MigrationProvider({ children }: { children: ReactNode }) {
  const mode = normalizeMode(import.meta.env.VITE_TELIER_UI_MIGRATION_MODE);
  const canUseRebuildOverride = mode === 'validation';
  const [override, setOverride] = useState<UiSurface | null>(() => {
    if (!canUseRebuildOverride) {
      removeStoredOverride();
      return null;
    }

    const queryOverride = readQueryOverride();

    if (queryOverride) {
      writeStoredOverride(queryOverride);
      return queryOverride;
    }

    return readStoredOverride();
  });

  const legacyHref = useMemo(() => buildLegacyHref(), []);
  const activeSurface = override || getDefaultSurface(mode);

  const activateRebuildPreview = useCallback(() => {
    if (!canUseRebuildOverride) {
      return;
    }
    writeStoredOverride('rebuild');
    setOverride('rebuild');
  }, [canUseRebuildOverride, setOverride]);

  const clearOverride = useCallback(() => {
    removeStoredOverride();
    setOverride(null);
  }, [setOverride]);

  const openLegacy = useCallback(() => {
    writeStoredOverride('legacy');
    setOverride('legacy');
    window.location.assign(legacyHref);
  }, [legacyHref, setOverride]);

  const value = useMemo<MigrationContextValue>(
    () => ({
      mode,
      activeSurface,
      hasOverride: Boolean(override),
      canUseRebuildOverride,
      legacyHref,
      activateRebuildPreview,
      clearOverride,
      openLegacy,
    }),
    [mode, activeSurface, override, canUseRebuildOverride, legacyHref, activateRebuildPreview, clearOverride, openLegacy],
  );

  return <MigrationContext.Provider value={value}>{children}</MigrationContext.Provider>;
}

export function useMigration() {
  const context = useContext(MigrationContext);

  if (!context) {
    throw new Error('useMigration must be used within MigrationProvider');
  }

  return context;
}

