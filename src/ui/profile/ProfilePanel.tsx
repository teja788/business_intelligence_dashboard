/**
 * Dataset profile panel (§8): per-column type, null %, distinct count, range,
 * and a distribution sparkline. Surfaces data understanding/trust on import.
 */
import type { ColumnProfile } from '@/model/types';
import { useProfile } from '@/ui/hooks/useProfile';
import { Sparkline } from '@/ui/components/Sparkline';

function pct(n: number): string {
  return `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 0)}%`;
}

function ColumnCard({ col }: { col: ColumnProfile }) {
  const isNumeric = col.type === 'number' || col.type === 'integer';
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-inset p-2.5">
      <div className="flex items-center justify-between">
        <span className="truncate text-[13px] text-content-primary">
          {col.column}
        </span>
        <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-content-muted">
          {col.type}
        </span>
      </div>

      <div className="mt-1.5 flex gap-3 text-[11px] text-content-muted">
        <span title="distinct values">{col.distinctCount.toLocaleString()} distinct</span>
        <span title="null fraction">{pct(col.nullFraction)} null</span>
      </div>

      {isNumeric && col.min != null && (
        <div className="mt-1 text-[11px] text-content-secondary">
          {Number(col.min).toLocaleString()} – {Number(col.max).toLocaleString()}
          {col.mean != null && (
            <span className="text-content-muted">
              {' '}
              · μ {Number(col.mean).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}
            </span>
          )}
        </div>
      )}

      {col.histogram && col.histogram.length > 0 && (
        <div className="mt-2">
          <Sparkline values={col.histogram.map((h) => h.count)} width={220} />
        </div>
      )}

      {col.examples && col.examples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {col.examples.slice(0, 5).map((e, i) => (
            <span
              key={i}
              className="truncate rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-content-secondary"
              title={`${String(e.value)} · ${e.count}`}
            >
              {e.value === null ? '∅' : String(e.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfilePanel({ datasetId }: { datasetId: string }) {
  const { profile, loading, error } = useProfile(datasetId);

  if (loading)
    return <p className="px-1 py-2 text-[12px] text-content-muted">Profiling…</p>;
  if (error)
    return <p className="px-1 py-2 text-[12px] text-red-400">{error}</p>;
  if (!profile) return null;

  return (
    <div className="space-y-2">
      {profile.columns.map((c) => (
        <ColumnCard key={c.column} col={c} />
      ))}
    </div>
  );
}
