/**
 * Adapter that lets a React component be a first-class ChartRenderer. The
 * renderer mounts a React root into the host element and unmounts on dispose —
 * so KPI/Table/Pivot register through the SAME plugin contract as ECharts
 * charts (no special-casing anywhere in core/UI).
 */
import { createElement, type ComponentType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  ChartData,
  ChartRenderer,
  EncodingSchema,
  RenderContext,
  SuitabilityInput,
} from '../types';

export interface ReactChartProps {
  data: ChartData;
  options: Record<string, unknown>;
  ctx?: RenderContext;
}

export function makeReactRenderer(config: {
  id: string;
  name: string;
  icon: ReactNode;
  encodingSchema: EncodingSchema;
  suitability: (input: SuitabilityInput) => number;
  Component: ComponentType<ReactChartProps>;
}): ChartRenderer {
  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    encodingSchema: config.encodingSchema,
    suitability: config.suitability,
    render(el, data, options, ctx) {
      let root: Root | null = createRoot(el);
      root.render(createElement(config.Component, { data, options, ctx }));
      return {
        dispose() {
          // Defer unmount to avoid React's "synchronous unmount during render".
          const r = root;
          root = null;
          if (r) queueMicrotask(() => r.unmount());
        },
      };
    },
  };
}
