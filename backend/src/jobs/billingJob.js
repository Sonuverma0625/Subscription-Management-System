import { runDueBilling } from '../services/billing.service.js';

export async function billingJob() {
  const summary = await runDueBilling();
  console.log(`[billing] ${summary.created} invoice(s) created, ${summary.skipped} skipped, ${summary.failed} failed across ${summary.subscriptions} subscription(s).`);
  if (summary.failures.length) console.error('[billing] Failures:', summary.failures);
  return summary;
}
