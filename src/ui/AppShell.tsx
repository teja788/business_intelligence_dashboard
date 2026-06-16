/**
 * Three-panel layout (§11): top bar; left rail = data/fields; center = canvas;
 * right = contextual panel. Mounts the global overlays (command palette, SQL
 * Lab, combine builder, formula editor, tile inspector) and the ⌘/Ctrl-K hook.
 */
import { useEffect } from 'react';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { RightPanel } from './RightPanel';
import { CenterCanvas } from './CenterCanvas';
import { CommandPalette } from './command/CommandPalette';
import { SqlLab } from './sqllab/SqlLab';
import { CombineDatasets } from './prep/CombineDatasets';
import { TileInspector } from './dashboard/TileInspector';
import { FormulaEditor } from './formula/FormulaEditor';
import { useUIStore } from '@/store/uiStore';
import { useActiveDataset } from '@/store/appStore';
import { useEffectiveDataset } from './hooks/useEffectiveDataset';

export function AppShell() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const formulaOpen = useUIStore((s) => s.formulaOpen);
  const closeFormula = useUIStore((s) => s.closeFormula);
  const active = useActiveDataset();
  const effective = useEffectiveDataset(active?.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!useUIStore.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  return (
    <div className="flex h-full flex-col bg-bg-base">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <main className="min-w-0 flex-1 bg-bg-base">
          <CenterCanvas />
        </main>
        <RightPanel />
      </div>

      {paletteOpen && <CommandPalette />}
      <SqlLab />
      <CombineDatasets />
      <TileInspector />
      {formulaOpen && effective && (
        <FormulaEditor dataset={effective} onClose={closeFormula} />
      )}
    </div>
  );
}
