/**
 * v1 DataSource: runs entirely in the browser against DuckDB-WASM.
 * Implements the DataSource interface (§5). When the backend arrives,
 * RemoteSQLSource implements the SAME interface — no UI/chart changes.
 */
import type { Table as ArrowTable } from 'apache-arrow';
import type * as duckdb from '@duckdb/duckdb-wasm';
import * as XLSX from 'xlsx';
import type {
  Dataset,
  DatasetProfile,
  ColumnProfile,
  Field,
  FieldRef,
  Filter,
  QuerySpec,
  Selection,
  ValueState,
} from '@/model/types';
import type { DataSource, ImportFileOptions } from './DataSource';
import { bootDuckDB } from './duckdb';
import { buildFields, type RawColumn } from './schema';
import { compileQuery, compileWhere } from '@/query/compile';
import { quoteIdent, quoteLiteral } from '@/query/sql';

/** Field ids are `${datasetId}::column`. */
function datasetIdOf(fieldId: string): string {
  const i = fieldId.indexOf('::');
  return i >= 0 ? fieldId.slice(0, i) : fieldId;
}

let idCounter = 0;
function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** Turn an arbitrary name into a safe SQL identifier for a table. */
function sanitizeTableName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '') // drop extension
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1');
  return base || 'dataset';
}

function extOf(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m ? m[1].toLowerCase() : '';
}

export class LocalDuckDBSource implements DataSource {
  private db!: duckdb.AsyncDuckDB;
  private conn!: duckdb.AsyncDuckDBConnection;
  private bootDone: Promise<void>;
  private datasets = new Map<string, Dataset>();
  public crossOriginIsolated = false;

  constructor() {
    this.bootDone = (async () => {
      const booted = await bootDuckDB();
      this.db = booted.db;
      this.crossOriginIsolated = booted.crossOriginIsolated;
      this.conn = await this.db.connect();
    })();
  }

  ready(): Promise<void> {
    return this.bootDone;
  }

  async listDatasets(): Promise<Dataset[]> {
    await this.ready();
    return [...this.datasets.values()];
  }

  async getSchema(datasetId: string): Promise<Field[]> {
    const ds = this.requireDataset(datasetId);
    return ds.fields;
  }

  async runSQL(sql: string): Promise<ArrowTable> {
    await this.ready();
    return (await this.conn.query(sql)) as unknown as ArrowTable;
  }

  async runQuery(spec: QuerySpec): Promise<ArrowTable> {
    const ds = this.requireDataset(spec.datasetId);
    return this.runSQL(compileQuery(spec, ds));
  }

  async importFile(
    file: File | ArrayBuffer,
    opts: ImportFileOptions = {},
  ): Promise<Dataset> {
    await this.ready();
    let bytes: Uint8Array;
    let fileName: string;
    if (file instanceof ArrayBuffer) {
      bytes = new Uint8Array(file);
      fileName = opts.name ?? 'data.csv';
    } else {
      bytes = new Uint8Array(await file.arrayBuffer());
      fileName = file.name;
    }
    return this.registerBuffer(bytes, fileName, opts);
  }

  async importText(
    text: string,
    fileName: string,
    opts: ImportFileOptions = {},
  ): Promise<Dataset> {
    await this.ready();
    const bytes = new TextEncoder().encode(text);
    return this.registerBuffer(bytes, fileName, opts);
  }

  async createDatasetFromSQL(
    name: string,
    sql: string,
    opts: { datasetId?: string } = {},
  ): Promise<Dataset> {
    await this.ready();
    const datasetId = opts.datasetId ?? uniqueId('ds');
    const table = `${sanitizeTableName(name)}_${idCounter}`;
    await this.conn.query(
      `CREATE OR REPLACE TABLE ${quoteIdent(table)} AS (${sql})`,
    );
    const fields = await this.describeTable(datasetId, table);
    const countRes = await this.conn.query(
      `SELECT COUNT(*) AS c FROM ${quoteIdent(table)}`,
    );
    const dataset: Dataset = {
      id: datasetId,
      name,
      source: 'file',
      table,
      fields,
      rowCount: Number((countRes.toArray()[0] as { c: unknown }).c ?? 0),
      loadedAt: new Date().toISOString(),
    };
    this.datasets.set(datasetId, dataset);
    return dataset;
  }

