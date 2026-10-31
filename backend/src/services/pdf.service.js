import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

const money = (amount) => `INR ${Number(amount || 0).toFixed(2)}`;
const displayDate = (date) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date));

export function createInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    void prisma.companySettings.findUnique({ where: { id: 'main' } }).then((settings) => {
      const companyName = settings?.companyName || env.COMPANY_NAME;
      const companyAddress = settings?.companyAddress || env.COMPANY_ADDRESS;
      const companyEmail = settings?.companyEmail || env.COMPANY_EMAIL;
      document.fillColor('#6D1A36').font('Helvetica-Bold').fontSize(22).text(companyName);
      document.fillColor('#3B0D1E').font('Helvetica').fontSize(9);
      if (companyAddress) document.text(companyAddress);
      document.text(companyEmail).moveDown(1.5);
    document.fillColor('#6D1A36').font('Helvetica-Bold').fontSize(20).text('INVOICE', { align: 'right' });
    document.fillColor('#3B0D1E').font('Helvetica').fontSize(10).text(invoice.number, { align: 'right' });
    document.text(`Issued ${displayDate(invoice.issueDate)}  ·  Due ${displayDate(invoice.dueDate)}`, { align: 'right' });
    document.moveDown(1.8);

    const customer = invoice.customer;
    document.fillColor('#6D1A36').font('Helvetica-Bold').fontSize(9).text('BILL TO');
    document.fillColor('#3B0D1E').font('Helvetica-Bold').fontSize(12).text(customer.companyName);
    document.font('Helvetica').fontSize(10).text(customer.user?.name || '').text(customer.user?.email || '');
    if (customer.address) document.text(customer.address);
    if (customer.gstin || customer.taxId) document.text(`Tax ID: ${customer.gstin || customer.taxId}`);
    document.moveDown(1.5);
    document.fillColor('#6D1A36').font('Helvetica-Bold').fontSize(9).text('SERVICE PERIOD');
    document.fillColor('#3B0D1E').font('Helvetica').fontSize(10).text(`${displayDate(invoice.billingPeriodStart)} – ${displayDate(invoice.billingPeriodEnd)}`);
    document.moveDown(1.5);

    const tableX = 48;
    const columns = { description: 48, quantity: 335, unit: 385, amount: 485 };
    const drawHeader = () => {
      const y = document.y;
      document.fillColor('#6D1A36').roundedRect(tableX, y, 499, 24, 7).fill();
      document.fillColor('#FFF8EE').font('Helvetica-Bold').fontSize(8);
      document.text('DESCRIPTION', columns.description + 10, y + 8, { width: 275 });
      document.text('QTY', columns.quantity, y + 8, { width: 38, align: 'right' });
      document.text('UNIT', columns.unit, y + 8, { width: 70, align: 'right' });
      document.text('AMOUNT', columns.amount, y + 8, { width: 54, align: 'right' });
      document.y = y + 32;
    };
    drawHeader();
    for (const line of invoice.lines) {
      const y = document.y;
      const descriptionHeight = document.heightOfString(line.description, { width: 265, font: 'Helvetica', fontSize: 9 });
      const rowHeight = Math.max(28, descriptionHeight + 12);
      if (y + rowHeight > document.page.height - 100) { document.addPage(); drawHeader(); }
      const rowY = document.y;
      document.fillColor('#3B0D1E').font('Helvetica').fontSize(9).text(line.description, columns.description + 8, rowY + 6, { width: 265 });
      if (Number(line.taxRate) > 0) document.fillColor('#806874').fontSize(7).text(`Tax ${Number(line.taxRate)}%`, columns.description + 8, rowY + 6 + descriptionHeight, { width: 265 });
      document.fillColor('#3B0D1E').fontSize(9).text(String(line.quantity), columns.quantity, rowY + 6, { width: 38, align: 'right' });
      document.text(money(line.unitPrice), columns.unit, rowY + 6, { width: 70, align: 'right' });
      document.font('Helvetica-Bold').text(money(line.amount), columns.amount, rowY + 6, { width: 54, align: 'right' });
      document.moveTo(tableX, rowY + rowHeight).lineTo(tableX + 499, rowY + rowHeight).strokeColor('#EADBC3').lineWidth(0.6).stroke();
      document.y = rowY + rowHeight;
    }
    document.moveDown(1);
    const summaryX = 355;
    const summaryWidth = 192;
    const summaryRow = (label, value, strong = false) => {
      document.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 12 : 9).fillColor(strong ? '#6D1A36' : '#3B0D1E');
      document.text(label, summaryX, document.y, { width: 100, continued: true });
      document.text(value, { width: summaryWidth - 100, align: 'right' });
      document.moveDown(0.45);
    };
    summaryRow('Subtotal', money(invoice.subtotal));
    summaryRow('Discounts', `- ${money(invoice.discountTotal)}`);
    summaryRow('Tax', money(invoice.taxTotal));
    document.moveTo(summaryX, document.y).lineTo(summaryX + summaryWidth, document.y).strokeColor('#6D1A36').lineWidth(0.7).stroke();
    document.moveDown(0.6);
    summaryRow('TOTAL', money(invoice.total), true);
    document.moveDown(1.5);
      document.fillColor('#806874').font('Helvetica').fontSize(8).text(`Subscription ${invoice.subscription.number} · Thank you for your business.`, { align: 'center' });
      document.end();
    }).catch(reject);
  });
}
