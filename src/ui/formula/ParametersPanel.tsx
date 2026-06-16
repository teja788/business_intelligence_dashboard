/**
 * What-if parameters (§7C): a slider/input whose value feeds formulas, so users
 * can model scenarios live. Changing a parameter re-runs every dependent chart.
 */
import { useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { uid } from '@/model/factory';

export function ParametersPanel() {
  const parameters = useDashboardStore((s) => s.workbook.parameters);
  const setParameter = useDashboardStore((s) => s.setParameter);
  const setParameterValue = useDashboardStore((s) => s.setParameterValue);
  const removeParameter = useDashboardStore((s) => s.removeParameter);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', value: '1', min: '0', max: '10', step: '0.1' });

  const create = () => {
    if (!draft.name.trim()) return;
    setParameter({
      id: uid('param'),
      name: draft.name.trim(),
      type: 'number',
      value: Number(draft.value) || 0,
      min: Number(draft.min),
      max: Number(draft.max),
      step: Number(draft.step) || 1,
    });
    setDraft({ name: '', value: '1', min: '0', max: '10', step: '0.1' });
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      {parameters.map((p) => (
        <div key={p.id} className="rounded-md border border-border-subtle bg-bg-inset p-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-content-primary">{p.name}</span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] tabular-nums text-accent2">{String(p.value)}</span>
              <button
                onClick={() => removeParameter(p.id)}
                className="text-[11px] text-content-muted hover:text-red-400"
              >
                ×
              </button>
            </span>
          </div>
          <input
            type="range"
            min={p.min ?? 0}
            max={p.max ?? 100}
            step={p.step ?? 1}
            value={Number(p.value)}
            onChange={(e) => setParameterValue(p.id, Number(e.target.value))}
            className="mt-1 w-full accent-accent"
          />
        </div>
      ))}

      {adding ? (
        <div className="space-y-1.5 rounded-md border border-border-subtle bg-bg-inset p-2">
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Parameter name"
            className="w-full rounded border border-border-subtle bg-bg-base px-2 py-1 text-[12px] text-content-primary outline-none focus:border-accent"
          />
          <div className="grid grid-cols-3 gap-1">
            {(['min', 'max', 'step'] as const).map((k) => (
              <input
                key={k}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                placeholder={k}
                className="w-full rounded border border-border-subtle bg-bg-base px-1.5 py-1 text-[11px] text-content-primary outline-none focus:border-accent"
              />
            ))}
          </div>
          <div className="flex justify-end gap-1">
            <button onClick={() => setAdding(false)} className="rounded px-2 py-1 text-[11px] text-content-muted hover:bg-bg-elevated">
              Cancel
            </button>
            <button onClick={create} className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-white hover:opacity-90">
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-md border border-dashed border-border-subtle py-1.5 text-[11px] text-content-secondary hover:border-accent hover:text-content-primary"
        >
          + Parameter
        </button>
      )}
    </div>
  );
}
