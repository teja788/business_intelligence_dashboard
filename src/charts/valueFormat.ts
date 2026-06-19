/**
 * Number formatting presets for measures (KPI value, table cells). A small,
 * predictable set — plain / currency / percent / compact — built on Intl so it
 * localizes correctly. Pure + unit-tested. Percent uses Intl semantics (a ratio
 * of 0.25 renders as "25%").
 */
export type ValueFormatStyle = 'number' | 'currency' | 'percent' | 'compact';

export interface ValueFormatOpts {
  style?: ValueFormatStyle;
  decimals?: number;
  /** ISO currency code for the 'currency' style (defaults to USD). */
  currency?: string;
}

/** Read + validate the valueFormat option off a tile's options bag. */
export function parseValueFormat(options: Record<string, unknown>): ValueFormatOpts | null {
  const f = options.valueFormat as ValueFormatOpts | undefined;
  if (!f || typeof f !== 'object' || !f.style) return null;
  return {
    style: f.style,
    decimals: typeof f.decimals === 'number' ? f.decimals : undefined,
    currency: typeof f.currency === 'string' ? f.currency : undefined,
  };
}

/** Format a number with the given preset. Falls back gracefully on bad input. */
export function formatValue(value: number, fmt: ValueFormatOpts): string {
  if (!Number.isFinite(value)) return '—';
  const { style = 'number', decimals, currency = 'USD' } = fmt;
  try {
    switch (style) {
      case 'currency':
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: decimals ?? 0,
          minimumFractionDigits: decimals ?? 0,
        }).format(value);
      case 'percent':
        return new Intl.NumberFormat(undefined, {
          style: 'percent',
          maximumFractionDigits: decimals ?? 1,
        }).format(value);
      case 'compact':
        return new Intl.NumberFormat(undefined, {
          notation: 'compact',
          maximumFractionDigits: decimals ?? 1,
        }).format(value);
      case 'number':
      default:
        return new Intl.NumberFormat(undefined, {
          maximumFractionDigits: decimals ?? (Math.abs(value) >= 1000 ? 0 : 2),
        }).format(value);
    }
  } catch {
    // e.g. an invalid currency code — never throw out of a renderer.
    return String(value);
  }
}
