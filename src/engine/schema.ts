/**
 * Map DuckDB column types to Vantage's FieldType/FieldRole and build Field[].
 */
import type { Field, FieldRole, FieldType, Aggregation } from '@/model/types';

/** Normalize a DuckDB type string (e.g. "DECIMAL(18,3)") to a FieldType. */
export function duckTypeToFieldType(duckType: string): FieldType {
  const t = duckType.toUpperCase();
  if (/BOOL/.test(t)) return 'boolean';
  if (/TIMESTAMP|DATETIME/.test(t)) return 'datetime';
  if (/DATE/.test(t)) return 'date';
  if (/TIME/.test(t)) return 'datetime';
  if (/INT|HUGEINT|SERIAL/.test(t)) return 'integer';
  if (/DOUBLE|FLOAT|REAL|DECIMAL|NUMERIC/.test(t)) return 'number';
  // VARCHAR, CHAR, TEXT, UUID, BLOB, ... default to string.
  return 'string';
}

export function defaultRole(type: FieldType): FieldRole {
  // Numbers default to measures; everything else is a dimension.
  return type === 'number' || type === 'integer' ? 'measure' : 'dimension';
}

export function defaultAggregation(type: FieldType): Aggregation {
  return type === 'number' || type === 'integer' ? 'sum' : 'count';
}

export interface RawColumn {
  name: string;
  duckType: string;
}

export function buildFields(datasetId: string, columns: RawColumn[]): Field[] {
  return columns.map((c) => {
    const type = duckTypeToFieldType(c.duckType);
    const role = defaultRole(type);
    return {
      id: `${datasetId}::${c.name}`,
      datasetId,
      name: c.name,
      column: c.name,
      role,
      type,
      defaultAggregation: defaultAggregation(type),
    } satisfies Field;
  });
}
