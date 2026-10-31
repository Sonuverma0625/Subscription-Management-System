import { closeExpiredSubscriptions } from '../services/billing.service.js';

export async function expiryJob() {
  const count = await closeExpiredSubscriptions();
  if (count) console.log(`[expiry] ${count} subscription(s) auto-closed.`);
  return count;
}
