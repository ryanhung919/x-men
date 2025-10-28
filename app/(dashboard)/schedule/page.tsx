'use client'

import dynamic from 'next/dynamic';

// Load client component lazily to avoid SSR issues
const ScheduleView = dynamic(() => import('@/components/schedule'), {
  ssr: false,
});

export default function SchedulePage() {
  return <ScheduleView />;
}