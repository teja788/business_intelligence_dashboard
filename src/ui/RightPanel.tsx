/**
 * Right contextual panel. In M0 it shows dataset metadata + a freshness badge
 * (a transparency/trust feature, §9). Becomes the per-tile config panel in M2.
 */
import { useActiveDataset } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { ProfilePanel } from './profile/ProfilePanel';
import { TileEditor } from './dashboard/TileEditor';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

export function RightPanel() {
  const active = useActiveDataset();
  const selectedTileId = useDashboardStore((s) => s.selectedTileId);
  const selectedTile = useDashboardStore((s) =>
    s.workbook.tiles.find((t) => t.id === s.selectedTileId),
  );
  const selectTile = useDashboardStore((s) => s.selectTile);

  if (selectedTileId && selectedTile) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-border-subtle bg-bg-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            Edit chart
          </span>
          <button
            onClick={() => selectTile(undefined)}
            className="rounded px-1.5 text-[11px] text-content-muted hover:bg-bg-elevated hover:text-content-primary"
          >
            Done
          </button>
        </div>
        <div className="v-scroll flex-1 overflow-auto px-3 pb-4">
          <TileEditor tile={selectedTile} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border-subtle bg-bg-panel">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
        Details
      </div>
      <div className="v-scroll flex-1 overflow-auto px-3 pb-3 text-[13px]">
        {!active ? (
          <p className="py-4 text-content-muted">
            Select or import a dataset to see its details here.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-content-primary">{active.name}</div>
              <div className="text-[11px] text-content-muted">
                table <span className="font-mono">{active.table}</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Rows" value={active.rowCount.toLocaleString()} />
              <Stat label="Columns" value={String(active.fields.length)} />
              <Stat
                label="Dimensions"
                value={String(
                  active.fields.filter((f) => f.role === 'dimension').length,
                )}
              />
              <Stat
                label="Measures"
                value={String(
                  active.fields.filter((f) => f.role === 'measure').length,
                )}
              />
            </dl>

            <div className="flex items-center gap-2 rounded-md bg-bg-inset px-2.5 py-1.5 text-[11px] text-content-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-assoc-selected" />
              Loaded {timeAgo(active.loadedAt)}
            </div>

            <div className="pt-1">
              <div className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Columns
              </div>
              <ProfilePanel datasetId={active.id} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-inset px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-content-muted">
        {label}
      </div>
      <div className="text-content-primary">{value}</div>
    </div>
  );
}
