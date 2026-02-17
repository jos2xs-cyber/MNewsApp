import { WeatherDaily } from '../api/client';
import { useWeatherForecast } from '../hooks/useWeather';

function formatTemperature(value: number) {
  return `${Math.round(value)}°F`;
}

function formatChance(value: number) {
  return `${Math.round(value)}%`;
}

export default function WeatherBanner() {
  const { data, isLoading, isError } = useWeatherForecast();

  return (
    <section className="mx-auto mt-4 max-w-6xl rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-500">Dallas, TX forecast</p>
        <h2 className="text-2xl font-semibold text-slate-900">5-day outlook</h2>
        <p className="text-sm text-slate-500">
          Updated {data ? new Date(data.updated).toLocaleTimeString() : 'just now'}
        </p>
      </div>
      {isError ? (
        <p className="mt-4 text-sm text-red-600">Unable to load weather right now.</p>
      ) : isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading weather...</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data?.forecast.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </section>
  );
}

function DayCard({ day }: { day: WeatherDaily }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{day.weekday || day.date}</p>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Dallas</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {day.icon ? <img src={day.icon} alt={day.description} className="h-8 w-8" /> : null}
        <p className="text-base font-semibold text-cyan-600">{day.description}</p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{formatTemperature(day.avgTempF)}</span>
        <span className="text-xs text-slate-500">
          {formatTemperature(day.maxTempF)} / {formatTemperature(day.minTempF)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Rain {formatChance(day.chanceOfRain)}</span>
        <span>Feels like {formatTemperature((day.maxTempF + day.minTempF) / 2)}</span>
      </div>
    </article>
  );
}
