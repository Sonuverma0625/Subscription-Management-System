import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailer = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  ...(env.MAIL_USER ? { auth: { user: env.MAIL_USER, pass: env.MAIL_PASSWORD } } : {}),
});

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetLink = `${env.PASSWORD_RESET_URL.replace(/\/$/, '')}/${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Reset your Darkside password',
    text: `Hello ${name},\n\nUse this link to reset your Darkside password. It expires in 30 minutes:\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Use the link below to reset your Darkside password. It expires in 30 minutes.</p><p><a href="${escapeHtml(resetLink)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendInvoiceEmail({ to, customerName, invoice, pdf }) {
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `Darkside invoice ${invoice.number}`,
    text: `Hello ${customerName},\n\nYour invoice ${invoice.number} for INR ${Number(invoice.total).toFixed(2)} is attached. It is due on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.dueDate))}.\n\nThank you,\n${env.COMPANY_NAME}`,
    html: `<p>Hello ${escapeHtml(customerName)},</p><p>Your invoice <strong>${escapeHtml(invoice.number)}</strong> for INR ${Number(invoice.total).toFixed(2)} is attached.</p><p>Due date: ${escapeHtml(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.dueDate)))}</p><p>Thank you,<br>${escapeHtml(env.COMPANY_NAME)}</p>`,
    attachments: [{ filename: `${invoice.number}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}

export async function sendOverdueReminder({ to, customerName, invoice }) {
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `Reminder: Darkside invoice ${invoice.number} is overdue`,
    text: `Hello ${customerName},\n\nInvoice ${invoice.number} has an outstanding balance of INR ${(Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)} and was due on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.dueDate))}. Please contact ${env.COMPANY_EMAIL} if you have already paid.\n\n${env.COMPANY_NAME}`,
    html: `<p>Hello ${escapeHtml(customerName)},</p><p>Invoice <strong>${escapeHtml(invoice.number)}</strong> has an outstanding balance of INR ${(Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)}.</p><p>Due date: ${escapeHtml(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(invoice.dueDate)))}</p><p>Contact ${escapeHtml(env.COMPANY_EMAIL)} if you have already paid.</p>`,
  });
}

export async function sendPaymentReceiptEmail({ to, customerName, invoice, payment, pdf }) {
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `Payment receipt for Darkside invoice ${invoice.number}`,
    text: `Hello ${customerName},\n\nWe received INR ${Number(payment.amount).toFixed(2)} for invoice ${invoice.number} on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(payment.paymentDate))}. Your remaining balance is INR ${Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)}.\n\nThank you,\n${env.COMPANY_NAME}`,
    html: `<p>Hello ${escapeHtml(customerName)},</p><p>We received <strong>INR ${Number(payment.amount).toFixed(2)}</strong> for invoice <strong>${escapeHtml(invoice.number)}</strong>.</p><p>Remaining balance: INR ${Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)}</p><p>Thank you,<br>${escapeHtml(env.COMPANY_NAME)}</p>`,
    ...(pdf ? { attachments: [{ filename: `${invoice.number}-receipt.pdf`, content: pdf, contentType: 'application/pdf' }] } : {}),
  });
}

export async function sendRenewalReminder({ to, customerName, subscription, plan }) {
  const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(subscription.nextBillingDate));
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `Upcoming renewal: ${subscription.number}`,
    text: `Hello ${customerName},\n\nYour ${plan.name} subscription (${subscription.number}) is scheduled for renewal on ${date}. Sign in to your Darkside portal to review the subscription.\n\n${env.COMPANY_NAME}`,
    html: `<p>Hello ${escapeHtml(customerName)},</p><p>Your <strong>${escapeHtml(plan.name)}</strong> subscription (${escapeHtml(subscription.number)}) is scheduled for renewal on ${escapeHtml(date)}.</p><p><a href="${escapeHtml(`${env.APP_URL}/portal`)}">Open your Darkside portal</a></p>`,
  });
}

export async function sendPaymentRetryReminder({ to, customerName, invoice, attempt, reminderNumber }) {
  await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: `Action needed: payment for invoice ${invoice.number}`,
    text: `Hello ${customerName},\n\nWe could not complete the payment for invoice ${invoice.number}. Outstanding balance: INR ${(Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)}. This is reminder ${reminderNumber} of 3. Please sign in and retry the payment.\n\n${env.COMPANY_NAME}`,
    html: `<p>Hello ${escapeHtml(customerName)},</p><p>We could not complete the payment for invoice <strong>${escapeHtml(invoice.number)}</strong>. Outstanding balance: INR ${(Number(invoice.total) - Number(invoice.amountPaid)).toFixed(2)}.</p><p>This is reminder ${reminderNumber} of 3. Please <a href="${escapeHtml(`${env.APP_URL}/invoices`)}">sign in and retry the payment</a>.</p>`,
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
