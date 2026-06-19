/**
 * A dashboard tile: header (title, drag handle, menu) + chart body. The body
 * renders through ChartView, so every chart type — ECharts or React — flows
 * through the identical plugin path.
 */
import { useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useUIStore } from '@/store/uiStore';
import { useSelectionStore, selectionFiltersFor } from '@/store/selectionStore';
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';
import type { ChartTile } from '@/model/types';
import { ChartView, type FieldValueSelection } from '@/charts/ChartView';
import { getChart } from '@/charts/registry';
import { getTileSQL } from '@/charts/tileSql';
import { downloadNodePng } from '@/export/image';
import { exportSqlToCsv } from '@/export/csv';
import { FilterControlTile } from './FilterControlTile';
import { FilterIcon } from '@/ui/components/icons';
import {
  canDrillDeeper,
  currentDrillField,
  drillFilters,
  type DrillStep,
} from '@/charts/drill';
import { useDrillStore } from '@/store/drillStore';

const EMPTY_PATH: DrillStep[] = [];

export function Tile({ tile, readOnly = false }: { tile: ChartTile; readOnly?: boolean }) {
  const dataset = useEffectiveDataset(tile.query.datasetId);
  const selectTile = useDashboardStore((s) => s.selectTile);
  const removeTile = useDashboardStore((s) => s.removeTile);
  const duplicateTile = useDashboardStore((s) => s.duplicateTile);
  const selectedId = useDashboardStore((s) => s.selectedTileId);
  const parameters = useDashboardStore((s) => s.workbook.parameters);
  const inspectTile = useUIStore((s) => s.inspectTile);
  const selection = useSelectionStore((s) => s.selection);
  const toggleValue = useSelectionStore((s) => s.toggleValue);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isControl = tile.type === 'control';
  const renderer = getChart(tile.type);
  const selected = selectedId === tile.id;
  const tileName = tile.title || (isControl ? 'Filter' : renderer?.name) || 'chart';
  const headerIcon = isControl ? <FilterIcon /> : renderer?.icon;

  // Apply the global associative selection to this tile's query.
  const filters = useMemo(
    () => selectionFiltersFor(selection, tile.query.datasetId),
    [selection, tile.query.datasetId],
  );

  // Drill-down: an optional ordered hierarchy of dimensions. While drilling, the
  // tile re-groups by the current level and pins ancestor values as filters.
  const drillFields = useMemo(
    () => (Array.isArray(tile.options.drillFields) ? (tile.options.drillFields as string[]) : []),
    [tile.options.drillFields],
  );
  const drillPath = useDrillStore((s) => s.paths[tile.id]) ?? EMPTY_PATH;
  const pushDrill = useDrillStore((s) => s.push);
  const popDrill = useDrillStore((s) => s.popTo);
  const drilling = !isControl && drillFields.length > 1;
  const drillField = drilling ? currentDrillField(drillFields, drillPath) : undefined;

  const effectiveEncoding = useMemo(
    () => (drillField ? { ...tile.encoding, x: [drillField] } : tile.encoding),
    [drillField, tile.encoding],
  );
  const effectiveFilters = useMemo(
    () => (drilling ? [...filters, ...drillFilters(drillPath)] : filters),
    [drilling, filters, drillPath],
  );

  const handleSelect = (sels: FieldValueSelection[]) => {
    // While a hierarchy is active and deeper levels remain, a click drills
    // instead of cross-filtering.
    if (drillField && canDrillDeeper(drillFields, drillPath)) {
      const hit = sels.find((s) => s.fieldId === drillField);
      if (hit) {
        pushDrill(tile.id, drillField, hit.value);
        return;
      }
    }
    for (const s of sels) toggleValue(s.fieldId, s.value);
  };

  const handleExportPng = () => {
    setMenuOpen(false);
    if (rootRef.current) void downloadNodePng(rootRef.current, tileName);
  };

  const handleExportCsv = () => {
    setMenuOpen(false);
    if (!dataset) return;
    const sql = getTileSQL(dataset, tile.encoding, tile.options, filters, parameters);
    void exportSqlToCsv(sql, tileName);
  };

  return (
    <div
      ref={rootRef}
      data-tile-id={tile.id}
      onMouseDown={() => selectTile(tile.id)}
      className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-bg-panel ${
        selected ? 'border-accent' : 'border-border-subtle'
      }`}
    >
      <div
        className={`flex h-8 shrink-0 items-center gap-2 border-b border-border-subtle px-2.5 ${
          readOnly ? '' : 'tile-handle cursor-move'
        }`}
      >
        <span className="text-content-muted">{headerIcon}</span>
        <span className="truncate text-[12px] font-medium text-content-primary">
          {tileName}
        </span>
        {!readOnly && (
        <div className="relative ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded px-1.5 text-content-muted hover:bg-bg-elevated hover:text-content-primary"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-md border border-border-strong bg-bg-elevated py-1 text-[12px] shadow-xl"
            >
              <MenuItem onClick={() => { selectTile(tile.id); setMenuOpen(false); }}>
                Edit
              </MenuItem>
              <MenuItem onClick={() => { duplicateTile(tile.id); setMenuOpen(false); }}>
                Duplicate
              </MenuItem>
              {!isControl && (
                <MenuItem onClick={() => { inspectTile(tile.id); setMenuOpen(false); }}>
                  View SQL / rows
                </MenuItem>
              )}
              <MenuItem onClick={handleExportPng}>Export PNG</MenuItem>
              {!isControl && (
                <MenuItem onClick={handleExportCsv}>Export data (CSV)</MenuItem>
              )}
              <MenuItem danger onClick={() => { removeTile(tile.id); setMenuOpen(false); }}>
                Delete
              </MenuItem>
            </div>
          )}
        </div>
        )}
      </div>

      <div className="min-h-0 flex-1 p-2">
        {isControl ? (
          <FilterControlTile tile={tile} />
        ) : !dataset ? (
          <div className="grid h-full place-items-center text-[12px] text-content-muted">
            Dataset unavailable
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {drilling && drillPath.length > 0 && (
              <div className="mb-1 flex flex-wrap items-center gap-1 px-0.5 text-[11px] text-content-muted">
                <button
                  onClick={() => popDrill(tile.id, 0)}
                  className="hover:text-content-primary"
                >
                  All
                </button>
                {drillPath.map((step, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span>›</span>
                    <button
                      onClick={() => popDrill(tile.id, i + 1)}
                      className="hover:text-content-primary"
                    >
                      {step.value === null ? '∅' : String(step.value)}
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ChartView
                dataset={dataset}
                type={tile.type}
                encoding={effectiveEncoding}
                options={tile.options}
                filters={effectiveFilters}
                onSelect={handleSelect}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left hover:bg-bg-panel ${
        danger ? 'text-red-400' : 'text-content-secondary'
      }`}
    >
      {children}
    </button>
  );
}
