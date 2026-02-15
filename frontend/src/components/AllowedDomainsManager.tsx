import { useState } from 'react';
import { useAllowedDomains } from '../hooks/useAllowedDomains';

export default function AllowedDomainsManager() {
  const { query, add, toggle, remove } = useAllowedDomains();
  const [domain, setDomain] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Allowed Domains</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(domain);
          setDomain('');
        }}
      >
        <input className="flex-1 rounded-md border p-2" placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} required />
        <button className="rounded-md bg-cyan-600 px-4 py-2 text-white">Add Domain</button>
      </form>
      {(query.data ?? []).map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
          <p>{d.domain}</p>
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-1" onClick={() => toggle.mutate({ id: d.id, is_active: !d.is_active })}>{d.is_active ? 'Disable' : 'Enable'}</button>
            <button className="rounded-md border border-red-200 px-3 py-1 text-red-600" onClick={() => window.confirm('Delete domain?') && remove.mutate(d.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}