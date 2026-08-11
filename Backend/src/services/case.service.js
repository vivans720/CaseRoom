const Case = require("../models/Case");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("./notification.service");

const throwError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const { embedCase } = require("./ai/embedding.service");

// Create a new case
const createCase = async (caseData, creatorId) => {
  const participants = [{ user: creatorId, role: "Admin" }];

  const newCase = new Case({
    ...caseData,
    creatorId,
    participants,
  });

  await newCase.save();

  // Async generate vector embedding for ChromaDB (non-blocking)
  embedCase(newCase).catch((err) =>
    console.error("[ChromaDB] Auto-embedding failed for new case:", err.message)
  );

  return newCase;
};

// get all cases for specific user

const getCaseById = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId)
    .populate("creatorId", "name email lastSeen employeeId profilePictureUrl roleName skills")
    .populate("participants.user", "name email lastSeen employeeId profilePictureUrl roleName skills");

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  return caseDoc;
};

// add or remove a participant from a case or update role

const updateParticipants = async (
  caseId,
  action,
  targetUserId,
  requesterId,
  io = null,
  role = "Editor",
) => {
  const caseDoc = await Case.findById(caseId);

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  const requesterRole = caseDoc.getParticipantRole(requesterId);
  if (requesterRole !== "Admin") {
    throwError(
      "Access denied. Only case Admins can manage participants",
      403,
    );
  }

  if (action === "add") {
    const existingIndex = caseDoc.participants.findIndex((p) => {
      const id = p.user
        ? p.user._id
          ? p.user._id.toString()
          : p.user.toString()
        : p._id
          ? p._id.toString()
          : p.toString();
      return id === targetUserId.toString();
    });

    if (existingIndex === -1) {
      caseDoc.participants.push({ user: targetUserId, role: role || "Editor" });
    } else {
      caseDoc.participants[existingIndex].role = role || caseDoc.participants[existingIndex].role || "Editor";
    }
  } else if (action === "remove") {
    if (targetUserId.toString() === caseDoc.creatorId.toString()) {
      throwError("The creator cannot be removed from the case", 400);
    }

    caseDoc.participants = caseDoc.participants.filter((p) => {
      const id = p.user
        ? p.user._id
          ? p.user._id.toString()
          : p.user.toString()
        : p._id
          ? p._id.toString()
          : p.toString();
      return id !== targetUserId.toString();
    });
  } else if (action === "updateRole") {
    if (!["Admin", "Editor", "Observer"].includes(role)) {
      throwError("Invalid role. Must be Admin, Editor, or Observer", 400);
    }
    const targetIndex = caseDoc.participants.findIndex((p) => {
      const id = p.user
        ? p.user._id
          ? p.user._id.toString()
          : p.user.toString()
        : p._id
          ? p._id.toString()
          : p.toString();
      return id === targetUserId.toString();
    });
    if (targetIndex === -1) {
      throwError("Target user is not a participant in this case", 404);
    }
    caseDoc.participants[targetIndex].role = role;
  } else {
    throwError('Invalid action. Use "add", "remove", or "updateRole"', 400);
  }

  caseDoc.markModified("participants");
  await caseDoc.save();

  const type =
    action === "add"
      ? "added_to_case"
      : action === "remove"
        ? "removed_from_case"
        : "role_updated";
  const title =
    action === "add"
      ? "Added to Case"
      : action === "remove"
        ? "Removed from Case"
        : "Case Role Updated";
  const body =
    action === "updateRole"
      ? `Your role in case "${caseDoc.title}" was updated to ${role}`
      : `You were ${action === "add" ? "added to" : "removed from"} case: ${caseDoc.title}`;

  await createNotification(
    {
      recipientId: targetUserId,
      type,
      title,
      body,
      caseId: caseDoc._id,
      actorId: requesterId,
    },
    io,
  );
  return caseDoc;
};

//archive case
const archiveCase = async (caseId, requesterId, io = null) => {
  const caseDoc = await Case.findById(caseId);

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (caseDoc.getParticipantRole(requesterId) !== "Admin") {
    throwError(
      "Access denied. Only case Admins can archive the case",
      403,
    );
  }

  if (caseDoc.status === "archived") {
    throwError("Case is already archived", 400);
  }

  caseDoc.status = "archived";
  await caseDoc.save();
  const notificationPromises = caseDoc.participants.map((p) => {
    const pid = p.user ? p.user : p;
    return createNotification(
      {
        recipientId: pid,
        type: "case_archived",
        title: "Case Archived",
        body: `The case "${caseDoc.title}" has been archived.`,
        caseId: caseDoc._id,
        actorId: requesterId,
      },
      io,
    );
  });
  await Promise.all(notificationPromises);
  return caseDoc;
};

