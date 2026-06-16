/**
 * Calculated-field editor (§7C): formula input with a function reference
 * (signatures + inline docs), field/parameter insertion, and live validation
 * that tells the user whether they're creating a MEASURE (aggregate) or a
 * row-level DIMENSION — the aggregation-semantics clarity incumbents lack.
 */
import { useMemo, useRef, useState } from 'react';
import type { Dataset } from '@/model/types';
import { Modal } from '@/ui/components/Modal';
import { useDashboardStore } from '@/store/dashboardStore';
import { listFunctions, validateFormula } from '@/formula';
import { buildCalculatedField } from '@/formula/createField';

export function FormulaEditor({
  dataset,
  onClose,
}: {
  dataset: Dataset;
  onClose: () => void;
}) {
  const addCalculatedField = useDashboardStore((s) => s.addCalculatedField);
  const parameters = useDashboardStore((s) => s.workbook.parameters);
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [saveError, setSaveError] = useState<string>();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const knownFields = useMemo(
    () => new Set(dataset.fields.map((f) => f.name)),
    [dataset],
  );
  const validation = useMemo(
    () => validateFormula(formula, knownFields),
    [formula, knownFields],
  );

  const insert = (text: string) => {
    const ta = taRef.current;
    if (!ta) {
      setFormula((f) => f + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = formula.slice(0, start) + text + formula.slice(end);
    setFormula(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  };

  const handleSave = () => {
    setSaveError(undefined);
    if (!name.trim()) {
      setSaveError('Give the field a name.');
      return;
    }
    try {
      const field = buildCalculatedField({ dataset, name: name.trim(), formula });
      addCalculatedField(field);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const dims = dataset.fields.filter((f) => f.role === 'dimension');
  const measures = dataset.fields.filter((f) => f.role === 'measure');

  return (
    <Modal title="New calculated field" onClose={onClose} width="max-w-3xl">
      <div className="grid grid-cols-[1fr_220px] gap-4">
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Field name (e.g. Profit Ratio)"
            className="w-full rounded-md border border-border-subtle bg-bg-inset px-2.5 py-2 text-[13px] text-content-primary outline-none focus:border-accent"
          />
          <textarea
            ref={taRef}
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder={'e.g.  SUM([Profit]) / SUM([Sales])\n      RUNNING_SUM(SUM([Sales]))\n      [Sales] * $GrowthRate'}
            rows={6}
            spellCheck={false}
            className="w-full rounded-md border border-border-subtle bg-bg-base px-2.5 py-2 font-mono text-[13px] text-content-primary outline-none focus:border-accent"
          />

          <div className="flex items-center gap-2 text-[12px]">
            {!formula.trim() ? (
              <span className="text-content-muted">Enter a formula…</span>
            ) : validation.ok ? (
              <>
                <span className="rounded bg-assoc-selected/15 px-2 py-0.5 text-assoc-selected">
                  ✓ Valid
                </span>
                <span className="rounded bg-bg-inset px-2 py-0.5 text-content-secondary">
                  {validation.isAggregate ? 'Measure (aggregate)' : 'Dimension (row-level)'}
                </span>
              </>
            ) : (
              <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-400">
                {validation.error}
              </span>
            )}
          </div>

          {saveError && <p className="text-[12px] text-red-400">{saveError}</p>}

          <div className="space-y-2">
            <ChipRow label="Fields" items={dims.concat(measures).map((f) => f.name)} onPick={(n) => insert(`[${n}]`)} />
            {parameters.length > 0 && (
              <ChipRow label="Parameters" items={parameters.map((p) => p.name)} onPick={(n) => insert(`$[${n}]`)} accent />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-[12px] text-content-secondary hover:bg-bg-elevated">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!validation.ok || !name.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Create field
            </button>
          </div>
        </div>

        <FunctionReference onInsert={insert} />
      </div>
    </Modal>
  );
}

function ChipRow({
  label,
  items,
  onPick,
  accent,
}: {
  label: string;
  items: string[];
  onPick: (item: string) => void;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <button
            key={i}
            onClick={() => onPick(i)}
            className={`rounded px-1.5 py-0.5 text-[11px] ${
              accent
                ? 'bg-accent2/15 text-accent2 hover:bg-accent2/25'
                : 'bg-bg-inset text-content-secondary hover:bg-bg-elevated'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

function FunctionReference({ onInsert }: { onInsert: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const fns = useMemo(() => listFunctions(), []);
  const filtered = query
    ? fns.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    : fns;

  return (
    <div className="flex min-h-0 flex-col rounded-md border border-border-subtle bg-bg-inset">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search functions…"
        className="border-b border-border-subtle bg-transparent px-2.5 py-1.5 text-[12px] text-content-primary outline-none"
      />
      <div className="v-scroll max-h-80 overflow-auto p-1">
        {filtered.map((f) => (
          <button
            key={f.name}
            onClick={() => onInsert(`${f.name}(`)}
            title={f.docs}
            className="block w-full rounded px-2 py-1 text-left hover:bg-bg-elevated"
          >
            <div className="font-mono text-[11px] text-accent">{f.signature}</div>
            <div className="text-[10px] text-content-muted">{f.docs}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
