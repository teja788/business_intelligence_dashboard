/**
 * Shared ECharts mount helper. Reuses an existing instance on the element so
 * re-renders update in place; the host owns disposal. This is the ONLY module
 * that imports ECharts directly besides the renderers themselves.
 */
import * as echarts from 'echarts';
import type { ChartInstance } from '../types';

export interface MarkClick {
  seriesName?: string;
  category?: string | number;
  value?: unknown;
  dataIndex: number;
}

export interface MountOptions {
  /** Fired when a mark (bar/point/slice) is clicked — used for cross-filtering. */
  onMarkClick?: (e: MarkClick) => void;
}

export function mountECharts(
  el: HTMLElement,
  option: unknown,
  opts: MountOptions = {},
): ChartInstance {
  const inst =
    echarts.getInstanceByDom(el) ??
    echarts.init(el, undefined, { renderer: 'canvas' });
  inst.setOption(option as Record<string, unknown>, { notMerge: true });

  inst.off('click');
  if (opts.onMarkClick) {
    inst.on('click', (params: any) => {
      opts.onMarkClick!({
        seriesName: params.seriesName,
        category: Array.isArray(params.name) ? params.name[0] : params.name,
        value: params.value,
        dataIndex: params.dataIndex,
      });
    });
  }

  return {
    dispose: () => inst.dispose(),
    resize: () => inst.resize(),
  };
}
