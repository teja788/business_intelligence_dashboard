/**
 * Generic undo/redo history reducer (pure). The dashboard wires it to workbook
 * snapshots, but it knows nothing about workbooks — just past/future stacks of
 * opaque states. Pure + unit-tested so the tricky stack bookkeeping is verified
 * independently of the store subscription that drives it.
 */
export interface History<T> {
  past: T[];
  future: T[];
}

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

/** Record a committed edit: push the prior state, drop the redo stack. */
export function record<T>(h: History<T>, prev: T, cap = 50): History<T> {
  const past = [...h.past, prev];
  while (past.length > cap) past.shift();
  return { past, future: [] };
}

/** Step back: returns the state to restore + the new history, or null if empty. */
export function undo<T>(
  h: History<T>,
  current: T,
): { history: History<T>; restored: T } | null {
  if (!h.past.length) return null;
  const restored = h.past[h.past.length - 1];
  return {
    history: { past: h.past.slice(0, -1), future: [...h.future, current] },
    restored,
  };
}

/** Step forward: returns the state to restore + the new history, or null. */
export function redo<T>(
  h: History<T>,
  current: T,
): { history: History<T>; restored: T } | null {
  if (!h.future.length) return null;
  const restored = h.future[h.future.length - 1];
  return {
    history: { past: [...h.past, current], future: h.future.slice(0, -1) },
    restored,
  };
}
