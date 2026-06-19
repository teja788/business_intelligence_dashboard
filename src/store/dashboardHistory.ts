/**
 * Undo/redo for the dashboard, wired without touching the existing store
 * actions. It subscribes to workbook-reference changes (Immer makes a fresh
 * workbook object on every edit) and records snapshots; undo/redo restore them
 * via `replaceWorkbook`. A `restoring` guard keeps undo/redo from being
 * re-recorded as fresh edits. The stack bookkeeping lives in a pure reducer.
 */
import { create } from 'zustand';
import type { Workbook } from '@/model/types';
import { useDashboardStore } from './dashboardStore';
import {
  emptyHistory,
  record,
  redo as redoReducer,
  undo as undoReducer,
  type History,
} from './historyReducer';

interface HistoryStore {
  hist: History<Workbook>;
}

export const useHistoryStore = create<HistoryStore>(() => ({
  hist: emptyHistory<Workbook>(),
}));

let restoring = false;
// Seed with the current workbook id so the very first edit is recorded (a
// different id later — load/new — resets the history instead).
let lastWorkbookId: string | undefined = useDashboardStore.getState().workbook.id;

// Record every committed edit (skip programmatic restores and full-workbook
// swaps like load/new, which start a fresh history rather than an undo step).
useDashboardStore.subscribe((state, prev) => {
  if (restoring) return;
  if (state.workbook === prev.workbook) return;
  if (state.workbook.id !== lastWorkbookId) {
    lastWorkbookId = state.workbook.id;
    useHistoryStore.setState({ hist: emptyHistory<Workbook>() });
    return;
  }
  useHistoryStore.setState((h) => ({ hist: record(h.hist, prev.workbook) }));
});

function restore(wb: Workbook) {
  restoring = true;
  useDashboardStore.getState().replaceWorkbook(wb);
  restoring = false;
}

export function undo(): void {
  const current = useDashboardStore.getState().workbook;
  const step = undoReducer(useHistoryStore.getState().hist, current);
  if (!step) return;
  useHistoryStore.setState({ hist: step.history });
  restore(step.restored);
}

export function redo(): void {
  const current = useDashboardStore.getState().workbook;
  const step = redoReducer(useHistoryStore.getState().hist, current);
  if (!step) return;
  useHistoryStore.setState({ hist: step.history });
  restore(step.restored);
}
