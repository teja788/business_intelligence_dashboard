/** Bar/column chart plugin (grouped, stacked, 100%-stacked via options). */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { BarIcon } from '../icons';
import { buildCategorySeries } from './series';
import {
  baseCartesianOption,
  categoryAxis,
  echartsTheme,
  valueAxis,
} from './theme';
import { mountECharts } from './mount';
import { buildMarkLine, parseRefLine } from './refline';

export const barChart: ChartRenderer = {
  id: 'bar',
  name: 'Bar',
  icon: createElement(BarIcon),
  encodingSchema: {
    x: { min: 1, max: 1 },
    y: { min: 1, max: 4 },
    color: { min: 0, max: 1 },
  },
  suitability({ dimensionCount, measureCount, firstDimensionType }) {
    if (measureCount < 1 || dimensionCount < 1) return 0;
    // Bars suit categorical x with one+ measures.
    if (firstDimensionType === 'date' || firstDimensionType === 'datetime')
      return 0.5;
    return 0.85;
  },
  render(el, data, options, ctx) {
    const theme = echartsTheme();
    const { categories, series } = buildCategorySeries(data);
    const stacked = !!options.stacked;
    const percent = !!options.percent;
    const horizontal = !!options.horizontal;

    // 100%-stacked: normalize each category's stack to sum to 100.
    let displaySeries = series;
    if (percent && stacked) {
      const totals = categories.map((_, ci) =>
        series.reduce((sum, s) => sum + (s.data[ci] ?? 0), 0),
      );
      displaySeries = series.map((s) => ({
        ...s,
        data: s.data.map((v, ci) =>
          v == null || !totals[ci] ? null : (v / totals[ci]) * 100,
        ),
      }));
    }

    const cat = categoryAxis(theme, data.x?.label, categories);
    const val = valueAxis(theme);

    // Optional reference line, attached to the first series so it draws once.
    const refOpt = parseRefLine(options);
    const markLine = refOpt
      ? buildMarkLine(
          refOpt,
          displaySeries.flatMap((s) => s.data),
          horizontal,
        )
      : null;

    const option = {
      ...baseCartesianOption(theme),
      color: theme.palette,
      xAxis: horizontal ? val : cat,
      yAxis: horizontal ? cat : val,
      series: displaySeries.map((s, i) => ({
        type: 'bar',
        name: s.name,
        data: s.data,
        stack: stacked ? 'total' : undefined,
        emphasis: { focus: 'series' },
        barMaxWidth: 48,
        ...(i === 0 && markLine ? { markLine } : {}),
      })),
    };

    return mountECharts(el, option, {
      onMarkClick: ctx?.onMarkClick
        ? (e) =>
            ctx.onMarkClick!({
              category: e.category,
              series: data.color ? e.seriesName : undefined,
            })
        : undefined,
    });
  },
};
