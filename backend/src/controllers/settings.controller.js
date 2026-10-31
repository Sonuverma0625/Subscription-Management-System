import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';

export const getCompanySettings = asyncHandler(async (_req, res) => {
  const settings = await prisma.companySettings.findUnique({ where: { id: 'main' } });
  return res.status(200).json({ success: true, data: { settings: settings || { id: 'main', companyName: env.COMPANY_NAME, companyEmail: env.COMPANY_EMAIL, companyAddress: env.COMPANY_ADDRESS }, settingsStored: Boolean(settings) }, message: 'Company settings loaded.' });
});

export const updateCompanySettings = asyncHandler(async (req, res) => {
  const settings = await prisma.$transaction(async (tx) => {
    const updated = await tx.companySettings.upsert({
      where: { id: 'main' },
      create: { id: 'main', ...req.body, companyAddress: req.body.companyAddress || null },
      update: { ...req.body, companyAddress: req.body.companyAddress || null },
    });
    await writeAuditLog(tx, { userId: req.user.id, action: 'COMPANY_SETTINGS_UPDATED', entity: 'CompanySettings', entityId: updated.id });
    return updated;
  });
  return res.status(200).json({ success: true, data: { settings }, message: 'Company settings saved.' });
});
