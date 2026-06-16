/** AST for the Vantage formula language (compiles to DuckDB SQL). */

export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'field'; name: string }
  | { kind: 'param'; name: string }
  | { kind: 'unary'; op: string; operand: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

export interface ParseResult {
  ast: Node;
  /** Field names referenced (for dependency tracking / validation). */
  fields: string[];
  /** Parameter names referenced. */
  params: string[];
  /** True if the expression contains an aggregate/window function. */
  isAggregate: boolean;
}
