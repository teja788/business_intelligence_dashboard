import { describe, expect, it } from 'vitest';
import { buildMarkLine, median, parseRefLine } from './refline';

describe('parseRefLine', () => {
  it('returns null for missing/invalid options', () => {
    expect(parseRefLine({})).toBeNull();
    expect(parseRefLine({ refLine: { kind: 'nope' } })).toBeNull();
    // 'value' requires a numeric value.
    expect(parseRefLine({ refLine: { kind: 'value' } })).toBeNull();
  });

  it('parses aggregate and fixed-value kinds', () => {
    expect(parseRefLine({ refLine: { kind: 'avg' } })).toEqual({
      kind: 'avg',
      value: undefined,
      label: undefined,
    });
    expect(parseRefLine({ refLine: { kind: 'value', value: 42, label: 'Goal' } })).toEqual({
      kind: 'value',
      value: 42,
      label: 'Goal',
    });
  });
});

describe('median', () => {
  it('handles odd and even counts and ignores nullish', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5, null, undefined, 1])).toBe(3);
    expect(median([])).toBeNull();
  });
});

describe('buildMarkLine', () => {
  it('uses native ECharts types for avg/min/max', () => {
    const ml = buildMarkLine({ kind: 'avg' }, [1, 2, 3]);
    expect((ml!.data as any[])[0].type).toBe('average');
  });

  it('pins median/value onto the value axis (yAxis by default)', () => {
    const med = buildMarkLine({ kind: 'median' }, [1, 2, 3, 4]);
    expect((med!.data as any[])[0].yAxis).toBe(2.5);
    const val = buildMarkLine({ kind: 'value', value: 100 }, [1, 2]);
    expect((val!.data as any[])[0].yAxis).toBe(100);
  });

  it('flips to the xAxis when horizontal', () => {
    const val = buildMarkLine({ kind: 'value', value: 7 }, [], true);
    expect((val!.data as any[])[0].xAxis).toBe(7);
  });

  it('returns null when a median/value line cannot be computed', () => {
    expect(buildMarkLine({ kind: 'median' }, [])).toBeNull();
    expect(buildMarkLine({ kind: 'value' }, [1, 2])).toBeNull();
  });
});
