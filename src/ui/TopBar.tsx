/**
 * Top bar: brand, (placeholder) selections bar, Simple/Advanced mode toggle,
 * and the command-palette trigger. The selections bar fills in at M3; the
 * command palette is present-but-disabled to reserve the slot (incl. the
 * deferred "Ask a question…" AI seam, §10).
 */
import { useAppStore } from '@/store/appStore';
import { useUIStore } from '@/store/uiStore';
import { SearchIcon } from './components/icons';
import { SelectionsBar } from './associative/SelectionsBar';

function ModeToggle() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  return (
    <div className="flex items-center rounded-lg border border-border-subtle bg-bg-inset p-0.5 text-xs">
      {(['simple', 'advanced'] as const).map((m) => (
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
  );
}

function EngineBadge() {
  const status = useAppStore((s) => s.engineStatus);
  const coi = useAppStore((s) => s.crossOriginIsolated);
  const label =
    status === 'ready'
      ? coi
        ? 'Engine · multi-thread'
        : 'Engine · single-thread'
      : status === 'booting'
        ? 'Starting engine…'
        : 'Engine error';
  const dot =
    status === 'ready'
      ? 'bg-assoc-selected'
      : status === 'booting'
        ? 'bg-accent2 animate-pulse'
        : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 rounded-md bg-bg-inset px-2.5 py-1 text-[11px] text-content-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

export function TopBar() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const openSqlLab = useUIStore((s) => s.openSqlLab);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const theme = useUIStore((s) => s.theme);
  const mode = useAppStore((s) => s.mode);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-panel px-3">
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-accent2 text-[13px] font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold tracking-tight">Vantage</span>
      </div>

      <SelectionsBar />

      <button
        onClick={() => setPaletteOpen(true)}
        title="Command palette"
        className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-inset px-2.5 py-1 text-xs text-content-secondary hover:text-content-primary"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="rounded bg-bg-elevated px-1 text-[10px]">⌘K</kbd>
      </button>

      {mode === 'advanced' && (
        <button
          onClick={() => openSqlLab()}
          title="SQL Lab"
          className="rounded-md border border-border-subtle bg-bg-inset px-2.5 py-1 text-xs text-content-secondary hover:text-content-primary"
        >
          SQL
        </button>
      )}

      <button
        onClick={toggleTheme}
        title="Toggle theme"
        className="grid h-7 w-7 place-items-center rounded-md border border-border-subtle bg-bg-inset text-xs text-content-secondary hover:text-content-primary"
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>

      <EngineBadge />
      <ModeToggle />
    </header>
  );
}
