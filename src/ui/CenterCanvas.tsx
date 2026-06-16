/**
 * Center canvas. M1: tabs to view the active dataset as a virtualized Table or
 * to Explore it as a chart. M2 adds the Dashboard grid tab.
 */
import { useMemo, useState } from 'react';
import { useActiveDataset } from '@/store/appStore';
import { useSqlQuery } from './hooks/useSqlQuery';
import { quoteIdent } from '@/query/sql';
import { DataTable } from './table/DataTable';
import { EmptyState } from './EmptyState';
import { ExploreView } from './explore/ExploreView';
import { DashboardView } from './dashboard/DashboardView';
import { TableIcon } from './components/icons';
import { BarIcon, KpiIcon } from '@/charts/icons';

const PREVIEW_LIMIT = 1000;
type View = 'dashboard' | 'explore' | 'table';

export function CenterCanvas() {
  const active = useActiveDataset();
  const [view, setView] = useState<View>('dashboard');

  const sql = useMemo(
    () =>
      active && view === 'table'
        ? `SELECT * FROM ${quoteIdent(active.table)} LIMIT ${PREVIEW_LIMIT}`
        : null,
    [active, view],
  );
  const { data, loading, error } = useSqlQuery(sql);

  if (!active) return <EmptyState />;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-content-primary">
          {active.name}
        </h1>
        <div className="flex items-center rounded-lg border border-border-subtle bg-bg-inset p-0.5 text-xs">
          <Tab active={view === 'dashboard'} onClick={() => setView('dashboard')}>
            <KpiIcon className="h-3.5 w-3.5" /> Dashboard
          </Tab>
          <Tab active={view === 'explore'} onClick={() => setView('explore')}>
            <BarIcon className="h-3.5 w-3.5" /> Explore
          </Tab>
          <Tab active={view === 'table'} onClick={() => setView('table')}>
            <TableIcon className="h-3.5 w-3.5" /> Table
          </Tab>
        </div>
        <span className="ml-auto text-[11px] text-content-muted">
          {active.rowCount.toLocaleString()} rows
        </span>
      </div>

      <div className="min-h-0 flex-1">
        {view === 'dashboard' && <DashboardView />}
        {view === 'explore' && <ExploreView dataset={active} />}
        {view === 'table' && (
          <>
            {loading && (
              <div className="grid h-full place-items-center text-sm text-content-muted">
                Running query…
              </div>
            )}
            {error && (
              <div className="grid h-full place-items-center text-sm text-red-400">
                {error}
              </div>
            )}
            {data && <DataTable columns={data.columns} rows={data.rows} />}
          </>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'text-content-secondary hover:text-content-primary'
      }`}
    >
      {children}
    </button>
  );
}
