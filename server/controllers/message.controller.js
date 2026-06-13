// controllers/message.controller.js
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const User    = require("../models/User");
const { success } = require("../utils/response");
const { NotFoundError, ForbiddenError, ValidationError } = require("../utils/errors");

// GET /api/messages/channels
exports.listChannels = async (req, res, next) => {
  try {
    const channels = await Channel.find({ participants: req.user.id })
      .sort({ lastAt: -1 })
      .lean();
    success(res, channels);
  } catch (err) {
    next(err);
  }
};

// GET /api/messages/:channelId
exports.listMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { before, limit } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 100);

    const channel = await Channel.findById(channelId).lean();
    if (!channel) throw new NotFoundError("Channel");
    if (!channel.participants.some(p => String(p) === String(req.user.id))) {
      throw new ForbiddenError("Not a participant of this channel");
    }

    const filter = { channelId };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate("senderId", "name avatar")
      .lean();

    success(res, messages.reverse());
  } catch (err) {
    next(err);
  }
};

// POST /api/messages/:channelId
exports.sendMessage = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { body } = req.body;
    if (!body?.trim()) throw new ValidationError("Message body is required");

    const channel = await Channel.findById(channelId);
    if (!channel) throw new NotFoundError("Channel");
    if (!channel.participants.some(p => String(p) === String(req.user.id))) {
      throw new ForbiddenError("Not a participant of this channel");
    }

    const message = await Message.create({
      channelId,
      senderId: req.user.id,
      body: body.trim(),
      readBy: [req.user.id],
    });

    channel.lastMessage = body.trim().slice(0, 100);
    channel.lastAt = new Date();
    await channel.save();

    const populated = await message.populate("senderId", "name avatar");

    // Emit via Socket.io if available
    const io = req.app.get("io");
    if (io) {
      io.to(channelId).emit("message:receive", { channelId, message: populated });
    }

    success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/messages/channels/direct — get or create a DM channel between two users
exports.getOrCreateDirect = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new ValidationError("userId is required");
    if (String(userId) === String(req.user.id)) throw new ValidationError("Cannot DM yourself");

    const other = await User.findById(userId).lean();
    if (!other) throw new NotFoundError("User");

    const participants = [req.user.id, userId].sort();
    let channel = await Channel.findOne({ type: "direct", participants: { $all: participants, $size: 2 } });

    if (!channel) {
      channel = await Channel.create({ type: "direct", participants });
    }

    success(res, channel);
  } catch (err) {
    next(err);
  }
};
