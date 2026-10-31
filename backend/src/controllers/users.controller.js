import bcrypt from 'bcrypt';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';

const PASSWORD_COST = 12;

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validatedQuery;
  const where = {
    role: 'STAFF',
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.status(200).json({
    success: true,
    data: items,
    message: 'Team members loaded.',
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const createStaff = asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, PASSWORD_COST);
  try {
    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: req.body.name, email: req.body.email, passwordHash, role: 'STAFF' },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      });
      await writeAuditLog(tx, { userId: req.user.id, action: 'STAFF_CREATED', entity: 'User', entityId: created.id });
      return created;
    });
    res.status(201).json({ success: true, data: { user: staff }, message: 'Staff account created.' });
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'An account with this email already exists.');
    throw error;
  }
});

export const setStaffActive = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, role: 'STAFF' }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Staff account not found.');

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: existing.id },
      data: { isActive: req.body.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!req.body.isActive) {
      await tx.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await writeAuditLog(tx, {
      userId: req.user.id,
      action: req.body.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
      entity: 'User',
      entityId: user.id,
    });
    return user;
  });
  res.status(200).json({ success: true, data: { user: updated }, message: updated.isActive ? 'Staff account activated.' : 'Staff account deactivated.' });
});
