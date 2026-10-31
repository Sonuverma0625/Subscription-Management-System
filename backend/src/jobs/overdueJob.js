import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendOverdueReminder } from '../config/mailer.js';

export async function overdueJob(asOf = new Date()) {
  const reminderCutoff = new Date(asOf.getTime() - 7 * 86400000);
  const overdue = await prisma.invoice.findMany({
    where: {
      status: 'CONFIRMED',
      dueDate: { lt: asOf },
      ...(env.OVERDUE_EMAILS ? { OR: [{ overdueReminderSentAt: null }, { overdueReminderSentAt: { lte: reminderCutoff } }] } : {}),
    },
    include: { customer: { include: { user: { select: { email: true, name: true } } } }, subscription: { select: { number: true } } },
    orderBy: { dueDate: 'asc' },
  });
  let sent = 0;
  if (env.OVERDUE_EMAILS) {
    for (const invoice of overdue) {
      try {
        await sendOverdueReminder({ to: invoice.customer.user.email, customerName: invoice.customer.user.name, invoice });
        await prisma.invoice.update({ where: { id: invoice.id }, data: { overdueReminderSentAt: asOf } });
        sent += 1;
      } catch (error) { console.error(`[overdue] Could not notify ${invoice.number}:`, error.message); }
    }
  }
  if (overdue.length) console.log(`[overdue] ${overdue.length} outstanding invoice(s) are overdue${env.OVERDUE_EMAILS ? `; ${sent} reminder(s) sent` : ''}.`);
  return { count: overdue.length, sent };
}
