/**
 * Read-only embed surface (see embed.ts). Renders just the saved dashboard with
 * a slim header — no rails, top bar, or editing chrome — so it sits cleanly in
 * an iframe. Cross-filtering by clicking marks still works (interactive embed).
 */
import { useDashboardStore } from '@/store/dashboardStore';
import { useAppStore } from '@/store/appStore';
import { DashboardGrid } from './dashboard/DashboardGrid';

export function EmbedView() {
  const name = useDashboardStore((s) => s.workbook.name);
  const tileCount = useDashboardStore((s) => s.workbook.tiles.length);
  const datasets = useAppStore((s) => s.datasets);

  return (
    <div className="flex h-full flex-col bg-bg-base p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-5 w-5 place-items-center rounded bg-gradient-to-br from-accent to-accent2 text-[11px] font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold text-content-primary">{name}</span>
        <span className="ml-auto text-[11px] text-content-muted">
          {tileCount} {tileCount === 1 ? 'tile' : 'tiles'}
        </span>
      </div>
      <div className="min-h-0 flex-1 rounded-lg border border-border-subtle bg-bg-base">
        {datasets.length && tileCount ? (
          <DashboardGrid readOnly />
        ) : (
          <div className="grid h-full place-items-center text-sm text-content-muted">
            Nothing to show — this browser has no saved dashboard.
          </div>
        )}
      </div>
    </div>
  );
}
