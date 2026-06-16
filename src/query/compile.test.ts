import { describe, it, expect } from 'vitest';
import { compileQuery } from './compile';
import { compileFilter } from './compile';
import type { Dataset, Field, QuerySpec, Filter } from '@/model/types';

function field(partial: Partial<Field> & { id: string; column: string }): Field {
  return {
    datasetId: 'ds1',
    name: partial.column,
    role: 'dimension',
    type: 'string',
    ...partial,
  } as Field;
}

const dataset: Dataset = {
  id: 'ds1',
  name: 'Sales',
  source: 'file',
  table: 'sales',
  rowCount: 100,
  loadedAt: '2024-01-01T00:00:00Z',
  fields: [
    field({ id: 'ds1::Region', column: 'Region' }),
    field({ id: 'ds1::Category', column: 'Category' }),
    field({
      id: 'ds1::Sales',
      column: 'Sales',
      role: 'measure',
      type: 'number',
      defaultAggregation: 'sum',
    }),
    field({
      id: 'ds1::OrderDate',
      column: 'OrderDate',
      type: 'date',
    }),
  ],
};

const fieldsMap = new Map(dataset.fields.map((f) => [f.id, f]));

describe('compileQuery', () => {
  it('compiles a grouped aggregate with GROUP BY ordinals', () => {
    const spec: QuerySpec = {
      datasetId: 'ds1',
      dimensions: [{ field: 'ds1::Region' }],
      measures: [{ field: 'ds1::Sales', agg: 'sum' }],
      filters: [],
    };
    const sql = compileQuery(spec, dataset);
    expect(sql).toContain('SELECT "Region" AS "Region", SUM("Sales") AS "sum(Sales)"');
    expect(sql).toContain('FROM "sales"');
    expect(sql).toContain('GROUP BY 1');
  });

  it('omits GROUP BY when there are no measures', () => {
    const spec: QuerySpec = {
      datasetId: 'ds1',
      dimensions: [{ field: 'ds1::Region' }],
      measures: [],
      filters: [],
    };
    const sql = compileQuery(spec, dataset);
    expect(sql).not.toContain('GROUP BY');
  });

  it('applies date truncation', () => {
    const spec: QuerySpec = {
      datasetId: 'ds1',
      dimensions: [{ field: 'ds1::OrderDate', dateTrunc: 'month' }],
      measures: [{ field: 'ds1::Sales', agg: 'sum' }],
      filters: [],
    };
    const sql = compileQuery(spec, dataset);
    expect(sql).toContain(`DATE_TRUNC('month', "OrderDate")`);
  });

  it('applies numeric binning', () => {
    const spec: QuerySpec = {
      datasetId: 'ds1',
      dimensions: [{ field: 'ds1::Sales', bin: { size: 100 } }],
      measures: [],
      filters: [],
    };
    const sql = compileQuery(spec, dataset);
    expect(sql).toContain('FLOOR("Sales" / 100) * 100');
  });

  it('renders all aggregations', () => {
    const aggs = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct', 'median'] as const;
    const expected = ['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'COUNT(DISTINCT', 'MEDIAN'];
    aggs.forEach((agg, i) => {
      const sql = compileQuery(
        {
          datasetId: 'ds1',
          dimensions: [{ field: 'ds1::Region' }],
          measures: [{ field: 'ds1::Sales', agg }],
          filters: [],
        },
        dataset,
      );
      expect(sql).toContain(expected[i]);
    });
  });

  it('adds ORDER BY and LIMIT', () => {
    const spec: QuerySpec = {
      datasetId: 'ds1',
      dimensions: [{ field: 'ds1::Region' }],
      measures: [{ field: 'ds1::Sales', agg: 'sum' }],
      filters: [],
      sort: [{ field: 'ds1::Sales', dir: 'desc' }],
      limit: 10,
    };
    const sql = compileQuery(spec, dataset);
    expect(sql).toContain('ORDER BY "Sales" DESC');
    expect(sql).toContain('LIMIT 10');
  });

  it('throws on unknown field', () => {
    expect(() =>
      compileQuery(
        { datasetId: 'ds1', dimensions: [{ field: 'nope' }], measures: [], filters: [] },
        dataset,
      ),
    ).toThrow(/Unknown field/);
  });
});

describe('compileFilter', () => {
  const cases: [Filter, string][] = [
    [{ field: 'ds1::Region', op: 'in', values: ['East', 'West'] }, `"Region" IN ('East', 'West')`],
    [{ field: 'ds1::Region', op: 'notIn', values: ['East'] }, `"Region" NOT IN ('East')`],
    [{ field: 'ds1::Sales', op: 'gt', values: [100] }, `"Sales" > 100`],
    [{ field: 'ds1::Sales', op: 'between', values: [10, 20] }, `"Sales" BETWEEN 10 AND 20`],
    [{ field: 'ds1::Region', op: 'contains', values: ['as'] }, `"Region" ILIKE '%as%'`],
    [{ field: 'ds1::Region', op: 'isNull' }, `"Region" IS NULL`],
  ];
  it.each(cases)('compiles %o', (filter, expected) => {
    expect(compileFilter(fieldsMap, filter)).toBe(expected);
  });

  it('escapes single quotes in literals', () => {
    const sql = compileFilter(fieldsMap, {
      field: 'ds1::Region',
      op: 'eq',
      values: ["O'Brien"],
    });
    expect(sql).toBe(`"Region" = 'O''Brien'`);
  });
});
