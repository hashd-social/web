import { useState, useEffect } from 'react';
import { useByteCaveClient } from './useByteCaveClient';

interface UseHashdUrlResult {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function useHashdUrl(hashdUrl: string | null | undefined): UseHashdUrlResult {
  const { client } = useByteCaveClient();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hashdUrl || !hashdUrl.startsWith('hashd://')) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!client) {
      setError('ByteCave client not initialized');
      return;
    }

    const cid = hashdUrl.replace('hashd://', '').split('?')[0];

    let mounted = true;
    setLoading(true);
    setError(null);

    client.retrieve(cid)
      .then(result => {
        if (!mounted) return;

        if (result.success && result.data) {
          const dataCopy = new Uint8Array(result.data);
          const blob = new Blob([dataCopy]);
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        } else {
          setError(result.error || 'Failed to retrieve content');
          setLoading(false);
        }
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to retrieve content');
        setLoading(false);
      });

    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [hashdUrl, client]);

  return { blobUrl, loading, error };
}
