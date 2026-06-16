/**
 * Tile transparency (§9): "View SQL" (with "Edit as SQL" → SQL Lab) and
 * "View underlying rows". Both reuse the exact query the chart runs.
 */
import { useMemo, useState } from 'react';
import { Modal } from '@/ui/components/Modal';
import { DataTable } from '@/ui/table/DataTable';
import { useDashboardStore } from '@/store/dashboardStore';
import { useUIStore } from '@/store/uiStore';
import { useSelectionStore, selectionFiltersFor } from '@/store/selectionStore';
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';
import { useSqlQuery } from '@/ui/hooks/useSqlQuery';
import { getTileSQL, getUnderlyingRowsSQL } from '@/charts/tileSql';

type Tab = 'sql' | 'rows';

export function TileInspector() {
  const tileId = useUIStore((s) => s.inspectTileId);
  const close = useUIStore((s) => s.inspectTile);
  const openSqlLab = useUIStore((s) => s.openSqlLab);
  const tile = useDashboardStore((s) =>
    s.workbook.tiles.find((t) => t.id === tileId),
  );
  const parameters = useDashboardStore((s) => s.workbook.parameters);
  const selection = useSelectionStore((s) => s.selection);
  const dataset = useEffectiveDataset(tile?.query.datasetId);
  const [tab, setTab] = useState<Tab>('sql');

  const filters = useMemo(
    () => (tile ? selectionFiltersFor(selection, tile.query.datasetId) : []),
    [selection, tile],
  );

  const sql = useMemo(() => {
    if (!tile || !dataset) return '';
    return getTileSQL(dataset, tile.encoding, tile.options, filters, parameters);
  }, [tile, dataset, filters, parameters]);

  const rowsSql = useMemo(
    () => (tile && dataset && tab === 'rows' ? getUnderlyingRowsSQL(dataset, filters) : null),
    [tile, dataset, filters, tab],
  );
  const { data, loading, error } = useSqlQuery(rowsSql);

  if (!tileId) return null;
  if (!tile || !dataset) {
    return (
      <Modal title="Inspect tile" onClose={() => close(undefined)}>
        <p className="text-sm text-content-muted">Tile unavailable.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Inspect · ${tile.title || tile.type}`}
      onClose={() => close(undefined)}
      width="max-w-4xl"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border-subtle bg-bg-inset p-0.5 text-xs">
          <button
            onClick={() => setTab('sql')}
            className={`rounded-md px-3 py-1 font-medium ${tab === 'sql' ? 'bg-accent text-white' : 'text-content-secondary'}`}
          >
            SQL
          </button>
          <button
            onClick={() => setTab('rows')}
            className={`rounded-md px-3 py-1 font-medium ${tab === 'rows' ? 'bg-accent text-white' : 'text-content-secondary'}`}
          >
            Underlying rows
          </button>
        </div>
        {tab === 'sql' && (
          <button
            onClick={() => { openSqlLab(sql); close(undefined); }}
            className="ml-auto rounded-md border border-border-subtle px-2.5 py-1 text-[12px] text-content-secondary hover:bg-bg-elevated hover:text-content-primary"
          >
            Edit as SQL →
          </button>
        )}
      </div>

      {tab === 'sql' ? (
        <pre className="v-scroll max-h-[60vh] overflow-auto rounded-md border border-border-subtle bg-bg-base p-3 font-mono text-[12px] leading-relaxed text-content-primary">
          {sql}
        </pre>
      ) : (
        <div className="h-[60vh]">
          {loading && <div className="grid h-full place-items-center text-sm text-content-muted">Loading rows…</div>}
          {error && <div className="grid h-full place-items-center text-sm text-red-400">{error}</div>}
          {data && <DataTable columns={data.columns} rows={data.rows} />}
        </div>
      )}
    </Modal>
  );
}
