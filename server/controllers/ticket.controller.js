// controllers/ticket.controller.js
const SupportTicket = require("../models/SupportTicket");
const Client = require("../models/Client");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

// POST /api/tickets — client raises a ticket
exports.createTicket = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    if (!title || !description) throw new ValidationError("title and description are required");

    // Client must have a linked client
    let clientId = req.body.clientId;
    if (req.user.role === "client") {
      if (!req.user.linkedClientId) throw new ValidationError("Your account is not linked to a client");
      clientId = req.user.linkedClientId;
    }
    if (!clientId) throw new ValidationError("clientId is required");

    const ticket = await SupportTicket.create({
      clientId,
      raisedBy: req.user.id,
      title,
      description,
      priority: priority || "medium",
    });

    // Fire-and-forget: email the account manager
    try {
      const client = await Client.findById(clientId).populate("accountManagerId", "name email").lean();
      if (client?.accountManagerId?.email) {
        const { sendNewTicketEmail } = require("../utils/mailer");
        sendNewTicketEmail(ticket, client, client.accountManagerId);
      }
    } catch (emailErr) {
      console.error("⚠️ New ticket email failed:", emailErr.message);
    }

    await logAudit({
      action: "ticket.create", entity: "SupportTicket", entityId: ticket._id,
      userId: req.user.id, details: { ticketId: ticket.ticketId, title }, req,
    });

    created(res, ticket);
  } catch (err) { next(err); }
};

// GET /api/tickets — list tickets (clients see own, team sees all)
exports.listTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, clientId, priority, sort = "-createdAt" } = req.query;
    const filter = {};

    // Client role scoping
    if (req.user.role === "client") {
      if (!req.user.linkedClientId) throw new ForbiddenError("Account not linked to a client");
      filter.clientId = req.user.linkedClientId;
    } else {
      if (clientId) filter.clientId = clientId;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate("clientId", "companyName displayName")
        .populate("raisedBy", "name avatar")
        .populate("assignedTo", "name avatar")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      SupportTicket.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
  } catch (err) { next(err); }
};

// GET /api/tickets/:id — single ticket with replies
exports.getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("clientId", "companyName displayName contactEmail")
      .populate("raisedBy", "name avatar email")
      .populate("assignedTo", "name avatar email")
      .populate("replies.userId", "name avatar role");

    if (!ticket) throw new NotFoundError("Ticket");

    // Client can only see their own tickets
    if (req.user.role === "client" && ticket.clientId._id.toString() !== req.user.linkedClientId?.toString()) {
      throw new ForbiddenError("You can only view your own tickets");
    }

    success(res, ticket);
  } catch (err) { next(err); }
};

// PATCH /api/tickets/:id/status — update status (team only)
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new ValidationError("status is required");

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new NotFoundError("Ticket");

    ticket.status = status;
    if (status === "resolved") ticket.resolvedAt = new Date();
    await ticket.save();

    await logAudit({
      action: "ticket.status_change", entity: "SupportTicket", entityId: ticket._id,
      userId: req.user.id, details: { ticketId: ticket.ticketId, status }, req,
    });

    success(res, ticket);
  } catch (err) { next(err); }
};

// PATCH /api/tickets/:id/assign — assign to team member
exports.assignTicket = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) throw new ValidationError("assignedTo is required");

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new NotFoundError("Ticket");

    ticket.assignedTo = assignedTo;
    await ticket.save();

    await logAudit({
      action: "ticket.assign", entity: "SupportTicket", entityId: ticket._id,
      userId: req.user.id, details: { ticketId: ticket.ticketId, assignedTo }, req,
    });

    success(res, ticket);
  } catch (err) { next(err); }
};

// POST /api/tickets/:id/reply — add reply (client or team)
exports.addReply = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) throw new ValidationError("message is required");

    const ticket = await SupportTicket.findById(req.params.id)
      .populate("clientId", "companyName contactEmail accountManagerId");
    if (!ticket) throw new NotFoundError("Ticket");

    // Client can only reply to their own tickets
    if (req.user.role === "client" && ticket.clientId._id.toString() !== req.user.linkedClientId?.toString()) {
      throw new ForbiddenError("You can only reply to your own tickets");
    }

    ticket.replies.push({
      userId: req.user.id,
      message,
      createdAt: new Date(),
    });
    await ticket.save();

    // Fire-and-forget: notify client when team replies
    if (req.user.role !== "client" && ticket.clientId?.contactEmail) {
      try {
        const { sendTicketReplyEmail } = require("../utils/mailer");
        sendTicketReplyEmail(ticket, ticket.clientId, { message, userId: req.user.id });
      } catch (emailErr) {
        console.error("⚠️ Ticket reply email failed:", emailErr.message);
      }
    }

    await logAudit({
      action: "ticket.reply", entity: "SupportTicket", entityId: ticket._id,
      userId: req.user.id, details: { ticketId: ticket.ticketId }, req,
    });

    // Re-populate replies for response
    await ticket.populate("replies.userId", "name avatar role");
    success(res, ticket);
  } catch (err) { next(err); }
};
