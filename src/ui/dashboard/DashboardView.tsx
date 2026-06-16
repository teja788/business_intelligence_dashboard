/**
 * Dashboard surface: a toolbar (rename, add chart, export/import, new) above
 * the tile grid. Workbook autosaves to IndexedDB on every change.
 */
import { useRef } from 'react';
import { useAppStore, useActiveDataset } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { suggestCharts } from '@/charts/registry';
import { DashboardGrid } from './DashboardGrid';

export function DashboardView() {
  const dataset = useActiveDataset();
  const datasets = useAppStore((s) => s.datasets);
  const name = useDashboardStore((s) => s.workbook.name);
  const tileCount = useDashboardStore((s) => s.workbook.tiles.length);
  const addTile = useDashboardStore((s) => s.addTile);
  const renameWorkbook = useDashboardStore((s) => s.renameWorkbook);
  const newWorkbook = useDashboardStore((s) => s.newWorkbook);
  const exportJSON = useDashboardStore((s) => s.exportJSON);
  const importJSON = useDashboardStore((s) => s.importJSON);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!dataset) return;
    const dim = dataset.fields.find((f) => f.role === 'dimension');
    const measure = dataset.fields.find((f) => f.role === 'measure');
    const encoding = {
      x: dim ? [dim.id] : [],
      y: measure ? [measure.id] : [],
    };
    const best = suggestCharts({
      dimensionCount: dim ? 1 : 0,
      measureCount: measure ? 1 : 0,
      firstDimensionType: dim?.type,
    })[0];
    addTile({ datasetId: dataset.id, type: best?.id ?? 'bar', encoding });
  };

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^\w-]+/g, '_') || 'workbook'}.vantage.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => {
      try {
        importJSON(t);
      } catch {
        /* ignore malformed file */
      }
    });
    e.target.value = '';
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => renameWorkbook(e.target.value)}
          className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-content-primary outline-none hover:border-border-subtle focus:border-accent"
        />
        <span className="text-[11px] text-content-muted">{tileCount} tiles</span>

        <div className="ml-auto flex items-center gap-1.5 text-[12px]">
          <button
            onClick={handleAdd}
            disabled={!dataset}
            className="rounded-md bg-accent px-2.5 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            + Add chart
          </button>
          <ToolbarButton onClick={handleExport} disabled={!tileCount}>Export</ToolbarButton>
          <ToolbarButton onClick={() => fileRef.current?.click()}>Import</ToolbarButton>
          <ToolbarButton onClick={newWorkbook}>New</ToolbarButton>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {!datasets.length ? (
        <div className="grid flex-1 place-items-center text-sm text-content-muted">
          Import a dataset to start building a dashboard.
        </div>
      ) : (
        <div className="min-h-0 flex-1 rounded-lg border border-border-subtle bg-bg-base">
          <DashboardGrid />
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border-subtle px-2.5 py-1.5 font-medium text-content-secondary hover:bg-bg-elevated hover:text-content-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}
