import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AllowedDomain, client } from '../api/client';

export function useAllowedDomains() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['allowed-domains'],
    queryFn: async () => (await client.get<AllowedDomain[]>('/allowed-domains')).data
  });

  const add = useMutation({
    mutationFn: (domain: string) => client.post('/allowed-domains', { domain }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-domains'] })
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) =>
      client.put(`/allowed-domains/${payload.id}`, { is_active: payload.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-domains'] })
  });

  const remove = useMutation({
    mutationFn: (id: number) => client.delete(`/allowed-domains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-domains'] })
  });

  return { query, add, toggle, remove };
}