import cron from 'node-cron';
import { billingJob } from './billingJob.js';
import { expiryJob } from './expiryJob.js';
import { overdueJob } from './overdueJob.js';
import { renewalJob } from './renewalJob.js';
import { paymentRetryJob } from './paymentRetryJob.js';

const tasks = [];

export function startScheduledJobs() {
  if (tasks.length) return;
  tasks.push(cron.schedule('5 0 * * *', () => void expiryJob().catch((error) => console.error('[expiry] Scheduled job failed:', error.message))));
  tasks.push(cron.schedule('10 0 * * *', () => void billingJob().catch((error) => console.error('[billing] Scheduled job failed:', error.message))));
  tasks.push(cron.schedule('20 0 * * *', () => void overdueJob().catch((error) => console.error('[overdue] Scheduled job failed:', error.message))));
  tasks.push(cron.schedule('25 0 * * *', () => void renewalJob().catch((error) => console.error('[renewal] Scheduled job failed:', error.message))));
  tasks.push(cron.schedule('30 0 * * *', () => void paymentRetryJob().catch((error) => console.error('[payment-retry] Scheduled job failed:', error.message))));
  console.log('Daily expiry, billing, overdue, renewal, and payment retry jobs scheduled between 00:05 and 00:30 server time.');
}

export function stopScheduledJobs() {
  for (const task of tasks) task.stop();
  tasks.length = 0;
}
