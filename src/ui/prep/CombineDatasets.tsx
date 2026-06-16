/**
 * Combine datasets — a visual join/union builder. Lets the user merge two
 * imported datasets into a new derived dataset, with full transparency: the
 * exact SQL that will run is shown read-only before creation.
 */
import { useMemo, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import type { Dataset } from '@/model/types';
import { Modal } from '@/ui/components/Modal';
import { Select } from '@/ui/components/Select';
import { quoteIdent } from '@/query/sql';

type Mode = 'join' | 'union';
type JoinType = 'inner' | 'left';

function columnOptions(dataset: Dataset | undefined) {
  if (!dataset) return [];
  return dataset.fields.map((f) => ({ value: f.column, label: f.name }));
}

export function CombineDatasets() {
  const open = useUIStore((s) => s.combineOpen);
  const closeCombine = useUIStore((s) => s.closeCombine);
  const datasets = useAppStore((s) => s.datasets);

  const [mode, setMode] = useState<Mode>('join');
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [joinType, setJoinType] = useState<JoinType>('inner');
  const [leftKey, setLeftKey] = useState('');
  const [rightKey, setRightKey] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const left = datasets.find((d) => d.id === leftId);
  const right = datasets.find((d) => d.id === rightId);

  const defaultName =
    left && right ? `${left.name} + ${right.name}` : '';
  const effectiveName = nameTouched ? name : defaultName;

  const sql = useMemo(() => {
    if (!left || !right) return '';
    const lt = quoteIdent(left.table);
    const rt = quoteIdent(right.table);
    if (mode === 'union') {
      return `SELECT * FROM ${lt} UNION ALL BY NAME SELECT * FROM ${rt}`;
    }
    if (!leftKey || !rightKey) return '';
    const kind = joinType === 'inner' ? 'INNER' : 'LEFT';
    return `SELECT l.*, r.* FROM ${lt} AS l ${kind} JOIN ${rt} AS r ON l.${quoteIdent(
      leftKey,
    )} = r.${quoteIdent(rightKey)}`;
  }, [left, right, mode, joinType, leftKey, rightKey]);

  if (!open) return null;

  const datasetOptions = datasets.map((d) => ({ value: d.id, label: d.name }));

  const valid =
    !!left &&
    !!right &&
    effectiveName.trim().length > 0 &&
    !!sql &&
    (mode === 'union' || (!!leftKey && !!rightKey));

  const onCreate = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await useAppStore.getState().createDerivedDataset(effectiveName.trim(), sql);
      closeCombine();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Combine datasets" onClose={closeCombine} width="max-w-2xl">
      {datasets.length < 2 ? (
        <p className="text-[13px] text-content-muted">
          Import at least two datasets to combine.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="inline-flex items-center rounded-lg border border-border-subtle bg-bg-inset p-0.5 text-xs">
            {(['join', 'union'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                  mode === m
                    ? 'bg-accent text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Left dataset"
              value={leftId}
              onChange={setLeftId}
              options={datasetOptions}
              allowEmpty
              placeholder="Choose dataset…"
            />
            <Select
              label="Right dataset"
              value={rightId}
              onChange={setRightId}
              options={datasetOptions}
              allowEmpty
              placeholder="Choose dataset…"
            />
          </div>

          {mode === 'join' && (
            <div className="space-y-3 border-t border-border-subtle pt-3">
              <Select
                label="Join type"
                value={joinType}
                onChange={(v) => setJoinType(v as JoinType)}
                options={[
                  { value: 'inner', label: 'Inner' },
                  { value: 'left', label: 'Left' },
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Left key column"
                  value={leftKey}
                  onChange={setLeftKey}
                  options={columnOptions(left)}
                  allowEmpty
                  placeholder="Choose column…"
                />
                <Select
                  label="Right key column"
                  value={rightKey}
                  onChange={setRightKey}
                  options={columnOptions(right)}
                  allowEmpty
                  placeholder="Choose column…"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-content-muted">
              Result name
            </label>
            <input
              value={effectiveName}
              placeholder="Combined dataset"
              onChange={(e) => {
                setNameTouched(true);
                setName(e.target.value);
              }}
              className="w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-primary outline-none focus:border-accent"
            />
          </div>

          {sql && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Generated SQL
              </div>
              <pre className="overflow-auto rounded bg-bg-base p-3 font-mono text-[12px] text-content-secondary">
                {sql}
              </pre>
            </div>
          )}

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex justify-end border-t border-border-subtle pt-3">
            <button
              onClick={onCreate}
              disabled={!valid || busy}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create dataset'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
