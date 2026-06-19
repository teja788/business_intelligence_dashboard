/**
 * Drill-down hierarchy helpers (pure). A tile can define an ordered list of
 * dimension fields (`options.drillFields`). Clicking a mark descends one level:
 * the clicked value becomes a filter and the chart re-groups by the next field
 * in the hierarchy. State is just the path of clicked {field,value} steps; the
 * current level is its length. Kept pure so the reducer is unit-testable and
 * the tile can override its encoding/filters without touching the chart engine.
 */
import type { Filter } from '@/model/types';

export type DrillScalar = string | number | boolean | null;

export interface DrillStep {
  field: string;
  value: DrillScalar;
}

/** The dimension a tile should currently group by, given its path. */
export function currentDrillField(
  drillFields: string[],
  path: DrillStep[],
): string | undefined {
  if (drillFields.length < 2) return undefined;
  const level = Math.min(path.length, drillFields.length - 1);
  return drillFields[level];
}

/** Whether another level remains below the current one. */
export function canDrillDeeper(drillFields: string[], path: DrillStep[]): boolean {
  return path.length < drillFields.length - 1;
}

/** Equality filters pinning each ancestor level to its clicked value. */
export function drillFilters(path: DrillStep[]): Filter[] {
  return path.map((step) => ({
    field: step.field,
    op: 'in' as const,
    values: [step.value],
  }));
}
