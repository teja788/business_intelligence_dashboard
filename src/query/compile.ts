/**
 * Visual-query → SQL compiler (the lightweight semantic layer, §5/§6).
 *
 * Takes a serializable `QuerySpec` plus the dataset's field metadata and emits
 * DuckDB-dialect SQL. Pure and synchronous so it is trivially unit-testable
 * (the brief calls this out for tests) and reusable by SQL Lab's "View SQL".
 */
import type {
  Aggregation,
  Dataset,
  DateTruncUnit,
  Field,
  Filter,
  QueryDimension,
  QueryMeasure,
  QuerySpec,
} from '@/model/types';
import { quoteIdent, quoteLiteral, quoteLiteralList } from './sql';

function fieldMap(dataset: Dataset): Map<string, Field> {
  return new Map(dataset.fields.map((f) => [f.id, f]));
}

function resolve(fields: Map<string, Field>, id: string): Field {
  const f = fields.get(id);
  if (!f) throw new Error(`Unknown field id: ${id}`);
  return f;
}

/** Base column expression for a field (physical column, or compiled calc SQL). */
function baseExpr(field: Field): string {
  if (field.isCalculated && field.sqlExpr) {
    // Pre-compiled by the formula engine; may contain __ORDER__/__PARAM_*__
    // placeholders resolved at the end of compileQuery.
    return `(${field.sqlExpr})`;
  }
  return quoteIdent(field.column);
}

function dateTruncExpr(expr: string, unit: DateTruncUnit): string {
  return `DATE_TRUNC('${unit}', ${expr})`;
}

function binExpr(expr: string, size: number): string {
  // Floor to the nearest multiple of `size` — stable, label-able numeric bins.
  return `FLOOR(${expr} / ${size}) * ${size}`;
}

export function dimensionExpr(field: Field, dim: QueryDimension): string {
  let expr = baseExpr(field);
  if (dim.dateTrunc) expr = dateTruncExpr(expr, dim.dateTrunc);
  if (dim.bin?.size) expr = binExpr(expr, dim.bin.size);
  return expr;
}

export function aggExpr(field: Field, agg: Aggregation): string {
  // A calculated field whose formula already aggregates (e.g. SUM([Sales]) or a
  // window calc) must be used as-is — wrapping it in another aggregate is an error.
  if (field.isCalculated && field.aggregated) return baseExpr(field);
  const col = baseExpr(field);
  switch (agg) {
    case 'sum':
      return `SUM(${col})`;
    case 'avg':
      return `AVG(${col})`;
    case 'min':
      return `MIN(${col})`;
    case 'max':
      return `MAX(${col})`;
    case 'count':
      return `COUNT(${col})`;
    case 'countDistinct':
      return `COUNT(DISTINCT ${col})`;
    case 'median':
      return `MEDIAN(${col})`;
    default: {
      const _exhaustive: never = agg;
      throw new Error(`Unsupported aggregation: ${_exhaustive}`);
    }
  }
}

/** Stable, readable output column alias for a dimension/measure. */
export function dimensionAlias(field: Field, dim: QueryDimension): string {
  if (dim.dateTrunc) return `${field.name} (${dim.dateTrunc})`;
  if (dim.bin?.size) return `${field.name} (bin)`;
  return field.name;
}

export function measureAlias(field: Field, m: QueryMeasure): string {
  if (field.isCalculated && field.aggregated) return field.name;
  return `${m.agg}(${field.name})`;
}

