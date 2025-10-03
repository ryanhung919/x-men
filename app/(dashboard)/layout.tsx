import type React from 'react';
import { Navbar } from '@/components/ui/common/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
