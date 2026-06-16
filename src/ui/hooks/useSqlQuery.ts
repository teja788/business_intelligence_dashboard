/**
 * React hook: run a SQL query through the DataSource and expose the result as
 * plain columns + rows. Charts/tables consume this rather than touching the
 * engine directly. Arrow stays inside the engine boundary; we materialize to
 * JS values here (M0 tables). Charts will read Arrow directly in later work.
 */
import { useEffect, useState } from 'react';
import { getDataSource } from '@/engine/source';

export interface SqlResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface QueryState {
  data?: SqlResult;
  loading: boolean;
  error?: string;
}

export function useSqlQuery(sql: string | null): QueryState {
  const [state, setState] = useState<QueryState>({ loading: !!sql });

  useEffect(() => {
    if (!sql) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    (async () => {
      try {
        const table = await getDataSource().runSQL(sql);
        const columns = table.schema.fields.map((f) => f.name);
        const rows = table.toArray().map((r) => {
          const obj: Record<string, unknown> = {};
          for (const col of columns) {
            const v = (r as Record<string, unknown>)[col];
            // Normalize BigInt (DuckDB counts) for display/serialization.
            obj[col] = typeof v === 'bigint' ? Number(v) : v;
          }
          return obj;
        });
        if (!cancelled) setState({ loading: false, data: { columns, rows } });
      } catch (err) {
        if (!cancelled)
          setState({
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sql]);

  return state;
}
