/**
 * Conditional formatting rules for numeric values (KPI value, table measure
 * cells). Rules are evaluated top-to-bottom; the first match wins. Colors are a
 * small semantic palette (not free-form hex) so the editor stays a dropdown and
 * the output reads well on both themes. Pure + unit-tested.
 */
import type { CSSProperties } from 'react';

export type FormatOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
export type FormatColor = 'green' | 'red' | 'amber' | 'blue' | 'gray';

export interface FormatRule {
  op: FormatOp;
  value: number;
  /** Upper bound for the 'between' op. */
  value2?: number;
  color: FormatColor;
}

const COLOR_STYLES: Record<FormatColor, CSSProperties> = {
  green: { backgroundColor: 'rgba(34,197,94,0.16)', color: 'rgb(74,222,128)' },
  red: { backgroundColor: 'rgba(239,68,68,0.16)', color: 'rgb(248,113,113)' },
  amber: { backgroundColor: 'rgba(245,158,11,0.16)', color: 'rgb(251,191,36)' },
  blue: { backgroundColor: 'rgba(59,130,246,0.16)', color: 'rgb(96,165,250)' },
  gray: { backgroundColor: 'rgba(148,163,184,0.16)', color: 'rgb(203,213,225)' },
};

export function colorStyle(color: FormatColor): CSSProperties {
  return COLOR_STYLES[color];
}

function matches(rule: FormatRule, v: number): boolean {
  switch (rule.op) {
    case 'gt':
      return v > rule.value;
    case 'gte':
      return v >= rule.value;
    case 'lt':
      return v < rule.value;
    case 'lte':
      return v <= rule.value;
    case 'eq':
      return v === rule.value;
    case 'between':
      return rule.value2 != null && v >= rule.value && v <= rule.value2;
    default:
      return false;
  }
}

/** Read + validate the rule list off a tile's options bag. */
export function parseFormatRules(options: Record<string, unknown>): FormatRule[] {
  const raw = options.format;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is FormatRule =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as FormatRule).value === 'number' &&
      typeof (r as FormatRule).op === 'string' &&
      typeof (r as FormatRule).color === 'string',
  );
}

/** First matching rule's color for a value, or null. Non-numbers never match. */
export function evalFormatColor(
  rules: FormatRule[],
  value: unknown,
): FormatColor | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  for (const rule of rules) if (matches(rule, value)) return rule.color;
  return null;
}
