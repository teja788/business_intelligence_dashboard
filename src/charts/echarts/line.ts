/** Line / area chart plugin. Area + smoothing toggled via options. */
import { createElement } from 'react';
import type { ChartRenderer } from '../types';
import { AreaIcon, LineIcon } from '../icons';
import { buildCategorySeries } from './series';
import {
  baseCartesianOption,
  categoryAxis,
  echartsTheme,
  valueAxis,
} from './theme';
import { mountECharts } from './mount';
import { buildMarkLine, parseRefLine } from './refline';

function makeLineChart(area: boolean): ChartRenderer {
  return {
    id: area ? 'area' : 'line',
    name: area ? 'Area' : 'Line',
    icon: createElement(area ? AreaIcon : LineIcon),
    encodingSchema: {
      x: { min: 1, max: 1 },
      y: { min: 1, max: 4 },
      color: { min: 0, max: 1 },
    },
    suitability({ dimensionCount, measureCount, firstDimensionType }) {
      if (measureCount < 1 || dimensionCount < 1) return 0;
      // Lines/areas shine on time series.
      if (firstDimensionType === 'date' || firstDimensionType === 'datetime')
        return area ? 0.8 : 0.95;
      return 0.45;
    },
    render(el, data, options, ctx) {
      const theme = echartsTheme();
      const { categories, series } = buildCategorySeries(data);
      const stacked = !!options.stacked;
      const smooth = options.smooth !== false;

      const refOpt = parseRefLine(options);
      const markLine = refOpt
        ? buildMarkLine(refOpt, series.flatMap((s) => s.data))
        : null;

      const option = {
        ...baseCartesianOption(theme),
        color: theme.palette,
        xAxis: { ...categoryAxis(theme, data.x?.label, categories), boundaryGap: false },
        yAxis: valueAxis(theme),
        series: series.map((s, i) => ({
          type: 'line',
          name: s.name,
          data: s.data,
          smooth,
          showSymbol: categories.length <= 60,
          symbolSize: 6,
          stack: stacked ? 'total' : undefined,
          areaStyle: area ? { opacity: stacked ? 0.6 : 0.18 } : undefined,
          emphasis: { focus: 'series' },
          connectNulls: true,
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
}

export const lineChart = makeLineChart(false);
export const areaChart = makeLineChart(true);
