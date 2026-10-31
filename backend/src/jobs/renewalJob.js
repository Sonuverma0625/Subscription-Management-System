import { prisma } from '../config/db.js';
import { sendRenewalReminder } from '../config/mailer.js';
import { createNotification } from '../services/notification.service.js';

export async function renewalJob(asOf = new Date()) {
  const horizon = new Date(asOf.getTime() + 7 * 86400000);
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', pausedAt: null, nextBillingDate: { gte: asOf, lte: horizon } },
    include: { plan: { select: { name: true } }, customer: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { nextBillingDate: 'asc' },
  });
  let notified = 0;
  for (const subscription of subscriptions) {
    const day = subscription.nextBillingDate.toISOString().slice(0, 10);
    const notification = await createNotification({
      userId: subscription.customer.user.id,
      type: 'RENEWAL_UPCOMING',
      title: 'Subscription renewal coming up',
      body: `${subscription.plan.name} (${subscription.number}) renews on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(subscription.nextBillingDate)}.`,
      href: '/portal',
      dedupeKey: `renewal:${subscription.id}:${day}`,
    });
    if (!notification) continue;
    try {
      await sendRenewalReminder({ to: subscription.customer.user.email, customerName: subscription.customer.user.name, subscription, plan: subscription.plan });
    } catch (error) { console.warn(`[renewal] In-app notice saved; email failed for ${subscription.number}:`, error.message); }
    notified += 1;
  }
  return { matched: subscriptions.length, notified };
}
