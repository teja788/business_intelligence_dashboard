/**
 * Bridge between the visual encoding (shelves) and the engine.
 *
 * Given an Encoding + Dataset, produce (a) a QuerySpec to run and (b) the
 * ColumnMeta that tells a chart which result columns are x / color / measures.
 * Result column keys reuse the compiler's aliasing so they line up exactly with
 * the rows materialized from the Arrow result.
 */
import type {
  Dataset,
  Encoding,
  Field,
  Filter,
  QueryMeasure,
  QuerySpec,
} from '@/model/types';
import { dimensionAlias, measureAlias } from '@/query/compile';
import type { ChartData, ColumnMeta } from './types';

function fieldById(dataset: Dataset, id: string): Field | undefined {
  return dataset.fields.find((f) => f.id === id);
}

export interface ResolvedChart {
  spec: QuerySpec;
  x?: ColumnMeta;
  color?: ColumnMeta;
  measures: ColumnMeta[];
  size?: ColumnMeta;
}

/** Per-field binning / date-truncation hints (stored in a tile's options). */
export interface DimensionTransform {
  bin?: { size: number };
  dateTrunc?: QuerySpec['dimensions'][number]['dateTrunc'];
}

export interface ResolveOptions {
  filters?: Filter[];
  limit?: number;
  transforms?: Record<string, DimensionTransform>;
  sort?: QuerySpec['sort'];
}

export function resolveChart(
  encoding: Encoding,
  dataset: Dataset,
  options: ResolveOptions = {},
): ResolvedChart {
  const { filters = [], limit = 5000, transforms = {}, sort } = options;
  const dimensions: QuerySpec['dimensions'] = [];
  let x: ColumnMeta | undefined;
  let color: ColumnMeta | undefined;

  const addDim = (id: string): ColumnMeta | undefined => {
    const field = fieldById(dataset, id);
    if (!field) return undefined;
    const t = transforms[id];
    const dim = { field: field.id, bin: t?.bin, dateTrunc: t?.dateTrunc };
    dimensions.push(dim);
    return { key: dimensionAlias(field, dim), label: field.name, field };
  };

  const xId = encoding.x?.[0];
  if (xId) x = addDim(xId);
  if (encoding.color) color = addDim(encoding.color);

  const measures: QueryMeasure[] = [];
  const measureMeta: ColumnMeta[] = [];
  // Add a measure to the query; `asSeries` controls whether it becomes a
  // plotted series (true for y) vs a side channel like size (false).
  const addMeasure = (id: string, asSeries: boolean): ColumnMeta | undefined => {
    const field = fieldById(dataset, id);
    if (!field) return undefined;
    const agg = field.defaultAggregation ?? (field.role === 'measure' ? 'sum' : 'count');
    const m = { field: field.id, agg };
    measures.push(m);
    const meta = { key: measureAlias(field, m), label: `${agg}(${field.name})`, field };
    if (asSeries) measureMeta.push(meta);
    return meta;
  };

  for (const yId of encoding.y ?? []) addMeasure(yId, true);
  const size = encoding.size ? addMeasure(encoding.size, false) : undefined;

  const spec: QuerySpec = {
    datasetId: dataset.id,
    dimensions,
    measures,
    filters,
    sort,
    limit,
  };

  return { spec, x, color, measures: measureMeta, size };
}

/** Combine resolved metadata with materialized rows into ChartData. */
export function toChartData(
  resolved: ResolvedChart,
  rows: Record<string, unknown>[],
): ChartData {
  return {
    rows,
    x: resolved.x,
    color: resolved.color,
    measures: resolved.measures,
    size: resolved.size,
  };
}
