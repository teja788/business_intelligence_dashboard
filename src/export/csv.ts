/**
 * CSV/TSV serialization. Pure and synchronous (so it is unit-testable) plus a
 * thin async helper that runs SQL through the DataSource and downloads the
 * result. Numbers/booleans/null/Date are rendered predictably; everything else
 * is stringified and RFC-4180 quoted when it contains a delimiter/quote/newline.
 */
import { getDataSource } from '@/engine/source';
import { downloadText, slugify } from './download';

function cell(value: unknown, delimiter: string): string {
  if (value == null) return '';
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'bigint') s = value.toString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);
  if (s.includes('"') || s.includes(delimiter) || /[\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface ToCsvOptions {
  /** Field delimiter. Use "\t" for TSV. Defaults to ",". */
  delimiter?: string;
}

/** Serialize columns + row objects to a CSV string. */
export function toCsv(
  columns: string[],
  rows: Record<string, unknown>[],
  opts: ToCsvOptions = {},
): string {
  const d = opts.delimiter ?? ',';
  const header = columns.map((c) => cell(c, d)).join(d);
  const body = rows.map((r) => columns.map((c) => cell(r[c], d)).join(d));
  return [header, ...body].join('\r\n');
}

/**
 * Run a SQL query and download the result as a CSV file. Used by tile/data
 * "Export data" actions — the numbers come from the engine, never recomputed.
 */
export async function exportSqlToCsv(sql: string, baseName: string): Promise<void> {
  const table = await getDataSource().runSQL(sql);
  const columns = table.schema.fields.map((f) => f.name);
  const rows = table.toArray().map((r) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const v = (r as Record<string, unknown>)[col];
      obj[col] = typeof v === 'bigint' ? Number(v) : v;
    }
    return obj;
  });
  downloadText(toCsv(columns, rows), `${slugify(baseName)}.csv`, 'text/csv;charset=utf-8');
}