// unarchive case
const unarchiveCase = async (caseId, requesterId, io = null) => {
  const caseDoc = await Case.findById(caseId);

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (caseDoc.getParticipantRole(requesterId) !== "Admin") {
    throwError(
      "Access denied. Only case Admins can unarchive the case",
      403,
    );
  }

  if (caseDoc.status !== "archived") {
    throwError("Case is not archived", 400);
  }

  caseDoc.status = "active";
  await caseDoc.save();

  const notificationPromises = caseDoc.participants.map((p) => {
    const pid = p.user ? p.user : p;
    return createNotification(
      {
        recipientId: pid,
        type: "case_unarchived",
        title: "Case Unarchived",
        body: `The case "${caseDoc.title}" has been unarchived and is now active.`,
        caseId: caseDoc._id,
        actorId: requesterId,
      },
      io,
    );
  });
  await Promise.all(notificationPromises);
  return caseDoc;
};

// update case status
const updateCaseStatus = async (caseId, status, requesterId, io = null) => {
  const allowedStatuses = [
    "Open",
    "In Progress",
    "Under Review",
    "Resolved",
    "Closed",
    "active",
    "archived",
  ];

  if (!allowedStatuses.includes(status)) {
    throwError(`Invalid status. Must be one of: ${allowedStatuses.join(", ")}`, 400);
  }

  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (caseDoc.getParticipantRole(requesterId) !== "Admin") {
    throwError("Access denied. Only case Admins can update case status", 403);
  }

  caseDoc.status = status;
  await caseDoc.save();

  if (io) {
    io.to(caseId.toString()).emit("case:status_updated", {
      caseId: caseDoc._id,
      status: caseDoc.status,
    });
  }

  const notificationPromises = caseDoc.participants.map((p) => {
    const pid = p.user ? p.user : p;
    return createNotification(
      {
        recipientId: pid,
        type: "case_status_updated",
        title: "Case Status Updated",
        body: `The case "${caseDoc.title}" status was changed to ${status}.`,
        caseId: caseDoc._id,
        actorId: requesterId,
      },
      io,
    );
  });
  await Promise.all(notificationPromises);

  return caseDoc;
};

//pin case
const pinCase = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const user = await User.findById(userId);
  if (!user) {
    throwError("User not found", 404);
  }

  if (!user.pinnedCases.includes(caseId) && user.pinnedCases.length >= 5) {
    throwError("Max pin limit reached (5 cases). Unpin a case first.", 400);
  }

  if (!user.pinnedCases.includes(caseId)) {
    user.pinnedCases.push(caseId);
    await user.save();
  }

  return { message: "Case pinned successfully" };
};

//unpin case
const unpinCase = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throwError("User not found", 404);
  }

  user.pinnedCases = user.pinnedCases.filter(
    (id) => id.toString() !== caseId.toString(),
  );
  await user.save();

  return { message: "Case unpinned successfully" };
};

//get all cases of logged in user
const getAllCases = async (userId) => {
  const user = await User.findById(userId).select("pinnedCases");
  if (!user) {
    throwError("User not found", 404);
  }

  const pinnedCaseIds = (user.pinnedCases || []).map((id) => id.toString());

  const cases = await Case.find({
    $or: [{ "participants.user": userId }, { creatorId: userId }],
  })
    .populate("creatorId", "name email lastSeen employeeId profilePictureUrl")
    .populate("participants.user", "name email lastSeen employeeId profilePictureUrl")
    .sort({ createdAt: -1 })
    .lean();

  const processedCases = cases.map((c) => ({
    ...c,
    isPinned: pinnedCaseIds.includes(c._id.toString()),
  }));

  // Sort so pinned cases are first
  processedCases.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // maintain relative order by createdAt
  });

  return processedCases;
};

//get all cases
const fetchAllCases = async () => {
  const cases = await Case.find({})
    .populate("creatorId", "name email lastSeen employeeId profilePictureUrl")
    .populate("participants.user", "name email lastSeen employeeId profilePictureUrl")
    .sort({ createdAt: -1 });

  return cases;
};

//delete case
const deleteCase = async (caseId, requesterId, io = null) => {
  const caseDoc = await Case.findById(caseId);

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  const title = caseDoc.title;

  if (caseDoc.getParticipantRole(requesterId) !== "Admin") {
    throwError("Access denied. Only case Admins can delete the case", 403);
  }

  const participants = caseDoc.participants.map((p) => (p.user ? p.user : p));

  await Message.deleteMany({ caseId: caseDoc._id });
  await caseDoc.deleteOne();
  const notificationPromises = participants.map((pid) =>
    createNotification(
      {
        recipientId: pid,
        type: "case_deleted",
        title: "Case Deleted",
        body: `The case "${title}" has been deleted.`,
        actorId: requesterId,
      },
      io,
    ),
  );
  await Promise.all(notificationPromises);
  return { message: "Case successfully deleted" };
};

