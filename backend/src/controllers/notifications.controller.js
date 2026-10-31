import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 30);
  const items = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: limit });
  const unread = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
  return res.status(200).json({ success: true, data: items, message: 'Notifications loaded.', meta: { unread } });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  if (result.count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } });
    if (!exists) throw new ApiError(404, 'Notification not found.');
  }
  return res.status(200).json({ success: true, data: null, message: 'Notification marked as read.' });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  return res.status(200).json({ success: true, data: { updated: result.count }, message: 'Notifications marked as read.' });
});
