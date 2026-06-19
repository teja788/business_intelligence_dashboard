import { describe, expect, it } from 'vitest';
import { fileNameFromUrl } from './remoteFile';

describe('fileNameFromUrl', () => {
  it('keeps an existing known extension from the path', () => {
    expect(fileNameFromUrl('https://x.com/data/sales.csv', null)).toBe('sales.csv');
    expect(fileNameFromUrl('https://x.com/q3.parquet', 'application/octet-stream')).toBe(
      'q3.parquet',
    );
  });

  it('infers the extension from content-type when the path has none', () => {
    // e.g. a published Google Sheet: …/export?format=csv
    expect(fileNameFromUrl('https://docs.google.com/spreadsheets/d/abc/export', 'text/csv')).toBe(
      'export.csv',
    );
    expect(fileNameFromUrl('https://api.x.com/v1/rows', 'application/json')).toBe('rows.json');
  });

  it('falls back to the hostname when there is no path segment', () => {
    expect(fileNameFromUrl('https://data.example.com/', 'text/csv')).toBe('data.example.com.csv');
  });

  it('defaults to csv for unknown content types', () => {
    expect(fileNameFromUrl('https://x.com/dump', 'application/octet-stream')).toBe('dump.csv');
  });

  it('decodes percent-encoded path segments', () => {
    expect(fileNameFromUrl('https://x.com/my%20data.csv', null)).toBe('my data.csv');
  });
});
