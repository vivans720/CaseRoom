// src/services/message.service.js

const Message = require("../models/Message");
const Case = require("../models/Case");
const { getMimeCategory } = require("../config/upload");
const cloudinary = require("../config/cloudinary");

const extractPublicId = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const uploadIndex = pathParts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;

    let startIndex = uploadIndex + 1;
    if (pathParts[startIndex] && /^v\d+$/.test(pathParts[startIndex])) {
      startIndex++;
    }

    const relevantParts = pathParts.slice(startIndex);
    const lastPart = relevantParts[relevantParts.length - 1];

    const lastPartWithoutExt =
      lastPart.substring(0, lastPart.lastIndexOf(".")) || lastPart;
    relevantParts[relevantParts.length - 1] = lastPartWithoutExt;

    return relevantParts.join("/");
  } catch (err) {
    return null;
  }
};

const getResourceType = (msgType) => {
  if (msgType === "video" || msgType === "audio") return "video";
  if (msgType === "document") return "raw";
  return "image";
};

//calculate pagination skip
const getSkipValue = (page, limit) => (page - 1) * limit;

const populateMessage = (query) =>
  query
    .populate("senderId", "name email employeeId profilePictureUrl")
    .populate("mentions", "name email employeeId profilePictureUrl")
    .populate({
      path: "replyTo",
      select: "_id content type isDeleted fileName fileUrl",
      populate: { path: "senderId", select: "name profilePictureUrl" },
    });

const normalizeMentionedUserIds = (mentionedUserIds) => {
  if (mentionedUserIds === undefined || mentionedUserIds === null) return [];

  if (!Array.isArray(mentionedUserIds)) {
    const error = new Error("mentionedUserIds must be an array");
    error.statusCode = 400;
    throw error;
  }

  const normalized = mentionedUserIds
    .map((id) => id?.toString?.().trim())
    .filter((id) => Boolean(id));

  return [...new Set(normalized)];
};

const resolveMentionedUserIds = ({ caseDoc, senderId, mentionedUserIds }) => {
  const normalizedMentionedUserIds =
    normalizeMentionedUserIds(mentionedUserIds);

  if (normalizedMentionedUserIds.length === 0) return [];

  const allowedParticipants = new Set(
    caseDoc.participants
      .map((p) => {
        if (!p) return null;
        return p.user
          ? p.user._id
            ? p.user._id.toString()
            : p.user.toString()
          : p._id
            ? p._id.toString()
            : p.toString();
      })
      .filter(Boolean),
  );
  if (caseDoc.creatorId) {
    allowedParticipants.add(caseDoc.creatorId.toString());
  }

  const invalidMentionedUserIds = normalizedMentionedUserIds.filter(
    (id) => !allowedParticipants.has(id),
  );

  if (invalidMentionedUserIds.length > 0) {
    const error = new Error("You can only mention participants in this case");
    error.statusCode = 400;
    throw error;
  }

  return normalizedMentionedUserIds.filter((id) => id !== senderId.toString());
};

const fetchMessagesByCase = async ({ caseId, page = 1, limit = 50 }) => {
  const skip = getSkipValue(page, limit);

  //fetch paginated messages sorted by newest first (with _id as tie-breaker for stable pagination)
  const messagesRaw = await Message.find({ caseId })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .populate("senderId", "name email employeeId profilePictureUrl")
    .populate("mentions", "name email employeeId profilePictureUrl")
    .populate({
      path: "replyTo",
      select: "_id content type isDeleted fileName fileUrl",
      populate: { path: "senderId", select: "name profilePictureUrl" },
    })
    .lean();

  const messages = messagesRaw.map((msg) => {
    if (msg.replyTo && msg.replyTo.isDeleted) {
      msg.replyTo.content = "Original message was deleted";
    }

    if (msg.isDeleted) {
      msg.content = "This message was deleted";
      delete msg.fileUrl;
      delete msg.fileName;
      delete msg.fileSize;
      delete msg.fileMimeType;
    }
    return msg;
  });

  const totalMessages = await Message.countDocuments({ caseId });
  const totalPages = Math.ceil(totalMessages / limit);

  return {
    messages,
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      limit,
    },
  };
};

const checkNotObserver = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId);
  if (caseDoc) {
    const role = caseDoc.getParticipantRole(userId);
    if (role === "Observer") {
      const error = new Error("Forbidden: Observers are read-only and cannot post messages or upload evidence");
      error.statusCode = 403;
      throw error;
    }
  }
};

