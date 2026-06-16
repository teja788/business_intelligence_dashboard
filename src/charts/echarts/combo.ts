/** Combo chart: first measure as bars, remaining measures as lines (dual axis). */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { LineIcon } from '../icons';
import { buildCategorySeries } from './series';
import {
  baseCartesianOption,
  categoryAxis,
  echartsTheme,
  valueAxis,
} from './theme';
import { mountECharts } from './mount';

export const comboChart: ChartRenderer = {
  id: 'combo',
  name: 'Combo',
  icon: createElement(LineIcon),
  encodingSchema: {
    x: { min: 1, max: 1 },
    y: { min: 2, max: 4 },
  },
  suitability({ dimensionCount, measureCount }) {
    return dimensionCount >= 1 && measureCount >= 2 ? 0.5 : 0;
  },
  render(el, data, _options, ctx) {
    const theme = echartsTheme();
    const { categories, series } = buildCategorySeries(data);

    const option = {
      ...baseCartesianOption(theme),
      color: theme.palette,
      xAxis: categoryAxis(theme, data.x?.label, categories),
      // Two value axes: bars on the left, lines on the right.
      yAxis: [valueAxis(theme), { ...valueAxis(theme), splitLine: { show: false } }],
      series: series.map((s, i) => ({
        type: i === 0 ? 'bar' : 'line',
        name: s.name,
        data: s.data,
        yAxisIndex: i === 0 ? 0 : 1,
        smooth: true,
        barMaxWidth: 48,
        emphasis: { focus: 'series' },
      })),
    };

    return mountECharts(el, option, {
      onMarkClick: ctx?.onMarkClick
        ? (e) => ctx.onMarkClick!({ category: e.category })
        : undefined,
    });
  },
};
