/** Tokenizer for the formula language. */

export type TokenType =
  | 'number'
  | 'string'
  | 'ident' // bare field name or function name
  | 'field' // [Bracketed Field Name]
  | 'param' // $Name or $[Name]
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class LexError extends Error {}

const TWO_CHAR_OPS = ['==', '!=', '<>', '<=', '>='];
const ONE_CHAR_OPS = ['+', '-', '*', '/', '%', '=', '<', '>'];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  const push = (type: TokenType, value: string, pos: number) =>
    tokens.push({ type, value, pos });

  while (i < n) {
    const c = input[i];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    // String literal: double quotes.
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < n && input[j] !== '"') {
        if (input[j] === '\\' && j + 1 < n) {
          s += input[j + 1];
          j += 2;
        } else {
          s += input[j++];
        }
      }
      if (j >= n) throw new LexError(`Unterminated string at ${i}`);
      push('string', s, i);
      i = j + 1;
      continue;
    }

    // Bracketed field name: [Order Date]
    if (c === '[') {
      const end = input.indexOf(']', i + 1);
      if (end < 0) throw new LexError(`Unterminated [field] at ${i}`);
      push('field', input.slice(i + 1, end), i);
      i = end + 1;
      continue;
    }

    // Parameter: $Name or $[Name with spaces]
    if (c === '$') {
      if (input[i + 1] === '[') {
        const end = input.indexOf(']', i + 2);
        if (end < 0) throw new LexError(`Unterminated $[param] at ${i}`);
        push('param', input.slice(i + 2, end), i);
        i = end + 1;
        continue;
      }
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(input[j])) j++;
      if (j === i + 1) throw new LexError(`Empty parameter name at ${i}`);
      push('param', input.slice(i + 1, j), i);
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < n && /[0-9.]/.test(input[j])) j++;
      push('number', input.slice(i, j), i);
      i = j;
      continue;
    }

    // Identifier / function name / keyword
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(input[j])) j++;
      push('ident', input.slice(i, j), i);
      i = j;
      continue;
    }

    if (c === '(') { push('lparen', c, i); i++; continue; }
    if (c === ')') { push('rparen', c, i); i++; continue; }
    if (c === ',') { push('comma', c, i); i++; continue; }

    const two = input.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) { push('op', two, i); i += 2; continue; }
    if (ONE_CHAR_OPS.includes(c)) { push('op', c, i); i++; continue; }

    throw new LexError(`Unexpected character '${c}' at ${i}`);
  }

  push('eof', '', n);
  return tokens;
}
