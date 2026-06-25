// controllers/finance.controller.js
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Client  = require("../models/Client");
const Project = require("../models/Project");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");
const { sanitizeSort, isValidUrl, parsePagination } = require("../utils/sanitize");

const INVOICE_SORTS    = ["-createdAt", "createdAt", "-dueDate", "dueDate", "-totalAmount", "totalAmount"];
const PAYMENT_SORTS    = ["-paymentDate", "paymentDate", "-amount", "amount", "-createdAt", "createdAt"];
const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];

// ── Invoices ─────────────────────────────────────────────────

exports.createInvoice = async (req, res, next) => {
  try {
    const { clientId, lineItems, month, year, dueDate } = req.body;
    if (!clientId || !lineItems || !lineItems.length) throw new ValidationError("clientId and lineItems are required");

    const clientExists = await Client.exists({ _id: clientId, isArchived: false });
    if (!clientExists) throw new ValidationError("Client not found");

    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) throw new ValidationError("dueDate must be a valid date");
    }

    // Compute amount server-side so callers cannot inflate totals
    const sanitizedLineItems = lineItems.map(item => ({
      ...item,
      amount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const seq = await nextSequence("invoice");
    const invoiceId = `ZRC-INV-${String(seq).padStart(5, "0")}`;
    const invoiceNumber = `INV-${year || new Date().getFullYear()}-${String(seq).padStart(3, "0")}`;

    const invoice = await Invoice.create({
      invoiceId, invoiceNumber, clientId,
      projectId: req.body.projectId || null,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      lineItems: sanitizedLineItems,
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
    const { page = 1, limit = 50, clientId, status, month, year } = req.query;
    const sort = sanitizeSort(req.query.sort, INVOICE_SORTS, "-createdAt");
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (status) {
      const statuses = String(status).split(",").map(s => s.trim()).filter(Boolean);
      const invalid = statuses.filter(s => !INVOICE_STATUSES.includes(s));
      if (invalid.length) throw new ValidationError(`Invalid status: ${invalid.join(", ")}. Allowed: ${INVOICE_STATUSES.join(", ")}`);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    if (req.user.role === "account_manager") {
      const clients = await Client.find({ accountManagerId: req.user.id }).select("_id").lean();
      filter.clientId = { $in: clients.map(c => c._id) };
    } else if (req.user.role === "client") {
      filter.clientId = req.user.linkedClientId;
    } else if (req.user.role === "project_manager") {
      const myProjects = await Project.find({ "teamMembers.userId": req.user.id }).select("_id").lean();
      filter.projectId = { $in: myProjects.map(p => p._id) };
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 50);
    const [docs, total] = await Promise.all([
      Invoice.find(filter).populate("clientId", "companyName displayName").sort(sort).skip(skip).limit(safeLimit).lean(),
      Invoice.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

const _checkInvoiceAccess = async (invoice, user) => {
  if (["super_admin", "admin"].includes(user.role)) return;

  if (user.role === "client") {
    if (!user.linkedClientId || String(invoice.clientId) !== String(user.linkedClientId)) {
      throw new NotFoundError("Invoice");
    }
    return;
  }

  if (user.role === "account_manager") {
    const client = await Client.findById(invoice.clientId).select("accountManagerId").lean();
    if (!client || String(client.accountManagerId) !== String(user.id)) throw new NotFoundError("Invoice");
    return;
  }

  if (user.role === "project_manager") {
    if (!invoice.projectId) throw new NotFoundError("Invoice");
    const project = await Project.findOne({
      _id: invoice.projectId,
      "teamMembers.userId": user.id,
    }).select("_id").lean();
    if (!project) throw new NotFoundError("Invoice");
    return;
  }

  // Any other role with invoices:read:own but no ownership rule → deny
  throw new ForbiddenError("Access denied");
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("clientId", "companyName displayName contactName contactEmail gstNumber billingAddress")
      .populate("projectId", "name projectId")
      .lean();
    if (!invoice) throw new NotFoundError("Invoice");
    await _checkInvoiceAccess(invoice, req.user);

    const payments = await Payment.find({ invoiceId: invoice._id }).sort("-paymentDate").lean();
    success(res, { ...invoice, payments });
  } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new NotFoundError("Invoice");
    await _checkInvoiceAccess(invoice, req.user);
    if (invoice.status !== "draft") throw new ValidationError("Only draft invoices can be edited");

    const allowed = ["lineItems", "taxRate", "dueDate", "notes", "paymentTerms", "currency"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) invoice[key] = req.body[key];
    }
    // Recompute line-item amounts server-side
    if (req.body.lineItems) {
      invoice.lineItems = invoice.lineItems.map(item => ({
        ...item.toObject(),
        amount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      }));
    }
    await invoice.save();
    await logAudit({ action: "invoice.update", entity: "Invoice", entityId: invoice._id, userId: req.user.id, details: { fields: Object.keys(req.body) }, req });
    success(res, invoice);
  } catch (err) { next(err); }
};

exports.sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new NotFoundError("Invoice");
    await _checkInvoiceAccess(invoice, req.user);
    if (invoice.status !== "draft") throw new ValidationError("Only draft invoices can be sent");
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

exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new NotFoundError("Invoice");
    await _checkInvoiceAccess(invoice, req.user);
    if (invoice.status === "paid") throw new ValidationError("Cannot cancel a fully paid invoice");
    if (invoice.status === "cancelled") throw new ValidationError("Invoice is already cancelled");

    const reason = req.body.reason || "";
    invoice.status = "cancelled";
    invoice.cancelReason = reason;
    await invoice.save();

    await logAudit({ action: "invoice.cancel", entity: "Invoice", entityId: invoice._id, userId: req.user.id, details: { invoiceId: invoice.invoiceId, reason }, req });
    success(res, invoice);
  } catch (err) { next(err); }
};

// ── Payments ─────────────────────────────────────────────────

exports.logPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod } = req.body;
    if (!invoiceId || amount == null || !paymentDate) throw new ValidationError("invoiceId, amount, and paymentDate are required");
    if (typeof amount !== "number" || amount <= 0) throw new ValidationError("amount must be a positive number");
    const parsedDate = new Date(paymentDate);
    if (isNaN(parsedDate.getTime())) throw new ValidationError("paymentDate must be a valid date");
    if (parsedDate > new Date()) throw new ValidationError("paymentDate cannot be in the future");
    if (!isValidUrl(req.body.receiptUrl)) throw new ValidationError("receiptUrl must be a valid http/https URL");

    // TDS validation
    const tdsRate = req.body.tdsRate ?? 0;
    const tdsAmount = req.body.tdsAmount != null
      ? req.body.tdsAmount
      : Math.round(amount * (tdsRate / 100) * 100) / 100;
    if (typeof tdsRate !== "number" || tdsRate < 0 || tdsRate > 100) throw new ValidationError("tdsRate must be a number between 0 and 100");
    if (typeof tdsAmount !== "number" || tdsAmount < 0) throw new ValidationError("tdsAmount must be a non-negative number");
    if (tdsAmount > amount) throw new ValidationError("tdsAmount cannot exceed the payment amount");
    const netAmountReceived = Math.round((amount - tdsAmount) * 100) / 100;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice");
    await _checkInvoiceAccess(invoice, req.user);
    if (["paid", "cancelled"].includes(invoice.status)) {
      throw new ValidationError(`Cannot log a payment against a ${invoice.status} invoice`);
    }

    const seq = await nextSequence("payment");
    const paymentId = `ZRC-PAY-${String(seq).padStart(5, "0")}`;

    const payment = await Payment.create({
      paymentId, invoiceId, clientId: invoice.clientId,
      amount, currency: invoice.currency,
      paymentDate, paymentMethod: paymentMethod || "bank_transfer",
      transactionRef: req.body.transactionRef || "",
      notes: req.body.notes || "",
      receiptUrl: req.body.receiptUrl || "",
      tdsRate, tdsAmount, netAmountReceived,
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
    const { clientId, invoiceId, page = 1, limit = 50 } = req.query;
    const sort = sanitizeSort(req.query.sort, PAYMENT_SORTS, "-paymentDate");
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (invoiceId) filter.invoiceId = invoiceId;

    // If account_manager role, filter to their clients only
    if (req.user.role === "account_manager") {
      const myClients = await Client.find({ accountManagerId: req.user.id }).select("_id").lean();
      const myClientIds = myClients.map(c => c._id);
      filter.clientId = { $in: myClientIds };
    }

    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit, 50);
    const [docs, total] = await Promise.all([
      Payment.find(filter).populate("loggedBy", "name").sort(sort).skip(skip).limit(safeLimit).lean(),
      Payment.countDocuments(filter),
    ]);
    paginated(res, { docs, total, page: safePage, limit: safeLimit });
  } catch (err) { next(err); }
};

exports.voidPayment = async (req, res, next) => {
  try {
    if (!["super_admin", "admin"].includes(req.user.role)) throw new ForbiddenError("Only admins can void payments");

    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new NotFoundError("Payment");

    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.paidAmount = Math.max(0, Math.round(((invoice.paidAmount || 0) - payment.amount) * 100) / 100);
      if (invoice.paidAmount <= 0) {
        invoice.paidAmount = 0;
        invoice.status = invoice.sentAt ? "sent" : "draft";
        invoice.paidAt = null;
      } else {
        invoice.status = "partial";
        invoice.paidAt = null;
      }
      await invoice.save();
    }

    await Payment.findByIdAndDelete(payment._id);
    await logAudit({ action: "payment.void", entity: "Payment", entityId: payment._id, userId: req.user.id, details: { paymentId: payment.paymentId, amount: payment.amount }, req });
    success(res, { message: "Payment voided and invoice balance reversed" });
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

    // _checkInvoiceAccess works on ObjectId fields; after populate, clientId is an object.
    // Pass a plain-id copy so the helper's String() comparisons work correctly.
    await _checkInvoiceAccess(
      { ...invoice, clientId: invoice.clientId?._id ?? invoice.clientId },
      req.user
    );

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

    // Actual outstanding balance — unpaid portion of all sent/partial invoices
    const outstandingAgg = await Invoice.aggregate([
      { $match: { status: { $in: ["sent", "partial"] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } } } },
    ]);
    const outstanding = outstandingAgg[0]?.total || 0;

    // Overdue invoices — sent/partial past due date
    const overdueInvoices = await Invoice.find({
      status: { $in: ["sent", "partial"] },
      dueDate: { $lt: now },
    }).populate("clientId", "companyName").lean();

    const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.totalAmount - inv.paidAmount), 0);

    success(res, {
      expectedMRR,
      collected,
      outstanding,
      overdue: overdueTotal,
      overdueInvoices: overdueInvoices.length,
      activeClientCount: activeClients.length,
      month: currentMonth,
      year: currentYear,
    });
  } catch (err) { next(err); }
};
