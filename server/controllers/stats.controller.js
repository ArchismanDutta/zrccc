// controllers/stats.controller.js
// Aggregated dashboard statistics
const Client      = require("../models/Client");
const Project     = require("../models/Project");
const Task        = require("../models/Task");
const ContentItem = require("../models/ContentItem");
const Invoice     = require("../models/Invoice");
const Payment     = require("../models/Payment");
const { success } = require("../utils/response");

exports.getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      activeClients, onboardingClients,
      activeProjects,
      openTasks, dueTodayTasks,
      contentStats,
      monthPayments,
      overdueInvoices,
      recentTasks,
      recentContent,
    ] = await Promise.all([
      Client.countDocuments({ status: "active", isArchived: false }),
      Client.countDocuments({ status: "onboarding", isArchived: false }),
      Project.countDocuments({ status: "active", isArchived: false }),
      Task.countDocuments({ status: { $nin: ["done", "cancelled"] } }),
      Task.countDocuments({
        status: { $nin: ["done", "cancelled"] },
        dueDate: { $lte: new Date(now.toDateString() + " 23:59:59"), $gte: new Date(now.toDateString()) },
      }),
      ContentItem.aggregate([
        { $match: { plannedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Invoice.countDocuments({ status: { $in: ["sent", "partial"] }, dueDate: { $lt: now } }),
      Task.find({ status: { $nin: ["done", "cancelled"] } })
        .sort("dueDate")
        .limit(10)
        .populate("assignedTo", "name avatar")
        .populate("projectId", "name")
        .lean(),
      ContentItem.find({ status: "in_review" })
        .sort("-updatedAt")
        .limit(10)
        .populate("assignedTo", "name avatar")
        .populate("clientId", "companyName")
        .lean(),
    ]);

    // Monthly MRR
    const clients = await Client.find({ status: "active", isArchived: false }).select("contract.monthlyValue").lean();
    const expectedMRR = clients.reduce((s, c) => s + (c.contract?.monthlyValue || 0), 0);

    success(res, {
      kpis: {
        activeClients,
        onboardingClients,
        activeProjects,
        openTasks,
        dueTodayTasks,
        expectedMRR,
        collectedThisMonth: monthPayments[0]?.total || 0,
        overdueInvoices,
      },
      contentStats: contentStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      recentTasks,
      recentContent,
    });
  } catch (err) { next(err); }
};

exports.getRevenueChart = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const now = new Date();
    const data = [];

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [paymentAgg, invoiceAgg] = await Promise.all([
        Payment.aggregate([
          { $match: { paymentDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Invoice.aggregate([
          { $match: { month: d.getMonth() + 1, year: d.getFullYear() } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

      data.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        year: d.getFullYear(),
        collected: paymentAgg[0]?.total || 0,
        expected: invoiceAgg[0]?.total || 0,
      });
    }

    success(res, data);
  } catch (err) { next(err); }
};

// ── Profit & Loss ────────────────────────────────────────────
exports.getProfitLoss = async (req, res, next) => {
  try {
    const Expense      = require("../models/Expense");
    const SalaryRecord = require("../models/SalaryRecord");
    const { months = 6 } = req.query;
    const now = new Date();
    const data = [];

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const [revenueAgg, expenseAgg, salaryAgg] = await Promise.all([
        Payment.aggregate([
          { $match: { paymentDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        SalaryRecord.aggregate([
          { $match: { month: m, year: y, status: "paid" } },
          { $group: { _id: null, total: { $sum: "$netSalary" } } },
        ]),
      ]);

      const revenue  = revenueAgg[0]?.total || 0;
      const expenses = expenseAgg[0]?.total || 0;
      const salaries = salaryAgg[0]?.total || 0;

      data.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        monthNum: m,
        year: y,
        revenue,
        expenses,
        salaries,
        netProfit: revenue - expenses - salaries,
      });
    }

    success(res, data);
  } catch (err) { next(err); }
};

// ── Reports ──────────────────────────────────────────────────
exports.getReports = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Revenue overview — 12 months expected vs collected
    const revenueData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [collectAgg, expectAgg] = await Promise.all([
        Payment.aggregate([
          { $match: { paymentDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Invoice.aggregate([
          { $match: { month: d.getMonth() + 1, year: d.getFullYear() } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

      revenueData.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        year: d.getFullYear(),
        expected: expectAgg[0]?.total || 0,
        collected: collectAgg[0]?.total || 0,
      });
    }

    const totalExpected  = revenueData.reduce((s, d) => s + d.expected, 0);
    const totalCollected = revenueData.reduce((s, d) => s + d.collected, 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // 2. Client revenue breakdown — top 10 by billed
    const clientBreakdown = await Invoice.aggregate([
      { $group: {
        _id: "$clientId",
        totalBilled: { $sum: "$totalAmount" },
        totalCollected: { $sum: "$paidAmount" },
      }},
      { $sort: { totalBilled: -1 } },
      { $limit: 10 },
      { $lookup: { from: "clients", localField: "_id", foreignField: "_id", as: "client" } },
      { $unwind: "$client" },
      { $project: {
        clientName: "$client.companyName",
        totalBilled: 1,
        totalCollected: 1,
        outstanding: { $subtract: ["$totalBilled", "$totalCollected"] },
      }},
    ]);

    // 3. Team productivity — tasks completed per member last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const teamProductivity = await Task.aggregate([
      { $unwind: "$assignedTo" },
      { $facet: {
        done: [
          { $match: { status: "done", updatedAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        ],
        open: [
          { $match: { status: { $nin: ["done", "cancelled"] } } },
          { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        ],
        overdue: [
          { $match: { status: { $nin: ["done", "cancelled"] }, dueDate: { $lt: now } } },
          { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        ],
      }},
    ]);

    // Merge productivity data by user
    const userIds = new Set();
    const prodMap = {};
    for (const key of ["done", "open", "overdue"]) {
      for (const item of teamProductivity[0][key] || []) {
        const uid = item._id.toString();
        userIds.add(uid);
        if (!prodMap[uid]) prodMap[uid] = { done: 0, open: 0, overdue: 0 };
        prodMap[uid][key] = item.count;
      }
    }

    // Lookup user names
    const mongoose = require("mongoose");
    const users = await require("../models/User").find({
      _id: { $in: Array.from(userIds).map(id => new mongoose.Types.ObjectId(id)) },
    }).select("name avatar").lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const teamData = Object.entries(prodMap).map(([uid, counts]) => ({
      userId: uid,
      name: userMap[uid]?.name || "Unknown",
      avatar: userMap[uid]?.avatar || "",
      ...counts,
    })).sort((a, b) => b.done - a.done);

    // 4. Content pipeline — by status and type
    const [contentByStatus, contentByType] = await Promise.all([
      ContentItem.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ContentItem.aggregate([
        { $group: { _id: "$contentType", count: { $sum: 1 } } },
      ]),
    ]);

    success(res, {
      revenue: {
        data: revenueData,
        totalExpected,
        totalCollected,
        collectionRate,
      },
      clientBreakdown,
      teamProductivity: teamData,
      contentPipeline: {
        byStatus: contentByStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        byType: contentByType.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
      },
    });
  } catch (err) { next(err); }
};

// ── Single Client Stats ──────────────────────────────────────
exports.getClientStats = async (req, res, next) => {
  try {
    const clientId = req.params.id;
    const mongoose = require("mongoose");

    const [invoiceAgg] = await Invoice.aggregate([
      { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
      { $group: {
        _id: null,
        totalBilled: { $sum: "$totalAmount" },
        totalCollected: { $sum: "$paidAmount" },
      }},
    ]);

    success(res, {
      totalBilled: invoiceAgg?.totalBilled || 0,
      totalCollected: invoiceAgg?.totalCollected || 0,
      totalOutstanding: (invoiceAgg?.totalBilled || 0) - (invoiceAgg?.totalCollected || 0),
    });
  } catch (err) { next(err); }
};
