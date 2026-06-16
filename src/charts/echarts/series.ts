/**
 * Reshape resolved ChartData into ECharts categories + series. Handles the
 * series-splitting color dimension and the multi-measure case. Pure + testable.
 */
import type { ChartData } from '../types';

export interface CategorySeries {
  categories: (string | number)[];
  series: { name: string; data: (number | null)[] }[];
}

function asCategory(v: unknown): string | number {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Unique values preserving first-seen order. */
function uniqueInOrder(values: (string | number)[]): (string | number)[] {
  const seen = new Set<string>();
  const out: (string | number)[] = [];
  for (const v of values) {
    const k = String(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

export function buildCategorySeries(data: ChartData): CategorySeries {
  const xKey = data.x?.key;
  const colorKey = data.color?.key;

  const categories = uniqueInOrder(
    data.rows.map((r) => (xKey ? asCategory(r[xKey]) : '')),
  );
  const catIndex = new Map(categories.map((c, i) => [String(c), i]));

  // Color split → one series per distinct color value (using the first measure).
  if (colorKey && data.measures.length) {
    const measure = data.measures[0];
    const seriesNames = uniqueInOrder(
      data.rows.map((r) => asCategory(r[colorKey])),
    );
    const series = seriesNames.map((name) => ({
      name: String(name),
      data: new Array<number | null>(categories.length).fill(null),
    }));
    const seriesIndex = new Map(seriesNames.map((n, i) => [String(n), i]));
    for (const row of data.rows) {
      const ci = catIndex.get(String(asCategory(xKey ? row[xKey] : '')));
      const si = seriesIndex.get(String(asCategory(row[colorKey])));
      if (ci != null && si != null) {
        series[si].data[ci] = asNumber(row[measure.key]);
      }
    }
    return { categories, series };
  }

  // No color → one series per measure.
  const series = data.measures.map((m) => ({
    name: m.label,
    data: new Array<number | null>(categories.length).fill(null),
  }));
  data.rows.forEach((row) => {
    const ci = catIndex.get(String(asCategory(xKey ? row[xKey] : '')));
    if (ci == null) return;
    data.measures.forEach((m, mi) => {
      series[mi].data[ci] = asNumber(row[m.key]);
    });
  });
  return { categories, series };
}
