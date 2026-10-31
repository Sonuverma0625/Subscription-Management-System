import { prisma } from '../config/db.js';
import { sendPaymentRetryReminder } from '../config/mailer.js';
import { createNotification } from '../services/notification.service.js';

const nextReminderDays = [3, 7];

export async function paymentRetryJob(asOf = new Date()) {
  const attempts = await prisma.paymentAttempt.findMany({
    where: { status: 'FAILED', nextRetryAt: { lte: asOf } },
    include: {
      invoice: {
        include: {
          customer: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 200,
  });
  let reminded = 0;
  for (const attempt of attempts) {
    const invoice = attempt.invoice;
    if (invoice.status !== 'CONFIRMED' || Number(invoice.amountPaid) >= Number(invoice.total)) {
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { nextRetryAt: null } });
      continue;
    }
    const openAttempt = await prisma.paymentAttempt.findFirst({
      where: { invoiceId: invoice.id, status: 'PENDING' },
      select: { id: true },
    });
    if (openAttempt) {
      await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { nextRetryAt: null } });
      continue;
    }
    const reminderNumber = attempt.retryReminderCount + 1;
    const notification = await createNotification({
      userId: invoice.customer.user.id,
      type: 'PAYMENT_RETRY',
      title: 'Payment needs another try',
      body: `Payment for ${invoice.number} did not go through. Retry it from your invoices.`,
      href: '/invoices',
      dedupeKey: `payment-retry:${attempt.id}:${reminderNumber}`,
    });
    if (!notification) continue;
    const delayDays = nextReminderDays[attempt.retryReminderCount];
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: {
      retryReminderCount: reminderNumber,
      nextRetryAt: delayDays ? new Date(asOf.getTime() + delayDays * 86400000) : null,
    } });
    try {
      await sendPaymentRetryReminder({ to: invoice.customer.user.email, customerName: invoice.customer.user.name, invoice, attempt, reminderNumber });
    } catch (error) { console.warn(`[payment-retry] In-app notice saved; email failed for ${invoice.number}:`, error.message); }
    reminded += 1;
  }
  return { checked: attempts.length, reminded };
}
