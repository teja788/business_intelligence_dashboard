/**
 * Rasterize a DOM node (a single tile or the whole dashboard) to a PNG. Uses
 * html-to-image so it captures every renderer uniformly — ECharts canvases,
 * the choropleth map, and the React table/KPI/pivot tiles all snapshot through
 * the same path, with no per-chart export code.
 */
import { toBlob, toPng } from 'html-to-image';
import { downloadBlob, slugify } from './download';

/** Resolve a solid background so the PNG isn't transparent over dark themes. */
function resolveBackground(node: HTMLElement): string {
  let el: HTMLElement | null = node;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
    el = el.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor || '#0b0e14';
}

export interface CaptureOptions {
  /** Device-pixel multiplier for crispness. Defaults to 2. */
  pixelRatio?: number;
  /** Override the auto-detected background color. */
  backgroundColor?: string;
}

function captureOpts(node: HTMLElement, opts: CaptureOptions) {
  return {
    pixelRatio: opts.pixelRatio ?? 2,
    backgroundColor: opts.backgroundColor ?? resolveBackground(node),
    cacheBust: true,
    // Don't try to snapshot scrollbars or grid resize handles.
    filter: (el: HTMLElement) =>
      !el.classList?.contains?.('react-resizable-handle'),
  };
}

/** PNG data URL for a node (used to embed charts in the HTML report). */
export function nodeToPngDataUrl(
  node: HTMLElement,
  opts: CaptureOptions = {},
): Promise<string> {
  return toPng(node, captureOpts(node, opts));
}

/** PNG Blob for a node. */
export async function nodeToPngBlob(
  node: HTMLElement,
  opts: CaptureOptions = {},
): Promise<Blob> {
  const blob = await toBlob(node, captureOpts(node, opts));
  if (!blob) throw new Error('Failed to rasterize node to PNG.');
  return blob;
}

/** Capture a node and download it as <name>.png. */
export async function downloadNodePng(
  node: HTMLElement,
  baseName: string,
  opts: CaptureOptions = {},
): Promise<void> {
  const blob = await nodeToPngBlob(node, opts);
  downloadBlob(blob, `${slugify(baseName)}.png`);
}
