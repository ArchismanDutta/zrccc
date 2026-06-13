// controllers/client.controller.js
const Client = require("../models/Client");
const { nextSequence } = require("../models/Counter");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

// POST /api/clients
exports.createClient = async (req, res, next) => {
  try {
    const { companyName, contactName, contactEmail, services, contract, priority } = req.body;
    if (!companyName) throw new ValidationError("companyName is required");

    const seq = await nextSequence("client");
    const clientId = `ZRC-CLT-${String(seq).padStart(5, "0")}`;

    const client = await Client.create({
      clientId,
      companyName,
      displayName: req.body.displayName || companyName,
      contactName,
      contactEmail,
      contactPhone: req.body.contactPhone || "",
      website: req.body.website || "",
      industry: req.body.industry || "",
      region: req.body.region || "",
      gstNumber: req.body.gstNumber || "",
      panNumber: req.body.panNumber || "",
      billingAddress: req.body.billingAddress || "",
      services: services || [],
      contract: contract || {},
      priority: priority || "medium",
      status: "prospect",
      statusHistory: [{ to: "prospect", changedBy: req.user.id }],
      accountManagerId: req.body.accountManagerId || req.user.id,
      enteredBy: req.user.id,
    });

    await logAudit({
      action: "client.create", entity: "Client", entityId: client._id,
      userId: req.user.id, details: { clientId, companyName }, req,
    });

    created(res, client);
  } catch (err) {
    next(err);
  }
};

// GET /api/clients
exports.listClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, sort = "-createdAt" } = req.query;
    const filter = { isArchived: false };

    if (status) filter.status = status;

    // Scope by role: account_manager sees only their own
    if (req.user.role === "account_manager") {
      filter.accountManagerId = req.user.id;
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      Client.find(filter)
        .populate("accountManagerId", "name email avatar")
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Client.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
  } catch (err) {
    next(err);
  }
};

// GET /api/clients/:id
exports.getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("accountManagerId", "name email avatar")
      .lean();
    if (!client || client.isArchived) throw new NotFoundError("Client");

    // For account_manager role — only their own clients
    if (req.user.role === "account_manager" && !req.user.permissions.includes("clients:read:all")) {
      const amId = client.accountManagerId?._id ?? client.accountManagerId;
      if (String(amId) !== String(req.user.id)) {
        throw new ForbiddenError("You can only access your own clients");
      }
    }

    success(res, client);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client || client.isArchived) throw new NotFoundError("Client");

    // For account_manager role — only their own clients
    if (req.user.role === "account_manager" && !req.user.permissions.includes("clients:read:all")) {
      if (String(client.accountManagerId) !== String(req.user.id)) {
        throw new ForbiddenError("You can only access your own clients");
      }
    }

    const allowed = [
      "companyName", "displayName", "contactName", "contactEmail", "contactPhone",
      "website", "industry", "region", "gstNumber", "panNumber", "billingAddress",
      "services", "contract", "priority", "healthScore", "tags", "notes",
      "lastContactedAt", "nextFollowUpAt", "logo", "accountManagerId",
    ];

    // Build update data from allowed fields
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    // Only admins may reassign a client to a different account manager
    if (data.accountManagerId && !["super_admin", "admin"].includes(req.user.role)) {
      delete data.accountManagerId;
    }

    for (const key of Object.keys(data)) {
      client[key] = data[key];
    }

    await client.save();

    await logAudit({
      action: "client.update", entity: "Client", entityId: client._id,
      userId: req.user.id, details: { fields: Object.keys(req.body) }, req,
    });

    success(res, client);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/clients/:id/status
exports.changeStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!status) throw new ValidationError("status is required");

    const client = await Client.findById(req.params.id);
    if (!client) throw new NotFoundError("Client");

    if (status === "churned" && !reason) {
      throw new ValidationError("Churn reason is required when setting status to churned");
    }

    client.statusHistory.push({
      from: client.status, to: status, changedBy: req.user.id, reason: reason || "",
    });
    client.status = status;
    if (status === "churned") client.churnReason = reason;

    await client.save();

    await logAudit({
      action: "client.status_change", entity: "Client", entityId: client._id,
      userId: req.user.id, details: { from: client.statusHistory.at(-1).from, to: status, reason }, req,
    });

    success(res, client);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/clients/:id (soft delete)
exports.archiveClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new NotFoundError("Client");

    client.isArchived = true;
    await client.save();

    await logAudit({
      action: "client.archive", entity: "Client", entityId: client._id,
      userId: req.user.id, req,
    });

    success(res, { message: "Client archived" });
  } catch (err) {
    next(err);
  }
};
