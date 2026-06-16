/**
 * M1 Explore view: pick fields → see a correct chart. Auto-suggests a chart
 * type from the field selection (Simple-mode "Show Me"), with manual override.
 * This builder is generalized into the M2 tile editor.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Dataset, Encoding } from '@/model/types';
import { Select } from '@/ui/components/Select';
import { ChartView } from '@/charts/ChartView';
import { suggestCharts } from '@/charts/registry';
import { getChart } from '@/charts/registry';
import { useEffectiveDataset } from '@/ui/hooks/useEffectiveDataset';

export function ExploreView({ dataset: rawDataset }: { dataset: Dataset }) {
  const dataset = useEffectiveDataset(rawDataset.id) ?? rawDataset;
  const dimensions = dataset.fields.filter((f) => f.role === 'dimension');
  const measures = dataset.fields.filter((f) => f.role === 'measure');

  const [xId, setXId] = useState(dimensions[0]?.id ?? '');
  const [yId, setYId] = useState(measures[0]?.id ?? '');
  const [colorId, setColorId] = useState('');
  const [typeOverride, setTypeOverride] = useState<string | null>(null);

  // Reset selections when the dataset changes.
  useEffect(() => {
    setXId(dimensions[0]?.id ?? '');
    setYId(measures[0]?.id ?? '');
    setColorId('');
    setTypeOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.id]);

  const encoding: Encoding = useMemo(
    () => ({
      x: xId ? [xId] : [],
      y: yId ? [yId] : [],
      color: colorId || undefined,
    }),
    [xId, yId, colorId],
  );

  const xField = dataset.fields.find((f) => f.id === xId);
  const suggestions = useMemo(
    () =>
      suggestCharts({
        dimensionCount: (xId ? 1 : 0) + (colorId ? 1 : 0),
        measureCount: yId ? 1 : 0,
        firstDimensionType: xField?.type,
      }),
    [xId, yId, colorId, xField?.type],
  );

  const activeType = typeOverride ?? suggestions[0]?.id ?? 'bar';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            label="X / Category"
            value={xId}
            onChange={setXId}
            options={dimensions.map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>
        <div className="w-44">
          <Select
            label="Y / Measure"
            value={yId}
            onChange={setYId}
            options={measures.map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>
        <div className="w-44">
          <Select
            label="Color (optional)"
            value={colorId}
            onChange={setColorId}
            allowEmpty
            options={dimensions
              .filter((f) => f.id !== xId)
              .map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {suggestions.slice(0, 6).map((c) => (
            <button
              key={c.id}
              title={c.name}
              onClick={() => setTypeOverride(c.id)}
              className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
                activeType === c.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border-subtle text-content-secondary hover:bg-bg-elevated'
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-lg border border-border-subtle bg-bg-panel p-3">
        {getChart(activeType) ? (
          <ChartView dataset={dataset} type={activeType} encoding={encoding} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-content-muted">
            Pick fields to build a chart.
          </div>
        )}
      </div>
    </div>
  );
}
