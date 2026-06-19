/**
 * Tiny download helpers shared by every exporter. Kept dependency-free and
 * DOM-only so the export modules stay focused on producing bytes, not plumbing.
 */

/** Filesystem-safe slug for a workbook/tile/dataset name. */
export function slugify(name: string, fallback = 'vantage'): string {
  const s = (name || '').trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return s || fallback;
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  // Revoke on the next tick so the click has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Trigger a browser download for any URL (incl. data: URLs). */
export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Download a string as a text file (CSV, HTML, JSON…). */
export function downloadText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}
