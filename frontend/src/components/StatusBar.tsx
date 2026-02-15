import { useDigestStatus } from '../hooks/useDigest';

export default function StatusBar() {
  const { data } = useDigestStatus();

  return (
    <div className="mt-6 rounded-lg border bg-white p-4 text-sm text-slate-600">
      <p>Scheduler: {data?.schedulerRunning ? 'Running' : 'Stopped'} {data?.nextRunAt ? `- Next: ${new Date(data.nextRunAt).toLocaleString()}` : ''}</p>
      <p>API usage today: {data?.todayOpenAICalls ?? 0}/{data?.limit ?? 50}</p>
      {data?.lastError ? <p className="text-red-600">Last error: {data.lastError}</p> : null}
    </div>
  );
}