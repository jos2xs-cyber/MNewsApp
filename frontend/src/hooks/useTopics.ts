import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, Topic } from '../api/client';

export function useTopics() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['topics'],
    queryFn: async () => (await client.get<Topic[]>('/topics')).data
  });

  const add = useMutation({
    mutationFn: (payload: { category: string; topic: string }) => client.post('/topics', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] })
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) => client.put(`/topics/${payload.id}`, { is_active: payload.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] })
  });

  const remove = useMutation({
    mutationFn: (id: number) => client.delete(`/topics/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] })
  });

  return { query, add, toggle, remove };
}