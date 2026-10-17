'use client';
import { createContext, useContext } from 'react';
export const TaskInspectorContext = createContext<{ openTask: (id: number) => void } | null>(null);
export function useTaskInspector() {
  const context = useContext(TaskInspectorContext);
  if (!context) throw Error('Task inspector requires dashboard provider');
  return context;
}
