/**
 * Embed mode: when the page is loaded with `?embed` (e.g. inside an iframe on a
 * wiki/portal), Vantage renders a clean, read-only view of the saved dashboard
 * — no rails, top bar, or editing chrome. The data comes from this browser's
 * local persistence (a server-backed share link is M6 build-later work).
 */
export function isEmbedMode(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('embed');
  } catch {
    return false;
  }
}

/** A shareable embed URL for the current page. */
export function embedUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?embed=1`;
}
