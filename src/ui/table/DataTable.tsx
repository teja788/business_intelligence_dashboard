/**
 * Virtualized data grid (TanStack Table + Virtual). Million-row friendly:
 * only visible rows are rendered. Used for the M0 raw-rows view and later for
 * the Table chart type and "view underlying rows".
 */
import { useMemo, useRef, type CSSProperties } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  /** Optional per-cell styling (e.g. conditional formatting on measure cells). */
  cellStyle?: (column: string, value: unknown, row: Record<string, unknown>) => CSSProperties | undefined;
  /** Optional per-cell text override (e.g. number-format presets on measures). */
  cellFormat?: (column: string, value: unknown) => string | undefined;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toLocaleString();
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function DataTable({ columns, rows, cellStyle, cellFormat }: DataTableProps) {
  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columns.map((col) => ({
        id: col,
        accessorFn: (row) => row[col],
        header: col,
        cell: (info) =>
          cellFormat?.(col, info.getValue()) ?? formatCell(info.getValue()),
      })),
    [columns, cellFormat],
  );

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const { rows: tableRows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length
    ? totalSize - virtualRows[virtualRows.length - 1].end
    : 0;

  return (
    <div
      ref={parentRef}
      className="v-scroll h-full w-full overflow-auto rounded-lg border border-border-subtle bg-bg-inset"
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-bg-elevated">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap border-b border-border-strong px-3 py-2 text-left font-medium text-content-secondary"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} colSpan={columns.length} />
            </tr>
          )}
          {virtualRows.map((vRow) => {
            const row = tableRows[vRow.index];
            return (
              <tr
                key={row.id}
                className="border-b border-border-subtle hover:bg-bg-elevated/60"
              >
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const style = cellStyle?.(colId, cell.getValue(), row.original);
                  return (
                    <td
                      key={cell.id}
                      style={style}
                      className="whitespace-nowrap px-3 py-1.5 text-content-primary"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
