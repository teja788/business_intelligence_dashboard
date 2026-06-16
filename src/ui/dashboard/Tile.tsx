/**
 * A dashboard tile: header (title, drag handle, menu) + chart body. The body
 * renders through ChartView, so every chart type — ECharts or React — flows
 * through the identical plugin path.
 */
import { useMemo, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useUIStore } from '@/store/uiStore';
import { useSelectionStore, selectionFiltersFor } from '@/store/selectionStore';
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';
import type { ChartTile } from '@/model/types';
import { ChartView, type FieldValueSelection } from '@/charts/ChartView';
import { getChart } from '@/charts/registry';

export function Tile({ tile }: { tile: ChartTile }) {
  const dataset = useEffectiveDataset(tile.query.datasetId);
  const selectTile = useDashboardStore((s) => s.selectTile);
  const removeTile = useDashboardStore((s) => s.removeTile);
  const duplicateTile = useDashboardStore((s) => s.duplicateTile);
  const selectedId = useDashboardStore((s) => s.selectedTileId);
  const inspectTile = useUIStore((s) => s.inspectTile);
  const selection = useSelectionStore((s) => s.selection);
  const toggleValue = useSelectionStore((s) => s.toggleValue);
  const [menuOpen, setMenuOpen] = useState(false);

  const renderer = getChart(tile.type);
  const selected = selectedId === tile.id;

  // Apply the global associative selection to this tile's query.
  const filters = useMemo(
    () => selectionFiltersFor(selection, tile.query.datasetId),
    [selection, tile.query.datasetId],
  );

  const handleSelect = (sels: FieldValueSelection[]) => {
    for (const s of sels) toggleValue(s.fieldId, s.value);
  };

  return (
    <div
      onMouseDown={() => selectTile(tile.id)}
      className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-bg-panel ${
        selected ? 'border-accent' : 'border-border-subtle'
      }`}
    >
      <div className="tile-handle flex h-8 shrink-0 cursor-move items-center gap-2 border-b border-border-subtle px-2.5">
        <span className="text-content-muted">{renderer?.icon}</span>
        <span className="truncate text-[12px] font-medium text-content-primary">
          {tile.title || renderer?.name || 'Chart'}
        </span>
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
              <MenuItem onClick={() => { inspectTile(tile.id); setMenuOpen(false); }}>
                View SQL / rows
              </MenuItem>
              <MenuItem danger onClick={() => { removeTile(tile.id); setMenuOpen(false); }}>
                Delete
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-2">
        {!dataset ? (
          <div className="grid h-full place-items-center text-[12px] text-content-muted">
            Dataset unavailable
          </div>
        ) : (
          <ChartView
            dataset={dataset}
            type={tile.type}
            encoding={tile.encoding}
            options={tile.options}
            filters={filters}
            onSelect={handleSelect}
          />
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
