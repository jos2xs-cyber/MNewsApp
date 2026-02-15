import { useState } from 'react';
import { useHistory } from '../hooks/useHistory';

export default function DigestHistory() {
  const [page, setPage] = useState(1);
  const { query, remove } = useHistory(page, 10);

  const data = query.data;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Digest History</h2>
      {(data?.items ?? []).map((item) => (
        <div key={item.id} className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900">{new Date(item.generated_at).toLocaleString()} ({item.articles_count} articles)</p>
            <button className="rounded-md border border-red-200 px-3 py-1 text-red-600" onClick={() => window.confirm('Delete record?') && remove.mutate(item.id)}>Delete</button>
          </div>
          <p className="text-sm text-slate-600">{item.sent_successfully ? 'Sent' : 'Not sent'} {item.error_message ? `- ${item.error_message}` : ''}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <button className="rounded-md border px-3 py-1" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}