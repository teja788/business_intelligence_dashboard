/**
 * Global app store (Zustand + Immer). Holds UI state and the dataset registry.
 * The associative Selection store lands in M3; tiles/workbook in M2.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Dataset } from '@/model/types';
import { getDataSource } from '@/engine/source';
import { SAMPLE_DATASETS } from '@/samples';
import {
  saveDataset,
  getDatasets,
  deleteStoredDataset,
  getMeta,
  getWorkbook,
} from '@/persist/db';
import { useDashboardStore } from './dashboardStore';
import { eventBus } from '@/events/bus';

export type AppMode = 'simple' | 'advanced';
export type EngineStatus = 'booting' | 'ready' | 'error';

interface AppState {
  mode: AppMode;
  engineStatus: EngineStatus;
  engineError?: string;
  crossOriginIsolated: boolean;

  datasets: Dataset[];
  activeDatasetId?: string;

  setMode: (mode: AppMode) => void;
  toggleMode: () => void;

  /** Boot the engine, restore persisted datasets + workbook. */
  initEngine: () => Promise<void>;
  importFile: (file: File) => Promise<void>;
  loadSample: (index?: number) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  createDerivedDataset: (name: string, sql: string) => Promise<Dataset>;
  setActiveDataset: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    mode: 'simple',
    engineStatus: 'booting',
    crossOriginIsolated: false,
    datasets: [],

    setMode: (mode) =>
      set((s) => {
        s.mode = mode;
      }),

    toggleMode: () =>
      set((s) => {
        s.mode = s.mode === 'simple' ? 'advanced' : 'simple';
      }),

    initEngine: async () => {
      const source = getDataSource();
      try {
        await source.ready();
        set((s) => {
          s.engineStatus = 'ready';
          s.crossOriginIsolated =
            typeof globalThis !== 'undefined' && !!globalThis.crossOriginIsolated;
        });
        await restoreSession();
      } catch (err) {
        set((s) => {
          s.engineStatus = 'error';
          s.engineError = err instanceof Error ? err.message : String(err);
        });
      }
    },

    importFile: async (file) => {
      const source = getDataSource();
      const dataset = await source.importFile(file);
      const bytes = await file.arrayBuffer();
      await saveDataset({
        id: dataset.id,
        name: dataset.name,
        fileName: file.name,
        bytes,
        loadedAt: dataset.loadedAt,
      });
      set((s) => {
        s.datasets.push(dataset);
        s.activeDatasetId = dataset.id;
      });
      eventBus.emit('dataset:added', { dataset });
    },

    loadSample: async (index = 0) => {
      const source = getDataSource();
      const sample = SAMPLE_DATASETS[index];
      if (!sample) return;
      // Avoid loading the same sample twice.
      if (get().datasets.some((d) => d.name === sample.name)) return;
      const dataset = await source.importText(sample.csv, sample.fileName, {
        name: sample.name,
      });
      await saveDataset({
        id: dataset.id,
        name: dataset.name,
        fileName: sample.fileName,
        bytes: new TextEncoder().encode(sample.csv).buffer,
        loadedAt: dataset.loadedAt,
      });
      set((s) => {
        s.datasets.push(dataset);
        s.activeDatasetId = dataset.id;
      });
    },

    removeDataset: async (id) => {
      await deleteStoredDataset(id);
      set((s) => {
        s.datasets = s.datasets.filter((d) => d.id !== id);
        if (s.activeDatasetId === id)
          s.activeDatasetId = s.datasets[0]?.id;
      });
    },

    createDerivedDataset: async (name, sql) => {
      const source = getDataSource();
      const dataset = await source.createDatasetFromSQL(name, sql);
      await saveDataset({
        id: dataset.id,
        name: dataset.name,
        fileName: `${name}.sql`,
        derivedSql: sql,
        loadedAt: dataset.loadedAt,
      });
      set((s) => {
        s.datasets.push(dataset);
        s.activeDatasetId = dataset.id;
      });
      return dataset;
    },

    setActiveDataset: (id) =>
      set((s) => {
        s.activeDatasetId = id;
      }),
  })),
);

/**
 * Rebuild persisted datasets into DuckDB (tables are in-memory and vanish on
 * reload) using their stable ids, then restore the last workbook.
 */
async function restoreSession(): Promise<void> {
  const source = getDataSource();
  const stored = await getDatasets();
  const restored: Dataset[] = [];

  // File-based datasets first; derived datasets (joins/unions) may depend on them.
  const fileDs = stored.filter((s) => s.bytes);
  const derivedDs = stored.filter((s) => s.derivedSql);

  for (const sd of fileDs) {
    try {
      const file = new File([sd.bytes!], sd.fileName);
      const dataset = await source.importFile(file, {
        name: sd.name,
        datasetId: sd.id,
      });
      restored.push(dataset);
    } catch {
      // Skip datasets that fail to rebuild (e.g. unsupported/corrupt bytes).
    }
  }
  for (const sd of derivedDs) {
    try {
      const dataset = await source.createDatasetFromSQL(sd.name, sd.derivedSql!, {
        datasetId: sd.id,
      });
      restored.push(dataset);
    } catch {
      // Skip derived datasets whose dependencies are missing.
    }
  }

  if (restored.length) {
    useAppStore.setState((s) => ({
      datasets: restored,
      activeDatasetId: s.activeDatasetId ?? restored[0].id,
    }));
  }

  const activeWorkbookId = await getMeta<string>('activeWorkbookId');
  if (activeWorkbookId) {
    const wb = await getWorkbook(activeWorkbookId);
    if (wb) useDashboardStore.getState().loadWorkbook(wb);
  }
}

/** Convenience selector for the currently active dataset object. */
export function useActiveDataset(): Dataset | undefined {
  return useAppStore((s) => s.datasets.find((d) => d.id === s.activeDatasetId));
}
