import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface TreeNode {
  id: number;
  title: string;
  type: string;
  filename: string | null;
  is_directory: boolean;
  children?: TreeNode[];
}

export interface TreeData {
  parents: TreeNode[];
  children: TreeNode[];
}

interface UseResourceTreeOptions {
  resourceId: number | null;
  maxDepth?: number;
  maxParents?: number;
}

export function useResourceTree({ resourceId, maxDepth = 3, maxParents = 2 }: UseResourceTreeOptions) {
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!resourceId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get(`/resources/${resourceId}/tree/children`, { params: { max_depth: maxDepth } }).catch(() => ({ data: [] })),
      api.get(`/resources/${resourceId}/tree/parents`, { params: { max_levels: maxParents } }).catch(() => ({ data: [] })),
    ])
      .then(([childrenRes, parentsRes]) => {
        if (!cancelled) {
          setData({
            children: childrenRes.data || [],
            parents: parentsRes.data || [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load resource tree');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [resourceId, maxDepth, maxParents, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, loading, error, refetch };
}
