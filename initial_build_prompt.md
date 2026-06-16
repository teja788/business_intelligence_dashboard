# Build Prompt — "Vantage": a web-based, open data-exploration tool

> Working codename: **Vantage** (rename freely). Paste this whole document into Claude Code as the project brief. Build it **milestone by milestone** (see §12) — do not try to one-shot the whole thing. After each milestone, stop, run it, and confirm before moving on.

---

## 1. The one-paragraph vision

Build a **web-based data-exploration and dashboarding tool** that a person can open by typing a URL, drag a file (CSV / Excel / Parquet / JSON) into, and within seconds be exploring with live charts — no login, no setup, no server round-trips. It should cover ~80% of what Power BI, Tableau, and Qlik do for the everyday user, while being faster, friendlier, and free to share. The data and computation start **entirely in the browser** (so it's private and instant), with the architecture deliberately built so that **server-side database connectors, accounts, and sharing can be added later without a rewrite**. The product has two faces from one codebase: a calm **Simple mode** for non-technical users and a powerful **Advanced mode** for analysts.

## 2. Why this exists — the gaps we are deliberately attacking

We are **not** cloning feature lists. The incumbents already have the features; they fail on **adoption and friction**. Design every decision against these documented failures:

1. **The "follow-up problem" / dashboard graveyard.** Traditional dashboards give *static answers to static questions*. The moment a user asks "okay, but why?" or "what about last quarter?", they have to file a new request. Dashboard adoption sits near 20%, and ~72% of users abandon dashboards for spreadsheets. **Our cure: associative cross-filtering** — clicking any value anywhere instantly re-filters everything, turning a static dashboard into a live conversation. This is our headline feature, not a footnote.
2. **The cost & login wall.** In the incumbents, every *viewer* needs a paid seat, and sharing is gated behind a vendor cloud. **Our cure:** runs in any browser, share by sending a file/link, no per-seat tax.
3. **Slowness on real data.** Users constantly report hangs and crashes on large datasets. **Our cure:** a real columnar OLAP engine (DuckDB-WASM) in a Web Worker + Apache Arrow + virtualized rendering.
4. **The hidden 90% spent on data prep.** Most BI effort is wrangling, not analysis; users can't easily join/union files, group on the fly, or fix types. **Our cure:** lightweight in-tool data prep + automatic data profiling on import.
5. **Steep learning curve.** ~70% of users use less than 10% of the features; tools like Tableau's LOD expressions and Power BI's DAX scare people off. **Our cure:** progressive disclosure — Simple mode hides power until asked for; sane defaults; a guided chart picker.
6. **Distrust of the numbers.** Adoption only happens when people trust the data. **Our cure:** radical transparency — every chart can reveal the exact SQL behind it, the row count, the data's freshness, and the underlying rows for any data point.
7. **Time-to-first-insight.** A dashboard that takes 6 steps and 90 seconds loses to a spreadsheet that's already open. **Our cure:** drag file → auto-profiled → auto-suggested charts in seconds.

**Guiding principle:** *Make the first useful chart appear within 10 seconds of dropping a file, and make every number one click away from "show me why."*

## 3. Design principles (apply these everywhere)

- **Seconds to value.** Optimize the cold path: file in → charts out. No mandatory modeling step.
- **Progressive disclosure.** Nothing advanced is *removed*, only *tucked away*. Simple mode is the default; Advanced mode is one toggle.
- **Everything is explorable.** Any data point is clickable to cross-filter, drillable, and inspectable ("view underlying rows", "view SQL").
- **Transparency builds trust.** Never hide how a number was computed.
- **Local-first, private by default.** Data never leaves the browser unless the user explicitly connects a remote source (future).
- **Composable & extensible.** Chart types, data connectors, and formula functions are all plugins registered against stable interfaces (§10). Adding a new chart should not require touching core code.
- **Keyboard- and speed-friendly.** Command palette (Cmd/Ctrl-K), undo/redo everywhere, sensible shortcuts.
- **Forgiving.** Autosave, non-destructive edits, easy duplicate/fork of any chart or dashboard.

## 4. Tech stack (recommended — use this unless you hit a hard blocker)

- **Frontend:** React 18 + **TypeScript** + **Vite**.
- **State:** **Zustand** (lightweight, ideal for the global selection/filter store the associative engine needs). Use Immer for ergonomic immutable updates.
- **Data engine:** **DuckDB-WASM** running inside a **Web Worker** (keep the main thread free). All analytical queries are SQL executed against DuckDB.
- **Data interchange:** **Apache Arrow** — keep query results in Arrow and feed charts from Arrow tables to avoid expensive JSON conversion.
- **File parsing:** DuckDB's native CSV/Parquet/JSON readers; **SheetJS (xlsx)** for Excel → loaded into DuckDB.
- **Charting:** **Apache ECharts** as the primary renderer (40+ chart types, performant, fully themeable, canvas+SVG). Wrap it behind our own `ChartRenderer` interface (§10) so Vega-Lite, deck.gl (maps), etc. can be added as plugins later. Do **not** let ECharts APIs leak into core app code.
- **Dashboard layout:** **react-grid-layout** (drag, resize, responsive breakpoints).
- **Styling:** **Tailwind CSS** + CSS variables for theming. **Framer Motion** for restrained, purposeful animation.
- **Tables:** **TanStack Table** + **TanStack Virtual** for virtualized, million-row-friendly grids and pivot tables.
- **Formula parsing:** a hand-written or PEG-based parser (e.g. via `chevrotain`) that compiles our formula language to DuckDB SQL (§9).
- **Persistence (local):** **OPFS** (Origin Private File System) for dataset files/Parquet caches; **IndexedDB** (via `idb`) for workbook/dashboard definitions and metadata.
- **Local dev:** everything static — `vite dev`. Production can be a static deploy (the "just type a URL" promise) until the backend lands.

> **Cross-origin isolation note:** DuckDB-WASM benefits from SharedArrayBuffer (threads). Configure the dev server and production host to send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Provide a graceful single-threaded fallback if those headers are absent.

## 5. Architecture & boundaries (this is what makes it future-proof)

Organize around clean interfaces so the browser-only v1 and the future server version are interchangeable.

```
src/
  engine/            # DuckDB worker, query execution, Arrow handling
    DataSource.ts        # interface — see below
    LocalDuckDBSource.ts # v1 implementation (browser)
    RemoteSQLSource.ts   # FUTURE stub: talks to backend connectors
  model/             # domain types: Dataset, Field, Workbook, Chart, Filter, Selection...
  query/             # visual-spec -> SQL compiler (the "semantic layer")
  formula/           # formula language: lexer, parser, AST -> SQL
  associative/       # global selection store + association computation
  charts/            # ChartRenderer interface + ECharts adapter + registry
  prep/              # data profiling + lightweight transforms
  ui/
    simple/          # Simple-mode surfaces
    advanced/        # shelves, SQL Lab, formula editor
    dashboard/       # grid, tiles, cross-filter wiring
    components/      # design-system primitives
  store/             # Zustand stores
  plugins/           # registration entry points (charts, connectors, functions)
```

**The key abstraction — `DataSource`:** the whole app talks to data through one interface, never to DuckDB directly.

```ts
interface DataSource {
  listDatasets(): Promise<Dataset[]>;
  getSchema(datasetId: string): Promise<Field[]>;
  profile(datasetId: string): Promise<DatasetProfile>;     // stats per column
  runQuery(spec: QuerySpec): Promise<ArrowTable>;          // structured query
  runSQL(sql: string): Promise<ArrowTable>;                // raw SQL (Advanced)
  // association support:
  possibleValues(field: FieldRef, selection: Selection): Promise<ValueState[]>;
}
```

`LocalDuckDBSource` implements this in v1. When the backend arrives, `RemoteSQLSource` implements the *same* interface against connectors — **no UI or chart code changes**. The visual-query → SQL compiler in `query/` should target standard SQL (DuckDB dialect) so most of it carries over to Postgres/warehouses later.

A `QuerySpec` is a serializable description of what a chart needs (dimensions, measures, filters, sort, limit). The compiler turns it into SQL. This is our lightweight **semantic layer**: fields carry types (dimension vs measure), default aggregations, and formatting.

## 6. Core data model (sketch — refine as needed)

```ts
type FieldRole = 'dimension' | 'measure';
type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'geo';

interface Field {
  id: string;
  datasetId: string;
  name: string;            // display
  column: string;          // physical column or calculated-field id
  role: FieldRole;
  type: FieldType;
  defaultAggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countDistinct' | 'median';
  format?: ValueFormat;    // number/currency/percent/date pattern
  isCalculated?: boolean;
  formula?: string;        // if calculated
}

interface Dataset { id: string; name: string; source: 'file' | 'remote'; fields: Field[]; rowCount: number; loadedAt: string; }

interface QuerySpec {
  datasetId: string;
  dimensions: { field: string; bin?: BinSpec; dateTrunc?: 'day'|'week'|'month'|'quarter'|'year' }[];
  measures: { field: string; agg: Aggregation }[];
  filters: Filter[];
  sort?: { field: string; dir: 'asc'|'desc' }[];
  limit?: number;
}

interface ChartTile {
  id: string;
  type: string;            // registered chart type id
  query: QuerySpec;
  encoding: Encoding;      // shelves: x, y, color, size, detail, tooltip...
  options: Record<string, unknown>; // chart-specific formatting
  layout: GridLayout;      // x,y,w,h on the dashboard grid
}

interface Workbook { id: string; name: string; datasets: string[]; tiles: ChartTile[]; parameters: Parameter[]; createdAt: string; updatedAt: string; }
```

Everything that defines a workbook must be **serializable to JSON** — that's the unit of save (IndexedDB now, server later), export, and share.

## 7. Feature spec — the three pillars

### Pillar A — Associative cross-filtering (the headline; do this *well*)

This is the Qlik-style "everything is connected" experience and our main differentiator.

- A **global `Selection` store** (Zustand) holds the set of active selections: `{ field, values[] }[]` plus free-form filters.
- **Clicking any mark** on any chart (a bar, a slice, a row, a point, a legend item) **toggles** that value into the global selection. Every other tile re-queries against the combined selection and animates to its new state.
- **Selection state coloring** (the Qlik "green/white/grey" idea), surfaced especially in filter/list panels and categorical axes:
  - **Selected** — values the user actively picked.
  - **Possible/associated** — values still reachable given current selections.
  - **Excluded** — values no longer possible. Show them greyed, **do not hide them** — revealing what's been excluded is the insight.
  - Implement via `DataSource.possibleValues(field, selection)`: for each field, run a query that returns which values survive the current selection. Cache aggressively.
- A persistent **Selections bar** shows active selections as removable chips, with one-click "clear all" and **back/forward through selection history** (this directly solves the follow-up problem — exploration becomes a navigable trail).
- **Drill & inspect on every mark** (right-click / long-press menu): *Keep only*, *Exclude*, *Drill down* (to next dimension in a hierarchy), *View underlying rows*, *View the SQL*.
- Performance: debounce rapid selections, run association + tile queries in parallel in the worker, and cache results keyed by (querySpec + selection hash).

### Pillar B — Drag-and-drop dashboard builder with many chart types

- **Canvas:** responsive grid (react-grid-layout). Tiles can be dragged, resized, duplicated, and reordered. Free placement with snapping.
- **Two building paths:**
  - **Simple mode:** pick a field or two and Vantage **auto-suggests** appropriate chart types (à la "Show Me"), choosing sensible defaults (e.g., a date + a measure → line chart; a category + measure → bar). One click to place.
  - **Advanced mode:** **shelves** (Tableau-style): drag fields into *Columns, Rows, Color, Size, Detail, Label, Tooltip, Filter* wells. The chart updates live. Aggregation and binning are inline-editable on each field pill.
- **Per-tile config panel:** chart type switcher, axis/format controls, sorting, top-N, reference lines, conditional formatting, **fully customizable tooltips** (add any field — this is a specific incumbent gripe), titles, colors.
- **Chart catalog for v1** (register each as a plugin, §10):
  - Table, **Pivot table** (drag dimensions to rows & columns), KPI / big-number card (with delta vs comparison period), bar/column (grouped & stacked & 100%), line, area (incl. stacked), combo (bar+line), pie/donut, scatter, bubble, histogram, box plot, heatmap, treemap, **funnel**, gauge, and a **map** (choropleth) as a clearly-scoped plugin (can land in a later milestone).
- **Dashboard-level controls:** global filter widgets (dropdown, search list with association coloring, date-range, numeric slider), **what-if parameters** (a slider/input that feeds formulas — another incumbent gap), and a comparison/period selector.
- **Storytelling-lite:** tiles support a text/markdown tile and a title/notes area so a dashboard can tell a story, not just show grids.

### Pillar C — Calculated fields & formula engine (Excel/DAX-like, but friendlier)

- A **formula editor** with autocomplete, function signatures, inline docs, and live validation/preview.
- A formula language that compiles to DuckDB SQL via `formula/` (lexer → parser → AST → SQL). Support:
  - **Row-level** expressions: arithmetic, string ops (`CONCAT`, `LEFT`, `SPLIT`), `IF`/`CASE`, `COALESCE`, date functions (`DATEDIFF`, `DATETRUNC`, `YEAR`, `MONTH`), type casts.
  - **Aggregations:** `SUM`, `AVG`, `COUNT`, `COUNTDISTINCT`, `MEDIAN`, `MIN`, `MAX`.
  - **Window/running calcs:** running total, moving average, rank, percent-of-total, period-over-period — the things that are painful in incumbents. Compile to SQL window functions.
  - **Parameters:** formulas can reference what-if `parameters` so users can model scenarios.
- Calculated fields become first-class `Field`s (role/type/format) usable anywhere a normal field is, including in the associative engine.
- Be **explicit about aggregation semantics** (measure vs row-level) and show the user which one they're creating — ambiguity here is a top source of incumbent confusion.

## 8. Data import & prep (kills the "90% on prep" problem)

- **Import:** drag-drop or file-picker for CSV, TSV, Excel (all sheets), Parquet, JSON/NDJSON. Also "paste data" and "load from URL" (public Parquet/CSV via DuckDB HTTPFS).
- **Auto-profiling on import** (Qlik-like): for each column infer type, show distribution sparkline, min/max/mean, distinct count, null %, and example values. Surface this in a **dataset profile panel** so users immediately understand and trust their data.
- **Lightweight transforms** (non-destructive, recorded as steps, all compiled to SQL/views):
  - Rename, change type, set format.
  - Split/extract, trim, find-replace, uppercase/lowercase.
  - **Group/bin on the fly** (numeric bins, custom value grouping) — explicitly missing in Power BI.
  - Filter rows, dedupe.
  - **Join and union across multiple files** (a major incumbent pain) — a visual join builder that emits DuckDB SQL.
- **Relationships:** allow defining simple relationships between datasets (keys) so cross-dataset queries and associative filtering can work across tables.

## 9. Transparency & trust features (cheap to build, huge for adoption)

- **"View SQL"** on any chart/tile — show the exact generated query. In Advanced mode, "Edit as SQL" opens it in the SQL Lab.
- **"View underlying rows"** for any mark or aggregate.
- **Row count & data freshness** badges (`loadedAt`) visible per dataset/tile.
- **SQL Lab (Advanced):** a full SQL editor against the loaded DuckDB, with results grid, save-as-dataset, and "turn this query into a chart."

## 10. Extensibility / plugin architecture (the "futuristic, add things later" requirement)

Three stable extension points, each a simple registry the rest of the app reads from:

1. **Chart plugins** — implement `ChartRenderer`:
   ```ts
   interface ChartRenderer {
     id: string; name: string; icon: ReactNode;
     // which encodings/shelves this chart accepts:
     encodingSchema: EncodingSchema;
     // does this (dimensions, measures) combo suit this chart? for auto-suggest
     suitability(query: QuerySpec): number;
     render(el: HTMLElement, data: ArrowTable, encoding: Encoding, options): Disposable;
     optionsPanel?: React.ComponentType<ChartOptionsProps>;
   }
   ```
   The ECharts adapter and every built-in chart are registered through this — no special-casing. New chart = new plugin file.
2. **Data-source/connector plugins** — implement `DataSource` (§5). `LocalDuckDBSource` ships in v1; future Postgres/MySQL/warehouse/REST connectors register the same way.
3. **Formula function plugins** — register `{ name, signature, sqlTemplate, docs }` so the formula language and its autocomplete grow without touching the parser core.

Also: a **theme registry** (CSS variables) and a small typed **event bus** so future features (alerts, AI, collaboration) can subscribe to selection/data events without coupling.

**Designed-for-but-deferred — "Ask your data" (AI):** do **not** build it in v1, but leave a clean seam: a `QueryGenerator` interface that takes natural language + dataset schema and returns a `QuerySpec` or SQL. Make the LLM provider pluggable and configured via env var (`OpenAI` / `Anthropic` / local). The command palette should have a disabled-but-present "Ask a question…" entry so the slot is real. This keeps the "futuristic" promise without scope-creeping v1.

## 11. UI / UX direction — bold & futuristic

- **Default dark theme**, with a light theme available via the theme registry. Deep near-black backgrounds, a restrained neon/electric accent (single accent color + a secondary), generous contrast, crisp modern sans typography (e.g. Inter/Geist), and a clear type scale.
- **Restrained, purposeful motion** (Framer Motion): tiles animate smoothly when cross-filtering re-queries the data; selection chips slide in; panels ease. Motion communicates causality (you clicked → the data moved) — never gratuitous. Respect `prefers-reduced-motion`.
- **Calm Simple mode, dense Advanced mode.** Simple mode is spacious and guided. Advanced mode reveals shelves, SQL Lab, and the formula editor.
- **Layout:** left rail = datasets/fields; center = canvas; right = contextual config panel; top = selections bar + mode toggle + command palette trigger. Collapsible panels.
- **Command palette (Cmd/Ctrl-K):** add chart, switch dataset, jump to a field, change theme, toggle mode, (future) ask a question.
- **Empty state is the onboarding:** a big, inviting drop zone — "Drop a CSV, Excel, or Parquet file to begin" — plus a "Try sample data" button that loads a bundled dataset so users reach a populated, cross-filterable dashboard in one click.
- **Accessibility:** keyboard navigable, ARIA on interactive marks, sufficient contrast, focus states.

> Before building UI, consult the project's frontend-design guidance for typography, spacing, and color discipline so it reads as intentional, not templated.

## 12. Build milestones — implement in this order, stop & verify after each

- **M0 — Scaffold & engine smoke test.** Vite + React + TS + Tailwind. DuckDB-WASM in a Web Worker. Dark theme shell with the three-panel layout. Load a bundled CSV into DuckDB and render its rows in a virtualized table. Set COOP/COEP headers. *Done when:* sample file shows as a table.
- **M1 — Fields, query compiler, first chart.** Schema/profiling on import; `Field` model with roles/types; `QuerySpec` → SQL compiler; render one ECharts chart (bar + line) via the `ChartRenderer` interface and registry. Drag-drop file import (CSV/Parquet/Excel/JSON). *Done when:* drop a file → pick fields → see a correct chart.
- **M2 — Dashboard builder.** react-grid-layout canvas; multiple tiles; per-tile config panel; chart-type switcher; shelves (Advanced) + auto-suggest (Simple); add the core chart catalog. Save/load workbook to IndexedDB; export/import workbook JSON. *Done when:* a multi-chart dashboard persists across reloads.
- **M3 — Associative cross-filtering (the headline).** Global `Selection` store; click-to-filter on all marks; `possibleValues` association computation with selected/possible/excluded coloring in filter panels; selections bar with history + clear; keep-only/exclude/drill/inspect context menu. *Done when:* clicking a bar re-filters every tile and association coloring is visible.
- **M4 — Calculated fields & formula engine.** Formula editor with autocomplete; lexer/parser/AST → SQL; row-level, aggregate, and window functions; what-if parameters wired to a slider widget. *Done when:* a user-defined running-total and a parameterized measure work in a chart.
- **M5 — Data prep, transparency, polish.** Lightweight transforms (rename/type/bin/group/filter/join/union); dataset profile panel; "View SQL" + "View underlying rows" everywhere; SQL Lab; command palette; sample-data onboarding; map plugin. *Done when:* a user can join two files, bin a field, and inspect the SQL behind any tile.
- **M6 — (Architected now, built later) Backend.** Node service implementing `DataSource` as `RemoteSQLSource`; first DB connector (Postgres); accounts; server-saved workbooks; share links; row-level permissions. Plus the `QueryGenerator` AI seam.

## 13. Non-goals for v1 (keep scope honest)

- No accounts/auth/multi-tenancy yet (architected for, not built).
- No live database connectors yet (file-first; the `DataSource` seam makes them additive).
- No AI "ask your data" implementation yet (seam only).
- No real-time streaming, no native mobile app (responsive web is enough), no enterprise governance suite.

## 14. How to work with this brief (instructions to the builder)

- Treat §12 as the plan of record. **Build one milestone, run it, and pause for review** before the next.
- Keep the `DataSource`, `ChartRenderer`, and formula-function registries clean from day one — they are what let this grow without rewrites. Never let DuckDB or ECharts specifics leak into UI/core code.
- Favor correctness and speed-to-first-chart over breadth. A small number of charts that cross-filter flawlessly beats twenty that don't.
- Write the visual-query compiler against standard SQL (DuckDB dialect) so it survives the move to server-side warehouses.
- Add a few realistic sample datasets so every feature is demoable immediately.
- Keep components typed, small, and tested where logic is non-trivial (the query compiler and formula parser especially deserve unit tests).
