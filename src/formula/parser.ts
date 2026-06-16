/** Recursive-descent parser → AST, with operator precedence. */
import type { Node } from './ast';
import { tokenize, type Token } from './lexer';

export class ParseError extends Error {}

const KEYWORDS = new Set(['AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL']);

export function parse(input: string): Node {
  const tokens = tokenize(input);
  let pos = 0;

  const peek = (): Token => tokens[pos];
  const next = (): Token => tokens[pos++];
  const isKeyword = (t: Token, kw: string) =>
    t.type === 'ident' && t.value.toUpperCase() === kw;
  const expect = (type: Token['type']): Token => {
    const t = peek();
    if (t.type !== type) throw new ParseError(`Expected ${type} but got '${t.value}' at ${t.pos}`);
    return next();
  };

  // expr := orExpr
  function parseExpr(): Node {
    return parseOr();
  }

  function parseOr(): Node {
    let left = parseAnd();
    while (isKeyword(peek(), 'OR')) {
      next();
      left = { kind: 'binary', op: 'OR', left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): Node {
    let left = parseNot();
    while (isKeyword(peek(), 'AND')) {
      next();
      left = { kind: 'binary', op: 'AND', left, right: parseNot() };
    }
    return left;
  }

  function parseNot(): Node {
    if (isKeyword(peek(), 'NOT')) {
      next();
      return { kind: 'unary', op: 'NOT', operand: parseNot() };
    }
    return parseComparison();
  }

  function parseComparison(): Node {
    let left = parseAdditive();
    const t = peek();
    if (t.type === 'op' && ['=', '==', '!=', '<>', '<', '<=', '>', '>='].includes(t.value)) {
      next();
      left = { kind: 'binary', op: t.value, left, right: parseAdditive() };
    }
    return left;
  }

  function parseAdditive(): Node {
    let left = parseMultiplicative();
    while (peek().type === 'op' && ['+', '-'].includes(peek().value)) {
      const op = next().value;
      left = { kind: 'binary', op, left, right: parseMultiplicative() };
    }
    return left;
  }

  function parseMultiplicative(): Node {
    let left = parseUnary();
    while (peek().type === 'op' && ['*', '/', '%'].includes(peek().value)) {
      const op = next().value;
      left = { kind: 'binary', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary(): Node {
    const t = peek();
    if (t.type === 'op' && (t.value === '-' || t.value === '+')) {
      next();
      return { kind: 'unary', op: t.value, operand: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary(): Node {
    const t = peek();
    switch (t.type) {
      case 'number':
        next();
        return { kind: 'number', value: Number(t.value) };
      case 'string':
        next();
        return { kind: 'string', value: t.value };
      case 'field':
        next();
        return { kind: 'field', name: t.value };
      case 'param':
        next();
        return { kind: 'param', name: t.value };
      case 'lparen': {
        next();
        const e = parseExpr();
        expect('rparen');
        return e;
      }
      case 'ident': {
        const name = t.value;
        const upper = name.toUpperCase();
        if (KEYWORDS.has(upper)) {
          next();
          if (upper === 'TRUE') return { kind: 'bool', value: true };
          if (upper === 'FALSE') return { kind: 'bool', value: false };
          if (upper === 'NULL') return { kind: 'null' };
          throw new ParseError(`Unexpected keyword '${name}' at ${t.pos}`);
        }
        next();
        // Function call vs bare field reference.
        if (peek().type === 'lparen') {
          next();
          const args: Node[] = [];
          if (peek().type !== 'rparen') {
            args.push(parseExpr());
            while (peek().type === 'comma') {
              next();
              args.push(parseExpr());
            }
          }
          expect('rparen');
          return { kind: 'call', name, args };
        }
        return { kind: 'field', name };
      }
      default:
        throw new ParseError(`Unexpected token '${t.value}' at ${t.pos}`);
    }
  }

  const ast = parseExpr();
  if (peek().type !== 'eof') {
    throw new ParseError(`Unexpected trailing input '${peek().value}' at ${peek().pos}`);
  }
  return ast;
}
