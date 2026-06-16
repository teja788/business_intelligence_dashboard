/**
 * SQL Lab: a free-form SQL console. Write a query against any registered
 * dataset's physical table, run it through the DuckDB engine, preview results
 * in a virtualized grid, and optionally materialize the query into a new
 * derived dataset. Self-contained overlay; mounted by AppShell elsewhere.
 */
import { useRef, useState } from 'react';
import { Modal } from '@/ui/components/Modal';
import { DataTable } from '@/ui/table/DataTable';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { getDataSource } from '@/engine/source';
import type { Dataset } from '@/model/types';

const ROW_CAP = 1000;

interface SqlResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Pick a sensible starting query from the first available dataset. */
function defaultQuery(datasets: Dataset[]): string {
  const first = datasets[0];
  return first ? `SELECT * FROM "${first.table}" LIMIT 100` : 'SELECT 1';
}

export function SqlLab() {
  const open = useUIStore((s) => s.sqlLabOpen);
  const closeSqlLab = useUIStore((s) => s.closeSqlLab);
  const datasets = useAppStore((s) => s.datasets);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sql, setSql] = useState(
    () => useUIStore.getState().sqlLabSeed ?? defaultQuery(useAppStore.getState().datasets),
  );
  const [result, setResult] = useState<SqlResult | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const trimmed = sql.trim();

  async function run() {
    const query = sql.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const table = await getDataSource().runSQL(query);
      const columns = table.schema.fields.map((f) => f.name);
      const all = table.toArray().map((r) => {
        const obj: Record<string, unknown> = {};
        for (const col of columns) {
          const v = (r as Record<string, unknown>)[col];
          // Normalize BigInt (DuckDB counts) for display/serialization.
          obj[col] = typeof v === 'bigint' ? Number(v) : v;
        }
        return obj;
      });
      setTruncated(all.length > ROW_CAP);
      setResult({ columns, rows: all.slice(0, ROW_CAP) });
    } catch (err) {
      setResult(null);
      setTruncated(false);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  /** Insert a quoted table name at the textarea cursor (append fallback). */
  function insertTable(table: string) {
    const token = `"${table}"`;
    const el = textareaRef.current;
    if (!el) {
      setSql((prev) => prev + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = sql.slice(0, start) + token + sql.slice(end);
    setSql(next);
    // Restore focus + caret after the inserted text on next tick.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function saveAsDataset() {
    const name = saveName.trim();
    const query = sql.trim();
    if (!name || !query) return;
    setSaving(true);
    setError(null);
    try {
      await useAppStore.getState().createDerivedDataset(name, query);
      closeSqlLab();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="SQL Lab" onClose={closeSqlLab} width="max-w-5xl">
      <div className="flex h-[70vh] flex-col gap-3">
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void run();
            }
          }}
          spellCheck={false}
          rows={8}
          placeholder="SELECT * FROM ..."
          className="w-full resize-y rounded-md border border-border-subtle bg-bg-base px-3 py-2 font-mono text-[13px] leading-relaxed text-content-primary outline-none focus:border-accent"
        />

        {datasets.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-content-muted">
            <span className="uppercase tracking-wider">Tables</span>
            {datasets.map((d) => (
              <button
                key={d.id}
                onClick={() => insertTable(d.table)}
                title={`Insert "${d.table}"`}
                className="font-mono text-content-secondary hover:text-accent2"
              >
                {d.name}
                <span className="text-content-muted"> → {d.table}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void run()}
            disabled={!trimmed || loading}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run'}
          </button>
          <span className="text-[11px] text-content-muted">⌘/Ctrl+Enter</span>

          <div className="ml-auto flex items-center gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="New dataset name"
              className="w-44 rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-primary outline-none focus:border-accent"
            />
            <button
              onClick={() => void saveAsDataset()}
              disabled={!trimmed || !saveName.trim() || saving}
              className="rounded-md border border-border-strong px-3 py-1.5 text-[13px] font-medium text-content-secondary hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save as dataset'}
            </button>
          </div>
        </div>

        <div className="min-h-[1rem] text-[12px]">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : result ? (
            <span className="text-content-muted">
              {result.rows.length.toLocaleString()} row
              {result.rows.length === 1 ? '' : 's'}
              {truncated && ` (showing first ${ROW_CAP.toLocaleString()})`}
            </span>
          ) : (
            <span className="text-content-muted">Run a query to preview results.</span>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {result && result.rows.length > 0 ? (
            <DataTable columns={result.columns} rows={result.rows} />
          ) : (
            <div className="grid h-full place-items-center rounded-lg border border-border-subtle bg-bg-inset text-[12px] text-content-muted">
              {loading ? 'Running query…' : 'No results yet.'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