const createMessage = async ({
  caseId,
  senderId,
  content,
  replyToId,
  mentionedUserIds = [],
}) => {
  await checkNotObserver(caseId, senderId);

  if (replyToId) {
    const parent = await Message.findById(replyToId);
    if (!parent || parent.caseId.toString() !== caseId.toString()) {
      throw new Error("Invalid replyTo reference");
    }
  }

  const message = new Message({
    caseId,
    senderId,
    content,
    replyTo: replyToId || null,
    mentions: mentionedUserIds,
  });
  await message.save();

  const populatedMessage = await populateMessage(Message.findById(message._id));

  return populatedMessage;
};

// Creates a message with file attachment metadata
const createFileMessage = async ({
  caseId,
  senderId,
  fileData,
  content = "",
  replyToId,
  mentionedUserIds = [],
}) => {
  await checkNotObserver(caseId, senderId);

  if (replyToId) {
    const parent = await Message.findById(replyToId);
    if (!parent || parent.caseId.toString() !== caseId.toString()) {
      throw new Error("Invalid replyTo reference");
    }
  }

  const message = new Message({
    caseId,
    senderId,
    type: getMimeCategory(fileData.mimeType),
    content,
    fileUrl: fileData.url,
    fileName: fileData.originalName,
    fileSize: fileData.size,
    fileMimeType: fileData.mimeType,
    replyTo: replyToId || null,
    mentions: mentionedUserIds,
  });

  await message.save();

  const populatedMessage = await populateMessage(Message.findById(message._id));

  return populatedMessage;
};

const editMessage = async (messageId, userId, newContent) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  await checkNotObserver(message.caseId, userId);

  if (message.senderId.toString() !== userId.toString()) {
    const error = new Error("Forbidden: You can only edit your own messages");
    error.statusCode = 403;
    throw error;
  }

  if (message.isDeleted) {
    const error = new Error("Cannot edit a deleted message");
    error.statusCode = 400;
    throw error;
  }

  const existingCase = await Case.findById(message.caseId);
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

  const normalizedContent =
    typeof newContent === "string" ? newContent.trim() : "";

  if (message.type === "text" && !normalizedContent) {
    const error = new Error("Content is required for text messages");
    error.statusCode = 400;
    throw error;
  }

  message.content = normalizedContent;
  message.editedAt = new Date();

  await message.save();

  return populateMessage(Message.findById(message._id));
};

const searchMessages = async ({ caseId, q, type, page = 1, limit = 20 }) => {
  // 1. Build a dynamic MongoDB filter object
  const query = {
    caseId,
    isDeleted: { $ne: true }, // Forward-compatible with Phase 11 soft deletes
  };
  let sortOption = {};
  if (q) {
    const regex = new RegExp(q, "i");
    query.$or = [{ content: regex }, { fileName: regex }];
    sortOption = { createdAt: -1, _id: -1 };
  } else {
    sortOption = { createdAt: -1, _id: -1 };
  }
  if (type) {
    query.type = type;
  }
  // 3. Apply pagination
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 20;

  // Uses the existing helper at the top of the file
  const skip = getSkipValue(parsedPage, parsedLimit);
  let findQuery = Message.find(query);
  const messages = await findQuery
    .populate("senderId", "name email employeeId profilePictureUrl")
    .populate("mentions", "name email employeeId profilePictureUrl")
    .populate({
      path: "replyTo",
      select: "_id content type isDeleted fileName fileUrl",
      populate: { path: "senderId", select: "name profilePictureUrl" },
    })
    .sort(q ? { createdAt: -1, _id: -1 } : sortOption)
    .skip(skip)
    .limit(parsedLimit);
  const totalMessages = await Message.countDocuments(query);
  const totalPages = Math.ceil(totalMessages / parsedLimit);
  // 4. Return formatted response
  return {
    messages,
    pagination: {
      currentPage: parsedPage,
      totalPages,
      totalMessages,
      limit: parsedLimit,
    },
  };
};

// Marks an array of messages as read by a specific user.
// Uses a $ne filter combined with $push to ensure idempotent updates

const markMessagesAsRead = async (userId, caseId, messageIds) => {
  if (!messageIds || messageIds.length === 0) {
    return { modifiedCount: 0 };
  }

  const result = await Message.updateMany(
    {
      _id: { $in: messageIds },
      caseId: caseId,
      "readBy.userId": { $ne: userId }, // Crucial: prevents duplicate read entries
    },
    {
      $push: {
        readBy: {
          userId: userId,
          readAt: new Date(),
        },
      },
    },
  );

  return result;
};

//Gets the count of unread messages for a specific user in a specific case.
// Excludes messages sent by the user themselves and messages logically deleted.
const getUnreadCount = async (userId, caseId) => {
  const count = await Message.countDocuments({
    caseId: caseId,
    senderId: { $ne: userId }, // Exclude messages sent by the user
    "readBy.userId": { $ne: userId }, // Crucial: user hasn't read it yet
    isDeleted: { $ne: true }, // Forward compatibility for Phase 11 soft deletes
  });

  return count;
};

