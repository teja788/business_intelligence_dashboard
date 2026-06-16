/** Treemap chart plugin — nested rectangles sized by a measure over a dimension. */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { TreemapIcon } from '../icons';
import { echartsTheme } from './theme';
import { mountECharts } from './mount';

export const treemapChart: ChartRenderer = {
  id: 'treemap',
  name: 'Treemap',
  icon: createElement(TreemapIcon),
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
    const nodes =
      xKey && measure
        ? data.rows.map((row) => ({
            name: String(row[xKey]),
            value: Number(row[measure.key]),
          }))
        : [];

    const option = {
      color: theme.palette,
      textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(20,20,28,0.96)',
        borderColor: theme.split,
        textStyle: { color: theme.text },
      },
      series: [
        {
          type: 'treemap',
          data: nodes,
          roam: false,
          label: { color: '#fff' },
          breadcrumb: { show: false },
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
