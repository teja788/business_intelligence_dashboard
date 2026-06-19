import { describe, expect, it } from 'vitest';
import { buildHtmlReport } from './htmlReport';

describe('buildHtmlReport', () => {
  const meta = { title: 'Q3 <Sales>', generatedAt: '2026-06-19 10:00', subtitle: 'sales.csv' };

  it('is a self-contained document with no external references', () => {
    const html = buildHtmlReport(meta, [
      { title: 'Revenue', img: 'data:image/png;base64,AAAA', w: 6 },
    ]);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('data:image/png;base64,AAAA');
    // No http(s) asset references — fully offline.
    expect(/src="https?:/i.test(html)).toBe(false);
    expect(/href="https?:/i.test(html)).toBe(false);
  });

  it('escapes HTML in titles to prevent broken markup/injection', () => {
    const html = buildHtmlReport(meta, []);
    expect(html).toContain('Q3 &lt;Sales&gt;');
    expect(html).not.toContain('<Sales>');
  });

  it('clamps the grid span to 1..12', () => {
    const html = buildHtmlReport(meta, [
      { title: 'wide', img: 'data:,', w: 99 },
      { title: 'thin', img: 'data:,', w: 0 },
    ]);
    expect(html).toContain('grid-column: span 12;');
    expect(html).toContain('grid-column: span 1;');
  });
});