export function compileFilter(fields: Map<string, Field>, filter: Filter): string {
  const field = resolve(fields, filter.field);
  const col = baseExpr(field);
  const vals = filter.values ?? [];
  switch (filter.op) {
    case 'in':
      return vals.length ? `${col} IN (${quoteLiteralList(vals)})` : 'FALSE';
    case 'notIn':
      return vals.length ? `${col} NOT IN (${quoteLiteralList(vals)})` : 'TRUE';
    case 'eq':
      return `${col} = ${quoteLiteral(vals[0] ?? null)}`;
    case 'neq':
      return `${col} <> ${quoteLiteral(vals[0] ?? null)}`;
    case 'gt':
      return `${col} > ${quoteLiteral(vals[0] ?? null)}`;
    case 'gte':
      return `${col} >= ${quoteLiteral(vals[0] ?? null)}`;
    case 'lt':
      return `${col} < ${quoteLiteral(vals[0] ?? null)}`;
    case 'lte':
      return `${col} <= ${quoteLiteral(vals[0] ?? null)}`;
    case 'between':
      return `${col} BETWEEN ${quoteLiteral(vals[0] ?? null)} AND ${quoteLiteral(
        vals[1] ?? null,
      )}`;
    case 'contains':
      return `${col} ILIKE ${quoteLiteral(`%${String(vals[0] ?? '')}%`)}`;
    case 'isNull':
      return `${col} IS NULL`;
    case 'isNotNull':
      return `${col} IS NOT NULL`;
    default: {
      const _exhaustive: never = filter.op;
      throw new Error(`Unsupported filter op: ${_exhaustive}`);
    }
  }
}

export function compileWhere(
  fields: Map<string, Field>,
  filters: Filter[],
): string {
  if (!filters.length) return '';
  const clauses = filters.map((f) => compileFilter(fields, f));
  return `WHERE ${clauses.join(' AND ')}`;
}

export interface CompileOptions {
  /** What-if parameter values, substituted for __PARAM_name__ placeholders. */
  params?: Record<string, string | number | boolean | null>;
}

/**
 * Compile a QuerySpec to a full SQL statement against the dataset's table.
 */
export function compileQuery(
  spec: QuerySpec,
  dataset: Dataset,
  options: CompileOptions = {},
): string {
  const fields = fieldMap(dataset);
  const table = quoteIdent(dataset.table);

  const selectParts: string[] = [];
  const groupByOrdinals: number[] = [];

  // Expression used for window ORDER BY (the first dimension), substituted into
  // any window calc placeholders.
  let orderExpr = '1';

  spec.dimensions.forEach((dim, i) => {
    const field = resolve(fields, dim.field);
    const expr = dimensionExpr(field, dim);
    if (i === 0) orderExpr = expr;
    selectParts.push(`${expr} AS ${quoteIdent(dimensionAlias(field, dim))}`);
    groupByOrdinals.push(selectParts.length); // 1-based ordinal
  });

  spec.measures.forEach((m) => {
    const field = resolve(fields, m.field);
    selectParts.push(
      `${aggExpr(field, m.agg)} AS ${quoteIdent(measureAlias(field, m))}`,
    );
  });

  // Guard: an empty SELECT means "show raw rows".
  const selectClause = selectParts.length ? selectParts.join(', ') : '*';

  const where = compileWhere(fields, spec.filters);

  const groupBy =
    spec.measures.length && groupByOrdinals.length
      ? `GROUP BY ${groupByOrdinals.join(', ')}`
      : '';

  let orderBy = '';
  if (spec.sort?.length) {
    const sortClauses = spec.sort.map((s) => {
      const f = resolve(fields, s.field);
      return `${quoteIdent(f.name)} ${s.dir.toUpperCase()}`;
    });
    orderBy = `ORDER BY ${sortClauses.join(', ')}`;
  }

  const limit = spec.limit != null ? `LIMIT ${Math.max(0, spec.limit | 0)}` : '';

  let sql = [`SELECT ${selectClause}`, `FROM ${table}`, where, groupBy, orderBy, limit]
    .filter(Boolean)
    .join('\n');

  // Resolve calculated-field placeholders.
  sql = sql.replace(/__ORDER__/g, orderExpr);
  sql = sql.replace(/__PARAM_(.+?)__/g, (_m, name: string) => {
    const v = options.params?.[name];
    return quoteLiteral(v ?? null);
  });

  return sql;
}
