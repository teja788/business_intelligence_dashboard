/**
 * Local persistence (§4): IndexedDB via `idb`. We store
 *  - the raw bytes of imported files (so datasets can be rebuilt in DuckDB on
 *    reload — DuckDB-WASM tables are in-memory and vanish otherwise), and
 *  - workbook definitions (the serializable unit of save/export/share).
 *
 * Dataset *ids* are persisted and reused on restore so field ids
 * (`${datasetId}::column`) and tile references stay stable across reloads.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Workbook } from '@/model/types';

export interface StoredDataset {
  id: string;
  name: string;
  fileName: string;
  /** Raw file bytes (file-imported datasets). */
  bytes?: ArrayBuffer;
  /** SQL to rebuild a derived dataset (joins/unions/SQL Lab). */
  derivedSql?: string;
  loadedAt: string;
}

interface VantageDB extends DBSchema {
  datasets: { key: string; value: StoredDataset };
  workbooks: { key: string; value: Workbook };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<VantageDB>> | null = null;

function db(): Promise<IDBPDatabase<VantageDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VantageDB>('vantage', 1, {
      upgrade(d) {
        d.createObjectStore('datasets', { keyPath: 'id' });
        d.createObjectStore('workbooks', { keyPath: 'id' });
        d.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export async function saveDataset(ds: StoredDataset): Promise<void> {
  await (await db()).put('datasets', ds);
}
export async function getDatasets(): Promise<StoredDataset[]> {
  return (await db()).getAll('datasets');
}
export async function deleteStoredDataset(id: string): Promise<void> {
  await (await db()).delete('datasets', id);
}

export async function saveWorkbook(wb: Workbook): Promise<void> {
  await (await db()).put('workbooks', wb);
}
export async function getWorkbook(id: string): Promise<Workbook | undefined> {
  return (await db()).get('workbooks', id);
}
export async function listWorkbooks(): Promise<Workbook[]> {
  return (await db()).getAll('workbooks');
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key);
}
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  return (await db()).get('meta', key) as Promise<T | undefined>;
}
