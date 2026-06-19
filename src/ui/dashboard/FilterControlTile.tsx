/**
 * A dashboard filter-control tile: a persistent, first-class filter placed on
 * the canvas. It embeds the associative FilterList, so picking values writes
 * into the SAME global selection that click-to-cross-filter uses — every other
 * tile re-queries automatically. No new filtering engine; just a new surface.
 */
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';
import { FilterList } from '@/ui/associative/FilterList';
import { useSelectionStore } from '@/store/selectionStore';
import type { ChartTile } from '@/model/types';

export function FilterControlTile({ tile }: { tile: ChartTile }) {
  const dataset = useEffectiveDataset(tile.query.datasetId);
  const fieldId = tile.options.controlField as string | undefined;
  const field = dataset?.fields.find((f) => f.id === fieldId);
  const selection = useSelectionStore((s) => s.selection);
  const clearField = useSelectionStore((s) => s.clearField);

  if (!dataset) {
    return (
      <div className="grid h-full place-items-center text-[12px] text-content-muted">
        Dataset unavailable
      </div>
    );
  }

  if (!field) {
    return (
      <div className="grid h-full place-items-center px-3 text-center text-[12px] text-content-muted">
        Pick a field to filter on in the editor (tile menu → Edit).
      </div>
    );
  }

  const active = selection.selections.find((s) => s.field === field.id);
  const activeCount = active?.values.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex items-center gap-2 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
          {field.name}
        </span>
        {activeCount > 0 && (
          <button
            onClick={() => clearField(field.id)}
            className="ml-auto rounded px-1 text-[10px] text-accent hover:bg-bg-elevated"
          >
            clear ({activeCount})
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <FilterList fieldId={field.id} />
      </div>
    </div>
  );
}
