import { FormEvent, useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export default function SettingsPanel() {
  const { query, save } = useSettings();
  const [form, setForm] = useState({
    email: '',
    schedule_time: '0 7 * * *',
    top_stories_count: 10,
    stories_per_category: 5,
    max_article_age_hours: 24,
    skip_paywalls: true
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        email: query.data.email,
        schedule_time: query.data.schedule_time,
        top_stories_count: query.data.top_stories_count,
        stories_per_category: query.data.stories_per_category,
        max_article_age_hours: query.data.max_article_age_hours,
        skip_paywalls: Boolean(query.data.skip_paywalls)
      });
    }
  }, [query.data]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
      <input className="w-full rounded-md border p-2" type="email" placeholder="Recipient email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input className="w-full rounded-md border p-2" placeholder="Cron time (m h * * *)" value={form.schedule_time} onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} required />
      <input className="w-full rounded-md border p-2" type="number" min={1} max={50} value={form.top_stories_count} onChange={(e) => setForm({ ...form, top_stories_count: Number(e.target.value) })} />
      <input className="w-full rounded-md border p-2" type="number" min={1} max={20} value={form.stories_per_category} onChange={(e) => setForm({ ...form, stories_per_category: Number(e.target.value) })} />
      <input className="w-full rounded-md border p-2" type="number" min={1} max={168} value={form.max_article_age_hours} onChange={(e) => setForm({ ...form, max_article_age_hours: Number(e.target.value) })} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.skip_paywalls} onChange={(e) => setForm({ ...form, skip_paywalls: e.target.checked })} />
        Skip paywalled articles
      </label>
      <button className="rounded-md bg-cyan-600 px-4 py-2 text-white" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Settings'}</button>
    </form>
  );
}