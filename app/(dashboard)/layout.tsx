import { TaskInspectorProvider } from '@/components/tasks/task-inspector-provider';
import type React from 'react';
import { Navbar } from '@/components/ui/common/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TaskInspectorProvider>
        <Navbar />
        <main className="mx-auto w-full max-w-[1488px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </TaskInspectorProvider>
    </div>
  );
}
