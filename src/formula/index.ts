/**
 * Public formula API: parse + analyze + compile a formula to DuckDB SQL.
 *
 * Aggregation semantics are explicit (§7C): a formula containing an aggregate
 * or window function produces a MEASURE; otherwise it is a row-level DIMENSION.
 * The UI surfaces this so users know which kind of field they're creating.
 */
import type { Node, ParseResult } from './ast';
import { parse, ParseError } from './parser';
import { compileNode, CompileError, type FormulaContext } from './compile';
import { getFunction } from './functions';

export { ParseError } from './parser';
export { CompileError } from './compile';
export * from './functions';

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  switch (node.kind) {
    case 'unary':
      walk(node.operand, visit);
      break;
    case 'binary':
      walk(node.left, visit);
      walk(node.right, visit);
      break;
    case 'call':
      node.args.forEach((a) => walk(a, visit));
      break;
  }
}

/** Parse + analyze. Throws ParseError on syntax errors. */
export function analyze(formula: string): ParseResult {
  const ast = parse(formula);
  const fields = new Set<string>();
  const params = new Set<string>();
  let isAggregate = false;
  walk(ast, (n) => {
    if (n.kind === 'field') fields.add(n.name);
    else if (n.kind === 'param') params.add(n.name);
    else if (n.kind === 'call') {
      const fn = getFunction(n.name);
      if (fn && (fn.kind === 'aggregate' || fn.kind === 'window')) isAggregate = true;
    }
  });
  return { ast, fields: [...fields], params: [...params], isAggregate };
}

export interface CompiledFormula {
  sql: string;
  fields: string[];
  params: string[];
  isAggregate: boolean;
}

/** Full compile: text → SQL. Throws ParseError / CompileError. */
export function compileFormula(
  formula: string,
  ctx: FormulaContext,
): CompiledFormula {
  const analysis = analyze(formula);
  const sql = compileNode(analysis.ast, ctx);
  return {
    sql,
    fields: analysis.fields,
    params: analysis.params,
    isAggregate: analysis.isAggregate,
  };
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  isAggregate?: boolean;
}

/** Validate without a real field resolver (used for live editor feedback). */
export function validateFormula(
  formula: string,
  knownFields: Set<string>,
): ValidationResult {
  if (!formula.trim()) return { ok: false, error: 'Empty formula' };
  try {
    const compiled = compileFormula(formula, {
      resolveField: (name) => {
        if (knownFields.size && !knownFields.has(name)) {
          throw new CompileError(`Unknown field: [${name}]`);
        }
        return `"${name}"`;
      },
    });
    return { ok: true, isAggregate: compiled.isAggregate };
  } catch (err) {
    if (err instanceof ParseError || err instanceof CompileError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: String(err) };
  }
}
