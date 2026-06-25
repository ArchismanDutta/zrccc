// controllers/notification.controller.js
const Notification = require("../models/Notification");
const { success } = require("../utils/response");

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { limit = 30, unreadOnly } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 30, 200);
    const filter = { userId: req.user.id };
    if (unreadOnly === "true") filter.isRead = false;

    const docs = await Notification.find(filter)
      .sort("-createdAt").limit(safeLimit).lean();
    const unread = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    success(res, { notifications: docs, unreadCount: unread });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true, readAt: new Date() }
    );
    success(res, { message: "Marked as read" });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    success(res, { message: "All marked as read" });
  } catch (err) { next(err); }
};
