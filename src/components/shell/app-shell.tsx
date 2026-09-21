import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row w-full">
      <Sidebar userEmail={userEmail} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
