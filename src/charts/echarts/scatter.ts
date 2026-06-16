/** Scatter / bubble chart plugins. measures[0]=X, measures[1]=Y, size=bubble. */
import { createElement } from 'react';
import type { ChartData, ChartRenderer, RenderContext } from '../types';
import { ScatterIcon, BubbleIcon } from '../icons';
import { baseCartesianOption, echartsTheme, valueAxis } from './theme';
import { mountECharts } from './mount';

type Point = [number, number, number | undefined, string];

function num(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}

function asCategory(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

/** Unique values preserving first-seen order. */
function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function pointOf(
  data: ChartData,
  row: Record<string, unknown>,
  bubble: boolean,
): Point {
  const xm = data.measures[0];
  const ym = data.measures[1];
  return [
    num(row[xm.key]),
    num(row[ym.key]),
    bubble && data.size ? num(row[data.size.key]) : undefined,
    data.x ? asCategory(row[data.x.key]) : '',
  ];
}

function buildSeries(data: ChartData, bubble: boolean) {
  if (data.measures.length < 2) return [];

  // Bubble size scaling: map size values to 8..50 by observed max.
  let maxSize = 0;
  if (bubble && data.size) {
    for (const row of data.rows) {
      const s = num(row[data.size.key]);
      if (Number.isFinite(s) && s > maxSize) maxSize = s;
    }
  }
  const symbolSize = bubble
    ? (val: number[] | unknown) => {
        const s = Array.isArray(val) ? Number(val[2]) : NaN;
        if (!Number.isFinite(s) || maxSize <= 0) return 10;
        return 8 + (Math.max(0, s) / maxSize) * 42;
      }
    : 10;

  const colorKey = data.color?.key;
  if (colorKey) {
    const names = uniqueInOrder(data.rows.map((r) => asCategory(r[colorKey])));
    return names.map((name) => ({
      type: 'scatter',
      name,
      symbolSize,
      data: data.rows
        .filter((r) => asCategory(r[colorKey]) === name)
        .map((r) => pointOf(data, r, bubble)),
    }));
  }

  return [
    {
      type: 'scatter',
      name: data.measures[1]?.label,
      symbolSize,
      data: data.rows.map((r) => pointOf(data, r, bubble)),
    },
  ];
}

function makeRender(bubble: boolean): ChartRenderer['render'] {
  return (el, data, _options, ctx: RenderContext | undefined) => {
    const theme = echartsTheme();
    const base = baseCartesianOption(theme);
    const series = buildSeries(data, bubble);

    const option = {
      ...base,
      color: theme.palette,
      tooltip: {
        ...base.tooltip,
        trigger: 'item',
        formatter: (params: any) => {
          const v = params.value as Point;
          const name = (params.data?.[3] ?? params.name ?? '') as string;
          const lines = [
            name ? `<b>${name}</b>` : '',
            `${data.measures[0]?.label ?? 'x'}: ${v?.[0]}`,
            `${data.measures[1]?.label ?? 'y'}: ${v?.[1]}`,
          ];
          if (bubble && data.size && v?.[2] !== undefined)
            lines.push(`${data.size.label}: ${v[2]}`);
          return lines.filter(Boolean).join('<br/>');
        },
      },
      xAxis: valueAxis(theme, data.measures[0]?.label),
      yAxis: valueAxis(theme, data.measures[1]?.label),
      series,
    };

    return mountECharts(el, option, {
      onMarkClick: ctx?.onMarkClick
        ? (e) => {
            const v = e.value as Point | undefined;
            ctx.onMarkClick!({ category: v?.[3] ?? e.category });
          }
        : undefined,
    });
  };
}

export const scatterChart: ChartRenderer = {
  id: 'scatter',
  name: 'Scatter',
  icon: createElement(ScatterIcon),
  encodingSchema: {
    x: { min: 0, max: 1 },
    y: { min: 2, max: 2 },
    color: { min: 0, max: 1 },
  },
  suitability({ measureCount }) {
    if (measureCount < 2) return 0;
    return 0.6;
  },
  render: makeRender(false),
};

export const bubbleChart: ChartRenderer = {
  id: 'bubble',
  name: 'Bubble',
  icon: createElement(BubbleIcon),
  encodingSchema: {
    x: { min: 0, max: 1 },
    y: { min: 2, max: 2 },
    color: { min: 0, max: 1 },
    size: { min: 0, max: 1 },
  },
  suitability({ measureCount }) {
    if (measureCount < 2) return 0;
    return 0.5;
  },
  render: makeRender(true),
};
