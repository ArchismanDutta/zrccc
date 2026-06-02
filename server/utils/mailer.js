// utils/mailer.js
// Email notification system using Nodemailer with cPanel SMTP.
// All functions are fire-and-forget — errors are logged but never thrown.
const nodemailer = require("nodemailer");
const path = require("path");

// ── Transporter Setup ────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_SECURE } = process.env;

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
    console.warn("⚠️ Mail not configured — MAIL_HOST/MAIL_USER/MAIL_PASS missing in .env");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: parseInt(MAIL_PORT) || 465,
    secure: MAIL_SECURE === "true",
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });

  return transporter;
}

const FROM = () => process.env.MAIL_FROM || `"ZRC Media Network" <${process.env.MAIL_USER || "noreply@zrcmedianetwork.com"}>`;

// ── Helper ───────────────────────────────────────────────────
async function sendMail(options) {
  const t = getTransporter();
  if (!t) { console.warn("⚠️ Skipping email — transporter not configured"); return; }
  try {
    await t.sendMail({ from: FROM(), ...options });
    console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
  } catch (err) {
    console.error(`❌ Email failed to ${options.to}:`, err.message);
  }
}

// ── 1. Invoice Sent ──────────────────────────────────────────
async function sendInvoiceEmail(invoice, client) {
  const email = client.contactEmail;
  if (!email) return;

  await sendMail({
    to: email,
    subject: `Invoice ${invoice.invoiceNumber} from ZRC Media Network`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Invoice from ZRC Media Network</h2>
        <p>Dear ${client.contactName || client.companyName},</p>
        <p>Please find details of your invoice below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Invoice Number</td><td style="padding: 10px;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Amount</td><td style="padding: 10px;">₹${(invoice.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Due Date</td><td style="padding: 10px;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "N/A"}</td></tr>
        </table>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network</p>
      </div>
    `,
  });
}

// ── 2. Payment Reminder (Overdue) ────────────────────────────
async function sendPaymentReminderEmail(invoice, client) {
  const email = client.contactEmail;
  if (!email) return;

  const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);

  await sendMail({
    to: email,
    subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is overdue`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Payment Reminder</h2>
        <p>Dear ${client.contactName || client.companyName},</p>
        <p>This is a friendly reminder that your invoice <strong>${invoice.invoiceNumber}</strong> is <strong>${daysOverdue} day(s) overdue</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #fff3f3;"><td style="padding: 10px; font-weight: bold;">Outstanding Amount</td><td style="padding: 10px; color: #e74c3c; font-weight: bold;">₹${outstanding.toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Due Date</td><td style="padding: 10px;">${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</td></tr>
        </table>
        <p>Please arrange payment at your earliest convenience. If payment has already been made, please disregard this email.</p>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network</p>
      </div>
    `,
  });
}

// ── 3. Payment Received ──────────────────────────────────────
async function sendPaymentReceivedEmail(invoice, client, payment) {
  const email = client.contactEmail;
  if (!email) return;

  const remaining = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));

  await sendMail({
    to: email,
    subject: `Payment Received — Invoice ${invoice.invoiceNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Payment Received</h2>
        <p>Dear ${client.contactName || client.companyName},</p>
        <p>We've received your payment. Thank you!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f0faf0;"><td style="padding: 10px; font-weight: bold;">Amount Received</td><td style="padding: 10px;">₹${(payment.amount || 0).toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Invoice</td><td style="padding: 10px;">${invoice.invoiceNumber}</td></tr>
          <tr style="background: #f0faf0;"><td style="padding: 10px; font-weight: bold;">Remaining Balance</td><td style="padding: 10px;">${remaining > 0 ? "₹" + remaining.toLocaleString("en-IN") : "Fully Paid ✓"}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network</p>
      </div>
    `,
  });
}

// ── 4. Salary Paid (with payslip PDF attached) ───────────────
async function sendSalaryPaidEmail(employee, salaryRecord) {
  if (!employee.email) return;

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const attachments = [];
  if (salaryRecord.payslipUrl) {
    const filePath = path.join(__dirname, "..", salaryRecord.payslipUrl);
    try {
      const fs = require("fs");
      if (fs.existsSync(filePath)) {
        attachments.push({
          filename: `Payslip-${salaryRecord.salaryId}.pdf`,
          path: filePath,
        });
      }
    } catch { /* ignore attachment errors */ }
  }

  await sendMail({
    to: employee.email,
    subject: `Salary Paid — ${monthNames[salaryRecord.month - 1]} ${salaryRecord.year}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Salary Payment Confirmation</h2>
        <p>Dear ${employee.name},</p>
        <p>Your salary for <strong>${monthNames[salaryRecord.month - 1]} ${salaryRecord.year}</strong> has been processed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Net Salary</td><td style="padding: 10px; font-weight: bold;">₹${salaryRecord.netSalary.toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Payment Method</td><td style="padding: 10px;">${(salaryRecord.paymentMethod || "").replace("_", " ").toUpperCase()}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 10px; font-weight: bold;">Transaction Ref</td><td style="padding: 10px;">${salaryRecord.transactionRef || "N/A"}</td></tr>
        </table>
        <p>${attachments.length > 0 ? "Your payslip is attached to this email." : ""}</p>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network</p>
      </div>
    `,
    attachments,
  });
}

// ── 5. New Ticket Raised ─────────────────────────────────────
async function sendNewTicketEmail(ticket, client, accountManager) {
  if (!accountManager?.email) return;

  await sendMail({
    to: accountManager.email,
    subject: `New Support Ticket: ${ticket.title} [${ticket.ticketId}]`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e67e22;">New Support Ticket</h2>
        <p>A new ticket has been raised by <strong>${client.companyName || client.displayName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #fff8f0;"><td style="padding: 10px; font-weight: bold;">Ticket ID</td><td style="padding: 10px;">${ticket.ticketId}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Title</td><td style="padding: 10px;">${ticket.title}</td></tr>
          <tr style="background: #fff8f0;"><td style="padding: 10px; font-weight: bold;">Priority</td><td style="padding: 10px;">${(ticket.priority || "medium").toUpperCase()}</td></tr>
        </table>
        <p><strong>Description:</strong></p>
        <p style="padding: 15px; background: #f9f9f9; border-radius: 8px;">${ticket.description}</p>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network CRM</p>
      </div>
    `,
  });
}

// ── 6. Ticket Reply Notification ─────────────────────────────
async function sendTicketReplyEmail(ticket, client, reply) {
  const email = client.contactEmail;
  if (!email) return;

  await sendMail({
    to: email,
    subject: `Reply on Ticket: ${ticket.title} [${ticket.ticketId}]`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Ticket Update</h2>
        <p>Dear ${client.contactName || client.companyName},</p>
        <p>A reply has been posted on your support ticket <strong>${ticket.ticketId}</strong>:</p>
        <div style="padding: 15px; background: #f5f5f5; border-left: 4px solid #3498db; border-radius: 4px; margin: 20px 0;">
          ${reply.message}
        </div>
        <p>You can reply from the client portal to continue the conversation.</p>
        <p style="color: #666; font-size: 12px;">— ZRC Media Network</p>
      </div>
    `,
  });
}

// ── Overdue Invoice Reminder Cron ────────────────────────────
function startOverdueReminder() {
  const Invoice = require("../models/Invoice");
  const Client = require("../models/Client");

  const checkOverdue = async () => {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const overdueInvoices = await Invoice.find({
        status: { $in: ["sent", "partial"] },
        dueDate: { $lt: now },
        $or: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { $exists: false } },
          { lastReminderSentAt: { $lt: twentyFourHoursAgo } },
        ],
      }).populate("clientId", "companyName contactName contactEmail").lean();

      if (overdueInvoices.length > 0) {
        console.log(`📧 Sending ${overdueInvoices.length} overdue payment reminder(s)...`);
      }

      for (const invoice of overdueInvoices) {
        if (invoice.clientId) {
          await sendPaymentReminderEmail(invoice, invoice.clientId);
          await Invoice.findByIdAndUpdate(invoice._id, { lastReminderSentAt: new Date() });
        }
      }
    } catch (err) {
      console.error("❌ Overdue reminder check failed:", err.message);
    }
  };

  // Run immediately, then every 24 hours
  checkOverdue();
  setInterval(checkOverdue, 24 * 60 * 60 * 1000);
  console.log("⏰ Overdue invoice reminder cron started (every 24h)");
}

module.exports = {
  sendInvoiceEmail,
  sendPaymentReminderEmail,
  sendPaymentReceivedEmail,
  sendSalaryPaidEmail,
  sendNewTicketEmail,
  sendTicketReplyEmail,
  startOverdueReminder,
};
