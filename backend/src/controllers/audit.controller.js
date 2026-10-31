import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, search, entity, from, to } = req.validatedQuery;
  const where = {
    ...(entity ? { entity } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(search ? { OR: [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Audit history loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});
