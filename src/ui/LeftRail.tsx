/**
 * Left rail: datasets + their fields. Fields are grouped into dimensions and
 * measures (the semantic distinction that drives chart building in M1/M2).
 */
import { useState } from 'react';
import { useAppStore, useActiveDataset } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useUIStore } from '@/store/uiStore';
import type { Field, FieldType } from '@/model/types';
import { FilterList } from './associative/FilterList';
import { ParametersPanel } from './formula/ParametersPanel';
import {
  CalendarIcon,
  DatabaseIcon,
  HashIcon,
  TextIcon,
  ToggleIcon,
  UploadIcon,
} from './components/icons';

function typeIcon(type: FieldType) {
  switch (type) {
    case 'number':
    case 'integer':
      return <HashIcon className="h-3.5 w-3.5" />;
    case 'date':
    case 'datetime':
      return <CalendarIcon className="h-3.5 w-3.5" />;
    case 'boolean':
      return <ToggleIcon className="h-3.5 w-3.5" />;
    default:
      return <TextIcon className="h-3.5 w-3.5" />;
  }
}

function FieldRow({ field }: { field: Field }) {
  const [expanded, setExpanded] = useState(false);
  const filterable = field.role === 'dimension';
  return (
    <div>
      <div
        onClick={() => filterable && setExpanded((v) => !v)}
        className={`group flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-content-secondary hover:bg-bg-elevated hover:text-content-primary ${
          filterable ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={
          filterable
            ? `${field.name} · ${field.type} — click to filter`
            : `${field.name} · ${field.type}`
        }
      >
        <span className={field.role === 'measure' ? 'text-accent2' : 'text-content-muted'}>
          {typeIcon(field.type)}
        </span>
        <span className="flex-1 truncate">{field.name}</span>
        {filterable && (
          <span className="text-[10px] text-content-muted">{expanded ? '▾' : '▸'}</span>
        )}
      </div>
      {expanded && filterable && (
        <div className="mb-1 ml-1.5 mt-0.5">
          <FilterList fieldId={field.id} />
        </div>
      )}
    </div>
  );
}

function FieldGroup({ title, fields }: { title: string; fields: Field[] }) {
  if (!fields.length) return null;
  return (
    <div className="mb-3">
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
        {title} · {fields.length}
      </div>
      {fields.map((f) => (
        <FieldRow key={f.id} field={f} />
      ))}
    </div>
  );
}

export function LeftRail() {
  const datasets = useAppStore((s) => s.datasets);
  const activeId = useAppStore((s) => s.activeDatasetId);
  const setActive = useAppStore((s) => s.setActiveDataset);
  const importFile = useAppStore((s) => s.importFile);
  const active = useActiveDataset();
  const calcFields = useDashboardStore((s) => s.workbook.calculatedFields) ?? [];
  const removeCalculatedField = useDashboardStore((s) => s.removeCalculatedField);
  const openFormula = useUIStore((s) => s.openFormula);

  // Physical fields are filterable in the rail; calculated fields are listed
  // separately (their values aren't directly associable yet).
  const dimensions = active?.fields.filter((f) => f.role === 'dimension') ?? [];
  const measures = active?.fields.filter((f) => f.role === 'measure') ?? [];
  const datasetCalcFields = calcFields.filter((f) => f.datasetId === activeId);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await importFile(file);
    e.target.value = '';
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
          Data
        </span>
        <label className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-content-secondary hover:bg-bg-elevated hover:text-content-primary">
          <UploadIcon className="h-3.5 w-3.5" />
          Import
          <input
            type="file"
            accept=".csv,.tsv,.txt,.parquet,.json,.ndjson,.xlsx,.xls"
            className="hidden"
            onChange={onPick}
          />
        </label>
      </div>

      <div className="v-scroll flex-1 overflow-auto px-2 pb-3">
        {datasets.length === 0 && (
          <p className="px-2 py-4 text-[12px] leading-relaxed text-content-muted">
            No data yet. Drop a file in the canvas or click Import.
          </p>
        )}

        {datasets.map((ds) => (
          <button
            key={ds.id}
            onClick={() => setActive(ds.id)}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
              ds.id === activeId
                ? 'bg-accent/15 text-content-primary'
                : 'text-content-secondary hover:bg-bg-elevated'
            }`}
          >
            <DatabaseIcon className="h-3.5 w-3.5 text-accent" />
            <span className="truncate">{ds.name}</span>
            <span className="ml-auto text-[10px] text-content-muted">
              {ds.rowCount.toLocaleString()}
            </span>
          </button>
        ))}

        {active && (
          <div className="mt-3 border-t border-border-subtle pt-3">
            <FieldGroup title="Dimensions" fields={dimensions} />
            <FieldGroup title="Measures" fields={measures} />

            <div className="mb-2 mt-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                  Calculated{datasetCalcFields.length ? ` · ${datasetCalcFields.length}` : ''}
                </span>
                <button
                  onClick={openFormula}
                  className="rounded px-1 text-[11px] text-accent hover:bg-bg-elevated"
                >
                  + Field
                </button>
              </div>
              {datasetCalcFields.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-content-secondary hover:bg-bg-elevated"
                  title={f.formula}
                >
                  <span className={f.role === 'measure' ? 'text-accent2' : 'text-content-muted'}>
                    {typeIcon(f.type)}
                  </span>
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    onClick={() => removeCalculatedField(f.id)}
                    className="text-[11px] text-content-muted opacity-0 hover:text-red-400 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 border-t border-border-subtle pt-3">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                Parameters
              </div>
              <div className="px-1">
                <ParametersPanel />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
