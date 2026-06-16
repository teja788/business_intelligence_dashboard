/** Load a dataset's column profile through the DataSource. */
import { useEffect, useState } from 'react';
import type { DatasetProfile } from '@/model/types';
import { getDataSource } from '@/engine/source';

export function useProfile(datasetId: string | undefined) {
  const [profile, setProfile] = useState<DatasetProfile>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!datasetId) {
      setProfile(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    getDataSource()
      .profile(datasetId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  return { profile, loading, error };
}
