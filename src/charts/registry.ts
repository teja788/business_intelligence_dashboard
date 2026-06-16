/**
 * Chart registry — the single place the app discovers chart types. Plugins
 * register here; UI reads from here. No core code references concrete charts.
 */
import type { ChartRenderer, SuitabilityInput } from './types';

const registry = new Map<string, ChartRenderer>();

export function registerChart(renderer: ChartRenderer): void {
  registry.set(renderer.id, renderer);
}

export function getChart(id: string): ChartRenderer | undefined {
  return registry.get(id);
}

export function listCharts(): ChartRenderer[] {
  return [...registry.values()];
}

/** Rank chart types for the current field selection (Simple-mode "Show Me"). */
export function suggestCharts(input: SuitabilityInput): ChartRenderer[] {
  return listCharts()
    .map((r) => ({ r, score: r.suitability(input) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}
