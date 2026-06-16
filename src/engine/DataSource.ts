/**
 * The single abstraction the whole app talks to for data (§5).
 *
 * No UI, chart, or store code may import DuckDB directly — it goes through a
 * DataSource. `LocalDuckDBSource` implements this in v1; a future
 * `RemoteSQLSource` will implement the SAME interface against server-side
 * connectors with zero UI/chart changes.
 */
import type { Table as ArrowTable } from 'apache-arrow';
import type {
  Dataset,
  DatasetProfile,
  Field,
  FieldRef,
  QuerySpec,
  Selection,
  ValueState,
} from '@/model/types';

export interface ImportFileOptions {
  /** Suggested dataset name (defaults to file name without extension). */
  name?: string;
  /** For Excel: which sheet to load. */
  sheet?: string;
  /** Force a specific dataset id (used to restore persisted datasets stably). */
  datasetId?: string;
}

export interface DataSource {
  /** Whether the engine has finished booting and is ready for queries. */
  ready(): Promise<void>;

  listDatasets(): Promise<Dataset[]>;
  getSchema(datasetId: string): Promise<Field[]>;
  profile(datasetId: string): Promise<DatasetProfile>;

  /** Structured query (compiled to SQL internally). */
  runQuery(spec: QuerySpec): Promise<ArrowTable>;

  /** Raw SQL escape hatch (Advanced mode / SQL Lab). */
  runSQL(sql: string): Promise<ArrowTable>;

  /**
   * Association support: for a field, return each value's state
   * (selected / possible / excluded) given the current selection.
   */
  possibleValues(field: FieldRef, selection: Selection): Promise<ValueState[]>;

  /**
   * Register a file as a dataset. v1 (browser) reads bytes; a remote source
   * may upload or reference instead.
   */
  importFile(file: File | ArrayBuffer, opts?: ImportFileOptions): Promise<Dataset>;

  /** Register an in-memory or bundled CSV/text payload as a dataset. */
  importText(
    text: string,
    fileName: string,
    opts?: ImportFileOptions,
  ): Promise<Dataset>;

  /**
   * Materialize a SQL query as a new dataset (joins/unions, SQL Lab
   * "save as dataset", and lightweight transforms compile to this).
   */
  createDatasetFromSQL(
    name: string,
    sql: string,
    opts?: { datasetId?: string },
  ): Promise<Dataset>;
}
