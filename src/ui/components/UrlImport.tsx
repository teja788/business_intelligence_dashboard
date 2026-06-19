/**
 * Compact "import from a URL" control: a button that expands to an inline URL
 * input. Used both in onboarding (EmptyState) and the left rail so users can
 * pull CSV/Parquet/JSON straight from a link (incl. published Google Sheets and
 * raw file hosts). The actual fetch+import is supplied by the caller.
 */
import { useState } from 'react';
import { LinkIcon } from './icons';

export interface UrlImportProps {
  onImport: (url: string) => Promise<void>;
  /** 'button' = pill button matching the empty state; 'subtle' = rail link. */
  variant?: 'button' | 'subtle';
  disabled?: boolean;
}

export function UrlImport({ onImport, variant = 'button', disabled }: UrlImportProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(undefined);
    try {
      await onImport(trimmed);
      setUrl('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    const trigger =
      variant === 'button' ? (
        <button
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-content-primary hover:bg-bg-elevated disabled:opacity-50"
        >
          <LinkIcon className="h-4 w-4 text-accent2" />
          From a URL
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-content-secondary hover:bg-bg-elevated hover:text-content-primary disabled:opacity-50"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          URL
        </button>
      );
    return trigger;
  }

  return (
    <div className={variant === 'button' ? 'w-full max-w-md' : 'w-full px-1.5 pb-2'}>
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="https://…/data.csv"
          className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[12px] text-content-primary outline-none focus:border-accent"
        />
        <button
          onClick={() => void submit()}
          disabled={busy || !url.trim()}
          className="rounded-md bg-accent px-2.5 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? '…' : 'Load'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md px-1.5 py-1.5 text-[12px] text-content-muted hover:text-content-primary"
        >
          ✕
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
