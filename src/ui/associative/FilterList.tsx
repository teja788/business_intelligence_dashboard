/**
 * Associative filter list (the Qlik green/white/grey, §7A). Each value is
 * colored by state: selected (green), possible (normal), excluded (grey) —
 * excluded values are SHOWN, not hidden; revealing what's been excluded is the
 * insight. Clicking toggles the value into the global selection.
 */
import { useState } from 'react';
import type { ValueState } from '@/model/types';
import { useAssociation } from '@/ui/hooks/useAssociation';
import { useSelectionStore } from '@/store/selectionStore';

function rowClass(state: ValueState['state']): string {
  switch (state) {
    case 'selected':
      return 'bg-assoc-selected/15 text-assoc-selected';
    case 'excluded':
      return 'text-assoc-excluded line-through decoration-assoc-excluded/50';
    default:
      return 'text-content-secondary hover:bg-bg-elevated';
  }
}

export function FilterList({ fieldId }: { fieldId: string }) {
  const { values, loading } = useAssociation(fieldId);
  const toggleValue = useSelectionStore((s) => s.toggleValue);
  const keepOnly = useSelectionStore((s) => s.keepOnly);
  const exclude = useSelectionStore((s) => s.exclude);
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = query
    ? values.filter((v) => String(v.value ?? '').toLowerCase().includes(query.toLowerCase()))
    : values;

  return (
    <div className="rounded-md border border-border-subtle bg-bg-inset p-1.5">
      {values.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search values…"
          className="mb-1 w-full rounded border border-border-subtle bg-bg-base px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent"
        />
      )}
      <div className="v-scroll max-h-52 overflow-auto">
        {loading && values.length === 0 ? (
          <div className="px-2 py-1.5 text-[11px] text-content-muted">Loading…</div>
        ) : (
          filtered.map((v) => {
            const key = String(v.value);
            return (
              <div
                key={key}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover((h) => (h === key ? null : h))}
                onClick={() => toggleValue(fieldId, v.value)}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-[12px] ${rowClass(v.state)}`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    v.state === 'selected'
                      ? 'bg-assoc-selected'
                      : v.state === 'excluded'
                        ? 'bg-assoc-excluded'
                        : 'bg-content-muted'
                  }`}
                />
                <span className="flex-1 truncate">
                  {v.value === null ? '∅ null' : key}
                </span>
                {hover === key ? (
                  <span className="flex items-center gap-1 text-[10px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); keepOnly(fieldId, v.value); }}
                      className="rounded bg-bg-elevated px-1 text-content-secondary hover:text-content-primary"
                      title="Keep only"
                    >
                      only
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); exclude(fieldId, v.value); }}
                      className="rounded bg-bg-elevated px-1 text-content-secondary hover:text-red-400"
                      title="Exclude"
                    >
                      excl
                    </button>
                  </span>
                ) : (
                  <span className="text-[10px] tabular-nums text-content-muted">
                    {v.count?.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
