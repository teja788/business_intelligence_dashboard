/**
 * The associative engine's heart (§7A): a global Selection store. Clicking any
 * mark toggles a value here; every tile re-queries against the combined
 * selection. Includes a navigable selection history (back/forward) — this is
 * what turns a static dashboard into an explorable trail (the "follow-up" cure).
 */
import { create } from 'zustand';
import type { Filter, Selection } from '@/model/types';

type Scalar = string | number | boolean | null;

/** Field ids are `${datasetId}::column`; selections carry the dataset implicitly. */
export function datasetIdOf(fieldId: string): string {
  const i = fieldId.indexOf('::');
  return i >= 0 ? fieldId.slice(0, i) : fieldId;
}

interface SelectionState {
  selection: Selection;
  history: Selection[];
  index: number;

  toggleValue: (fieldId: string, value: Scalar) => void;
  setValues: (fieldId: string, values: Scalar[]) => void;
  keepOnly: (fieldId: string, value: Scalar) => void;
  exclude: (fieldId: string, value: Scalar) => void;
  clearField: (fieldId: string) => void;
  clearAll: () => void;
  addFilter: (filter: Filter) => void;
  removeFilter: (index: number) => void;

  back: () => void;
  forward: () => void;
  canBack: () => boolean;
  canForward: () => boolean;
}

const EMPTY: Selection = { selections: [], filters: [] };

function clone(s: Selection): Selection {
  return JSON.parse(JSON.stringify(s)) as Selection;
}

export const useSelectionStore = create<SelectionState>((set, get) => {
  /** Apply a transform, recording the result in history (truncating forward). */
  const commit = (next: Selection) => {
    set((s) => {
      const history = s.history.slice(0, s.index + 1);
      history.push(clone(next));
      return { selection: next, history, index: history.length - 1 };
    });
  };

  const withField = (
    sel: Selection,
    fieldId: string,
    fn: (values: Scalar[]) => Scalar[],
  ): Selection => {
    const next = clone(sel);
    const entry = next.selections.find((x) => x.field === fieldId);
    const current = entry ? [...entry.values] : [];
    const updated = fn(current);
    next.selections = next.selections.filter((x) => x.field !== fieldId);
    if (updated.length) next.selections.push({ field: fieldId, values: updated });
    return next;
  };

  return {
    selection: EMPTY,
    history: [EMPTY],
    index: 0,

    toggleValue: (fieldId, value) =>
      commit(
        withField(get().selection, fieldId, (vals) =>
          vals.some((v) => String(v) === String(value))
            ? vals.filter((v) => String(v) !== String(value))
            : [...vals, value],
        ),
      ),

    setValues: (fieldId, values) =>
      commit(withField(get().selection, fieldId, () => values)),

    keepOnly: (fieldId, value) =>
      commit(withField(get().selection, fieldId, () => [value])),

    exclude: (fieldId, value) => {
      // Implement "exclude" as a not-in filter so it composes with selections.
      const next = clone(get().selection);
      next.filters.push({ field: fieldId, op: 'notIn', values: [value] });
      commit(next);
    },

    clearField: (fieldId) =>
      commit(withField(get().selection, fieldId, () => [])),

    clearAll: () => commit(clone(EMPTY)),

    addFilter: (filter) => {
      const next = clone(get().selection);
      next.filters.push(filter);
      commit(next);
    },

    removeFilter: (i) => {
      const next = clone(get().selection);
      next.filters.splice(i, 1);
      commit(next);
    },

    back: () =>
      set((s) =>
        s.index > 0
          ? { index: s.index - 1, selection: clone(s.history[s.index - 1]) }
          : s,
      ),

    forward: () =>
      set((s) =>
        s.index < s.history.length - 1
          ? { index: s.index + 1, selection: clone(s.history[s.index + 1]) }
          : s,
      ),

    canBack: () => get().index > 0,
    canForward: () => get().index < get().history.length - 1,
  };
});

/** Build the Filter[] that apply to a given dataset from the global selection. */
export function selectionFiltersFor(
  selection: Selection,
  datasetId: string,
): Filter[] {
  const filters: Filter[] = [];
  for (const sel of selection.selections) {
    if (datasetIdOf(sel.field) === datasetId && sel.values.length) {
      filters.push({ field: sel.field, op: 'in', values: sel.values });
    }
  }
  for (const f of selection.filters) {
    if (datasetIdOf(f.field) === datasetId) filters.push(f);
  }
  return filters;
}
