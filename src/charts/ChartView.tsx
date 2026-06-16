/**
 * Renders a chart from a (dataset, type, encoding) triple. Owns the pipeline:
 * encoding → QuerySpec → SQL → Arrow rows → ChartData → ChartHost.
 * Reused by the M1 single-chart view and M2 dashboard tiles.
 */
import { useMemo } from 'react';
import type { Dataset, Encoding, Filter } from '@/model/types';
import { compileQuery } from '@/query/compile';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSqlQuery } from '@/ui/hooks/useSqlQuery';
import { getChart } from './registry';
import { resolveChart, toChartData } from './resolve';
import { ChartHost } from './ChartHost';

export interface FieldValueSelection {
  fieldId: string;
  value: string | number;
}

export interface ChartViewProps {
  dataset: Dataset;
  type: string;
  encoding: Encoding;
  options?: Record<string, unknown>;
  filters?: Filter[];
  /** Called when a mark is clicked (cross-filtering, M3). */
  onSelect?: (selections: FieldValueSelection[]) => void;
}

export function ChartView({
  dataset,
  type,
  encoding,
  options = {},
  filters = [],
  onSelect,
}: ChartViewProps) {
  const renderer = getChart(type);

  const transforms = options.transforms as
    | Record<string, import('./resolve').DimensionTransform>
    | undefined;
  const resolved = useMemo(
    () => resolveChart(encoding, dataset, { filters, transforms }),
    [encoding, dataset, filters, transforms],
  );

  const parameters = useDashboardStore((s) => s.workbook.parameters);
  const params = useMemo(() => {
    const map: Record<string, string | number | boolean | null> = {};
    for (const p of parameters) map[p.name] = p.value;
    return map;
  }, [parameters]);

  const sql = useMemo(
    () => (resolved.spec.measures.length || resolved.spec.dimensions.length
      ? compileQuery(resolved.spec, dataset, { params })
      : null),
    [resolved, dataset, params],
  );

  const { data, loading, error } = useSqlQuery(sql);

  const chartData = useMemo(
    () => (data ? toChartData(resolved, data.rows) : null),
    [data, resolved],
  );

  const ctx = useMemo(
    () =>
      onSelect
        ? {
            onMarkClick: (sel: { category?: string | number; series?: string | number }) => {
              const out: FieldValueSelection[] = [];
              if (sel.category != null && resolved.x)
                out.push({ fieldId: resolved.x.field.id, value: sel.category });
              if (sel.series != null && resolved.color)
                out.push({ fieldId: resolved.color.field.id, value: sel.series });
              if (out.length) onSelect(out);
            },
          }
        : undefined,
    [onSelect, resolved],
  );

  if (!renderer) {
    return (
      <Centered className="text-red-400">Unknown chart type: {type}</Centered>
    );
  }
  if (error) return <Centered className="text-red-400">{error}</Centered>;
  if (loading || !chartData)
    return <Centered className="text-content-muted">Loading…</Centered>;
  if (!chartData.measures.length && !chartData.x)
    return (
      <Centered className="text-content-muted">
        Add a field to build this chart.
      </Centered>
    );

  return (
    <ChartHost renderer={renderer} data={chartData} options={options} ctx={ctx} />
  );
}

function Centered({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid h-full w-full place-items-center text-sm ${className}`}>
      {children}
    </div>
  );
}
