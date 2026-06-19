/**
 * Query result cache. Dashboards run many tiles, often sharing the same SQL
 * (KPIs over the same filtered table, re-renders on layout changes, etc.).
 * Caching by exact SQL string avoids redundant DuckDB round-trips. Correct
 * because the same SQL yields the same result until the underlying data
 * changes — so we clear the whole cache when a dataset is added/refreshed/
 * removed (filters/params change the SQL text itself, so they key distinctly).
 */
import type { Table as ArrowTable } from 'apache-arrow';
import { eventBus } from '@/events/bus';

/** Tiny insertion-ordered LRU. Pure and unit-tested. */
export class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // Mark as most-recently-used.
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K;
      this.map.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

const cache = new LruCache<string, ArrowTable>(64);

export function getCachedQuery(sql: string): ArrowTable | undefined {
  return cache.get(sql);
}

export function setCachedQuery(sql: string, table: ArrowTable): void {
  cache.set(sql, table);
}

export function clearQueryCache(): void {
  cache.clear();
}

// Any change to the dataset registry invalidates cached results.
eventBus.on('dataset:added', clearQueryCache);
eventBus.on('dataset:removed', clearQueryCache);
