/**
 * Chart plugin contract (§10). Every chart — including all built-ins — is
 * registered through `ChartRenderer`; no special-casing in core/UI code, and
 * ECharts APIs never leak past the adapter. A new chart = a new plugin file.
 *
 * Charts receive already-resolved `ChartData` (rows materialized from Arrow,
 * with x/color/measure columns identified) rather than a raw Arrow table or a
 * QuerySpec — so renderers know nothing about SQL or the engine.
 */
import type { ReactNode, ComponentType } from 'react';
import type { Field, FieldType } from '@/model/types';

export interface ColumnMeta {
  /** Result column key (matches keys in ChartData.rows). */
  key: string;
  /** Human label for axes/legends/tooltips. */
  label: string;
  field: Field;
}

export interface ChartData {
  rows: Record<string, unknown>[];
  /** Primary dimension (category / time axis / point identity for scatter). */
  x?: ColumnMeta;
  /** Series-splitting dimension (color); also the y-axis category for heatmaps. */
  color?: ColumnMeta;
  /** Measures (numeric series). Scatter reads measures[0]=x, [1]=y. */
  measures: ColumnMeta[];
  /** Optional size channel (bubble charts). */
  size?: ColumnMeta;
}

/** Which shelves a chart accepts and their cardinality. */
export interface EncodingSchema {
  x?: { min: number; max: number };
  y?: { min: number; max: number };
  color?: { min: number; max: number };
  size?: { min: number; max: number };
}

/** Summary the registry uses to score "Show Me"-style auto-suggestions. */
export interface SuitabilityInput {
  dimensionCount: number;
  measureCount: number;
  firstDimensionType?: FieldType;
}

/** Live handle returned by render() so the host can update/teardown cleanly. */
export interface ChartInstance {
  dispose(): void;
  /** Called by the host on container resize (optional). */
  resize?(): void;
}

export interface ChartOptionsProps {
  options: Record<string, unknown>;
  onChange: (options: Record<string, unknown>) => void;
}

/** A clicked mark, reported in terms the chart understands (not SQL). */
export interface MarkSelection {
  /** Value on the x/category dimension, if any. */
  category?: string | number;
  /** Value on the color/series dimension, if any. */
  series?: string | number;
}

/** Side-channel passed to render() for interactivity (cross-filtering, M3). */
export interface RenderContext {
  onMarkClick?: (sel: MarkSelection) => void;
}

export interface ChartRenderer {
  id: string;
  name: string;
  icon: ReactNode;
  encodingSchema: EncodingSchema;
  /** 0..1 — how well this chart suits the given dimensions/measures. */
  suitability(input: SuitabilityInput): number;
  /** Mount/update the chart into `el`. Returns a handle for teardown/resize. */
  render(
    el: HTMLElement,
    data: ChartData,
    options: Record<string, unknown>,
    ctx?: RenderContext,
  ): ChartInstance;
  optionsPanel?: ComponentType<ChartOptionsProps>;
}
