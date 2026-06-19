import { describe, expect, it } from 'vitest';
import { formatValue, parseValueFormat } from './valueFormat';

describe('formatValue', () => {
  it('formats compact notation', () => {
    expect(formatValue(1200, { style: 'compact' })).toBe('1.2K');
    expect(formatValue(3_400_000, { style: 'compact' })).toBe('3.4M');
  });

  it('formats percent using Intl ratio semantics', () => {
    expect(formatValue(0.25, { style: 'percent' })).toBe('25%');
    expect(formatValue(0.1234, { style: 'percent', decimals: 1 })).toBe('12.3%');
  });

  it('formats currency with a code and decimals', () => {
    // Symbol placement is locale-dependent, but the amount + code must appear.
    const out = formatValue(1000, { style: 'currency', currency: 'USD', decimals: 0 });
    expect(out).toMatch(/1,000/);
    expect(out).toMatch(/\$|USD/);
  });

  it('falls back to a plain string on an invalid currency code', () => {
    expect(formatValue(5, { style: 'currency', currency: 'NOPE' })).toBe('5');
  });

  it('returns an em dash for non-finite values', () => {
    expect(formatValue(Infinity, { style: 'number' })).toBe('—');
    expect(formatValue(NaN, { style: 'compact' })).toBe('—');
  });
});

describe('parseValueFormat', () => {
  it('requires a style', () => {
    expect(parseValueFormat({})).toBeNull();
    expect(parseValueFormat({ valueFormat: {} })).toBeNull();
    expect(parseValueFormat({ valueFormat: { style: 'percent', decimals: 2 } })).toEqual({
      style: 'percent',
      decimals: 2,
      currency: undefined,
    });
  });
});
