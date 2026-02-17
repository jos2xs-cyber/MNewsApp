import axios from 'axios';
import { WeatherForecast, WeatherDaily } from '../types';

const WTTR_URL = 'https://wttr.in/Dallas?format=j1';
const REQUEST_TIMEOUT_MS = 12_000;

function parseDaily(day: any): WeatherDaily {
  const today = day ?? {};
  const hourly = Array.isArray(today.hourly) ? today.hourly[0] : undefined;
  const description = hourly?.weatherDesc?.[0]?.value ?? today.weatherDesc?.[0]?.value ?? 'Sunny';
  const icon = hourly?.weatherIconUrl?.[0]?.value ?? '';
  const chanceOfRain = Number(hourly?.chanceofrain ?? today.chanceofrain ?? 0);
  return {
    date: today.date ?? '',
    weekday: today.date ? new Date(today.date).toLocaleDateString('en-US', { weekday: 'short' }) : '',
    description,
    icon,
    maxTempF: Number(today.maxtempF ?? 0),
    minTempF: Number(today.mintempF ?? 0),
    avgTempF: Number(today.avgtempF ?? 0),
    chanceOfRain
  };
}

export async function fetchDallasForecast(): Promise<WeatherForecast> {
  const response = await axios.get(WTTR_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': 'NewsDigestWeather/1.0 (+local dashboard)'
    }
  });

  const data = response.data ?? {};
  const location = data.nearest_area?.[0]?.areaName?.[0]?.value ?? 'Dallas, TX';
  const updated = data.current_condition?.[0]?.observation_time ?? new Date().toISOString();
  const rawForecast = Array.isArray(data.weather) ? data.weather.slice(0, 5) : [];
  const forecast = rawForecast.map(parseDaily);

  return {
    location,
    updated,
    forecast
  };
}
