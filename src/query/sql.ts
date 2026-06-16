/**
 * Low-level SQL string helpers (DuckDB dialect). Centralized so quoting/escaping
 * is consistent and the compiler stays readable. Target standard SQL so the
 * compiler survives a future move to Postgres/warehouses.
 */

/** Quote a SQL identifier (column/table) for DuckDB: double quotes, doubled inside. */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Quote a scalar literal safely. */
export function quoteLiteral(
  value: string | number | boolean | null,
): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${value.replace(/'/g, "''")}'`;
}

export function quoteLiteralList(
  values: (string | number | boolean | null)[],
): string {
  return values.map(quoteLiteral).join(', ');
}
