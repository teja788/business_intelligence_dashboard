/** Table chart — reuses the virtualized DataTable to show the query result. */
import { createElement, useMemo } from 'react';
import { makeReactRenderer, type ReactChartProps } from './reactRenderer';
import { TableChartIcon } from '../icons';
import { DataTable } from '@/ui/table/DataTable';

function TableChartView({ data }: ReactChartProps) {
  const columns = useMemo(() => {
    const cols: string[] = [];
    if (data.x) cols.push(data.x.key);
    if (data.color) cols.push(data.color.key);
    for (const m of data.measures) cols.push(m.key);
    // Fall back to whatever keys exist on the rows.
    if (!cols.length && data.rows[0]) cols.push(...Object.keys(data.rows[0]));
    return cols;
  }, [data]);

  return <DataTable columns={columns} rows={data.rows} />;
}

export const tableChart = makeReactRenderer({
  id: 'table',
  name: 'Table',
  icon: createElement(TableChartIcon),
  encodingSchema: {
    x: { min: 0, max: 4 },
    y: { min: 0, max: 8 },
    color: { min: 0, max: 1 },
  },
  // A reasonable fallback for any field combination.
  suitability: ({ dimensionCount, measureCount }) =>
    dimensionCount + measureCount > 0 ? 0.2 : 0,
  Component: TableChartView,
});
