/** Factories for serializable model objects + a small id generator. */
import type { ChartTile, Encoding, Workbook } from './types';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`;
}

export function createWorkbook(name = 'Untitled dashboard'): Workbook {
  const now = new Date().toISOString();
  return {
    id: uid('wb'),
    name,
    datasets: [],
    tiles: [],
    parameters: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateTileInput {
  datasetId: string;
  type: string;
  encoding: Encoding;
  title?: string;
  options?: Record<string, unknown>;
  layout?: Partial<ChartTile['layout']>;
}

export function createTile(input: CreateTileInput): ChartTile {
  return {
    id: uid('tile'),
    type: input.type,
    title: input.title,
    query: {
      datasetId: input.datasetId,
      dimensions: [],
      measures: [],
      filters: [],
    },
    encoding: input.encoding,
    options: input.options ?? {},
    layout: {
      x: input.layout?.x ?? 0,
      y: input.layout?.y ?? Infinity, // place at bottom by default
      w: input.layout?.w ?? 6,
      h: input.layout?.h ?? 8,
    },
  };
}
