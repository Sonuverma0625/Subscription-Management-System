import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db.js';
import { sendPasswordResetEmail } from '../config/mailer.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { writeAuditLog } from '../utils/audit.js';
import {
  createAccessToken,
  createRefreshToken,
  durationToMilliseconds,
  hashToken,
  hashesMatch,
  verifyRefreshToken,
} from '../utils/tokens.js';

const PASSWORD_COST = 12;

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    ...(user.customer ? { customer: user.customer } : {}),
  };
}

async function issueSession(user) {
  const placeholderHash = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationToMilliseconds(env.REFRESH_TOKEN_TTL));
  const session = await prisma.refreshSession.create({
    data: { userId: user.id, tokenHash: placeholderHash, expiresAt },
  });
  const refreshToken = createRefreshToken(user.id, session.id);
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(refreshToken) },
  });
  return { accessToken: createAccessToken(user), refreshToken };
}

export async function registerCustomer(input) {
  const name = input.name?.trim() || input.email.split('@')[0];
  const companyName = input.companyName?.trim() || name;
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_COST);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email: input.email,
          passwordHash,
          role: 'CUSTOMER',
          customer: { create: { companyName } },
        },
        include: { customer: { select: { id: true, companyName: true } } },
      });
      await writeAuditLog(tx, { userId: created.id, action: 'CUSTOMER_REGISTERED', entity: 'User', entityId: created.id });
      return created;
    });
    return toPublicUser(user);
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'An account with this email already exists.');
    throw error;
  }
}

export async function loginUser(input) {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { customer: { select: { id: true, companyName: true } } } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }
  if (!user.isActive) throw new ApiError(403, 'This account is inactive. Contact your administrator.');

  const tokens = await issueSession(user);
  await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id } });
  return { user: toPublicUser(user), ...tokens };
}

export async function rotateSession(refreshToken) {
  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Your session has expired. Sign in again.');
  }
  if (claims.type !== 'refresh' || typeof claims.sub !== 'string' || typeof claims.sid !== 'string') {
    throw new ApiError(401, 'Your session is invalid. Sign in again.');
  }

  const oldSession = await prisma.refreshSession.findUnique({
    where: { id: claims.sid },
    include: { user: { include: { customer: { select: { id: true, companyName: true } } } } },
  });
  if (!oldSession || oldSession.userId !== claims.sub || oldSession.revokedAt || oldSession.expiresAt <= new Date() || !hashesMatch(oldSession.tokenHash, hashToken(refreshToken)) || !oldSession.user.isActive) {
    throw new ApiError(401, 'Your session is no longer valid. Sign in again.');
  }

  const next = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshSession.updateMany({
      where: { id: oldSession.id, userId: oldSession.userId, revokedAt: null, tokenHash: oldSession.tokenHash, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new ApiError(401, 'Your session was already used. Sign in again.');

    const placeholderHash = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationToMilliseconds(env.REFRESH_TOKEN_TTL));
    const session = await tx.refreshSession.create({ data: { userId: oldSession.userId, tokenHash: placeholderHash, expiresAt } });
    const rotatedRefreshToken = createRefreshToken(oldSession.userId, session.id);
    await tx.refreshSession.update({ where: { id: session.id }, data: { tokenHash: hashToken(rotatedRefreshToken) } });
    return { refreshToken: rotatedRefreshToken, accessToken: createAccessToken(oldSession.user) };
  });

  return { user: toPublicUser(oldSession.user), ...next };
}

export async function revokeSession(refreshToken) {
  if (!refreshToken) return;
  try {
    const claims = verifyRefreshToken(refreshToken);
    if (claims.type !== 'refresh' || typeof claims.sub !== 'string' || typeof claims.sid !== 'string') return;
    await prisma.refreshSession.updateMany({
      where: { id: claims.sid, userId: claims.sub, revokedAt: null, tokenHash: hashToken(refreshToken) },
      data: { revokedAt: new Date() },
    });
  } catch {
    // The cookie is cleared by the controller even when the presented token is expired or malformed.
  }
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const token = randomBytes(32).toString('base64url');
  const resetTokenHash = hashToken(token);
  const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash, resetTokenExpiry } });
  await sendPasswordResetEmail({ to: user.email, name: user.name, token });
}

export async function resetPassword(token, password) {
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: hashToken(token), resetTokenExpiry: { gt: new Date() }, isActive: true },
  });
  if (!user) throw new ApiError(400, 'This password reset link is invalid or has expired.');

  const passwordHash = await bcrypt.hash(password, PASSWORD_COST);
  await prisma.$transaction(async (tx) => {
    const consumed = await tx.user.updateMany({
      where: { id: user.id, resetTokenHash: hashToken(token), resetTokenExpiry: { gt: new Date() }, isActive: true },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
    });
    if (consumed.count !== 1) throw new ApiError(400, 'This password reset link is invalid or has expired.');
    await tx.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await writeAuditLog(tx, { userId: user.id, action: 'PASSWORD_RESET', entity: 'User', entityId: user.id });
  });
}
