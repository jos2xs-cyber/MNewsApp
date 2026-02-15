import toast from 'react-hot-toast';
import { useDigestActions } from '../hooks/useDigest';

export default function TestDigestButton() {
  const { send } = useDigestActions();
  return (
    <button
      className="rounded-md bg-cyan-600 px-4 py-2 font-medium text-white"
      onClick={async () => {
        try {
          const res = await send.mutateAsync();
          const payload = res.data as { articles_count: number; queued?: boolean };
          if (payload.queued) {
            toast('Digest request queued');
            return;
          }
          toast.success(`Digest sent (${payload.articles_count} articles)`);
        } catch {
          toast.error('Failed to send digest');
        }
      }}
      disabled={send.isPending}
    >
      {send.isPending ? 'Sending...' : 'Send Test Digest Now'}
    </button>
  );
}