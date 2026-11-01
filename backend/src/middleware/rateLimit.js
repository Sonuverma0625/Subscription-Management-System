import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication requests. Please wait before trying again.',
  },
});

// Failed sign-in attempts still share the same 10-per-15-minute threshold,
// while successful sign-ins no longer consume the user's retry budget.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication requests. Please wait before trying again.',
  },
});

export const sessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many session requests. Please wait before trying again.',
  },
});
