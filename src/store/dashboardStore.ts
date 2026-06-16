/**
 * Dashboard/workbook store: the current Workbook (tiles + parameters), tile
 * CRUD, grid layout, and autosave to IndexedDB. The workbook is the
 * serializable unit of save/export/share.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChartTile, Field, GridLayout, Parameter, Workbook } from '@/model/types';
import { createTile, createWorkbook, type CreateTileInput } from '@/model/factory';
import { saveWorkbook, setMeta } from '@/persist/db';

interface DashboardState {
  workbook: Workbook;
  selectedTileId?: string;

  addTile: (input: CreateTileInput) => string;
  updateTile: (id: string, patch: Partial<ChartTile>) => void;
  updateTileOptions: (id: string, options: Record<string, unknown>) => void;
  removeTile: (id: string) => void;
  duplicateTile: (id: string) => void;
  setLayouts: (layouts: Record<string, GridLayout>) => void;
  selectTile: (id?: string) => void;

  setParameter: (param: Parameter) => void;
  setParameterValue: (id: string, value: string | number | boolean) => void;
  removeParameter: (id: string) => void;

  addCalculatedField: (field: Field) => void;
  removeCalculatedField: (id: string) => void;

  renameWorkbook: (name: string) => void;
  newWorkbook: () => void;
  loadWorkbook: (wb: Workbook) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

function persist(wb: Workbook) {
  wb.updatedAt = new Date().toISOString();
  void saveWorkbook(JSON.parse(JSON.stringify(wb)) as Workbook);
  void setMeta('activeWorkbookId', wb.id);
}

export const useDashboardStore = create<DashboardState>()(
  immer((set, get) => ({
    workbook: createWorkbook(),

    addTile: (input) => {
      const tile = createTile(input);
      set((s) => {
        s.workbook.tiles.push(tile);
        s.selectedTileId = tile.id;
        persist(s.workbook);
      });
      return tile.id;
    },

    updateTile: (id, patch) =>
      set((s) => {
        const idx = s.workbook.tiles.findIndex((t) => t.id === id);
        if (idx >= 0) {
          s.workbook.tiles[idx] = { ...s.workbook.tiles[idx], ...patch };
          persist(s.workbook);
        }
      }),

    updateTileOptions: (id, options) =>
      set((s) => {
        const t = s.workbook.tiles.find((t) => t.id === id);
        if (t) {
          t.options = { ...t.options, ...options };
          persist(s.workbook);
        }
      }),

    removeTile: (id) =>
      set((s) => {
        s.workbook.tiles = s.workbook.tiles.filter((t) => t.id !== id);
        if (s.selectedTileId === id) s.selectedTileId = undefined;
        persist(s.workbook);
      }),

    duplicateTile: (id) =>
      set((s) => {
        const t = s.workbook.tiles.find((t) => t.id === id);
        if (!t) return;
        const copy = createTile({
          datasetId: t.query.datasetId,
          type: t.type,
          encoding: JSON.parse(JSON.stringify(t.encoding)),
          title: t.title ? `${t.title} (copy)` : undefined,
          options: JSON.parse(JSON.stringify(t.options)),
          layout: { x: t.layout.x, y: t.layout.y + t.layout.h, w: t.layout.w, h: t.layout.h },
        });
        s.workbook.tiles.push(copy);
        s.selectedTileId = copy.id;
        persist(s.workbook);
      }),

    setLayouts: (layouts) =>
      set((s) => {
        let changed = false;
        s.workbook.tiles.forEach((t) => {
          const l = layouts[t.id];
          if (l && (l.x !== t.layout.x || l.y !== t.layout.y || l.w !== t.layout.w || l.h !== t.layout.h)) {
            t.layout = l;
            changed = true;
          }
        });
        if (changed) persist(s.workbook);
      }),

    selectTile: (id) => set((s) => { s.selectedTileId = id; }),

    setParameter: (param) =>
      set((s) => {
        const idx = s.workbook.parameters.findIndex((p) => p.id === param.id);
        if (idx >= 0) s.workbook.parameters[idx] = param;
        else s.workbook.parameters.push(param);
        persist(s.workbook);
      }),

    setParameterValue: (id, value) =>
      set((s) => {
        const p = s.workbook.parameters.find((p) => p.id === id);
        if (p) {
          p.value = value;
          persist(s.workbook);
        }
      }),

    removeParameter: (id) =>
      set((s) => {
        s.workbook.parameters = s.workbook.parameters.filter((p) => p.id !== id);
        persist(s.workbook);
      }),

    addCalculatedField: (field) =>
      set((s) => {
        if (!s.workbook.calculatedFields) s.workbook.calculatedFields = [];
        const idx = s.workbook.calculatedFields.findIndex((f) => f.id === field.id);
        if (idx >= 0) s.workbook.calculatedFields[idx] = field;
        else s.workbook.calculatedFields.push(field);
        persist(s.workbook);
      }),

    removeCalculatedField: (id) =>
      set((s) => {
        s.workbook.calculatedFields =
          (s.workbook.calculatedFields ?? []).filter((f) => f.id !== id);
        persist(s.workbook);
      }),

    renameWorkbook: (name) =>
      set((s) => {
        s.workbook.name = name;
        persist(s.workbook);
      }),

    newWorkbook: () =>
      set((s) => {
        s.workbook = createWorkbook();
        s.selectedTileId = undefined;
        persist(s.workbook);
      }),

    loadWorkbook: (wb) =>
      set((s) => {
        s.workbook = wb;
        s.selectedTileId = undefined;
      }),

    exportJSON: () => JSON.stringify(get().workbook, null, 2),

    importJSON: (json) => {
      const wb = JSON.parse(json) as Workbook;
      set((s) => {
        s.workbook = wb;
        s.selectedTileId = undefined;
        persist(s.workbook);
      });
    },
  })),
);
