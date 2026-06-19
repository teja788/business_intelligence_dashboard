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
  code-splitting. **Choropleth map plugin** (world-atlas topology, lazy-loaded;
  try the "Sales by Country" sample).
- [~] **M6 — Backend seam (architected; service built later).** `RemoteSQLSource`
  implements the same `DataSource` interface over HTTP — flip via
  `VITE_DATA_SOURCE=remote` + `VITE_REMOTE_URL`, no UI/chart changes. Pluggable
  `QueryGenerator` "ask your data" AI seam (provider via `VITE_LLM_PROVIDER`),
  and a typed `eventBus`. The Node service, connectors, accounts, share links,
  and row-level permissions are the remaining build-later work.
- [x] **M7 — Export, more sources, auto-build (10x usefulness, no AI).**
  - **Export & sharing** (`src/export/`): per-tile PNG + CSV, full-dashboard PNG
    and PDF, and a **self-contained HTML report** (charts embedded as data-URIs,
    opens offline anywhere). All client-side via html-to-image + jsPDF; numbers
    are computed in the engine at export time, never recomputed.
  - **Data sources beyond file-drop** (`src/engine/remoteFile.ts`): import from a
    **URL / paste a link** (CSV/Parquet/JSON/TSV/Excel, incl. published Google
    Sheets & raw hosts), with one-click **refresh** that re-fetches and re-imports
    under the same dataset id so tiles/field ids stay stable.
  - **One-click auto-build** (`src/charts/autoDashboard.ts`): heuristic starter
    dashboard from profiling — KPIs per measure, a time trend, and breakdown bars
    for low-cardinality categories. Pure/unit-tested; no LLM.
- [x] **M8 — Interaction depth.**
  - **Reference lines** (`src/charts/echarts/refline.ts`): average / median / min /
    max / fixed-value annotation lines on bar/line/area, via ECharts `markLine`.
  - **Dashboard filter-control tiles** (`FilterControlTile`): a first-class
    on-canvas filter (`+ Filter`) that embeds the associative `FilterList`, so it
    writes the SAME global selection as click-to-cross-filter — every tile reacts.
  - **Drill-down hierarchies** (`src/charts/drill.ts` + `drillStore`): define an
    ordered dimension hierarchy on a tile; clicking a mark descends a level
    (ancestor value pinned as a filter, re-grouped by the next field) with a
    breadcrumb to climb back. Drill state is ephemeral (not persisted).
- [x] **M9 — Formatting & history.**
  - **Conditional formatting** (`src/charts/format.ts`): threshold colour rules
    (>, ≥, <, ≤, =, between) for KPI values and table measure cells, edited per
    tile. Pure evaluator; `DataTable` gained an optional `cellStyle` hook.
  - **Undo / redo** (`historyReducer.ts` + `dashboardHistory.ts`): full workbook
    undo/redo with ⌘Z / ⌘⇧Z and toolbar buttons, via a pure history reducer and
    an isolated store subscription (no changes to existing store actions).
- [x] **M10 — Performance, formats, embed.**
  - **Query result cache** (`src/engine/queryCache.ts`): an LRU keyed by exact
    SQL so the many tiles sharing a query (and re-renders) skip redundant DuckDB
    round-trips; cleared whenever the dataset registry changes (so refresh shows
    new data). Filters/params change the SQL text, so they key distinctly.
  - **Number-format presets** (`src/charts/valueFormat.ts`): plain / currency /
    percent / compact (with decimals & currency code) for KPI values and table
    measure cells. Pure/Intl-based.
  - **Embed mode** (`src/ui/embed.ts` + `EmbedView`): load with `?embed` for a
    read-only, chrome-free dashboard (interactive cross-filtering kept) suitable
    for iframes; "Copy embed link" in the Export menu.
  - *Deferred by design:* OPFS-backed DuckDB persistence (engine-level change,
    needs real-browser verification — the app already survives reloads via the
    IndexedDB byte-store rebuild), and live palette themes / small-multiples
    (need a chart-remount path; low leverage).