  // --- Profiling -----------------------------------------------------------

  async profile(datasetId: string): Promise<DatasetProfile> {
    const ds = this.requireDataset(datasetId);
    const table = quoteIdent(ds.table);
    const columns: ColumnProfile[] = [];

    for (const field of ds.fields) {
      const col = quoteIdent(field.column);
      const isNumeric = field.type === 'number' || field.type === 'integer';
      const statsSql = `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ${col} IS NULL) AS nulls,
          COUNT(DISTINCT ${col}) AS distinct_count
          ${isNumeric ? `, MIN(${col}) AS min_v, MAX(${col}) AS max_v, AVG(${col}) AS mean_v` : ''}
        FROM ${table}`;
      const res = await this.runSQL(statsSql);
      const row = res.toArray()[0] as Record<string, unknown>;
      const total = Number(row.total ?? 0);
      const nulls = Number(row.nulls ?? 0);
      const profile: ColumnProfile = {
        column: field.column,
        type: field.type,
        nullCount: nulls,
        nullFraction: total ? nulls / total : 0,
        distinctCount: Number(row.distinct_count ?? 0),
      };
      if (isNumeric) {
        profile.min = row.min_v != null ? Number(row.min_v) : undefined;
        profile.max = row.max_v != null ? Number(row.max_v) : undefined;
        profile.mean = row.mean_v != null ? Number(row.mean_v) : undefined;
        if (
          profile.min != null &&
          profile.max != null &&
          profile.max > profile.min
        ) {
          const hist = await this.runSQL(
            `SELECT width_bucket(${col}, ${profile.min}, ${profile.max}, 10) AS b,
                    COUNT(*) AS c
             FROM ${table} WHERE ${col} IS NOT NULL GROUP BY 1 ORDER BY 1`,
          );
          profile.histogram = hist.toArray().map((h) => {
            const hr = h as { b: unknown; c: unknown };
            return { bucket: String(Number(hr.b ?? 0)), count: Number(hr.c ?? 0) };
          });
        }
      } else {
        const ex = await this.runSQL(
          `SELECT ${col} AS v, COUNT(*) AS c FROM ${table}
           GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        );
        profile.examples = ex.toArray().map((e) => {
          const er = e as { v: unknown; c: unknown };
          return {
            value: er.v as string | number | null,
            count: Number(er.c ?? 0),
          };
        });
      }
      columns.push(profile);
    }

    return { datasetId, rowCount: ds.rowCount, columns };
  }

  // --- Association (full logic lands in M3) --------------------------------

  async possibleValues(
    field: FieldRef,
    selection: Selection,
  ): Promise<ValueState[]> {
    const ds = this.requireDataset(field.datasetId);
    const f = ds.fields.find((x) => x.id === field.field);
    if (!f) throw new Error(`Unknown field: ${field.field}`);
    const col = quoteIdent(f.column);
    const table = quoteIdent(ds.table);
    const fields = new Map(ds.fields.map((x) => [x.id, x]));

    // Filters from every OTHER field's selection (associative semantics: a
    // field's own selection doesn't constrain which of its values are possible).
    const otherFilters: Filter[] = [];
    for (const sel of selection.selections) {
      if (sel.field === field.field) continue;
      if (datasetIdOf(sel.field) === ds.id && sel.values.length)
        otherFilters.push({ field: sel.field, op: 'in', values: sel.values });
    }
    for (const flt of selection.filters) {
      if (flt.field === field.field) continue;
      if (datasetIdOf(flt.field) === ds.id) otherFilters.push(flt);
    }
    const where = compileWhere(fields, otherFilters);

    // All values (with counts) and the set still reachable under other selections.
    const [allRes, possibleRes] = await Promise.all([
      this.runSQL(
        `SELECT ${col} AS v, COUNT(*) AS c FROM ${table} GROUP BY 1 ORDER BY 2 DESC LIMIT 2000`,
      ),
      this.runSQL(
        `SELECT DISTINCT ${col} AS v FROM ${table} ${where}`,
      ),
    ]);

    const possible = new Set(
      possibleRes.toArray().map((r) => String((r as { v: unknown }).v)),
    );
    const selected = new Set(
      (selection.selections.find((s) => s.field === field.field)?.values ?? []).map(
        (v) => String(v),
      ),
    );

    return allRes.toArray().map((r) => {
      const value = (r as { v: unknown }).v as ValueState['value'];
      const key = String(value);
      const state = selected.has(key)
        ? 'selected'
        : possible.has(key)
          ? 'possible'
          : 'excluded';
      return { value, count: Number((r as { c: unknown }).c ?? 0), state };
    });
  }

  // --- internals -----------------------------------------------------------

  private requireDataset(id: string): Dataset {
    const ds = this.datasets.get(id);
    if (!ds) throw new Error(`Unknown dataset: ${id}`);
    return ds;
  }

  private async registerBuffer(
    bytes: Uint8Array,
    fileName: string,
    opts: ImportFileOptions,
  ): Promise<Dataset> {
    let ext = extOf(fileName);

    // Excel: convert the selected sheet to CSV via SheetJS, then ingest as CSV
    // through DuckDB's reader — keeps a single code path downstream.
    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(bytes, { type: 'array' });
      const sheetName =
        opts.sheet && wb.SheetNames.includes(opts.sheet)
          ? opts.sheet
          : wb.SheetNames[0];
      if (!sheetName) throw new Error('No sheets found in the Excel file.');
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      bytes = new TextEncoder().encode(csv);
      ext = 'csv';
    }

    const datasetId = opts.datasetId ?? uniqueId('ds');
    const table = `${sanitizeTableName(opts.name ?? fileName)}_${idCounter}`;
    const virtualName = `${datasetId}.${ext || 'csv'}`;

    await this.db.registerFileBuffer(virtualName, bytes);

    const reader = this.readerExpr(virtualName, ext);
    await this.conn.query(
      `CREATE OR REPLACE TABLE ${quoteIdent(table)} AS SELECT * FROM ${reader}`,
    );

    const fields = await this.describeTable(datasetId, table);
    const countRes = await this.conn.query(
      `SELECT COUNT(*) AS c FROM ${quoteIdent(table)}`,
    );
    const rowCount = Number(
      (countRes.toArray()[0] as { c: unknown }).c ?? 0,
    );

    const dataset: Dataset = {
      id: datasetId,
      name: opts.name ?? fileName.replace(/\.[^.]+$/, ''),
      source: 'file',
      table,
      fields,
      rowCount,
      loadedAt: new Date().toISOString(),
    };
    this.datasets.set(datasetId, dataset);
    return dataset;
  }

  private readerExpr(virtualName: string, ext: string): string {
    const path = quoteLiteral(virtualName);
    switch (ext) {
      case 'parquet':
        return `read_parquet(${path})`;
      case 'json':
      case 'ndjson':
        return `read_json_auto(${path})`;
      case 'tsv':
        return `read_csv_auto(${path}, delim='\t')`;
      case 'csv':
      case 'txt':
      default:
        return `read_csv_auto(${path})`;
    }
  }

  private async describeTable(
    datasetId: string,
    table: string,
  ): Promise<Field[]> {
    const res = await this.conn.query(`DESCRIBE ${quoteIdent(table)}`);
    const cols: RawColumn[] = res.toArray().map((r) => {
      const row = r as { column_name: string; column_type: string };
      return { name: row.column_name, duckType: row.column_type };
    });
    return buildFields(datasetId, cols);
  }
}
