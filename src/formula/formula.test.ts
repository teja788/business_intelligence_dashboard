import { describe, it, expect } from 'vitest';
import { analyze, compileFormula, validateFormula } from './index';
import type { FormulaContext } from './compile';

// Resolve [Name] / Name to a quoted column for tests.
const ctx: FormulaContext = { resolveField: (n) => `"${n}"` };

describe('formula parser/compiler', () => {
  it('compiles arithmetic with precedence', () => {
    expect(compileFormula('1 + 2 * 3', ctx).sql).toBe('(1 + (2 * 3))');
  });

  it('compiles field references and a ratio', () => {
    const out = compileFormula('SUM([Profit]) / SUM([Sales])', ctx);
    expect(out.sql).toBe('(SUM("Profit") / SUM("Sales"))');
    expect(out.isAggregate).toBe(true);
    expect(out.fields.sort()).toEqual(['Profit', 'Sales']);
  });

  it('treats bare identifiers as fields', () => {
    expect(compileFormula('Sales * 2', ctx).sql).toBe('("Sales" * 2)');
  });

  it('compiles IF to CASE WHEN', () => {
    expect(compileFormula('IF([Sales] > 100, "big", "small")', ctx).sql).toBe(
      `CASE WHEN ("Sales" > 100) THEN 'big' ELSE 'small' END`,
    );
  });

  it('compiles string + logical operators', () => {
    const out = compileFormula('UPPER([Region]) = "EAST" AND [Sales] > 0', ctx);
    expect(out.sql).toBe(`((UPPER("Region") = 'EAST') AND ("Sales" > 0))`);
    expect(out.isAggregate).toBe(false);
  });

  it('emits a parameter placeholder', () => {
    const out = compileFormula('[Sales] * $GrowthRate', ctx);
    expect(out.sql).toBe('("Sales" * __PARAM_GrowthRate__)');
    expect(out.params).toEqual(['GrowthRate']);
  });

  it('compiles a running total with the order placeholder', () => {
    const out = compileFormula('RUNNING_SUM(SUM([Sales]))', ctx);
    expect(out.sql).toContain('SUM(SUM("Sales")) OVER (ORDER BY __ORDER__');
    expect(out.isAggregate).toBe(true);
  });

  it('compiles percent of total', () => {
    const out = compileFormula('PERCENT_OF_TOTAL(SUM([Sales]))', ctx);
    expect(out.sql).toContain('SUM(SUM("Sales")) OVER ()');
  });

  it('detects aggregate vs row-level via analyze', () => {
    expect(analyze('SUM([Sales])').isAggregate).toBe(true);
    expect(analyze('[Sales] * 2').isAggregate).toBe(false);
  });

  it('escapes string literals', () => {
    expect(compileFormula(`"O'Brien"`, ctx).sql).toBe(`'O''Brien'`);
  });
});

describe('validateFormula', () => {
  const known = new Set(['Sales', 'Profit']);
  it('accepts a valid formula and reports aggregate-ness', () => {
    expect(validateFormula('SUM([Sales])', known)).toEqual({ ok: true, isAggregate: true });
  });
  it('rejects unknown fields', () => {
    const r = validateFormula('[Nope] + 1', known);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown field/);
  });
  it('rejects bad arity', () => {
    const r = validateFormula('LEFT([Sales])', known);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/LEFT expects/);
  });
  it('rejects syntax errors', () => {
    expect(validateFormula('1 +', known).ok).toBe(false);
    expect(validateFormula('SUM([Sales]', known).ok).toBe(false);
  });
  it('rejects unknown functions', () => {
    expect(validateFormula('BOGUS(1)', known).ok).toBe(false);
  });
});
