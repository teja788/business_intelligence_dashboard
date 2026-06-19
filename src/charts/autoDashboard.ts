/**
 * Heuristic "auto-build" — turn a freshly profiled dataset into a useful
 * starter dashboard in one click, with no AI. The rules mirror what an analyst
 * does first: headline KPIs for each measure, a time trend if there's a date,
 * and a breakdown bar for each low-cardinality category. Pure and synchronous
 * so it is unit-testable; the store just persists what it returns.
 */
import type { Dataset, Field } from '@/model/types';
import type { CreateTileInput } from '@/model/factory';

const COLS = 12;
/** Categories with more distinct values than this don't make readable bars. */
const MAX_BAR_CARDINALITY = 50;

function isDate(f: Field): boolean {
  return f.type === 'date' || f.type === 'datetime';
}

function isCategorical(f: Field): boolean {
  return f.type === 'string' || f.type === 'boolean' || f.type === 'integer';
}

export interface AutoDashboardOptions {
  /** distinctCount keyed by physical column name (from DatasetProfile). */
  cardinality?: Record<string, number>;
  /** y of the first generated tile (to append below existing tiles). */
  baseY?: number;
}

/** Build a list of tiles for a dataset. Empty if there's nothing to chart. */
export function buildAutoDashboard(
  dataset: Dataset,
  opts: AutoDashboardOptions = {},
): CreateTileInput[] {
  const card = opts.cardinality ?? {};
  const baseY = opts.baseY ?? 0;
  const measures = dataset.fields.filter((f) => f.role === 'measure');
  const dims = dataset.fields.filter((f) => f.role === 'dimension');
  const dateDim = dims.find(isDate);

  const catDims = dims
    .filter((d) => d !== dateDim && isCategorical(d))
    .map((d) => ({ d, n: card[d.column] ?? Number.POSITIVE_INFINITY }))
    .filter((x) => x.n >= 2 && x.n <= MAX_BAR_CARDINALITY)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.d)
    .slice(0, 4);

  const tiles: CreateTileInput[] = [];
  let y = baseY;

  // 1) Headline KPIs — one per measure, four across the top.
  const kpiMeasures = measures.slice(0, 4);
  kpiMeasures.forEach((m, i) => {
    tiles.push({
      datasetId: dataset.id,
      type: 'kpi',
      title: m.name,
      encoding: { y: [m.id] },
      layout: { x: (i % 4) * 3, y, w: 3, h: 3 },
    });
  });
  if (kpiMeasures.length) y += 3;

  // 2) Time trend — first one/two measures over the date dimension (by month).
  if (dateDim && measures.length) {
    const ys = measures.slice(0, 2).map((m) => m.id);
    tiles.push({
      datasetId: dataset.id,
      type: 'line',
      title: `${measures[0].name} over time`,
      encoding: { x: [dateDim.id], y: ys },
      options: { transforms: { [dateDim.id]: { dateTrunc: 'month' } } },
      layout: { x: 0, y, w: COLS, h: 6 },
    });
    y += 6;
  }

  // 3) Breakdown bars — primary measure by each low-cardinality category.
  if (measures.length) {
    const primary = measures[0];
    catDims.forEach((d, i) => {
      tiles.push({
        datasetId: dataset.id,
        type: 'bar',
        title: `${primary.name} by ${d.name}`,
        encoding: { x: [d.id], y: [primary.id] },
        layout: { x: (i % 2) * 6, y: y + Math.floor(i / 2) * 6, w: 6, h: 6 },
      });
    });
    if (catDims.length) y += Math.ceil(catDims.length / 2) * 6;
  } else if (catDims.length) {
    // No measures: counts by the first category still beats a blank canvas.
    tiles.push({
      datasetId: dataset.id,
      type: 'bar',
      title: `Count by ${catDims[0].name}`,
      encoding: { x: [catDims[0].id], y: [] },
      layout: { x: 0, y, w: COLS, h: 6 },
    });
    y += 6;
  }

  return tiles;
}
