import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, DigestHistory } from '../api/client';

export function useHistory(page: number, pageSize = 10) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['history', page, pageSize],
    queryFn: async () => (await client.get<{ items: DigestHistory[]; total: number; page: number; pageSize: number }>(`/history?page=${page}&pageSize=${pageSize}`)).data
  });

  const remove = useMutation({
    mutationFn: (id: number) => client.delete(`/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] })
  });

  return { query, remove };
}