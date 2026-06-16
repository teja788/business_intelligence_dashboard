/**
 * Per-tile config panel (§7B). Title, chart-type switcher (auto-suggested for
 * the current fields, plus the full catalog), field shelves, and chart-specific
 * options. Simple mode shows the essentials; Advanced reveals size + raw options.
 */
import { useAppStore } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';
import type { ChartTile, Dataset, Encoding } from '@/model/types';
import { Select } from '@/ui/components/Select';
import { listCharts, suggestCharts } from '@/charts/registry';

function fieldOptions(dataset: Dataset, role: 'dimension' | 'measure') {
  return dataset.fields
    .filter((f) => f.role === role)
    .map((f) => ({ value: f.id, label: f.name }));
}

export function TileEditor({ tile }: { tile: ChartTile }) {
  const dataset = useEffectiveDataset(tile.query.datasetId);
  const mode = useAppStore((s) => s.mode);
  const updateTile = useDashboardStore((s) => s.updateTile);
  const updateTileOptions = useDashboardStore((s) => s.updateTileOptions);

  if (!dataset) return <p className="px-1 text-[12px] text-content-muted">Dataset unavailable.</p>;

  const enc = tile.encoding;
  const setEnc = (patch: Partial<Encoding>) =>
    updateTile(tile.id, { encoding: { ...enc, ...patch } });

  const dims = fieldOptions(dataset, 'dimension');
  const measures = fieldOptions(dataset, 'measure');
  const xField = dataset.fields.find((f) => f.id === enc.x?.[0]);

  const suggestions = suggestCharts({
    dimensionCount: (enc.x?.length ? 1 : 0) + (enc.color ? 1 : 0),
    measureCount: enc.y?.length ?? 0,
    firstDimensionType: xField?.type,
  });
  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const others = listCharts().filter((c) => !suggestedIds.has(c.id));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          Title
        </label>
        <input
          value={tile.title ?? ''}
          placeholder="Chart title"
          onChange={(e) => updateTile(tile.id, { title: e.target.value })}
          className="w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-primary outline-none focus:border-accent"
        />
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          Chart type
        </div>
        <div className="flex flex-wrap gap-1">
          {[...suggestions, ...others].map((c) => (
            <button
              key={c.id}
              title={c.name + (suggestedIds.has(c.id) ? ' · suggested' : '')}
              onClick={() => updateTile(tile.id, { type: c.id })}
              className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
                tile.type === c.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : suggestedIds.has(c.id)
                    ? 'border-border-strong text-content-secondary hover:bg-bg-elevated'
                    : 'border-border-subtle text-content-muted hover:bg-bg-elevated'
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border-subtle pt-3">
        <Select
          label="X / Category"
          value={enc.x?.[0] ?? ''}
          onChange={(v) => setEnc({ x: v ? [v] : [] })}
          options={dims}
          allowEmpty
        />

        <MeasureShelf
          label="Y / Measures"
          values={enc.y ?? []}
          options={measures}
          onChange={(y) => setEnc({ y })}
        />

        <Select
          label="Color / Split"
          value={enc.color ?? ''}
          onChange={(v) => setEnc({ color: v || undefined })}
          options={dims.filter((d) => d.value !== enc.x?.[0])}
          allowEmpty
        />

        {mode === 'advanced' && (
          <Select
            label="Size (bubble)"
            value={enc.size ?? ''}
            onChange={(v) => setEnc({ size: v || undefined })}
            options={measures}
            allowEmpty
          />
        )}

        {xField && <BinControl tile={tile} field={xField} />}
      </div>

      <ChartOptions tile={tile} onChange={(o) => updateTileOptions(tile.id, o)} advanced={mode === 'advanced'} />
    </div>
  );
}

function BinControl({ tile, field }: { tile: ChartTile; field: { id: string; type: string } }) {
  const updateTileOptions = useDashboardStore((s) => s.updateTileOptions);
  const transforms = (tile.options.transforms ?? {}) as Record<
    string,
    { bin?: { size: number }; dateTrunc?: string }
  >;
  const current = transforms[field.id] ?? {};
  const setTransform = (t: { bin?: { size: number }; dateTrunc?: string } | undefined) => {
    const next = { ...transforms };
    if (t && (t.bin || t.dateTrunc)) next[field.id] = t;
    else delete next[field.id];
    updateTileOptions(tile.id, { transforms: next });
  };

  if (field.type === 'number' || field.type === 'integer') {
    return (
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          Bin size (group {field.id.split('::').pop()})
        </span>
        <input
          type="number"
          min={0}
          value={current.bin?.size ?? ''}
          placeholder="No binning"
          onChange={(e) => {
            const size = Number(e.target.value);
            setTransform(size > 0 ? { bin: { size } } : undefined);
          }}
          className="w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-primary outline-none focus:border-accent"
        />
      </label>
    );
  }

  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <Select
        label="Group dates by"
        value={current.dateTrunc ?? ''}
        allowEmpty
        placeholder="No truncation"
        options={['day', 'week', 'month', 'quarter', 'year'].map((u) => ({ value: u, label: u }))}
        onChange={(v) => setTransform(v ? { dateTrunc: v } : undefined)}
      />
    );
  }

  return null;
}

function MeasureShelf({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
}) {
  const available = options.filter((o) => !values.includes(o.value));
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => {
          const opt = options.find((o) => o.value === v);
          return (
            <span
              key={v}
              className="flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-[12px] text-accent"
            >
              {opt?.label ?? v}
              <button
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-accent/70 hover:text-accent"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...values, e.target.value])}
          className="mt-1 w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-secondary outline-none focus:border-accent"
        >
          <option value="">+ Add measure…</option>
          {available.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1 text-[13px] text-content-secondary">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-accent"
      />
    </label>
  );
}

function ChartOptions({
  tile,
  onChange,
  advanced,
}: {
  tile: ChartTile;
  onChange: (o: Record<string, unknown>) => void;
  advanced: boolean;
}) {
  const o = tile.options;
  const bool = (k: string) => !!o[k];
  const section = (children: React.ReactNode) => (
    <div className="space-y-0.5 border-t border-border-subtle pt-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
        Options
      </div>
      {children}
    </div>
  );

  switch (tile.type) {
    case 'bar':
      return section(
        <>
          <Toggle label="Stacked" checked={bool('stacked')} onChange={(v) => onChange({ stacked: v })} />
          {advanced && (
            <Toggle label="100% stacked" checked={bool('percent')} onChange={(v) => onChange({ percent: v })} />
          )}
          <Toggle label="Horizontal" checked={bool('horizontal')} onChange={(v) => onChange({ horizontal: v })} />
        </>,
      );
    case 'line':
    case 'area':
      return section(
        <>
          <Toggle label="Smooth" checked={o.smooth !== false} onChange={(v) => onChange({ smooth: v })} />
          <Toggle label="Stacked" checked={bool('stacked')} onChange={(v) => onChange({ stacked: v })} />
        </>,
      );
    case 'kpi':
      return section(
        <div className="grid grid-cols-2 gap-2">
          <TextOpt label="Prefix" value={(o.prefix as string) ?? ''} onChange={(v) => onChange({ prefix: v })} />
          <TextOpt label="Suffix" value={(o.suffix as string) ?? ''} onChange={(v) => onChange({ suffix: v })} />
        </div>,
      );
    default:
      return null;
  }
}

function TextOpt({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-content-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1 text-[13px] text-content-primary outline-none focus:border-accent"
      />
    </label>
  );
}
