/**
 * Choropleth map plugin (§7B). A clearly-scoped plugin: it registers through the
 * same ChartRenderer contract as every other chart. The world topology is
 * lazy-loaded (dynamic import → its own chunk) so it costs nothing until a map
 * is actually placed. Datasets map by country name (e.g. "Germany").
 */
import { createElement } from 'react';
import * as echarts from 'echarts';
import type { ChartRenderer } from '../types';
import { MapIcon } from '../icons';
import { echartsTheme } from './theme';

let mapReady: Promise<boolean> | null = null;

/** Register the 'world' map once, on first use. */
function ensureWorldMap(): Promise<boolean> {
  if (!mapReady) {
    mapReady = (async () => {
      try {
        const [{ feature }, topo] = await Promise.all([
          import('topojson-client'),
          import('world-atlas/countries-110m.json'),
        ]);
        const topology = ((topo as { default?: unknown }).default ?? topo) as any;
        const geo = feature(topology, topology.objects.countries);
        echarts.registerMap('world', geo as any);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return mapReady;
}

function num(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const mapChart: ChartRenderer = {
  id: 'map',
  name: 'Map',
  icon: createElement(MapIcon),
  encodingSchema: { x: { min: 1, max: 1 }, y: { min: 1, max: 1 } },
  suitability({ dimensionCount, measureCount, firstDimensionType }) {
    if (measureCount < 1 || dimensionCount < 1) return 0;
    // Strongly prefer when the dimension is geographic; otherwise selectable
    // but never auto-suggested.
    return firstDimensionType === 'geo' ? 0.8 : 0.12;
  },
  render(el, data, _options, ctx) {
    const theme = echartsTheme();
    const inst =
      echarts.getInstanceByDom(el) ??
      echarts.init(el, undefined, { renderer: 'canvas' });
    inst.showLoading({ text: 'Loading map…', textColor: theme.textMuted, maskColor: 'rgba(0,0,0,0)' });

    let disposed = false;
    ensureWorldMap().then((ok) => {
      if (disposed) return;
      inst.hideLoading();
      if (!ok || !data.x || !data.measures.length) {
        inst.setOption(
          {
            graphic: {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: 'Map needs a country dimension + a measure',
                fill: theme.textMuted,
                fontSize: 13,
              },
            },
          },
          { notMerge: true },
        );
        return;
      }

      const xKey = data.x.key;
      const mKey = data.measures[0].key;
      const seriesData = data.rows.map((r) => ({
        name: String(r[xKey] ?? ''),
        value: num(r[mKey]),
      }));
      const values = seriesData.map((d) => d.value);
      const min = Math.min(0, ...values);
      const max = Math.max(1, ...values);

      inst.setOption(
        {
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(20,20,28,0.96)',
            borderColor: theme.split,
            textStyle: { color: theme.text },
            formatter: (p: any) =>
              p.value != null && !Number.isNaN(p.value)
                ? `${p.name}: ${Number(p.value).toLocaleString()}`
                : `${p.name}: —`,
          },
          visualMap: {
            min,
            max,
            calculable: true,
            left: 'left',
            bottom: '6%',
            inRange: { color: ['#10203a', theme.palette[0], theme.palette[1]] },
            textStyle: { color: theme.textMuted },
          },
          series: [
            {
              type: 'map',
              map: 'world',
              roam: true,
              scaleLimit: { min: 1, max: 6 },
              itemStyle: { areaColor: '#15151f', borderColor: theme.split },
              emphasis: {
                label: { show: false },
                itemStyle: { areaColor: theme.palette[1] },
              },
              data: seriesData,
            },
          ],
        },
        { notMerge: true },
      );

      inst.off('click');
      if (ctx?.onMarkClick) {
        inst.on('click', (p: any) => {
          if (p?.name) ctx.onMarkClick!({ category: p.name });
        });
      }
    });

    return {
      dispose: () => {
        disposed = true;
        inst.dispose();
      },
      resize: () => inst.resize(),
    };
  },
};
