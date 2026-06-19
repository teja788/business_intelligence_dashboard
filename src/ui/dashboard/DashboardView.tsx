/**
 * Dashboard surface: a toolbar (rename, add chart, export/import, new) above
 * the tile grid. Workbook autosaves to IndexedDB on every change. The Export
 * menu produces shareable artifacts — PNG, PDF, a self-contained HTML report,
 * and the portable workbook JSON.
 */
import { useEffect, useRef, useState } from 'react';
import { useAppStore, useActiveDataset } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { suggestCharts, getChart } from '@/charts/registry';
import { buildAutoDashboard } from '@/charts/autoDashboard';
import { getDataSource } from '@/engine/source';
import { downloadNodePng } from '@/export/image';
import { downloadNodePdf } from '@/export/pdf';
import { exportHtmlReport, type CaptureTileRef } from '@/export/htmlReport';
import { downloadText, slugify } from '@/export/download';
import { undo, redo, useHistoryStore } from '@/store/dashboardHistory';
import { embedUrl } from '@/ui/embed';
import { DashboardGrid } from './DashboardGrid';

export function DashboardView() {
  const dataset = useActiveDataset();
  const datasets = useAppStore((s) => s.datasets);
  const name = useDashboardStore((s) => s.workbook.name);
  const tiles = useDashboardStore((s) => s.workbook.tiles);
  const tileCount = tiles.length;
  const addTile = useDashboardStore((s) => s.addTile);
  const addTiles = useDashboardStore((s) => s.addTiles);
  const renameWorkbook = useDashboardStore((s) => s.renameWorkbook);
  const newWorkbook = useDashboardStore((s) => s.newWorkbook);
  const exportJSON = useDashboardStore((s) => s.exportJSON);
  const importJSON = useDashboardStore((s) => s.importJSON);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [building, setBuilding] = useState(false);
  const hist = useHistoryStore((s) => s.hist);
  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const handleAddFilter = () => {
    if (!dataset) return;
    const dim = dataset.fields.find((f) => f.role === 'dimension');
    addTile({
      datasetId: dataset.id,
      type: 'control',
      encoding: {},
      title: dim?.name ?? 'Filter',
      options: dim ? { controlField: dim.id } : {},
      layout: { x: 0, y: 0, w: 3, h: 6 },
    });
  };

  const handleAutoBuild = async () => {
    if (!dataset || building) return;
    setBuilding(true);
    try {
      let cardinality: Record<string, number> = {};
      try {
        const profile = await getDataSource().profile(dataset.id);
        cardinality = Object.fromEntries(
          profile.columns.map((c) => [c.column, c.distinctCount]),
        );
      } catch {
        /* profiling is best-effort; heuristics still work without it */
      }
      const baseY = tiles.reduce((m, t) => Math.max(m, t.layout.y + t.layout.h), 0);
      const generated = buildAutoDashboard(dataset, { cardinality, baseY });
      addTiles(generated);
    } finally {
      setBuilding(false);
    }
  };

  /** The grid element that holds all tile rows (captured for image exports). */
  const captureNode = (): HTMLElement | null =>
    gridWrapRef.current?.querySelector<HTMLElement>('.react-grid-layout') ??
    gridWrapRef.current;

  const handleExportJson = () => {
    downloadText(
      exportJSON(),
      `${slugify(name, 'workbook')}.vantage.json`,
      'application/json',
    );
  };

  const handleExportPng = async () => {
    const node = captureNode();
    if (!node) return;
    setExporting(true);
    try {
      await downloadNodePng(node, name || 'dashboard');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    const node = captureNode();
    if (!node) return;
    setExporting(true);
    try {
      await downloadNodePdf(node, name || 'dashboard');
    } finally {
      setExporting(false);
    }
  };

  const handleExportReport = async () => {
    const node = captureNode();
    if (!node) return;
    const refs: CaptureTileRef[] = tiles.map((t) => ({
      id: t.id,
      title: t.title || getChart(t.type)?.name || 'Chart',
      w: t.layout.w,
    }));
    setExporting(true);
    try {
      await exportHtmlReport(node, refs, {
        title: name || 'Dashboard',
        subtitle: dataset?.name,
        generatedAt: new Date().toLocaleString(),
      });
    } finally {
      setExporting(false);
    }
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
        <span className="text-[11px] text-content-muted">
          {building ? 'Building…' : exporting ? 'Exporting…' : `${tileCount} tiles`}
        </span>

        <div className="ml-auto flex items-center gap-1.5 text-[12px]">
          <button
            onClick={handleAutoBuild}
            disabled={!dataset || building}
            title="Generate a starter dashboard from this dataset"
            className="rounded-md border border-accent2/60 bg-accent2/10 px-2.5 py-1.5 font-medium text-accent2 hover:bg-accent2/20 disabled:opacity-40"
          >
            ✨ Auto-build
          </button>
          <button
            onClick={handleAdd}
            disabled={!dataset}
            className="rounded-md bg-accent px-2.5 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            + Add chart
          </button>
          <ToolbarButton onClick={handleAddFilter} disabled={!dataset}>
            + Filter
          </ToolbarButton>
          <ToolbarButton onClick={undo} disabled={!canUndo}>
            <span title="Undo (⌘Z)">↶</span>
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo}>
            <span title="Redo (⌘⇧Z)">↷</span>
          </ToolbarButton>
          <ExportMenu disabled={!tileCount || exporting}>
            <ExportMenuItem onClick={handleExportPng}>Image (PNG)</ExportMenuItem>
            <ExportMenuItem onClick={handleExportPdf}>PDF</ExportMenuItem>
            <ExportMenuItem onClick={handleExportReport}>
              HTML report (self-contained)
            </ExportMenuItem>
            <ExportMenuItem onClick={handleExportJson}>
              Workbook (.json)
            </ExportMenuItem>
            <ExportMenuItem onClick={() => void navigator.clipboard?.writeText(embedUrl())}>
              Copy embed link
            </ExportMenuItem>
          </ExportMenu>
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
        <div
          ref={gridWrapRef}
          className="min-h-0 flex-1 rounded-lg border border-border-subtle bg-bg-base"
        >
          <DashboardGrid />
        </div>
      )}
    </div>
  );
}

function ExportMenu({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-md border border-border-subtle px-2.5 py-1.5 font-medium text-content-secondary hover:bg-bg-elevated hover:text-content-primary disabled:opacity-40"
      >
        Export ▾
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-md border border-border-strong bg-bg-elevated py-1 shadow-xl"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ExportMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-[12px] text-content-secondary hover:bg-bg-panel hover:text-content-primary"
    >
      {children}
    </button>
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
