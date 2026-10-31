import { prisma } from '../config/db.js';

export async function createNotification(data, client = prisma) {
  const create = {
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    href: data.href || null,
    ...(data.dedupeKey ? { dedupeKey: data.dedupeKey } : {}),
  };
  if (data.dedupeKey) {
    const inserted = await client.notification.createMany({ data: [create], skipDuplicates: true });
    if (!inserted.count) return null;
    return client.notification.findUnique({ where: { userId_dedupeKey: { userId: data.userId, dedupeKey: data.dedupeKey } } });
  }
  return client.notification.create({ data: create });
}
