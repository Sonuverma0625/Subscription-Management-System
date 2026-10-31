import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../utils/tokens.js';
import {
  loginUser,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  rotateSession,
  toPublicUser,
} from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const user = await registerCustomer(req.body);
  res.status(201).json({ success: true, data: { user }, message: 'Customer account created. You can now sign in.' });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user }, message: 'Signed in successfully.' });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Sign in to continue.');
  const result = await rotateSession(token);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user }, message: 'Session refreshed.' });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSession(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: null, message: 'Signed out successfully.' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      customer: { select: { id: true, companyName: true } },
    },
  });
  if (!user) throw new ApiError(401, 'Your account is unavailable. Sign in again.');
  res.status(200).json({ success: true, data: { user: toPublicUser(user) }, message: 'Current user loaded.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email);
  res.status(200).json({ success: true, data: null, message: 'If an active account matches that email, a reset link will be sent shortly.' });
});

export const reset = asyncHandler(async (req, res) => {
  await resetPassword(req.params.token, req.body.password);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: null, message: 'Password updated. Sign in with your new password.' });
});
