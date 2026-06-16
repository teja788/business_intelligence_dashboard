/** Funnel chart plugin — stage-by-stage drop-off over a single dimension. */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { FunnelIcon } from '../icons';
import { echartsTheme } from './theme';
import { mountECharts } from './mount';

export const funnelChart: ChartRenderer = {
  id: 'funnel',
  name: 'Funnel',
  icon: createElement(FunnelIcon),
  encodingSchema: {
    x: { min: 1, max: 1 },
    y: { min: 1, max: 1 },
  },
  suitability({ dimensionCount, measureCount }) {
    return dimensionCount === 1 && measureCount >= 1 ? 0.4 : 0;
  },
  render(el, data, _options, ctx) {
    const theme = echartsTheme();
    const xKey = data.x?.key;
    const measure = data.measures[0];
    const slices =
      xKey && measure
        ? data.rows
            .map((row) => ({
              name: String(row[xKey]),
              value: Number(row[measure.key]),
            }))
            .sort((a, b) => b.value - a.value)
        : [];

    const option = {
      color: theme.palette,
      textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
      legend: {
        type: 'scroll',
        textStyle: { color: theme.textMuted },
        top: 4,
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
          type: 'funnel',
          data: slices,
          sort: 'descending',
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
  },
};
