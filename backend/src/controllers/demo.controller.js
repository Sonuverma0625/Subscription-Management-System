import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { mailer } from '../config/mailer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';

export const createDemoRequest = asyncHandler(async (req, res) => {
  if (req.body.website) return res.status(202).json({ success: true, data: null, message: 'Thanks. Your request has been received.' });
  const request = await prisma.demoRequest.create({ data: {
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    companyName: req.body.companyName,
    message: req.body.message,
  } });
  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: env.COMPANY_EMAIL,
      replyTo: request.email,
      subject: `Darkside demo request from ${request.companyName}`,
      text: `Name: ${request.name}\nEmail: ${request.email}\nCompany: ${request.companyName}\n\n${request.message}`,
    });
  } catch (error) {
    console.warn('[demo] Request saved; notification email could not be sent:', error.message);
  }
  return res.status(201).json({ success: true, data: { id: request.id }, message: 'Thanks. Your request has been received.' });
});

export const listDemoRequests = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.validatedQuery;
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.demoRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.demoRequest.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Demo requests loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const updateDemoRequestStatus = asyncHandler(async (req, res) => {
  const request = await prisma.$transaction(async (tx) => {
    const current = await tx.demoRequest.findUnique({ where: { id: req.params.id } });
    if (!current) return null;
    const updated = await tx.demoRequest.update({ where: { id: current.id }, data: { status: req.body.status } });
    await writeAuditLog(tx, { userId: req.user.id, action: 'DEMO_REQUEST_STATUS_UPDATED', entity: 'DemoRequest', entityId: updated.id, details: { from: current.status, to: updated.status } });
    return updated;
  });
  if (!request) return res.status(404).json({ success: false, data: null, message: 'Demo request not found.' });
  return res.status(200).json({ success: true, data: { request }, message: 'Demo request status updated.' });
});
