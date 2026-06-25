// services/notification.service.js
const Notification = require("../models/Notification");

/**
 * Create a DB notification and emit it over Socket.io to the recipient's personal room.
 * Fire-and-forget — never throws, so a notification failure never breaks a request.
 *
 * @param {Object}  io           — Socket.io server instance (from app.get('io'))
 * @param {*}       recipientId  — MongoDB ObjectId or string user ID
 * @param {Object}  payload
 * @param {string}  payload.type  — e.g. "task_assigned", "task_review_requested"
 * @param {string}  payload.title
 * @param {string}  [payload.body]
 * @param {string}  [payload.link]  — frontend route, e.g. "/tasks/abc123"
 * @param {Object}  [payload.data]  — arbitrary extra data
 */
async function sendNotification(io, recipientId, { type, title, body = "", link = "", data = {} }) {
  try {
    const notif = await Notification.create({
      userId:  recipientId,
      type,
      title,
      body,
      link,
      data,
    });

    if (io) {
      io.to(String(recipientId)).emit("notification", notif.toObject());
    }
  } catch (err) {
    console.error("[notification.service] Failed:", err.message);
  }
}

/**
 * Send the same notification to multiple recipients (e.g. all task assignees).
 * Skips nullish / empty entries silently.
 */
async function sendNotificationToMany(io, recipientIds, payload) {
  const unique = [...new Set((recipientIds || []).map(String).filter(Boolean))];
  await Promise.all(unique.map(id => sendNotification(io, id, payload)));
}

module.exports = { sendNotification, sendNotificationToMany };
