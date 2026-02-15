import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, DigestStatus } from '../api/client';

export function useDigestStatus() {
  return useQuery({
    queryKey: ['digest-status'],
    queryFn: async () => (await client.get<DigestStatus>('/digest/status')).data,
    refetchInterval: 5000
  });
}

export function useDigestActions() {
  const qc = useQueryClient();
  const generate = useMutation({
    mutationFn: () => client.post('/digest/generate'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['digest-status'] })
  });
  const send = useMutation({
    mutationFn: () => client.post('/digest/send'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['digest-status'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    }
  });
  return { generate, send };
}