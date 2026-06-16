/**
 * Persistent selections bar (§7A): active selections as removable chips, with
 * back/forward through selection history and clear-all. This is the navigable
 * trail that directly addresses the "follow-up problem".
 */
import { useAppStore } from '@/store/appStore';
import { useSelectionStore } from '@/store/selectionStore';

function useFieldName() {
  const datasets = useAppStore((s) => s.datasets);
  return (fieldId: string) => {
    for (const d of datasets) {
      const f = d.fields.find((x) => x.id === fieldId);
      if (f) return f.name;
    }
    return fieldId.split('::').pop() ?? fieldId;
  };
}

export function SelectionsBar() {
  const selection = useSelectionStore((s) => s.selection);
  const clearField = useSelectionStore((s) => s.clearField);
  const removeFilter = useSelectionStore((s) => s.removeFilter);
  const clearAll = useSelectionStore((s) => s.clearAll);
  const back = useSelectionStore((s) => s.back);
  const forward = useSelectionStore((s) => s.forward);
  const canBack = useSelectionStore((s) => s.canBack());
  const canForward = useSelectionStore((s) => s.canForward());
  const fieldName = useFieldName();

  const hasAny =
    selection.selections.length > 0 || selection.filters.length > 0;

  return (
    <div className="ml-2 flex h-7 flex-1 items-center gap-1.5 overflow-hidden">
      <div className="flex items-center">
        <HistoryButton disabled={!canBack} onClick={back} title="Back">
          ←
        </HistoryButton>
        <HistoryButton disabled={!canForward} onClick={forward} title="Forward">
          →
        </HistoryButton>
      </div>

      <div className="v-scroll flex flex-1 items-center gap-1.5 overflow-x-auto">
        {!hasAny && (
          <span className="text-[11px] text-content-muted">
            No selections — click any mark or filter a field to explore
          </span>
        )}

        {selection.selections.map((sel) => (
          <Chip
            key={sel.field}
            onRemove={() => clearField(sel.field)}
            tone="selected"
          >
            <b className="font-medium">{fieldName(sel.field)}</b>
            <span className="opacity-70">
              {sel.values.length === 1
                ? ` = ${String(sel.values[0])}`
                : ` ∈ ${sel.values.length}`}
            </span>
          </Chip>
        ))}

        {selection.filters.map((f, i) => (
          <Chip key={i} onRemove={() => removeFilter(i)} tone="excluded">
            <b className="font-medium">{fieldName(f.field)}</b>
            <span className="opacity-70"> {f.op} {(f.values ?? []).map(String).join(', ')}</span>
          </Chip>
        ))}
      </div>

      {hasAny && (
        <button
          onClick={clearAll}
          className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-content-muted hover:bg-bg-elevated hover:text-content-primary"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function HistoryButton({
  children,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-6 w-6 place-items-center rounded text-content-muted hover:bg-bg-elevated hover:text-content-primary disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Chip({
  children,
  onRemove,
  tone,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  tone: 'selected' | 'excluded';
}) {
  const color =
    tone === 'selected'
      ? 'border-assoc-selected/40 bg-assoc-selected/10 text-assoc-selected'
      : 'border-border-strong bg-bg-inset text-content-secondary';
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${color}`}
    >
      <span className="max-w-[180px] truncate">{children}</span>
      <button onClick={onRemove} className="opacity-70 hover:opacity-100">
        ×
      </button>
    </span>
  );
}
