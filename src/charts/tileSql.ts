/**
 * Compute the SQL behind a tile (for "View SQL" / "Edit as SQL") and a query
 * for its underlying rows (for "View underlying rows"). Reuses the exact same
 * resolve + compile path the chart uses — radical transparency (§9).
 */
import type { Dataset, Filter, Parameter } from '@/model/types';
import { compileQuery } from '@/query/compile';
import { quoteIdent } from '@/query/sql';
import { resolveChart, type DimensionTransform } from './resolve';
import type { Encoding } from '@/model/types';

function paramMap(parameters: Parameter[]) {
  const m: Record<string, string | number | boolean | null> = {};
  for (const p of parameters) m[p.name] = p.value;
  return m;
}

export function getTileSQL(
  dataset: Dataset,
  encoding: Encoding,
  options: Record<string, unknown>,
  filters: Filter[],
  parameters: Parameter[],
): string {
  const transforms = options.transforms as
    | Record<string, DimensionTransform>
    | undefined;
  const resolved = resolveChart(encoding, dataset, { filters, transforms });
  if (!resolved.spec.dimensions.length && !resolved.spec.measures.length) {
    return `-- Add fields to this chart to generate a query.`;
  }
  return compileQuery(resolved.spec, dataset, { params: paramMap(parameters) });
}

/** SQL that returns the raw rows behind a tile, honoring active filters. */
export function getUnderlyingRowsSQL(
  dataset: Dataset,
  filters: Filter[],
  limit = 500,
): string {
  const fields = new Map(dataset.fields.map((f) => [f.id, f]));
  const clauses = filters
    .filter((f) => fields.has(f.field))
    .map((f) => {
      const field = fields.get(f.field)!;
      const col = quoteIdent(field.column);
      const vals = (f.values ?? []).map((v) =>
        typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v),
      );
      if (f.op === 'in' && vals.length) return `${col} IN (${vals.join(', ')})`;
      if (f.op === 'notIn' && vals.length) return `${col} NOT IN (${vals.join(', ')})`;
      return null;
    })
    .filter(Boolean);
  const where = clauses.length ? `\nWHERE ${clauses.join(' AND ')}` : '';
  return `SELECT * FROM ${quoteIdent(dataset.table)}${where}\nLIMIT ${limit}`;
}
