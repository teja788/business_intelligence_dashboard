/**
 * Ephemeral per-tile drill-down paths. This is transient view state (not part
 * of the saved workbook): drilling is an exploration gesture, and resetting on
 * reload keeps the persisted dashboard predictable. Keyed by tile id.
 */
import { create } from 'zustand';
import type { DrillScalar, DrillStep } from '@/charts/drill';

interface DrillState {
  paths: Record<string, DrillStep[]>;
  push: (tileId: string, field: string, value: DrillScalar) => void;
  /** Truncate the path to `length` steps (breadcrumb navigation). */
  popTo: (tileId: string, length: number) => void;
  clear: (tileId: string) => void;
}

export const useDrillStore = create<DrillState>((set) => ({
  paths: {},
  push: (tileId, field, value) =>
    set((s) => ({
      paths: { ...s.paths, [tileId]: [...(s.paths[tileId] ?? []), { field, value }] },
    })),
  popTo: (tileId, length) =>
    set((s) => ({
      paths: { ...s.paths, [tileId]: (s.paths[tileId] ?? []).slice(0, length) },
    })),
  clear: (tileId) =>
    set((s) => {
      const next = { ...s.paths };
      delete next[tileId];
      return { paths: next };
    }),
}));
