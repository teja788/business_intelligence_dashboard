/**
 * Boots DuckDB-WASM. The engine runs inside its own Web Worker (spawned by
 * AsyncDuckDB), so analytical queries never block the main thread.
 *
 * We bundle the wasm + worker locally (via Vite `?url` imports) instead of
 * fetching from a CDN — this keeps Vantage local-first and offline-capable.
 * If SharedArrayBuffer is available (COOP/COEP headers set) DuckDB selects its
 * multi-threaded bundle automatically; otherwise it falls back to single-thread.
 */
import * as duckdb from '@duckdb/duckdb-wasm';

// Local bundle assets — Vite rewrites these to served URLs and copies them
// into the production build.
import mvp_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvp_wasm, mainWorker: mvp_worker },
  eh: { mainModule: eh_wasm, mainWorker: eh_worker },
};

export interface BootedDuckDB {
  db: duckdb.AsyncDuckDB;
  /** True when cross-origin isolation enabled the multi-threaded path. */
  crossOriginIsolated: boolean;
}

let bootPromise: Promise<BootedDuckDB> | null = null;

/** Boots (or returns the already-booting) DuckDB instance — singleton. */
export function bootDuckDB(): Promise<BootedDuckDB> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker!);
    const logger =
      import.meta.env?.DEV ? new duckdb.ConsoleLogger() : new duckdb.VoidLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return {
      db,
      crossOriginIsolated:
        typeof globalThis !== 'undefined' && !!globalThis.crossOriginIsolated,
    };
  })();
  return bootPromise;
}
