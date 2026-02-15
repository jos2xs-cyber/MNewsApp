import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, Settings } from '../api/client';

export interface SettingsUpdatePayload {
  email: string;
  schedule_time: string;
  top_stories_count: number;
  stories_per_category: number;
  max_article_age_hours: number;
  skip_paywalls: boolean;
}

export function useSettings() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await client.get<Settings>('/settings')).data
  });

  const save = useMutation({
    mutationFn: (payload: SettingsUpdatePayload) =>
      client.put('/settings', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] })
  });

  return { query, save };
}
