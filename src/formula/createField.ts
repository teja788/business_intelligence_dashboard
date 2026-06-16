/**
 * Build a first-class calculated Field from a formula. Resolves field
 * references against a dataset, compiles to SQL, and sets role/aggregation
 * semantics explicitly (§7C).
 */
import type { Dataset, Field, FieldRole } from '@/model/types';
import { quoteIdent } from '@/query/sql';
import { compileFormula, CompileError } from './index';

export interface CreateCalcInput {
  dataset: Dataset;
  name: string;
  formula: string;
  /** Override the inferred role; aggregate formulas are always measures. */
  role?: FieldRole;
}

export function buildCalculatedField(input: CreateCalcInput): Field {
  const { dataset, name, formula } = input;

  const compiled = compileFormula(formula, {
    resolveField: (ref) => {
      const f = dataset.fields.find((x) => x.name === ref || x.column === ref);
      if (!f) throw new CompileError(`Unknown field: [${ref}]`);
      return f.isCalculated && f.sqlExpr ? `(${f.sqlExpr})` : quoteIdent(f.column);
    },
  });

  const isAgg = compiled.isAggregate;
  const role: FieldRole = isAgg ? 'measure' : (input.role ?? 'dimension');

  return {
    id: `${dataset.id}::${name}`,
    datasetId: dataset.id,
    name,
    column: name,
    role,
    type: role === 'measure' ? 'number' : 'string',
    isCalculated: true,
    formula,
    sqlExpr: compiled.sql,
    aggregated: role === 'measure' ? isAgg : false,
    defaultAggregation: role === 'measure' && !isAgg ? 'sum' : undefined,
  };
}