//get all participants of specific case

const getCaseParticipants = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId)
    .populate("creatorId", "name email employeeId lastSeen profilePictureUrl")
    .populate("participants.user", "name email employeeId lastSeen profilePictureUrl");

  if (!caseDoc) {
    throwError("Case not found", 404);
  }

  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const result = [];
  const addedUserIds = new Set();

  // Add creator first if valid user object
  if (caseDoc.creatorId && typeof caseDoc.creatorId === "object") {
    const creatorObj = caseDoc.creatorId.toObject ? caseDoc.creatorId.toObject() : caseDoc.creatorId;
    if (creatorObj && creatorObj._id) {
      result.push({
        ...creatorObj,
        role: "Admin",
      });
      addedUserIds.add(creatorObj._id.toString());
    }
  }

  // Add participants from participants array
  if (Array.isArray(caseDoc.participants)) {
    for (const p of caseDoc.participants) {
      const userObj = p.user && typeof p.user === "object" ? (p.user.toObject ? p.user.toObject() : p.user) : null;
      if (userObj && userObj._id) {
        const uId = userObj._id.toString();
        if (!addedUserIds.has(uId)) {
          result.push({
            ...userObj,
            role: p.role || "Editor",
          });
          addedUserIds.add(uId);
        }
      }
    }
  }

  return result;
};

// Internal case participants fetcher
const getParticipantsInternal = async (caseId) => {
  const caseDoc = await Case.findById(caseId)
    .populate("creatorId", "name email employeeId lastSeen profilePictureUrl")
    .populate("participants.user", "name email employeeId lastSeen profilePictureUrl");
  if (!caseDoc) return [];

  const result = [];
  const addedUserIds = new Set();

  if (caseDoc.creatorId && typeof caseDoc.creatorId === "object") {
    const creatorObj = caseDoc.creatorId.toObject ? caseDoc.creatorId.toObject() : caseDoc.creatorId;
    if (creatorObj && creatorObj._id) {
      result.push(creatorObj);
      addedUserIds.add(creatorObj._id.toString());
    }
  }

  if (Array.isArray(caseDoc.participants)) {
    for (const p of caseDoc.participants) {
      const userObj = p.user && typeof p.user === "object" ? (p.user.toObject ? p.user.toObject() : p.user) : null;
      if (userObj && userObj._id) {
        const uId = userObj._id.toString();
        if (!addedUserIds.has(uId)) {
          result.push(userObj);
          addedUserIds.add(uId);
        }
      }
    }
  }

  return result;
};

const searchCases = async ({
  userId,
  q,
  status,
  priority,
  category,
  dateFrom,
  dateTo,
  creatorId,
  sortBy,
  page = 1,
  limit = 20,
}) => {
  const query = {
    $or: [{ "participants.user": userId }, { creatorId: userId }],
  };
  if (q) {
    query.$text = { $search: q };
  }
  if (status) {
    query.status = status;
  }
  if (priority) {
    query.priority = priority;
  }
  if (category) {
    query.category = category;
  }

  if (creatorId) {
    query.creatorId = creatorId;
  }
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.createdAt.$lte = new Date(dateTo);
    }
  }
  let sortOption = {};
  if (sortBy) {
    switch (sortBy) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "recently_active":
        sortOption = { updatedAt: -1 };
        break;
      case "newest":
      default:
        sortOption = { createdAt: -1 };
        break;
    }
  } else if (q) {
    sortOption = { score: { $meta: "textScore" } };
  } else {
    sortOption = { createdAt: -1 };
  }
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 20;
  const skip = (parsedPage - 1) * parsedLimit;
  const cases = await Case.find(query)
    .populate("creatorId", "name email lastSeen")
    .populate("participants.user", "name email lastSeen")
    .sort(sortOption)
    .skip(skip)
    .limit(parsedLimit);
  const totalCases = await Case.countDocuments(query);
  const totalPages = Math.ceil(totalCases / parsedLimit);
  return {
    cases,
    pagination: {
      currentPage: parsedPage,
      totalPages,
      totalCases,
      limit: parsedLimit,
    },
  };
};

module.exports = {
  createCase,
  getCaseById,
  updateParticipants,
  archiveCase,
  getAllCases,
  fetchAllCases,
  deleteCase,
  getCaseParticipants,
  getParticipantsInternal,
  searchCases,
  pinCase,
  unpinCase,
  unarchiveCase,
  updateCaseStatus,
};
