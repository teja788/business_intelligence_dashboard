/** Heatmap plugin. x=x-axis category, color=y-axis category, measures[0]=value. */
import { createElement } from 'react';
import type { ChartData, ChartRenderer, RenderContext } from '../types';
import { HeatmapIcon } from '../icons';
import { baseCartesianOption, categoryAxis, echartsTheme } from './theme';
import { mountECharts } from './mount';

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

function buildHeatmap(data: ChartData) {
  const xKey = data.x?.key;
  const colorKey = data.color?.key;
  const measure = data.measures[0];

  const xCats = uniqueInOrder(
    data.rows.map((r) => (xKey ? asCategory(r[xKey]) : '')),
  );
  const yCats = colorKey
    ? uniqueInOrder(data.rows.map((r) => asCategory(r[colorKey])))
    : [measure?.label ?? 'value'];

  const xIndex = new Map(xCats.map((c, i) => [c, i]));
  const yIndex = new Map(yCats.map((c, i) => [c, i]));

  const cells: [number, number, number][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (const row of data.rows) {
    const xi = xIndex.get(xKey ? asCategory(row[xKey]) : '');
    const yi = colorKey ? yIndex.get(asCategory(row[colorKey])) : 0;
    if (xi == null || yi == null) continue;
    const v = measure ? num(row[measure.key]) : NaN;
    if (!Number.isFinite(v)) continue;
    cells.push([xi, yi, v]);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!cells.length) {
    min = 0;
    max = 0;
  }
  return { xCats, yCats, cells, min, max };
}

export const heatmapChart: ChartRenderer = {
  id: 'heatmap',
  name: 'Heatmap',
  icon: createElement(HeatmapIcon),
  encodingSchema: {
    x: { min: 1, max: 1 },
    y: { min: 1, max: 1 },
    color: { min: 1, max: 1 },
  },
  suitability({ dimensionCount, measureCount }) {
    if (dimensionCount < 2 || measureCount < 1) return 0;
    return 0.5;
  },
  render(el, data, _options, ctx: RenderContext | undefined) {
    const theme = echartsTheme();
    const { xCats, yCats, cells, min, max } = buildHeatmap(data);
    const cat = categoryAxis(theme, data.x?.label);

    const option = {
      grid: baseCartesianOption(theme).grid,
      textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(20,20,28,0.96)',
        borderColor: theme.split,
        textStyle: { color: theme.text },
      },
      xAxis: {
        type: 'category',
        data: xCats,
        name: cat.name,
        nameTextStyle: cat.nameTextStyle,
        axisLine: cat.axisLine,
        axisLabel: cat.axisLabel,
        axisTick: cat.axisTick,
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: yCats,
        nameTextStyle: cat.nameTextStyle,
        axisLine: cat.axisLine,
        axisLabel: cat.axisLabel,
        axisTick: cat.axisTick,
        splitArea: { show: true },
      },
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#0d1b2a', theme.palette[0], theme.palette[1]] },
        textStyle: { color: theme.textMuted },
      },
      series: [
        {
          type: 'heatmap',
          data: cells,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 8 } },
        },
      ],
    };

    return mountECharts(el, option, {
      onMarkClick: ctx?.onMarkClick
        ? (e) => {
            const v = e.value as [number, number, number] | undefined;
            if (!v) return;
            ctx.onMarkClick!({ category: xCats[v[0]], series: yCats[v[1]] });
          }
        : undefined,
    });
  },
};
