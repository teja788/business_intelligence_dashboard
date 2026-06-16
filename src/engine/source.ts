/**
 * App-wide DataSource singleton. The rest of the app imports `getDataSource()`
 * and never constructs an engine directly — swapping in RemoteSQLSource later
 * is a one-line change here.
 */
import type { DataSource } from './DataSource';
import { LocalDuckDBSource } from './LocalDuckDBSource';
import { RemoteSQLSource } from './RemoteSQLSource';

let instance: DataSource | null = null;

/**
 * The single place the engine is chosen. v1 is always Local (browser DuckDB);
 * setting VITE_DATA_SOURCE=remote + VITE_REMOTE_URL flips to the M6 server
 * backend with ZERO changes anywhere else — the whole point of the DataSource
 * boundary.
 */
export function getDataSource(): DataSource {
  if (instance) return instance;
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  if (env.VITE_DATA_SOURCE === 'remote' && env.VITE_REMOTE_URL) {
    instance = new RemoteSQLSource({
      baseUrl: env.VITE_REMOTE_URL,
      token: env.VITE_REMOTE_TOKEN,
    });
  } else {
    instance = new LocalDuckDBSource();
  }
  return instance;
}
