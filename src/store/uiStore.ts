/** Global UI/overlay state: theme + which modal/palette is open. */
import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface UIState {
  theme: Theme;
  sqlLabOpen: boolean;
  sqlLabSeed?: string; // optional initial SQL (e.g. "edit as SQL" from a tile)
  combineOpen: boolean;
  paletteOpen: boolean;
  formulaOpen: boolean;
  inspectTileId?: string;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  openSqlLab: (seed?: string) => void;
  closeSqlLab: () => void;
  openCombine: () => void;
  closeCombine: () => void;
  openFormula: () => void;
  closeFormula: () => void;
  setPaletteOpen: (open: boolean) => void;
  inspectTile: (id?: string) => void;
}

const THEME_KEY = 'vantage.theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors */
  }
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return saved;
    }
  } catch {
    /* ignore */
  }
  return 'dark';
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme(),
  sqlLabOpen: false,
  combineOpen: false,
  paletteOpen: false,
  formulaOpen: false,

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  openSqlLab: (seed) => set({ sqlLabOpen: true, sqlLabSeed: seed, paletteOpen: false }),
  closeSqlLab: () => set({ sqlLabOpen: false, sqlLabSeed: undefined }),
  openCombine: () => set({ combineOpen: true, paletteOpen: false }),
  closeCombine: () => set({ combineOpen: false }),
  openFormula: () => set({ formulaOpen: true, paletteOpen: false }),
  closeFormula: () => set({ formulaOpen: false }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  inspectTile: (inspectTileId) => set({ inspectTileId }),
}));
