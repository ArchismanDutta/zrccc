// controllers/finance.controller.js
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Client  = require("../models/Client");
const Project = require("../models/Project");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

// ── Invoices ─────────────────────────────────────────────────

exports.createInvoice = async (req, res, next) => {
  try {
    const { clientId, lineItems, month, year, dueDate } = req.body;
    if (!clientId || !lineItems || !lineItems.length) throw new ValidationError("clientId and lineItems are required");

    const seq = await nextSequence("invoice");
    const invoiceId = `ZRC-INV-${String(seq).padStart(5, "0")}`;
    const invoiceNumber = `INV-${year || new Date().getFullYear()}-${String(seq).padStart(3, "0")}`;

    const invoice = await Invoice.create({
      invoiceId, invoiceNumber, clientId,
      projectId: req.body.projectId || null,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      lineItems,
      taxRate: req.body.taxRate ?? 18,
      dueDate, currency: req.body.currency || "INR",
      notes: req.body.notes || "", paymentTerms: req.body.paymentTerms || "Net 15",
      createdBy: req.user.id,
    });

    await logAudit({ action: "invoice.create", entity: "Invoice", entityId: invoice._id, userId: req.user.id, details: { invoiceId, invoiceNumber }, req });
    created(res, invoice);
  } catch (err) { next(err); }
};

exports.listInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, clientId, status, month, year, sort = "-createdAt" } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    if (req.user.role === "account_manager") {
      const clients = await Client.find({ accountManagerId: req.user.id }).select("_id").lean();
      filter.clientId = { $in: clients.map(c => c._id) };
    } else if (req.user.role === "client") {
      filter.clientId = req.user.linkedClientId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Invoice.find(filter).populate("clientId", "companyName displayName").sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Invoice.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("clientId", "companyName displayName contactName contactEmail gstNumber billingAddress")
      .populate("projectId", "name projectId")
      .lean();
    if (!invoice) throw new NotFoundError("Invoice");

    const payments = await Payment.find({ invoiceId: invoice._id }).sort("-paymentDate").lean();
    success(res, { ...invoice, payments });
  } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new NotFoundError("Invoice");
    if (invoice.status !== "draft") throw new ValidationError("Only draft invoices can be edited");

    const allowed = ["lineItems", "taxRate", "dueDate", "notes", "paymentTerms", "currency"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) invoice[key] = req.body[key];
    }
    await invoice.save();
    success(res, invoice);
  } catch (err) { next(err); }
};

exports.sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new NotFoundError("Invoice");
    invoice.status = "sent";
    invoice.sentAt = new Date();
    await invoice.save();
    await logAudit({ action: "invoice.send", entity: "Invoice", entityId: invoice._id, userId: req.user.id, req });

    // Fire-and-forget email notification
    try {
      const client = await Client.findById(invoice.clientId).lean();
      if (client) {
        const { sendInvoiceEmail } = require("../utils/mailer");
        sendInvoiceEmail(invoice, client);
      }
    } catch (emailErr) {
      console.error("⚠️ Invoice email failed:", emailErr.message);
    }

    success(res, invoice);
  } catch (err) { next(err); }
};

// ── Payments ─────────────────────────────────────────────────

exports.logPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod } = req.body;
    if (!invoiceId || !amount || !paymentDate) throw new ValidationError("invoiceId, amount, and paymentDate are required");

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice");

    const seq = await nextSequence("payment");
    const paymentId = `ZRC-PAY-${String(seq).padStart(5, "0")}`;

    const payment = await Payment.create({
      paymentId, invoiceId, clientId: invoice.clientId,
      amount, currency: invoice.currency,
      paymentDate, paymentMethod: paymentMethod || "bank_transfer",
      transactionRef: req.body.transactionRef || "",
      notes: req.body.notes || "",
      receiptUrl: req.body.receiptUrl || "",
      loggedBy: req.user.id,
    });

    // Update invoice paid amount and status
    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
    } else {
      invoice.status = "partial";
    }
    await invoice.save();

    await logAudit({ action: "payment.log", entity: "Payment", entityId: payment._id, userId: req.user.id, details: { amount, invoiceId: invoice.invoiceId }, req });

    // Fire-and-forget email notification
    try {
      const client = await Client.findById(invoice.clientId).lean();
      if (client) {
        const { sendPaymentReceivedEmail } = require("../utils/mailer");
        sendPaymentReceivedEmail(invoice, client, payment);
      }
    } catch (emailErr) {
      console.error("⚠️ Payment email failed:", emailErr.message);
    }

    created(res, payment);
  } catch (err) { next(err); }
};

