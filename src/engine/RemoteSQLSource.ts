/**
 * M6 seam (architected now, built later). A server-backed DataSource that
 * implements the EXACT SAME interface as LocalDuckDBSource — so swapping the
 * engine in `source.ts` is a one-line change and NO UI/chart/store code moves.
 *
 * It talks to a future Node service (Postgres/warehouse connectors, accounts,
 * server-saved workbooks, share links, row-level permissions). The endpoints
 * below are the contract that service must honor. Nothing here is wired into
 * the app yet; it exists to prove the boundary holds.
 */
import { tableFromIPC, type Table as ArrowTable } from 'apache-arrow';
import type {
  Dataset,
  DatasetProfile,
  Field,
  FieldRef,
  QuerySpec,
  Selection,
  ValueState,
} from '@/model/types';
import type { DataSource, ImportFileOptions } from './DataSource';

export interface RemoteSQLSourceConfig {
  baseUrl: string;
  /** Bearer token for authenticated requests (accounts land in M6). */
  token?: string;
}

export class RemoteSQLSource implements DataSource {
  constructor(private config: RemoteSQLSourceConfig) {}

  private headers(json = true): HeadersInit {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (this.config.token) h['Authorization'] = `Bearer ${this.config.token}`;
    return h;
  }

  private async getJSON<T>(path: string): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      headers: this.headers(false),
    });
    if (!res.ok) throw new Error(`Remote ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async postJSON<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Remote ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  /** POST that returns an Arrow IPC stream (the wire format for results). */
  private async postArrow(path: string, body: unknown): Promise<ArrowTable> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Remote ${path} failed: ${res.status}`);
    return tableFromIPC(new Uint8Array(await res.arrayBuffer()));
  }

  ready(): Promise<void> {
    return this.getJSON<{ ok: boolean }>('/health').then(() => undefined);
  }

  listDatasets(): Promise<Dataset[]> {
    return this.getJSON<Dataset[]>('/datasets');
  }

  getSchema(datasetId: string): Promise<Field[]> {
    return this.getJSON<Field[]>(`/datasets/${encodeURIComponent(datasetId)}/schema`);
  }

  profile(datasetId: string): Promise<DatasetProfile> {
    return this.getJSON<DatasetProfile>(
      `/datasets/${encodeURIComponent(datasetId)}/profile`,
    );
  }

  runQuery(spec: QuerySpec): Promise<ArrowTable> {
    // The server applies its own visual-query→SQL compiler (same dialect) so
    // row-level permissions can be enforced before execution.
    return this.postArrow('/query', { spec });
  }

  runSQL(sql: string): Promise<ArrowTable> {
    return this.postArrow('/sql', { sql });
  }

  possibleValues(field: FieldRef, selection: Selection): Promise<ValueState[]> {
    return this.postJSON<ValueState[]>('/association', { field, selection });
  }

  async importFile(
    file: File | ArrayBuffer,
    opts: ImportFileOptions = {},
  ): Promise<Dataset> {
    const form = new FormData();
    const blob = file instanceof ArrayBuffer ? new Blob([file]) : file;
    form.append('file', blob, opts.name ?? 'upload');
    if (opts.name) form.append('name', opts.name);
    const res = await fetch(`${this.config.baseUrl}/datasets`, {
      method: 'POST',
      headers: this.headers(false),
      body: form,
    });
    if (!res.ok) throw new Error(`Remote upload failed: ${res.status}`);
    return res.json() as Promise<Dataset>;
  }

  importText(
    text: string,
    fileName: string,
    opts: ImportFileOptions = {},
  ): Promise<Dataset> {
    return this.postJSON<Dataset>('/datasets/text', { text, fileName, ...opts });
  }

  createDatasetFromSQL(
    name: string,
    sql: string,
    opts: { datasetId?: string } = {},
  ): Promise<Dataset> {
    return this.postJSON<Dataset>('/datasets/derived', { name, sql, ...opts });
  }
}
