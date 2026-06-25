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
    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) throw new ValidationError("before must be a valid ISO date string");
      filter.createdAt = { $lt: beforeDate };
    }

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
    if (body.length > 5000) throw new ValidationError("Message body must not exceed 5000 characters");

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

// POST /api/messages/channels/project — create or get a project channel
exports.getOrCreateProject = async (req, res, next) => {
  try {
    const { projectId, name, participantIds = [] } = req.body;
    if (!projectId) throw new ValidationError("projectId is required");
    if (!name?.trim()) throw new ValidationError("name is required");

    // Verify the caller has access to this project
    const Project = require("../models/Project");
    const project = await Project.findById(projectId).select("teamMembers projectManagerId clientId").lean();
    if (!project) throw new NotFoundError("Project");

    const role = req.user.role;
    if (!["super_admin", "admin", "account_manager"].includes(role)) {
      const isMember = project.teamMembers.some(m => String(m.userId) === String(req.user.id));
      if (!isMember) throw new ForbiddenError("You are not a member of this project");
    }

    let channel = await Channel.findOne({ type: "project", projectId });
    if (!channel) {
      // Derive participants from the project's team list — never trust client-supplied IDs.
      const memberIds = project.teamMembers.map(m => String(m.userId));
      const allParticipants = [...new Set([String(req.user.id), ...memberIds])];
      channel = await Channel.create({
        type: "project",
        projectId,
        name: name.trim(),
        participants: allParticipants,
      });
    }

    success(res, channel);
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
    if (req.user.role === "client") throw new ForbiddenError("Clients must use the support ticket system");

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
