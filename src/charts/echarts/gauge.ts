/** Gauge chart plugin — single KPI-like value against a max. */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { GaugeIcon } from '../icons';
import { echartsTheme } from './theme';
import { mountECharts } from './mount';

export const gaugeChart: ChartRenderer = {
  id: 'gauge',
  name: 'Gauge',
  icon: createElement(GaugeIcon),
  encodingSchema: {
    y: { min: 1, max: 1 },
  },
  suitability({ dimensionCount, measureCount }) {
    if (dimensionCount === 0 && measureCount === 1) return 0.3;
    return measureCount === 1 ? 0.2 : 0;
  },
  render(el, data, options) {
    const theme = echartsTheme();
    const measure = data.measures[0];
    const value =
      measure && data.rows[0] ? Number(data.rows[0][measure.key]) : 0;
    const max =
      typeof options.max === 'number' ? options.max : value * 1.5 || 1;

    const option = {
      color: theme.palette,
      textStyle: { color: theme.text, fontFamily: 'Inter, sans-serif' },
      series: [
        {
          type: 'gauge',
          max,
          data: [{ value, name: measure?.label }],
          detail: { color: theme.text },
          title: { color: theme.textMuted },
        },
      ],
    };

    return mountECharts(el, option);
  },
};
