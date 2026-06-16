# Vantage

A web-based, **local-first** data-exploration & dashboarding tool. Drop a file
(CSV / Parquet / JSON / Excel) into the browser and explore it instantly — no
login, no setup, no server round-trips. The data and computation start entirely
in the browser (private and fast), with clean interfaces so server-side
connectors, accounts, and sharing can be added later without a rewrite.

> Codename "Vantage" — see `initial_build_prompt.md` for the full product brief.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Then either **drop a CSV/Parquet/JSON file** into the canvas or click
**"Try sample data"**.

Other scripts:

```bash
npm run build      # typecheck (tsc -b) + production build
npm run test       # unit tests (Vitest) — query compiler, etc.
npm run typecheck  # types only
```

> The dev/preview servers send `Cross-Origin-Opener-Policy: same-origin` and
> `Cross-Origin-Embedder-Policy: require-corp` so DuckDB-WASM can use its
> multi-threaded bundle. Without these headers it falls back to single-thread.

## Tech stack

React 18 + TypeScript + Vite · Zustand (+ Immer) · **DuckDB-WASM** (in a Web
Worker) · Apache Arrow · ECharts (M1+) · react-grid-layout (M2+) · Tailwind ·
TanStack Table/Virtual.

## Architecture (key boundaries)

The whole app talks to data through one `DataSource` interface and never to
DuckDB directly. ECharts is wrapped behind a `ChartRenderer` interface. These
seams are what let the browser-only v1 grow into a server version without a
rewrite.

```
src/
  engine/      DuckDB worker boot + LocalDuckDBSource (implements DataSource)
  model/       serializable domain types (Dataset, Field, QuerySpec, Workbook…)
  query/       visual-spec → SQL compiler (the semantic layer) + SQL helpers
  store/       Zustand stores (app/UI state)
  samples/     bundled sample datasets
  ui/          AppShell, panels, virtualized table, components
```

## Milestone status

- [x] **M0 — Scaffold & engine smoke test.** Vite + React + TS + Tailwind dark
  three-panel shell. DuckDB-WASM in a Web Worker with COOP/COEP + single-thread
  fallback. `DataSource` interface + `LocalDuckDBSource`. File import → rows in a
  virtualized table. Query→SQL compiler (unit-tested).
- [x] **M1 — Fields, profiling, first chart.** Type/role inference, column
  profiling (sparklines/nulls/distinct), `ChartRenderer` plugin registry +
  ECharts adapter (bar/line/area), Explore view with "Show Me" auto-suggest,
  Excel import (SheetJS).
- [x] **M2 — Dashboard builder.** react-grid-layout canvas, tiles
  (drag/resize/duplicate), per-tile editor, chart-type switcher, shelves +
  auto-suggest, 15-chart catalog (bar/line/area/combo/pie/donut/funnel/treemap/
  gauge/scatter/bubble/heatmap/KPI/table/pivot), IndexedDB autosave +
  export/import JSON. Datasets persist & restore across reloads.
- [x] **M3 — Associative cross-filtering (headline).** Global selection store,
  click-any-mark to cross-filter every tile, selected/possible/excluded coloring
  in filter lists, selections bar with back/forward history + clear, keep-only /
  exclude.
- [x] **M4 — Calculated fields & formula engine.** Lexer→parser→AST→SQL formula
  language (row-level, aggregate, and window calcs: running total / moving avg /
  rank / percent-of-total), formula editor with function reference + live
  validation + explicit measure/dimension semantics, what-if parameters wired to
  sliders.
- [x] **M5 — Data prep, transparency, polish.** Tile-level binning &
  date-truncation, visual Join/Union builder, SQL Lab (run + save-as-dataset),
  "View SQL" / "View underlying rows" / "Edit as SQL", command palette (⌘/Ctrl-K)
  with a reserved "Ask a question…" AI seam, light/dark theme, vendor
  code-splitting. _(Choropleth map plugin deferred — the `ChartRenderer` seam
  makes it a drop-in; see brief §7B.)_
- [ ] M6 — (Architected, built later) Backend / remote connectors / AI seam.
