// src/controllers/message.controller.js

const messageService = require("../services/message.service");
const Case = require("../models/Case");
const { createNotification } = require("../services/notification.service");

const parseMentionedUserIds = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;

  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch (_error) {
    const error = new Error("mentionedUserIds must be a valid JSON array");
    error.statusCode = 400;
    throw error;
  }
};

const getCaseMessages = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    // authorization
    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    const isParticipant = existingCase.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    const isCreator = existingCase.creatorId.toString() === userId.toString();

    if (!isParticipant && !isCreator) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    const result = await messageService.fetchMessagesByCase({
      caseId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Forward the error to the global error handler
    next(error);
  }
};

const uploadFileMessage = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const userId = req.user._id;
    const { content, replyToId, mentionedUserIds } = req.body;

    // 1. Validate case exists
    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate case is active
    if (existingCase.status === "archived") {
      const error = new Error("Cannot upload files to an archived case");
      error.statusCode = 400;
      throw error;
    }

    // 3. Validate participant access
    const isParticipant = existingCase.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    const isCreator = existingCase.creatorId.toString() === userId.toString();
    if (!isParticipant && !isCreator) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    // 4. Validate file was uploaded (multer ran before this handler)
    if (!req.file) {
      const error = new Error("No file provided");
      error.statusCode = 400;
      throw error;
    }

    // 5. Build file data from multer/cloudinary result
    const fileData = {
      url: req.file.path, // multer-storage-cloudinary sets path = secure_url
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    };

    const resolvedMentionedUserIds = messageService.resolveMentionedUserIds({
      caseDoc: existingCase,
      senderId: userId,
      mentionedUserIds: parseMentionedUserIds(mentionedUserIds),
    });

    // 6. Create file message
    const savedMessage = await messageService.createFileMessage({
      caseId,
      senderId: userId,
      fileData,
      content: content || "",
      replyToId,
      mentionedUserIds: resolvedMentionedUserIds,
    });

    // 7. Broadcast via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`case_${caseId}`).emit("new_message", savedMessage);

      const mentionNotifications = resolvedMentionedUserIds.map((pid) =>
        createNotification(
          {
            recipientId: pid,
            type: "mentioned_in_message",
            title: `Mention in ${existingCase.title}`,
            body: `${req.user.name} mentioned you in chat.`,
            caseId: existingCase._id,
            messageId: savedMessage._id,
            actorId: userId,
          },
          io,
        ),
      );

      await Promise.all(mentionNotifications);
    }

    return res.status(201).json({
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    next(error);
  }
};

const searchMessages = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const userId = req.user._id;
    const { q, type, page, limit } = req.query;

    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    const isParticipant = existingCase.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    const isCreator = existingCase.creatorId.toString() === userId.toString();

    if (!isParticipant && !isCreator) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    const result = await messageService.searchMessages({
      caseId,
      q,
      type,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const userId = req.user._id;

    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    const isParticipant = existingCase.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    const isCreator = existingCase.creatorId.toString() === userId.toString();

    if (!isParticipant && !isCreator) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    const unreadCount = await messageService.getUnreadCount(userId, caseId);

    return res.status(200).json({
      success: true,
      data: {
        caseId,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { id: caseId, messageId } = req.params;
    const userId = req.user._id;

    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    if (!existingCase.isParticipant(userId)) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    const deletedMessage = await messageService.deleteMessage(
      messageId,
      userId,
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`case_${caseId}`).emit("message_deleted", {
        messageId,
        caseId,
        deletedBy: userId,
        deletedAt: deletedMessage.deletedAt,
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedMessage,
    });
  } catch (error) {
    next(error);
  }
};

const editMessage = async (req, res, next) => {
  try {
    const { id: caseId, messageId } = req.params;
    const userId = req.user._id;
    const { content } = req.body;

    const existingCase = await Case.findById(caseId);

    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    if (existingCase.status === "archived") {
      const error = new Error("Cannot edit messages in an archived case");
      error.statusCode = 400;
      throw error;
    }

    if (!existingCase.isParticipant(userId)) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    if (typeof content !== "string") {
      const error = new Error("content must be a string");
      error.statusCode = 400;
      throw error;
    }

    const updatedMessage = await messageService.editMessage(
      messageId,
      userId,
      content,
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`case_${caseId}`).emit("message_edited", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

const getMessagePage = async (req, res, next) => {
  try {
    const { id: caseId, messageId } = req.params;
    const { limit } = req.query;

    const page = await messageService.findMessagePage(
      caseId,
      messageId,
      parseInt(limit, 10) || 50,
    );

    if (!page) {
      const error = new Error("Message not found or does not belong to case");
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: { page },
    });
  } catch (error) {
    next(error);
  }
};

const getCaseVault = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const userId = req.user._id;
    const { category, search, page, limit } = req.query;

    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    const isParticipant = existingCase.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    const isCreator = existingCase.creatorId.toString() === userId.toString();

    if (!isParticipant && !isCreator) {
      const error = new Error(
        "Forbidden: You are not a participant of this case",
      );
      error.statusCode = 403;
      throw error;
    }

    const result = await messageService.getCaseVaultItems({
      caseId,
      category,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const pinMessage = async (req, res, next) => {
  try {
    const { id: caseId, messageId } = req.params;
    const userId = req.user._id;
    const io = req.app.get("io");
    const result = await messageService.pinMessage(caseId, messageId, userId, io);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const unpinMessage = async (req, res, next) => {
  try {
    const { id: caseId, messageId } = req.params;
    const userId = req.user._id;
    const io = req.app.get("io");
    const result = await messageService.unpinMessage(caseId, messageId, userId, io);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getPinnedMessages = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const result = await messageService.getPinnedMessages(caseId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCaseMessages,
  uploadFileMessage,
  searchMessages,
  getUnreadCount,
  deleteMessage,
  editMessage,
  getMessagePage,
  getCaseVault,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
};

