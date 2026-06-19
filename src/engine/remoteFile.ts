/**
 * Fetch a remote data file (CSV/Parquet/JSON/TSV/Excel) into an in-browser
 * File so it flows through the exact same import path as a dropped file — the
 * engine never needs to know the bytes came from a URL. CORS is the remote
 * server's responsibility (published Google Sheets, raw GitHub, S3-with-CORS,
 * and most data portals work).
 */

const CONTENT_TYPE_EXT: Array<[RegExp, string]> = [
  [/csv/, 'csv'],
  [/tab-separated|tsv/, 'tsv'],
  [/ndjson|x-jsonlines/, 'ndjson'],
  [/json/, 'json'],
  [/parquet/, 'parquet'],
  [/spreadsheetml|ms-excel|officedocument\.spreadsheet/, 'xlsx'],
];

function hasKnownExt(name: string): boolean {
  return /\.(csv|tsv|txt|parquet|json|ndjson|xlsx|xls)$/i.test(name);
}

function extFromContentType(contentType: string | null): string {
  const ct = (contentType ?? '').toLowerCase();
  for (const [re, ext] of CONTENT_TYPE_EXT) if (re.test(ct)) return ext;
  return 'csv'; // DuckDB's CSV sniffer is the most forgiving fallback.
}

/** Derive a sensible file name (with a usable extension) from a URL + headers. */
export function fileNameFromUrl(url: string, contentType: string | null): string {
  let base = 'data';
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last) base = decodeURIComponent(last);
    else if (u.hostname) base = u.hostname.replace(/^www\./, '');
  } catch {
    /* non-URL string — keep the default base */
  }
  if (hasKnownExt(base)) return base;
  return `${base}.${extFromContentType(contentType)}`;
}

/** Fetch the URL and return its bytes wrapped as a named File. */
export async function fetchUrlAsFile(url: string): Promise<File> {
  let res: Response;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    throw new Error(
      `Could not fetch ${url}. The server may block cross-origin requests (CORS). ${
        err instanceof Error ? err.message : ''
      }`.trim(),
    );
  }
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const name = fileNameFromUrl(url, res.headers.get('content-type'));
  return new File([blob], name, { type: blob.type });
}
