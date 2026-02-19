import axios from 'axios';
import { WeatherForecast, WeatherDaily } from '../types';

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=32.844&longitude=-97.143&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FChicago';
const FORCED_LOCATION = 'Bedford, TX 76021';
const REQUEST_TIMEOUT_MS = 12_000;

function codeToDescription(code: number): string {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Cloudy';
}

function parseDaily(index: number, daily: any): WeatherDaily {
  const date = daily?.time?.[index] ?? '';
  const weatherCode = Number(daily?.weather_code?.[index] ?? 3);
  const maxTempF = Number(daily?.temperature_2m_max?.[index] ?? 0);
  const minTempF = Number(daily?.temperature_2m_min?.[index] ?? 0);
  const chanceOfRain = Number(daily?.precipitation_probability_max?.[index] ?? 0);
  return {
    date,
    weekday: date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short' }) : '',
    description: codeToDescription(weatherCode),
    icon: '',
    maxTempF,
    minTempF,
    avgTempF: (maxTempF + minTempF) / 2,
    chanceOfRain
  };
}

export async function fetchBedfordForecast(): Promise<WeatherForecast> {
  const response = await axios.get(OPEN_METEO_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': 'NewsDigestWeather/1.0 (+local dashboard)'
    }
  });

  const data = response.data ?? {};
  const location = FORCED_LOCATION;
  const updated = new Date().toISOString();
  const times = Array.isArray(data?.daily?.time) ? data.daily.time : [];
  const forecast = times.slice(0, 5).map((_: unknown, index: number) => parseDaily(index, data.daily));

  return {
    location,
    updated,
    forecast
  };
}