const deleteMessage = async (messageId, userId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  const caseDoc = await Case.findById(message.caseId);
  const role = caseDoc ? caseDoc.getParticipantRole(userId) : null;

  if (role === "Observer") {
    const error = new Error("Forbidden: Observers are read-only and cannot delete content");
    error.statusCode = 403;
    throw error;
  }

  if (message.senderId.toString() !== userId.toString() && role !== "Admin") {
    const error = new Error("Forbidden: You can only delete your own messages");
    error.statusCode = 403;
    throw error;
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = "";

  if (message.fileUrl) {
    const publicId = extractPublicId(message.fileUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: getResourceType(message.type),
        });
      } catch (err) {
        console.error("Cloudinary file deletion failed:", err);
      }
    }
    message.fileUrl = undefined;
    message.fileName = undefined;
    message.fileSize = undefined;
    message.fileMimeType = undefined;
  }

  await message.save();
  return message;
};

const findMessagePage = async (caseId, messageId, limit = 50) => {
  const targetMessage = await Message.findById(messageId);
  if (!targetMessage) return null;

  // Count how many messages are newer than this one in this case
  // Match the fetchMessagesByCase sort logic: newest first by createdAt, then _id
  const newerCount = await Message.countDocuments({
    caseId,
    $or: [
      { createdAt: { $gt: targetMessage.createdAt } },
      {
        createdAt: targetMessage.createdAt,
        _id: { $gt: targetMessage._id },
      },
    ],
  });

  const page = Math.floor(newerCount / limit) + 1;
  return page;
};

const normalizeReactions = (reactions) => {
  const grouped = new Map();

  reactions.forEach((reaction) => {
    const existingReaction = grouped.get(reaction.emoji);

    if (!existingReaction) {
      grouped.set(reaction.emoji, {
        emoji: reaction.emoji,
        userIds: [...reaction.userIds],
      });
      return;
    }

    const mergedUserIds = new Map();

    [...existingReaction.userIds, ...reaction.userIds].forEach((id) => {
      mergedUserIds.set(id.toString(), id);
    });

    existingReaction.userIds = Array.from(mergedUserIds.values());
  });

  return Array.from(grouped.values());
};

const removeUserFromReactionGroups = (reactions, userId) => {
  const userIdString = userId.toString();

  return reactions
    .map((reaction) => ({
      ...reaction,
      userIds: reaction.userIds.filter((id) => id.toString() !== userIdString),
    }))
    .filter((reaction) => reaction.userIds.length > 0);
};

const addUserToReactionGroup = (reactions, userId, emoji) => {
  const existingReaction = reactions.find(
    (reaction) => reaction.emoji === emoji,
  );

  if (!existingReaction) {
    reactions.push({ emoji, userIds: [userId] });
    return reactions;
  }

  const alreadyIncluded = existingReaction.userIds.some(
    (id) => id.toString() === userId.toString(),
  );

  if (!alreadyIncluded) {
    existingReaction.userIds.push(userId);
  }

  return reactions;
};

const toggleReaction = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  await checkNotObserver(message.caseId, userId);

  const reactions = normalizeReactions(message.reactions || []);
  const userIdString = userId.toString();
  const targetReaction = reactions.find((reaction) => reaction.emoji === emoji);
  const userHasSelectedEmoji = Boolean(
    targetReaction?.userIds.some((id) => id.toString() === userIdString),
  );

  let nextReactions = removeUserFromReactionGroups(reactions, userId);

  if (!userHasSelectedEmoji) {
    nextReactions = addUserToReactionGroup(nextReactions, userId, emoji);
  }

  message.reactions = nextReactions;
  await message.save();
  return message.reactions;
};

const addReaction = async (messageId, userId, emoji) => {
  return toggleReaction(messageId, userId, emoji);
};

const removeReaction = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  const reactions = normalizeReactions(message.reactions || []);
  const reactionIndex = reactions.findIndex(
    (reaction) => reaction.emoji === emoji,
  );

  if (reactionIndex !== -1) {
    reactions[reactionIndex].userIds = reactions[reactionIndex].userIds.filter(
      (id) => id.toString() !== userId.toString(),
    );

    if (reactions[reactionIndex].userIds.length === 0) {
      reactions.splice(reactionIndex, 1);
    }
  }

  message.reactions = reactions;
  await message.save();
  return message.reactions;
};

