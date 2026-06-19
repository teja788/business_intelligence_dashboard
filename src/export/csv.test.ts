import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header and CRLF-separated rows', () => {
    const csv = toCsv(['a', 'b'], [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    expect(csv).toBe('a,b\r\n1,2\r\n3,4');
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    const csv = toCsv(['name', 'note'], [
      { name: 'Acme, Inc', note: 'he said "hi"' },
      { name: 'line\nbreak', note: 'ok' },
    ]);
    expect(csv).toBe(
      'name,note\r\n"Acme, Inc","he said ""hi"""\r\n"line\nbreak",ok',
    );
  });

  it('renders null/undefined as empty and stringifies bigint', () => {
    const csv = toCsv(['x', 'y', 'z'], [{ x: null, y: undefined, z: 10n }]);
    expect(csv).toBe('x,y,z\r\n,,10');
  });

  it('supports a tab delimiter without quoting commas', () => {
    const csv = toCsv(['a', 'b'], [{ a: 'x,y', b: 'z' }], { delimiter: '\t' });
    expect(csv).toBe('a\tb\r\nx,y\tz');
  });

  it('omits columns not present in a row', () => {
    const csv = toCsv(['a', 'b'], [{ a: 1 }]);
    expect(csv).toBe('a,b\r\n1,');
  });
});