exports.listPayments = async (req, res, next) => {
  try {
    const { clientId, invoiceId, page = 1, limit = 50, sort = "-paymentDate" } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (invoiceId) filter.invoiceId = invoiceId;

    // If account_manager role, filter to their clients only
    if (req.user.role === "account_manager") {
      const myClients = await Client.find({ accountManagerId: req.user.id }).select("_id").lean();
      const myClientIds = myClients.map(c => c._id);
      filter.clientId = { $in: myClientIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Payment.find(filter).populate("loggedBy", "name").sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Payment.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.clientPayments = async (req, res, next) => {
  try {
    const projects = await Project.find({ isArchived: false })
      .populate("clientId", "companyName displayName")
      .select("name projectId budget currency status clientId")
      .sort("clientId name")
      .lean();

    const invoiceAgg = await Invoice.aggregate([
      { $group: { _id: "$projectId", billed: { $sum: "$totalAmount" }, paid: { $sum: "$paidAmount" } } },
    ]);
    const invMap = {};
    invoiceAgg.forEach(i => { if (i._id) invMap[String(i._id)] = { billed: i.billed, paid: i.paid }; });

    const clientMap = {};
    projects.forEach(p => {
      if (!p.clientId) return;
      const cid = String(p.clientId._id);
      if (!clientMap[cid]) clientMap[cid] = { client: p.clientId, projects: [], totalContract: 0, totalPaid: 0 };
      const inv = invMap[String(p._id)] || { billed: 0, paid: 0 };
      const balance = Math.max(0, (p.budget || 0) - inv.paid);
      clientMap[cid].projects.push({
        _id: p._id, name: p.name, projectId: p.projectId, status: p.status,
        contractValue: p.budget || 0, currency: p.currency || "INR",
        billed: inv.billed, paid: inv.paid, balance,
      });
      clientMap[cid].totalContract += p.budget || 0;
      clientMap[cid].totalPaid += inv.paid;
    });

    Object.values(clientMap).forEach(c => { c.totalBalance = Math.max(0, c.totalContract - c.totalPaid); });

    success(res, Object.values(clientMap));
  } catch (err) { next(err); }
};

exports.downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("clientId", "companyName displayName contactName contactEmail")
      .lean();
    if (!invoice) throw new NotFoundError("Invoice");

    // For client role, verify invoice belongs to their linked client
    if (req.user.role === "client") {
      if (String(invoice.clientId) !== String(req.user.linkedClientId)) {
        throw new ForbiddenError("Access denied");
      }
    }

    const { generateInvoicePdf } = require("../utils/invoicePdf");
    generateInvoicePdf(invoice, res);
  } catch (err) { next(err); }
};

// ── Finance Dashboard ────────────────────────────────────────

exports.dashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Total expected (sum of active client MRR)
    const activeClients = await Client.find({ status: "active", isArchived: false }).select("contract companyName").lean();
    const expectedMRR = activeClients.reduce((s, c) => s + (c.contract?.monthlyValue || 0), 0);

    // Collected this month
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    const monthPayments = await Payment.aggregate([
      { $match: { paymentDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const collected = monthPayments[0]?.total || 0;

    // Overdue invoices
    const overdueInvoices = await Invoice.find({
      status: { $in: ["sent", "partial"] },
      dueDate: { $lt: now },
    }).populate("clientId", "companyName").lean();

    const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.totalAmount - inv.paidAmount), 0);

    success(res, {
      expectedMRR,
      collected,
      outstanding: expectedMRR - collected,
      overdue: overdueTotal,
      overdueInvoices: overdueInvoices.length,
      activeClientCount: activeClients.length,
      month: currentMonth,
      year: currentYear,
    });
  } catch (err) { next(err); }
};