const getCaseVaultItems = async ({
  caseId,
  category = "all",
  search = "",
  page = 1,
  limit = 50,
}) => {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 50;
  const skip = (parsedPage - 1) * parsedLimit;

  const baseQuery = {
    caseId,
    isDeleted: { $ne: true },
  };

  const URL_REGEX = /https?:\/\/[^\s]+/gi;

  if (category === "image") {
    baseQuery.type = "image";
  } else if (category === "media") {
    baseQuery.type = { $in: ["video", "audio"] };
  } else if (category === "document") {
    baseQuery.type = "document";
  } else if (category === "link") {
    baseQuery.content = { $regex: /https?:\/\//i };
  } else {
    // "all"
    baseQuery.$or = [
      { fileUrl: { $exists: true, $ne: null } },
      { content: { $regex: /https?:\/\//i } },
    ];
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    const searchFilter = {
      $or: [{ fileName: searchRegex }, { content: searchRegex }],
    };
    if (baseQuery.$or) {
      baseQuery.$and = [{ $or: baseQuery.$or }, searchFilter];
      delete baseQuery.$or;
    } else {
      baseQuery.$or = searchFilter.$or;
    }
  }

  const messages = await Message.find(baseQuery)
    .populate("senderId", "name email employeeId profilePictureUrl")
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  const totalCount = await Message.countDocuments(baseQuery);

  // Format vault items
  const items = [];
  messages.forEach((msg) => {
    // If message has file attachment
    if (msg.fileUrl) {
      const isMedia = msg.type === "video" || msg.type === "audio";
      const cat =
        msg.type === "image"
          ? "image"
          : isMedia
            ? "media"
            : "document";

      items.push({
        id: `${msg._id}_file`,
        messageId: msg._id,
        category: cat,
        type: msg.type,
        fileName: msg.fileName || "Attachment",
        fileUrl: msg.fileUrl,
        fileSize: msg.fileSize,
        fileMimeType: msg.fileMimeType,
        content: msg.content,
        sender: msg.senderId,
        createdAt: msg.createdAt,
      });
    }

    // Extract links from message content if category is "all" or "link"
    if (
      (category === "all" || category === "link") &&
      msg.content &&
      /https?:\/\//i.test(msg.content)
    ) {
      const matches = msg.content.match(URL_REGEX);
      if (matches) {
        matches.forEach((url, idx) => {
          if (!search || url.toLowerCase().includes(search.toLowerCase()) || (msg.fileName && msg.fileName.toLowerCase().includes(search.toLowerCase()))) {
            items.push({
              id: `${msg._id}_link_${idx}`,
              messageId: msg._id,
              category: "link",
              type: "link",
              url,
              content: msg.content,
              sender: msg.senderId,
              createdAt: msg.createdAt,
            });
          }
        });
      }
    }
  });

  return {
    items,
    pagination: {
      currentPage: parsedPage,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
      totalItems: totalCount,
      limit: parsedLimit,
    },
  };
};
const pinMessage = async (caseId, messageId, userId, io = null) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    const error = new Error("Case not found");
    error.statusCode = 404;
    throw error;
  }
  const role = caseDoc.getParticipantRole(userId);
  if (role !== "Admin") {
    const error = new Error("Forbidden: Only Admins can pin messages");
    error.statusCode = 403;
    throw error;
  }

  const message = await Message.findOne({ _id: messageId, caseId });
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  message.isPinned = true;
  message.pinnedAt = new Date();
  message.pinnedBy = userId;
  await message.save();

  const populated = await populateMessage(Message.findById(message._id)).lean();
  if (io) {
    io.to(`case_${caseId}`).emit("message_pinned", { caseId, message: populated });
  }
  return populated;
};

const unpinMessage = async (caseId, messageId, userId, io = null) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    const error = new Error("Case not found");
    error.statusCode = 404;
    throw error;
  }
  const role = caseDoc.getParticipantRole(userId);
  if (role !== "Admin") {
    const error = new Error("Forbidden: Only Admins can unpin messages");
    error.statusCode = 403;
    throw error;
  }

  const message = await Message.findOne({ _id: messageId, caseId });
  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  message.isPinned = false;
  message.pinnedAt = undefined;
  message.pinnedBy = undefined;
  await message.save();

  if (io) {
    io.to(`case_${caseId}`).emit("message_unpinned", { caseId, messageId });
  }
  return { message: "Message unpinned successfully" };
};

const getPinnedMessages = async (caseId) => {
  const messages = await Message.find({ caseId, isPinned: true, isDeleted: { $ne: true } })
    .sort({ pinnedAt: -1 })
    .populate("senderId", "name email employeeId profilePictureUrl")
    .lean();
  return messages;
};

module.exports = {
  fetchMessagesByCase,
  createMessage,
  createFileMessage,
  resolveMentionedUserIds,
  searchMessages,
  markMessagesAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage,
  findMessagePage,
  toggleReaction,
  addReaction,
  removeReaction,
  getCaseVaultItems,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
};

