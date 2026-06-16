/** Pie & donut chart plugins — part-of-whole over a single dimension. */
import { createElement } from 'react';
import type { ChartRenderer, ChartData, RenderContext } from '../types';
import { PieIcon, DonutIcon } from '../icons';
import { echartsTheme } from './theme';
import { mountECharts } from './mount';

interface Slice {
  name: string;
  value: number;
}

function buildSlices(data: ChartData): Slice[] {
  const xKey = data.x?.key;
  const measure = data.measures[0];
  if (!xKey || !measure) return [];
  return data.rows.map((row) => ({
    name: String(row[xKey]),
    value: Number(row[measure.key]),
  }));
}

function renderPie(
  el: HTMLElement,
  data: ChartData,
  donut: boolean,
  ctx?: RenderContext,
) {
  const theme = echartsTheme();
  const slices = buildSlices(data);
  const option = {
    color: theme.palette,
    textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      left: 8,
      top: 'middle',
      textStyle: { color: theme.textMuted },
      icon: 'roundRect',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(20,20,28,0.96)',
      borderColor: theme.split,
      textStyle: { color: theme.text },
    },
    series: [
      {
        type: 'pie',
        radius: donut ? ['45%', '70%'] : '70%',
        data: slices,
        label: { color: theme.text },
        emphasis: { focus: 'self' },
      },
    ],
  };

  return mountECharts(el, option, {
    onMarkClick: ctx?.onMarkClick
      ? (e) => ctx.onMarkClick!({ category: e.category })
      : undefined,
  });
}

function suitability(input: {
  dimensionCount: number;
  measureCount: number;
}): number {
  return input.dimensionCount === 1 && input.measureCount >= 1 ? 0.7 : 0;
}

const encodingSchema = {
  x: { min: 1, max: 1 },
  y: { min: 1, max: 1 },
} as const;

export const pieChart: ChartRenderer = {
  id: 'pie',
  name: 'Pie',
  icon: createElement(PieIcon),
  encodingSchema,
  suitability,
  render(el, data, _options, ctx) {
    return renderPie(el, data, false, ctx);
  },
};

export const donutChart: ChartRenderer = {
  id: 'donut',
  name: 'Donut',
  icon: createElement(DonutIcon),
  encodingSchema,
  suitability,
  render(el, data, _options, ctx) {
    return renderPie(el, data, true, ctx);
  },
};
