import cron, { ScheduledTask } from 'node-cron';
import { queries } from './db/queries';
import { sendDigestNow, setSchedulerStatus, resetDailyUsage } from './services/digestRunner';

let digestTask: ScheduledTask | null = null;
let resetTask: ScheduledTask | null = null;

function stopCurrentTasks(): void {
  if (digestTask) {
    digestTask.stop();
    digestTask = null;
  }
  if (resetTask) {
    resetTask.stop();
    resetTask = null;
  }
}

function estimateNextRun(cronExpr: string): string | null {
  const [minStr, hourStr] = cronExpr.split(' ');
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(Number(minStr));
  next.setHours(Number(hourStr));
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

export async function reloadScheduler(): Promise<void> {
  stopCurrentTasks();
  const settings = await queries.getSettings();
  if (!settings) {
    setSchedulerStatus(false, null);
    return;
  }

  digestTask = cron.schedule(settings.schedule_time, async () => {
    await sendDigestNow('scheduled');
    setSchedulerStatus(true, estimateNextRun(settings.schedule_time));
  });

  resetTask = cron.schedule('0 0 * * *', () => {
    resetDailyUsage();
  });

  setSchedulerStatus(true, estimateNextRun(settings.schedule_time));
}

export async function startScheduler(): Promise<void> {
  await reloadScheduler();
}
