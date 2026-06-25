// controllers/search.controller.js
// GET /api/search?q=... — cross-collection typeahead, max 6 per section
const Client      = require("../models/Client");
const Project     = require("../models/Project");
const Task        = require("../models/Task");
const ContentItem = require("../models/ContentItem");
const { success } = require("../utils/response");
const { escapeRegex } = require("../utils/sanitize");

const LIMIT = 6;

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      return success(res, { clients: [], projects: [], tasks: [], content: [] });
    }

    const s     = escapeRegex(q);
    const regex = { $regex: s, $options: "i" };
    const role  = req.user.role;

    // ── Clients ────────────────────────────────────────────────
    let clients = [];
    if (["super_admin", "admin", "account_manager", "project_manager"].includes(role)) {
      clients = await Client.find({ $or: [{ companyName: regex }, { displayName: regex }] })
        .select("companyName displayName status")
        .limit(LIMIT)
        .lean();
    }

    // ── Projects ───────────────────────────────────────────────
    const projectRegexFilter = { $or: [{ name: regex }, { projectId: regex }] };
    if (!["super_admin", "admin", "account_manager", "dept_head"].includes(role)) {
      const mine = await Project.find({ "teamMembers.userId": req.user.id }, "_id").lean();
      projectRegexFilter._id = { $in: mine.map(p => p._id) };
    }
    const projects = await Project.find(projectRegexFilter)
      .select("name projectId status")
      .limit(LIMIT)
      .lean();

    // ── Tasks ──────────────────────────────────────────────────
    const taskRegexFilter = { $or: [{ title: regex }, { taskId: regex }] };
    if (!["super_admin", "admin", "dept_head"].includes(role)) {
      taskRegexFilter.assignedTo = req.user.id;
    }
    const tasks = await Task.find(taskRegexFilter)
      .select("title taskId status priority")
      .limit(LIMIT)
      .lean();

    // ── Content ────────────────────────────────────────────────
    const contentRegexFilter = { $or: [{ title: regex }, { contentId: regex }] };
    if (role === "client") {
      contentRegexFilter.clientId = req.user.linkedClientId;
    } else if (!["super_admin", "admin", "account_manager", "dept_head"].includes(role)) {
      contentRegexFilter.assignedTo = req.user.id;
    }
    const content = await ContentItem.find(contentRegexFilter)
      .select("title contentId status contentType")
      .limit(LIMIT)
      .lean();

    success(res, { clients, projects, tasks, content });
  } catch (err) { next(err); }
};
