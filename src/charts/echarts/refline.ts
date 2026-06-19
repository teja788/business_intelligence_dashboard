/**
 * Reference / annotation lines for cartesian charts (bar, line, area, combo).
 * The configured line is rendered via an ECharts `markLine`. Native aggregate
 * types (average/min/max) are computed by ECharts per series; median and fixed
 * values are computed here (pure + testable) and pinned to the value axis.
 */

export type RefLineKind = 'avg' | 'median' | 'min' | 'max' | 'value';

export interface RefLineOption {
  kind: RefLineKind;
  /** Fixed axis value — only used when kind === 'value'. */
  value?: number;
  /** Optional custom label; defaults to the kind's name. */
  label?: string;
}

const KINDS: RefLineKind[] = ['avg', 'median', 'min', 'max', 'value'];

const DEFAULT_LABEL: Record<RefLineKind, string> = {
  avg: 'Average',
  median: 'Median',
  min: 'Min',
  max: 'Max',
  value: 'Target',
};

/** Read + validate the refLine option off a tile's options bag. */
export function parseRefLine(options: Record<string, unknown>): RefLineOption | null {
  const r = options.refLine as Partial<RefLineOption> | undefined;
  if (!r || typeof r !== 'object') return null;
  if (!r.kind || !KINDS.includes(r.kind)) return null;
  if (r.kind === 'value' && typeof r.value !== 'number') return null;
  return {
    kind: r.kind,
    value: typeof r.value === 'number' ? r.value : undefined,
    label: typeof r.label === 'string' && r.label ? r.label : undefined,
  };
}

/** Median of a numeric list, ignoring nullish entries. Null if empty. */
export function median(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const LINE_STYLE = { type: 'dashed' as const, width: 1.5 };

/**
 * Build an ECharts `markLine` object for the option, or null if it can't be
 * drawn. `values` are the plotted numbers (for median); `horizontal` flips the
 * pinned axis for fixed value/median lines on a horizontal bar chart.
 */
export function buildMarkLine(
  opt: RefLineOption,
  values: Array<number | null | undefined>,
  horizontal = false,
): Record<string, unknown> | null {
  const name = opt.label ?? DEFAULT_LABEL[opt.kind];
  const base = {
    silent: true,
    symbol: 'none',
    lineStyle: LINE_STYLE,
    label: { formatter: name, position: 'insideEndTop' as const },
  };
  const axisKey = horizontal ? 'xAxis' : 'yAxis';

  if (opt.kind === 'avg' || opt.kind === 'min' || opt.kind === 'max') {
    const type = opt.kind === 'avg' ? 'average' : opt.kind;
    return { ...base, data: [{ type, name }] };
  }

  const pinned = opt.kind === 'median' ? median(values) : opt.value;
  if (pinned == null || !Number.isFinite(pinned)) return null;
  return { ...base, data: [{ [axisKey]: pinned, name }] };
}
