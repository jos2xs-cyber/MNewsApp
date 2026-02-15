import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, Source } from '../api/client';

export function useSources() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['sources'],
    queryFn: async () => (await client.get<Source[]>('/sources')).data
  });

  const add = useMutation({
    mutationFn: (payload: { category: string; url: string; name: string }) => client.post('/sources', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] })
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) => client.put(`/sources/${payload.id}`, { is_active: payload.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] })
  });

  const remove = useMutation({
    mutationFn: (id: number) => client.delete(`/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] })
  });

  return { query, add, toggle, remove };
}