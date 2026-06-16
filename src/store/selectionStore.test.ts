import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSelectionStore,
  selectionFiltersFor,
  datasetIdOf,
} from './selectionStore';

const FIELD = 'ds1::Region';
const get = () => useSelectionStore.getState();

beforeEach(() => {
  useSelectionStore.setState({
    selection: { selections: [], filters: [] },
    history: [{ selections: [], filters: [] }],
    index: 0,
  });
});

describe('selectionStore', () => {
  it('toggles a value on and off', () => {
    get().toggleValue(FIELD, 'East');
    expect(get().selection.selections[0]).toEqual({
      field: FIELD,
      values: ['East'],
    });
    get().toggleValue(FIELD, 'East');
    expect(get().selection.selections).toHaveLength(0);
  });

  it('accumulates multiple values per field', () => {
    get().toggleValue(FIELD, 'East');
    get().toggleValue(FIELD, 'West');
    expect(get().selection.selections[0].values).toEqual(['East', 'West']);
  });

  it('keepOnly replaces the selection with a single value', () => {
    get().toggleValue(FIELD, 'East');
    get().toggleValue(FIELD, 'West');
    get().keepOnly(FIELD, 'South');
    expect(get().selection.selections[0].values).toEqual(['South']);
  });

  it('exclude adds a notIn filter', () => {
    get().exclude(FIELD, 'East');
    expect(get().selection.filters).toEqual([
      { field: FIELD, op: 'notIn', values: ['East'] },
    ]);
  });

  it('supports back/forward through history', () => {
    get().toggleValue(FIELD, 'East'); // index 1
    get().toggleValue(FIELD, 'West'); // index 2
    expect(get().canBack()).toBe(true);
    get().back();
    expect(get().selection.selections[0].values).toEqual(['East']);
    get().back();
    expect(get().selection.selections).toHaveLength(0);
    get().forward();
    expect(get().selection.selections[0].values).toEqual(['East']);
  });

  it('truncates forward history on a new action', () => {
    get().toggleValue(FIELD, 'East');
    get().toggleValue(FIELD, 'West');
    get().back();
    get().toggleValue(FIELD, 'South'); // diverge
    expect(get().canForward()).toBe(false);
    expect(get().selection.selections[0].values).toEqual(['East', 'South']);
  });

  it('clearAll empties the selection', () => {
    get().toggleValue(FIELD, 'East');
    get().exclude(FIELD, 'West');
    get().clearAll();
    expect(get().selection.selections).toHaveLength(0);
    expect(get().selection.filters).toHaveLength(0);
  });
});

describe('selectionFiltersFor', () => {
  it('builds in-filters scoped to a dataset', () => {
    const selection = {
      selections: [
        { field: 'ds1::Region', values: ['East'] },
        { field: 'ds2::Country', values: ['US'] },
      ],
      filters: [{ field: 'ds1::Cat', op: 'notIn' as const, values: ['A'] }],
    };
    const filters = selectionFiltersFor(selection, 'ds1');
    expect(filters).toEqual([
      { field: 'ds1::Region', op: 'in', values: ['East'] },
      { field: 'ds1::Cat', op: 'notIn', values: ['A'] },
    ]);
  });
});

describe('datasetIdOf', () => {
  it('extracts the dataset id from a field id', () => {
    expect(datasetIdOf('ds1::Region')).toBe('ds1');
    expect(datasetIdOf('plain')).toBe('plain');
  });
});
