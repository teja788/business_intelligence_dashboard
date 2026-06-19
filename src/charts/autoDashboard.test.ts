import { describe, expect, it } from 'vitest';
import type { Dataset, Field } from '@/model/types';
import { buildAutoDashboard } from './autoDashboard';

function field(partial: Partial<Field> & Pick<Field, 'id' | 'column' | 'role' | 'type'>): Field {
  return { datasetId: 'ds', name: partial.column, ...partial } as Field;
}

const dataset: Dataset = {
  id: 'ds',
  name: 'Sales',
  source: 'file',
  table: 'sales',
  rowCount: 100,
  loadedAt: '2026-01-01',
  fields: [
    field({ id: 'ds::date', column: 'date', role: 'dimension', type: 'date', name: 'Date' }),
    field({ id: 'ds::region', column: 'region', role: 'dimension', type: 'string', name: 'Region' }),
    field({ id: 'ds::id', column: 'id', role: 'dimension', type: 'string', name: 'Id' }),
    field({ id: 'ds::sales', column: 'sales', role: 'measure', type: 'number', name: 'Sales' }),
    field({ id: 'ds::profit', column: 'profit', role: 'measure', type: 'number', name: 'Profit' }),
  ],
};

const cardinality = { region: 4, id: 100, date: 365, sales: 90, profit: 90 };

describe('buildAutoDashboard', () => {
  it('creates a KPI per measure', () => {
    const tiles = buildAutoDashboard(dataset, { cardinality });
    const kpis = tiles.filter((t) => t.type === 'kpi');
    expect(kpis).toHaveLength(2);
    expect(kpis[0].encoding.y).toEqual(['ds::sales']);
  });

  it('adds a time trend when a date dimension exists', () => {
    const tiles = buildAutoDashboard(dataset, { cardinality });
    const line = tiles.find((t) => t.type === 'line');
    expect(line).toBeTruthy();
    expect(line!.encoding.x).toEqual(['ds::date']);
    expect((line!.options as any).transforms['ds::date'].dateTrunc).toBe('month');
  });

  it('makes a breakdown bar only for low-cardinality categories', () => {
    const tiles = buildAutoDashboard(dataset, { cardinality });
    const bars = tiles.filter((t) => t.type === 'bar');
    // "region" (4) qualifies; "id" (100) is over the cap and excluded.
    expect(bars).toHaveLength(1);
    expect(bars[0].encoding.x).toEqual(['ds::region']);
    expect(bars[0].encoding.y).toEqual(['ds::sales']);
  });

  it('offsets generated tiles below existing ones via baseY', () => {
    const tiles = buildAutoDashboard(dataset, { cardinality, baseY: 20 });
    expect(Math.min(...tiles.map((t) => t.layout!.y!))).toBe(20);
  });

  it('falls back to a count bar when there are no measures', () => {
    const noMeasures: Dataset = {
      ...dataset,
      fields: dataset.fields.filter((f) => f.role === 'dimension'),
    };
    const tiles = buildAutoDashboard(noMeasures, { cardinality });
    expect(tiles.every((t) => t.type !== 'kpi')).toBe(true);
    const bar = tiles.find((t) => t.type === 'bar');
    expect(bar!.title).toContain('Count by');
  });
});
