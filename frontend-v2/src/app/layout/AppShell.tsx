import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalTimerBar } from './GlobalTimerBar';

interface AppShellProps {
  children: React.ReactNode;
  currentUserId?: string;
  navigationVariant?: 'default' | 'admin';
}

export const AppShell: React.FC<AppShellProps> = ({ children, navigationVariant = 'default' }) => {
  return (
    <div className="min-h-screen bg-surface-primary pt-12">
      <GlobalTimerBar />

      <div className="flex min-h-[calc(100vh-3rem)]">
        <Sidebar variant={navigationVariant} />

        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
};
