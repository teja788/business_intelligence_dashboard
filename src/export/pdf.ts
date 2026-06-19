/**
 * Dashboard → PDF. Rasterizes the dashboard node once (so ECharts + DOM tiles
 * are captured identically) and lays it onto a single page sized to the
 * content, so nothing is cropped. jsPDF is loaded here only.
 */
import { jsPDF } from 'jspdf';
import { nodeToPngDataUrl, type CaptureOptions } from './image';
import { downloadBlob, slugify } from './download';

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not measure dashboard image.'));
    img.src = dataUrl;
  });
}

/** Capture the node and download it as <name>.pdf (one content-sized page). */
export async function downloadNodePdf(
  node: HTMLElement,
  baseName: string,
  opts: CaptureOptions = {},
): Promise<void> {
  const ratio = opts.pixelRatio ?? 2;
  const dataUrl = await nodeToPngDataUrl(node, opts);
  const { w, h } = await imageSize(dataUrl);
  // Convert device pixels back to CSS px for sane physical sizing.
  const pw = w / ratio;
  const ph = h / ratio;
  const doc = new jsPDF({
    orientation: pw >= ph ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pw, ph],
    compress: true,
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
  downloadBlob(doc.output('blob'), `${slugify(baseName)}.pdf`);
}
