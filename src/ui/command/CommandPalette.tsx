/**
 * Command palette (⌘/Ctrl-K, §11). Fast access to every major action. Includes
 * a present-but-disabled "Ask a question…" entry that reserves the AI seam
 * (§10) without building it in v1.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useUIStore } from '@/store/uiStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSelectionStore } from '@/store/selectionStore';
import { suggestCharts } from '@/charts/registry';

interface Command {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  run?: () => void;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const openSqlLab = useUIStore((s) => s.openSqlLab);
  const openCombine = useUIStore((s) => s.openCombine);
  const openFormula = useUIStore((s) => s.openFormula);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const datasets = useAppStore((s) => s.datasets);
  const activeId = useAppStore((s) => s.activeDatasetId);
  const setActiveDataset = useAppStore((s) => s.setActiveDataset);
  const toggleMode = useAppStore((s) => s.toggleMode);
  const addTile = useDashboardStore((s) => s.addTile);
  const clearAll = useSelectionStore((s) => s.clearAll);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const active = datasets.find((d) => d.id === activeId);
    const list: Command[] = [];
    if (active) {
      list.push({
        id: 'add-chart',
        label: 'Add chart',
        hint: 'Dashboard',
        run: () => {
          const dim = active.fields.find((f) => f.role === 'dimension');
          const measure = active.fields.find((f) => f.role === 'measure');
          const best = suggestCharts({
            dimensionCount: dim ? 1 : 0,
            measureCount: measure ? 1 : 0,
            firstDimensionType: dim?.type,
          })[0];
          addTile({
            datasetId: active.id,
            type: best?.id ?? 'bar',
            encoding: { x: dim ? [dim.id] : [], y: measure ? [measure.id] : [] },
          });
        },
      });
      list.push({ id: 'calc', label: 'New calculated field…', run: openFormula });
    }
    list.push({ id: 'sql', label: 'Open SQL Lab', hint: 'Advanced', run: () => openSqlLab() });
    list.push({ id: 'combine', label: 'Combine datasets (join / union)…', run: openCombine });
    list.push({ id: 'mode', label: 'Toggle Simple / Advanced mode', run: toggleMode });
    list.push({ id: 'theme', label: 'Toggle dark / light theme', run: toggleTheme });
    list.push({ id: 'clear', label: 'Clear all selections', run: clearAll });
    for (const d of datasets) {
      if (d.id !== activeId)
        list.push({ id: `ds-${d.id}`, label: `Switch to dataset: ${d.name}`, run: () => setActiveDataset(d.id) });
    }
    list.push({ id: 'ai', label: 'Ask a question…', hint: 'Coming soon', disabled: true });
    return list;
  }, [datasets, activeId, addTile, openFormula, openSqlLab, openCombine, toggleMode, toggleTheme, clearAll, setActiveDataset]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = filtered[i];
    if (cmd && !cmd.disabled && cmd.run) {
      cmd.run();
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/50 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-strong bg-bg-panel shadow-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); runAt(active); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Type a command…"
          className="w-full border-b border-border-subtle bg-transparent px-4 py-3 text-sm text-content-primary outline-none"
        />
        <div className="v-scroll max-h-80 overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-content-muted">No matching commands</div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              disabled={c.disabled}
              onMouseEnter={() => setActive(i)}
              onClick={() => runAt(i)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                i === active && !c.disabled ? 'bg-accent/15 text-content-primary' : 'text-content-secondary'
              } ${c.disabled ? 'opacity-40' : ''}`}
            >
              <span>{c.label}</span>
              {c.hint && <span className="text-[11px] text-content-muted">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
