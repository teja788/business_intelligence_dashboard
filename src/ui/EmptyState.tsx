/**
 * Empty state IS the onboarding (§11): a big inviting drop zone plus a
 * "Try sample data" button so users reach a populated view in one click.
 */
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { SparkIcon, UploadIcon } from './components/icons';

export function EmptyState() {
  const importFile = useAppStore((s) => s.importFile);
  const loadSample = useAppStore((s) => s.loadSample);
  const engineStatus = useAppStore((s) => s.engineStatus);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const disabled = engineStatus !== 'ready' || busy;

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      await importFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full place-items-center p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex w-full max-w-xl flex-col items-center rounded-2xl border-2 border-dashed px-10 py-16 text-center transition-colors ${
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-border-strong bg-bg-panel/50'
        }`}
      >
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-white">
          <UploadIcon className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-content-primary">
          Drop a CSV, Parquet, or JSON file to begin
        </h2>
        <p className="mt-1 max-w-sm text-sm text-content-secondary">
          Your data stays in your browser — private and instant. No login, no
          upload, no setup.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 ${
              disabled ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <UploadIcon className="h-4 w-4" />
            Choose a file
            <input
              type="file"
              accept=".csv,.tsv,.txt,.parquet,.json,.ndjson,.xlsx,.xls"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </label>

          <button
            onClick={() => {
              setBusy(true);
              setError(undefined);
              void loadSample()
                .catch((err) =>
                  setError(err instanceof Error ? err.message : String(err)),
                )
                .finally(() => setBusy(false));
            }}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-content-primary hover:bg-bg-elevated disabled:opacity-50"
          >
            <SparkIcon className="h-4 w-4 text-accent2" />
            Try sample data
          </button>
        </div>

        <p className="mt-5 text-[11px] text-content-muted">
          {engineStatus === 'booting'
            ? 'Starting the in-browser engine…'
            : busy
              ? 'Loading…'
              : 'CSV · TSV · Parquet · JSON · Excel'}
        </p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
