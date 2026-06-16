/**
 * Renderer-agnostic React host for a chart. Calls renderer.render() into a div
 * and forwards container resizes. Knows nothing about ECharts.
 */
import { useEffect, useRef } from 'react';
import type { ChartData, ChartInstance, ChartRenderer, RenderContext } from './types';

export interface ChartHostProps {
  renderer: ChartRenderer;
  data: ChartData;
  options: Record<string, unknown>;
  ctx?: RenderContext;
}

export function ChartHost({ renderer, data, options, ctx }: ChartHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  const instRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    instRef.current = renderer.render(el, data, options, ctx);
    return () => {
      instRef.current?.dispose();
      instRef.current = null;
    };
  }, [renderer, data, options, ctx]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => instRef.current?.resize?.());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
