/**
 * Self-contained HTML report — the headline "share anywhere" deliverable. Each
 * tile is rasterized to an embedded PNG data URL and laid out on a 12-column
 * grid that mirrors the dashboard. The output file has zero external
 * references: it opens offline in any browser, no Vantage required.
 */
import { nodeToPngDataUrl } from './image';
import { downloadText, slugify } from './download';

export interface ReportTile {
  title: string;
  /** PNG data URL. */
  img: string;
  /** Grid width 1..12 (mirrors the dashboard column span). */
  w: number;
}

export interface ReportMeta {
  title: string;
  /** Human-readable generation timestamp. */
  generatedAt: string;
  /** Optional dataset/source note shown under the title. */
  subtitle?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Pure: build the full HTML document string from captured tiles. */
export function buildHtmlReport(meta: ReportMeta, tiles: ReportTile[]): string {
  const cards = tiles
    .map((t) => {
      const span = Math.min(12, Math.max(1, Math.round(t.w)));
      return `      <figure class="card" style="grid-column: span ${span};">
        <figcaption>${esc(t.title)}</figcaption>
        <img alt="${esc(t.title)}" src="${t.img}" />
      </figure>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0e14; color: #e6e9ef;
    font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding: 28px 32px 8px; }
  h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .meta { color: #8b93a7; font-size: 12px; margin-top: 4px; }
  main { padding: 16px 32px 40px; }
  .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
  .card { margin: 0; background: #131722; border: 1px solid #232a3a;
    border-radius: 12px; overflow: hidden; min-width: 0; }
  figcaption { padding: 10px 12px; font-size: 12px; font-weight: 600;
    border-bottom: 1px solid #232a3a; color: #c7cdda; }
  .card img { display: block; width: 100%; height: auto; }
  footer { padding: 0 32px 32px; color: #5c6478; font-size: 11px; }
  @media (max-width: 720px) { .card { grid-column: span 12 !important; } }
</style>
</head>
<body>
  <header>
    <h1>${esc(meta.title)}</h1>
    <div class="meta">${esc(meta.subtitle ?? '')}${meta.subtitle ? ' · ' : ''}Generated ${esc(meta.generatedAt)} by Vantage</div>
  </header>
  <main>
    <div class="grid">
${cards}
    </div>
  </main>
  <footer>Static snapshot — figures were computed in Vantage at export time.</footer>
</body>
</html>`;
}

export interface CaptureTileRef {
  id: string;
  title: string;
  w: number;
}

/**
 * Capture each referenced tile node (located via [data-tile-id]) to a PNG and
 * assemble + download a self-contained HTML report.
 */
export async function exportHtmlReport(
  root: HTMLElement,
  refs: CaptureTileRef[],
  meta: ReportMeta,
): Promise<void> {
  const tiles: ReportTile[] = [];
  for (const ref of refs) {
    const node = root.querySelector<HTMLElement>(`[data-tile-id="${ref.id}"]`);
    if (!node) continue;
    const img = await nodeToPngDataUrl(node);
    tiles.push({ title: ref.title, img, w: ref.w });
  }
  const html = buildHtmlReport(meta, tiles);
  downloadText(html, `${slugify(meta.title)}.report.html`, 'text/html;charset=utf-8');
}
