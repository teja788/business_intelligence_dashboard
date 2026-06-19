import { describe, expect, it } from 'vitest';
import { LruCache } from './queryCache';

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const c = new LruCache<string, number>(3);
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
    expect(c.has('a')).toBe(true);
    expect(c.get('missing')).toBeUndefined();
  });

  it('evicts the least-recently-used entry past capacity', () => {
    const c = new LruCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3); // evicts 'a'
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
    expect(c.size).toBe(2);
  });

  it('a get refreshes recency so it survives eviction', () => {
    const c = new LruCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // 'a' is now most-recent
    c.set('c', 3); // should evict 'b', not 'a'
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
  });

  it('overwriting a key updates value and recency', () => {
    const c = new LruCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('a', 10); // refresh 'a'
    c.set('c', 3); // evicts 'b'
    expect(c.get('a')).toBe(10);
    expect(c.has('b')).toBe(false);
  });

  it('clear empties the cache', () => {
    const c = new LruCache<string, number>(2);
    c.set('a', 1);
    c.clear();
    expect(c.size).toBe(0);
    expect(c.has('a')).toBe(false);
  });
});
