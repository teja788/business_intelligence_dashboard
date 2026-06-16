import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { AppShell } from '@/ui/AppShell';
import { registerBuiltinCharts } from '@/charts/builtins';

registerBuiltinCharts();

export default function App() {
  const initEngine = useAppStore((s) => s.initEngine);
  const engineStatus = useAppStore((s) => s.engineStatus);
  const engineError = useAppStore((s) => s.engineError);

  useEffect(() => {
    void initEngine();
  }, [initEngine]);

  if (engineStatus === 'error') {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div className="max-w-md">
          <h1 className="text-lg font-semibold text-red-400">
            Couldn’t start the data engine
          </h1>
          <p className="mt-2 text-sm text-content-secondary">{engineError}</p>
          <p className="mt-4 text-xs text-content-muted">
            DuckDB-WASM needs a modern browser. If this persists, try reloading.
          </p>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
