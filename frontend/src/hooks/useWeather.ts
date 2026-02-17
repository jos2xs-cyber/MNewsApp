import { useQuery } from '@tanstack/react-query';
import { client, WeatherForecast } from '../api/client';

export function useWeatherForecast() {
  return useQuery<WeatherForecast>({
    queryKey: ['weather'],
    queryFn: async () => (await client.get<WeatherForecast>('/weather')).data,
    staleTime: 1000 * 60 * 5
  });
}
