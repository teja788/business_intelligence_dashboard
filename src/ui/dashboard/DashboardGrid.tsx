/**
 * The dashboard canvas: a responsive, draggable/resizable grid of tiles
 * (react-grid-layout). Layout changes persist through the dashboard store.
 */
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useDashboardStore } from '@/store/dashboardStore';
import type { GridLayout } from '@/model/types';
import { Tile } from './Tile';

const ResponsiveGridLayout = WidthProvider(Responsive);
const COLS = 12;

export function DashboardGrid() {
  const tiles = useDashboardStore((s) => s.workbook.tiles);
  const setLayouts = useDashboardStore((s) => s.setLayouts);
  const selectTile = useDashboardStore((s) => s.selectTile);

  const layout: Layout[] = tiles.map((t) => ({
    i: t.id,
    x: t.layout.x,
    y: t.layout.y === Infinity ? 0 : t.layout.y,
    w: t.layout.w,
    h: t.layout.h,
  }));

  const handleChange = (current: Layout[]) => {
    const map: Record<string, GridLayout> = {};
    for (const l of current) map[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
    setLayouts(map);
  };

  if (!tiles.length) {
    return (
      <div
        className="grid h-full place-items-center"
        onMouseDown={() => selectTile(undefined)}
      >
        <div className="text-center text-sm text-content-muted">
          <p className="text-content-secondary">Your dashboard is empty.</p>
          <p className="mt-1 text-[12px]">
            Click <span className="text-accent">+ Add chart</span> to place your
            first tile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="v-scroll h-full overflow-auto" onMouseDown={(e) => {
      if (e.target === e.currentTarget) selectTile(undefined);
    }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout, md: layout, sm: layout }}
        breakpoints={{ lg: 1200, md: 900, sm: 0 }}
        cols={{ lg: COLS, md: COLS, sm: 4 }}
        rowHeight={32}
        margin={[12, 12]}
        draggableHandle=".tile-handle"
        onLayoutChange={handleChange}
        compactType="vertical"
      >
        {tiles.map((t) => (
          <div key={t.id}>
            <Tile tile={t} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
