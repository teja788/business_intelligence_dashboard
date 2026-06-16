import { describe, it, expect } from 'vitest';
import { buildCategorySeries } from './series';
import type { ChartData, ColumnMeta } from '../types';
import type { Field } from '@/model/types';

function meta(key: string, role: Field['role'] = 'dimension'): ColumnMeta {
  return {
    key,
    label: key,
    field: {
      id: key,
      datasetId: 'd',
      name: key,
      column: key,
      role,
      type: role === 'measure' ? 'number' : 'string',
    },
  };
}

describe('buildCategorySeries', () => {
  it('one series per measure when no color', () => {
    const data: ChartData = {
      x: meta('Region'),
      measures: [meta('sum(Sales)', 'measure'), meta('sum(Profit)', 'measure')],
      rows: [
        { Region: 'East', 'sum(Sales)': 100, 'sum(Profit)': 20 },
        { Region: 'West', 'sum(Sales)': 200, 'sum(Profit)': 50 },
      ],
    };
    const { categories, series } = buildCategorySeries(data);
    expect(categories).toEqual(['East', 'West']);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ name: 'sum(Sales)', data: [100, 200] });
    expect(series[1]).toEqual({ name: 'sum(Profit)', data: [20, 50] });
  });

  it('one series per color value using first measure', () => {
    const data: ChartData = {
      x: meta('Region'),
      color: meta('Segment'),
      measures: [meta('sum(Sales)', 'measure')],
      rows: [
        { Region: 'East', Segment: 'Consumer', 'sum(Sales)': 100 },
        { Region: 'East', Segment: 'Corporate', 'sum(Sales)': 60 },
        { Region: 'West', Segment: 'Consumer', 'sum(Sales)': 200 },
      ],
    };
    const { categories, series } = buildCategorySeries(data);
    expect(categories).toEqual(['East', 'West']);
    const consumer = series.find((s) => s.name === 'Consumer');
    const corporate = series.find((s) => s.name === 'Corporate');
    expect(consumer?.data).toEqual([100, 200]);
    // Corporate missing for West → null preserved.
    expect(corporate?.data).toEqual([60, null]);
  });

  it('renders null for missing combinations', () => {
    const data: ChartData = {
      x: meta('Region'),
      measures: [meta('sum(Sales)', 'measure')],
      rows: [{ Region: 'East', 'sum(Sales)': 100 }],
    };
    const { series } = buildCategorySeries(data);
    expect(series[0].data).toEqual([100]);
  });
});
