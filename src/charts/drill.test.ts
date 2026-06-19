import { describe, expect, it } from 'vitest';
import { canDrillDeeper, currentDrillField, drillFilters, type DrillStep } from './drill';

const hierarchy = ['ds::region', 'ds::country', 'ds::city'];

describe('currentDrillField', () => {
  it('returns the level matching the path depth', () => {
    expect(currentDrillField(hierarchy, [])).toBe('ds::region');
    expect(currentDrillField(hierarchy, [{ field: 'ds::region', value: 'EU' }])).toBe('ds::country');
  });

  it('clamps to the deepest level and disables for trivial hierarchies', () => {
    const deep: DrillStep[] = [
      { field: 'ds::region', value: 'EU' },
      { field: 'ds::country', value: 'FR' },
      { field: 'ds::city', value: 'Paris' },
    ];
    expect(currentDrillField(hierarchy, deep)).toBe('ds::city');
    expect(currentDrillField(['ds::only'], [])).toBeUndefined();
  });
});

describe('canDrillDeeper', () => {
  it('is true until the last level is reached', () => {
    expect(canDrillDeeper(hierarchy, [])).toBe(true);
    expect(canDrillDeeper(hierarchy, [{ field: 'ds::region', value: 'EU' }])).toBe(true);
    expect(
      canDrillDeeper(hierarchy, [
        { field: 'ds::region', value: 'EU' },
        { field: 'ds::country', value: 'FR' },
      ]),
    ).toBe(false);
  });
});

describe('drillFilters', () => {
  it('pins each ancestor value as an in-filter', () => {
    expect(
      drillFilters([
        { field: 'ds::region', value: 'EU' },
        { field: 'ds::country', value: 'FR' },
      ]),
    ).toEqual([
      { field: 'ds::region', op: 'in', values: ['EU'] },
      { field: 'ds::country', op: 'in', values: ['FR'] },
    ]);
  });
});
