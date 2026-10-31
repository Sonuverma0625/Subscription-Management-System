import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const isRazorpayConfigured = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export function verifyHmac(payload, signature, secret) {
  if (!payload || !signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function razorpayRequest(path, { method = 'GET', body } = {}) {
  if (!isRazorpayConfigured()) throw new ApiError(503, 'Online payments are not configured yet.');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result.error?.description || result.error?.reason || 'The payment provider could not process this request.';
    throw new ApiError(502, message);
  }
  return result;
}
