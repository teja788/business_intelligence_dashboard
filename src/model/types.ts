/**
 * Vantage domain model (§6 of the brief).
 *
 * Everything that defines a workbook must be serializable to JSON — it is the
 * unit of save (IndexedDB now, server later), export, and share. Keep these
 * types free of runtime/engine objects (no Arrow tables, no DuckDB handles).
 */

export type FieldRole = 'dimension' | 'measure';

export type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'geo';

export type Aggregation =
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | 'countDistinct'
  | 'median';

export type DateTruncUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface ValueFormat {
  kind: 'number' | 'currency' | 'percent' | 'date' | 'string';
  /** e.g. currency code "USD", or a date pattern like "yyyy-MM". */
  pattern?: string;
  decimals?: number;
  currency?: string;
}

export interface Field {
  id: string;
  datasetId: string;
  name: string; // display name
  column: string; // physical column or calculated-field id
  role: FieldRole;
  type: FieldType;
  defaultAggregation?: Aggregation;
  format?: ValueFormat;
  isCalculated?: boolean;
  formula?: string; // source formula text, present iff isCalculated
  sqlExpr?: string; // compiled SQL expression, present iff isCalculated
  /** Calc measure whose expression already aggregates — do NOT wrap in an agg. */
  aggregated?: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  source: 'file' | 'remote';
  /** Physical table name inside the engine (e.g. DuckDB table/view). */
  table: string;
  fields: Field[];
  rowCount: number;
  loadedAt: string; // ISO timestamp — drives the "data freshness" badge
}

/* ----------------------------- Query model ------------------------------ */

export interface BinSpec {
  /** Fixed-width numeric binning. */
  size?: number;
  /** Or a fixed bucket count across the value range. */
  count?: number;
}

export type FilterOp =
  | 'in'
  | 'notIn'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'contains'
  | 'isNull'
  | 'isNotNull';

export interface Filter {
  field: string; // Field.id
  op: FilterOp;
  /** Values for in/notIn/between/eq/etc. Shape depends on op. */
  values?: (string | number | boolean | null)[];
}

export interface QueryDimension {
  field: string; // Field.id
  bin?: BinSpec;
  dateTrunc?: DateTruncUnit;
}

export interface QueryMeasure {
  field: string; // Field.id
  agg: Aggregation;
}

export interface QuerySpec {
  datasetId: string;
  dimensions: QueryDimension[];
  measures: QueryMeasure[];
  filters: Filter[];
  sort?: { field: string; dir: 'asc' | 'desc' }[];
  limit?: number;
}

/* --------------------------- Charts & layout ---------------------------- */

export interface GridLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Shelf wells — Tableau-style encoding. */
export interface Encoding {
  x?: string[]; // Field ids
  y?: string[];
  color?: string;
  size?: string;
  detail?: string[];
  label?: string;
  tooltip?: string[];
}

export interface ChartTile {
  id: string;
  type: string; // registered ChartRenderer id
  title?: string;
  query: QuerySpec;
  encoding: Encoding;
  options: Record<string, unknown>;
  layout: GridLayout;
}

export interface Parameter {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'date';
  value: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface Workbook {
  id: string;
  name: string;
  datasets: string[]; // Dataset ids
  tiles: ChartTile[];
  parameters: Parameter[];
  /** User-defined calculated fields (carry their datasetId via Field). */
  calculatedFields?: Field[];
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------- Profiling -------------------------------- */

export interface ColumnProfile {
  column: string;
  type: FieldType;
  nullCount: number;
  nullFraction: number;
  distinctCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  /** Small histogram/sparkline buckets for numeric/date columns. */
  histogram?: { bucket: string; count: number }[];
  /** Top example values (for categorical columns). */
  examples?: { value: string | number | null; count: number }[];
}

export interface DatasetProfile {
  datasetId: string;
  rowCount: number;
  columns: ColumnProfile[];
}

/* ------------------------- Associative engine --------------------------- */

export type SelectionStateKind = 'selected' | 'possible' | 'excluded';

export interface ValueState {
  value: string | number | boolean | null;
  state: SelectionStateKind;
  count?: number;
}

/** A reference to a field for association queries. */
export interface FieldRef {
  datasetId: string;
  field: string; // Field.id
}

/** The global associative selection: picked values per field, plus free filters. */
export interface Selection {
  selections: { field: string; values: (string | number | boolean | null)[] }[];
  filters: Filter[];
}

export const EMPTY_SELECTION: Selection = { selections: [], filters: [] };
