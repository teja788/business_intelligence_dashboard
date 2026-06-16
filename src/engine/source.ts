/**
 * App-wide DataSource singleton. The rest of the app imports `getDataSource()`
 * and never constructs an engine directly — swapping in RemoteSQLSource later
 * is a one-line change here.
 */
import type { DataSource } from './DataSource';
import { LocalDuckDBSource } from './LocalDuckDBSource';

let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!instance) instance = new LocalDuckDBSource();
  return instance;
}
