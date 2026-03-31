import React from 'react';
import { Sidebar } from './Sidebar';
import { GlobalTimerBar } from './GlobalTimerBar';

interface AppShellProps {
  children: React.ReactNode;
  currentUserId?: string;
  navigationVariant?: 'default' | 'admin';
}

export const AppShell: React.FC<AppShellProps> = ({ children, navigationVariant = 'default' }) => {
  return (
    <div className="flex min-h-screen bg-surface-secondary">
      <Sidebar variant={navigationVariant} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface-primary">
        <div className="sticky top-0 z-40">
          <GlobalTimerBar />
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
