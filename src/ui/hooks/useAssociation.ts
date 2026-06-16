/**
 * Compute a field's value states (selected / possible / excluded) under the
 * current global selection. Recomputes whenever the selection changes.
 */
import { useEffect, useState } from 'react';
import type { ValueState } from '@/model/types';
import { getDataSource } from '@/engine/source';
import { useSelectionStore, datasetIdOf } from '@/store/selectionStore';

export function useAssociation(fieldId: string) {
  const selection = useSelectionStore((s) => s.selection);
  const [values, setValues] = useState<ValueState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDataSource()
      .possibleValues({ datasetId: datasetIdOf(fieldId), field: fieldId }, selection)
      .then((v) => {
        if (!cancelled) setValues(v);
      })
      .catch(() => {
        if (!cancelled) setValues([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId, selection]);

  return { values, loading };
}
