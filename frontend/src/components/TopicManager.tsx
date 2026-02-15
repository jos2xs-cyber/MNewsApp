import { useState } from 'react';
import { useTopics } from '../hooks/useTopics';

const categories = ['business', 'tech', 'finance', 'ai', 'lifestyle', 'local', 'food'] as const;

export default function TopicManager() {
  const { query, add, toggle, remove } = useTopics();
  const [form, setForm] = useState({ category: 'business', topic: '' });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Topics</h2>
      <form
        className="grid gap-2 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(form);
          setForm({ ...form, topic: '' });
        }}
      >
        <select className="rounded-md border p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input className="rounded-md border p-2" placeholder="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required />
        <button className="rounded-md bg-cyan-600 px-4 py-2 text-white">Add Topic</button>
      </form>
      <div className="space-y-2">
        {(query.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
            <div>
              <p className="text-slate-900 font-medium">{t.topic}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{t.category}</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border px-3 py-1" onClick={() => toggle.mutate({ id: t.id, is_active: !t.is_active })}>{t.is_active ? 'Disable' : 'Enable'}</button>
              <button className="rounded-md border border-red-200 px-3 py-1 text-red-600" onClick={() => window.confirm('Delete topic?') && remove.mutate(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
