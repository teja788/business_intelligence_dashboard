/**
 * A dataset augmented with the workbook's calculated fields for that dataset.
 * Calculated fields are first-class Fields usable anywhere a normal field is.
 */
import { useMemo } from 'react';
import type { Dataset } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { useDashboardStore } from '@/store/dashboardStore';

export function useEffectiveDataset(datasetId: string | undefined): Dataset | undefined {
  const dataset = useAppStore((s) => s.datasets.find((d) => d.id === datasetId));
  const calcFields = useDashboardStore((s) => s.workbook.calculatedFields);

  return useMemo(() => {
    if (!dataset) return undefined;
    const extra = (calcFields ?? []).filter((f) => f.datasetId === dataset.id);
    if (!extra.length) return dataset;
    return { ...dataset, fields: [...dataset.fields, ...extra] };
  }, [dataset, calcFields]);
}
