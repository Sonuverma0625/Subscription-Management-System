import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'brightloop_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashesMatch(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function durationToMilliseconds(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error('Token duration must use s, m, h, or d units.');
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2]];
}

export function createAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: 'brightloop-api',
    audience: 'brightloop-frontend',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'brightloop-api',
    audience: 'brightloop-frontend',
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: 'brightloop-api',
    audience: 'brightloop-frontend',
  });
}

export function createRefreshToken(userId, sessionId) {
  return jwt.sign({ sub: userId, sid: sessionId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.REFRESH_TOKEN_TTL,
    issuer: 'brightloop-api',
    audience: 'brightloop-frontend',
  });
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
    maxAge: durationToMilliseconds(env.REFRESH_TOKEN_TTL),
  };
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
  });
}
