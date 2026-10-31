import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { billingJob } from '../jobs/billingJob.js';
import { expiryJob } from '../jobs/expiryJob.js';
import { overdueJob } from '../jobs/overdueJob.js';
import { paymentRetryJob } from '../jobs/paymentRetryJob.js';
import { renewalJob } from '../jobs/renewalJob.js';

export const cronRouter = Router();

const dailyJobs = [
  ['expiry', expiryJob],
  ['billing', billingJob],
  ['overdue', overdueJob],
  ['renewal', renewalJob],
  ['paymentRetry', paymentRetryJob],
];

function isAuthorized(request) {
  const expected = env.CRON_SECRET;
  const authorization = request.get('authorization') || '';
  if (!expected || !authorization.startsWith('Bearer ')) return false;

  const receivedBuffer = Buffer.from(authorization.slice('Bearer '.length));
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function summarize(name, result) {
  if (name === 'expiry') return { closed: result };
  if (name === 'billing') {
    return {
      subscriptions: result.subscriptions,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
    };
  }
  if (name === 'overdue') return result;
  if (name === 'renewal') return result;
  if (name === 'paymentRetry') return result;
  return {};
}

cronRouter.get('/daily', async (request, response) => {
  if (!isAuthorized(request)) {
    return response.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  const jobs = {};
  const failures = [];

  for (const [name, run] of dailyJobs) {
    try {
      const result = await run();
      jobs[name] = { status: 'completed', ...summarize(name, result) };
      if (name === 'billing' && result.failed > 0) failures.push(name);
    } catch (error) {
      console.error(`[cron:${name}] Daily job failed:`, error);
      jobs[name] = { status: 'failed' };
      failures.push(name);
    }
  }

  const success = failures.length === 0;
  return response.status(success ? 200 : 500).json({
    success,
    data: { jobs, failures },
    message: success ? 'Daily jobs completed.' : 'One or more daily jobs failed.',
  });
});
