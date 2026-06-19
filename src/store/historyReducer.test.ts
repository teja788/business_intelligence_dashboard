import { describe, expect, it } from 'vitest';
import { emptyHistory, record, redo, undo } from './historyReducer';

describe('history reducer', () => {
  it('records edits and clears the redo stack', () => {
    let h = emptyHistory<string>();
    h = record(h, 'a');
    h = record(h, 'b');
    expect(h.past).toEqual(['a', 'b']);
    expect(h.future).toEqual([]);
  });

  it('undo moves the current state to the future stack', () => {
    let h = record(record(emptyHistory<string>(), 'a'), 'b'); // past: [a, b]
    const u = undo(h, 'c')!; // current is 'c'
    expect(u.restored).toBe('b');
    expect(u.history.past).toEqual(['a']);
    expect(u.history.future).toEqual(['c']);
  });

  it('redo replays a previously undone state', () => {
    let h = { past: ['a'], future: ['c'] };
    const r = redo(h, 'b')!;
    expect(r.restored).toBe('c');
    expect(r.history.past).toEqual(['a', 'b']);
    expect(r.history.future).toEqual([]);
  });

  it('returns null at the ends of the stacks', () => {
    expect(undo(emptyHistory<string>(), 'x')).toBeNull();
    expect(redo(emptyHistory<string>(), 'x')).toBeNull();
  });

  it('a new edit after undo drops the redo stack', () => {
    let h = { past: ['a'], future: ['c'] };
    h = record(h, 'b');
    expect(h.past).toEqual(['a', 'b']);
    expect(h.future).toEqual([]);
  });

  it('caps the past stack to the configured size', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i++) h = record(h, i, 50);
    expect(h.past.length).toBe(50);
    expect(h.past[0]).toBe(10); // oldest 10 dropped
    expect(h.past[49]).toBe(59);
  });
});
