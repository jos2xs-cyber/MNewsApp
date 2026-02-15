import { useState } from 'react';
import { useSources } from '../hooks/useSources';

const categories = ['business', 'tech', 'finance'] as const;

export default function SourceManager() {
  const { query, add, toggle, remove } = useSources();
  const [form, setForm] = useState({ category: 'business', url: '', name: '' });

  const items = query.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Sources</h2>
      <form
        className="grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(form);
          setForm({ ...form, url: '', name: '' });
        }}
      >
        <select className="rounded-md border p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input className="rounded-md border p-2" placeholder="https://site.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        <input className="rounded-md border p-2" placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <button className="rounded-md bg-cyan-600 px-4 py-2 text-white">Add Source</button>
      </form>
      <div className="space-y-2">
        {items.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
            <div>
              <p className="font-medium text-slate-900">{s.name}</p>
              <p className="text-sm text-slate-600">{s.category} - {s.url}</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border px-3 py-1" onClick={() => toggle.mutate({ id: s.id, is_active: !s.is_active })}>{s.is_active ? 'Disable' : 'Enable'}</button>
              <button className="rounded-md border border-red-200 px-3 py-1 text-red-600" onClick={() => window.confirm('Delete source?') && remove.mutate(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}