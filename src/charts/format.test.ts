import { describe, expect, it } from 'vitest';
import { evalFormatColor, parseFormatRules, type FormatRule } from './format';

const rules: FormatRule[] = [
  { op: 'lt', value: 0, color: 'red' },
  { op: 'between', value: 0, value2: 100, color: 'amber' },
  { op: 'gte', value: 100, color: 'green' },
];

describe('evalFormatColor', () => {
  it('returns the first matching rule colour', () => {
    expect(evalFormatColor(rules, -5)).toBe('red');
    expect(evalFormatColor(rules, 50)).toBe('amber');
    // 100 matches the inclusive 'between 0..100' first (first-match wins).
    expect(evalFormatColor(rules, 100)).toBe('amber');
    expect(evalFormatColor(rules, 250)).toBe('green');
  });

  it('returns null for non-numeric or unmatched values', () => {
    expect(evalFormatColor(rules, 'x')).toBeNull();
    expect(evalFormatColor(rules, null)).toBeNull();
    expect(evalFormatColor([{ op: 'gt', value: 10, color: 'blue' }], 5)).toBeNull();
  });

  it('treats between as inclusive and requires value2', () => {
    expect(evalFormatColor([{ op: 'between', value: 1, value2: 3, color: 'blue' }], 3)).toBe('blue');
    expect(evalFormatColor([{ op: 'between', value: 1, color: 'blue' }], 2)).toBeNull();
  });
});

describe('parseFormatRules', () => {
  it('keeps only well-formed rules', () => {
    expect(
      parseFormatRules({
        format: [
          { op: 'gt', value: 1, color: 'green' },
          { op: 'gt', color: 'green' }, // missing value
          null,
          'nope',
        ],
      }),
    ).toEqual([{ op: 'gt', value: 1, color: 'green' }]);
  });

  it('returns [] when there is no format option', () => {
    expect(parseFormatRules({})).toEqual([]);
  });
});
