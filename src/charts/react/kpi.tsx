/** KPI / big-number card. Shows a single aggregate with optional comparison. */
import { createElement } from 'react';
import { makeReactRenderer, type ReactChartProps } from './reactRenderer';
import { KpiIcon } from '../icons';

function fmt(v: number, opts: Record<string, unknown>): string {
  const decimals = typeof opts.decimals === 'number' ? opts.decimals : undefined;
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : '';
  const suffix = typeof opts.suffix === 'string' ? opts.suffix : '';
  const n = v.toLocaleString(undefined, {
    maximumFractionDigits: decimals ?? (Math.abs(v) >= 1000 ? 0 : 2),
  });
  return `${prefix}${n}${suffix}`;
}

function KpiCard({ data, options }: ReactChartProps) {
  const measure = data.measures[0];
  const value = measure
    ? Number((data.rows[0]?.[measure.key] as number) ?? 0)
    : 0;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="text-[11px] font-medium uppercase tracking-wider text-content-muted">
        {(options.label as string) || measure?.label || 'Metric'}
      </div>
      <div className="mt-1 bg-gradient-to-br from-content-primary to-content-secondary bg-clip-text text-4xl font-semibold tabular-nums text-transparent">
        {measure ? fmt(value, options) : '—'}
      </div>
      {typeof options.target === 'number' && measure && (
        <div className="mt-2 text-xs text-content-muted">
          {value >= (options.target as number) ? '▲' : '▼'} target{' '}
          {fmt(options.target as number, options)}
        </div>
      )}
    </div>
  );
}

export const kpiChart = makeReactRenderer({
  id: 'kpi',
  name: 'KPI',
  icon: createElement(KpiIcon),
  encodingSchema: { y: { min: 1, max: 1 } },
  suitability: ({ dimensionCount, measureCount }) =>
    dimensionCount === 0 && measureCount === 1 ? 0.9 : measureCount === 1 ? 0.3 : 0,
  Component: KpiCard,
});
