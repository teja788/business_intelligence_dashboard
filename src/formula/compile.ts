/** AST → DuckDB SQL. Field/param resolution is injected via the context. */
import type { Node } from './ast';
import { quoteLiteral } from '@/query/sql';
import { getFunction } from './functions';

export interface FormulaContext {
  /** Resolve a field name (display or column) to its SQL expression. */
  resolveField: (name: string) => string;
}

export class CompileError extends Error {}

/** Parameter placeholder — replaced with the live value by the query compiler. */
export function paramPlaceholder(name: string): string {
  return `__PARAM_${name}__`;
}

const BINARY_SQL: Record<string, string> = {
  '=': '=',
  '==': '=',
  '!=': '<>',
  '<>': '<>',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': '%',
  AND: 'AND',
  OR: 'OR',
};

export function compileNode(node: Node, ctx: FormulaContext): string {
  switch (node.kind) {
    case 'number':
      return String(node.value);
    case 'string':
      return quoteLiteral(node.value);
    case 'bool':
      return node.value ? 'TRUE' : 'FALSE';
    case 'null':
      return 'NULL';
    case 'field':
      return ctx.resolveField(node.name);
    case 'param':
      return paramPlaceholder(node.name);
    case 'unary': {
      const operand = compileNode(node.operand, ctx);
      if (node.op === 'NOT') return `(NOT ${operand})`;
      return `(${node.op}${operand})`;
    }
    case 'binary': {
      const op = BINARY_SQL[node.op];
      if (!op) throw new CompileError(`Unsupported operator: ${node.op}`);
      return `(${compileNode(node.left, ctx)} ${op} ${compileNode(node.right, ctx)})`;
    }
    case 'call': {
      const fn = getFunction(node.name);
      if (!fn) throw new CompileError(`Unknown function: ${node.name}`);
      if (node.args.length < fn.minArgs || node.args.length > fn.maxArgs) {
        throw new CompileError(
          `${fn.name} expects ${fn.signature} (got ${node.args.length} args)`,
        );
      }
      return fn.compile(node.args.map((a) => compileNode(a, ctx)));
    }
  }
}
