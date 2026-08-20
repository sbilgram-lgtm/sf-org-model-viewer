import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function useSchema(auth) {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(() => {
    if (!auth || !auth.authenticated) return;
    setLoading(true);
    setError(null);
    axios.get('/api/schema', { withCredentials: true })
      .then(r => setSchema(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => { fetch(); }, [fetch]);

  return { schema, loading, error, refetch: fetch };
}
