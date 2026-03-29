import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalTimerBar } from './GlobalTimerBar';
import { MigrationStatusBanner } from '../migration/MigrationGate';

interface AppShellProps {
  children: React.ReactNode;
  currentUserId?: string;
}

// AppShell mantendo identidade visual "The Architectural Monolith"
// Estrutura limpa, tecnica, sem decoracao excessiva
export const AppShell: React.FC<AppShellProps> = ({ children, currentUserId }) => {
  return (
    <div className="min-h-screen bg-surface-primary pt-10">
      <GlobalTimerBar currentUserId={currentUserId} />

      <div className="flex min-h-[calc(100vh-2.5rem)]">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <div className="border-b border-border-primary bg-surface-primary px-6 py-3">
            <MigrationStatusBanner />
          </div>
          <Topbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
};

