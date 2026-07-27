const caseService = require("../services/case.service.js");
const Message = require("../models/Message");
const pdfService = require("../services/pdf.service.js");

// controller to handle creating new case
const createCase = async (req, res, next) => {
  try {
    const { title, description, priority, category } = req.body;
    const creatorId = req.user.id;
    const newCase = await caseService.createCase(
      { title, description, priority, category },
      creatorId,
    );

    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
};

// get all cases of logged in user
const getAllCases = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cases = await caseService.getAllCases(userId);

    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    next(error);
  }
};

// get all cases
const fetchAllCases = async (req, res, next) => {
  try {
    const cases = await caseService.fetchAllCases();

    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    next(error);
  }
};

// getting case by ID
const getCaseById = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const caseDoc = await caseService.getCaseById(caseId, userId);

    res.status(200).json({ success: true, data: caseDoc });
  } catch (error) {
    next(error);
  }
};

// add or remove participants in a case or update role
const updateParticipants = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const { action, userId: targetUserId, role } = req.body;
    const requesterId = req.user.id;
    const io = req.app.get("io");
    const updatedCase = await caseService.updateParticipants(
      caseId,
      action,
      targetUserId,
      requesterId,
      io,
      role,
    );

    res.status(200).json({ success: true, data: updatedCase });
  } catch (error) {
    next(error);
  }
};

// archive case
const archiveCase = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const requesterId = req.user.id;
    const io = req.app.get("io");
    const archivedCase = await caseService.archiveCase(caseId, requesterId, io);

    res.status(200).json({ success: true, data: archivedCase });
  } catch (error) {
    next(error);
  }
};

// unarchive case
const unarchiveCase = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const requesterId = req.user.id;
    const io = req.app.get("io");
    const unarchivedCase = await caseService.unarchiveCase(
      caseId,
      requesterId,
      io,
    );

    res.status(200).json({ success: true, data: unarchivedCase });
  } catch (error) {
    next(error);
  }
};

// update case status
const updateCaseStatus = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const { status } = req.body;
    const requesterId = req.user.id;
    const io = req.app.get("io");
    const updatedCase = await caseService.updateCaseStatus(
      caseId,
      status,
      requesterId,
      io,
    );

    res.status(200).json({ success: true, data: updatedCase });
  } catch (error) {
    next(error);
  }
};

// delete case
const deleteCase = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const requesterId = req.user.id;
    const io = req.app.get("io");
    const result = await caseService.deleteCase(caseId, requesterId, io);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// get case participants
const getCaseParticipants = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const participants = await caseService.getCaseParticipants(caseId, userId);

    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    next(error);
  }
};

// search cases
const searchCases = async (req, res, next) => {
  try {
    const {
      q,
      status,
      priority,
      category,
      dateFrom,
      dateTo,
      creatorId,
      sortBy,
      page = "1",
      limit = "20",
    } = req.query;
    const userId = req.user.id;
    // Validate status
    const validStatuses = ["Open", "In Progress", "Under Review", "Resolved", "Closed", "active", "archived"];
    if (status && !validStatuses.includes(status)) {
      const error = new Error(`Invalid status. Must be one of ${validStatuses.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    // Validate priority
    if (priority && !["Low", "Medium", "High", "Critical"].includes(priority)) {
      const error = new Error('Invalid priority. Must be "Low", "Medium", "High", or "Critical"');
      error.statusCode = 400;
      throw error;
    }
    // Validate category
    if (category && !["Incident", "Legal", "HR", "Engineering"].includes(category)) {
      const error = new Error('Invalid category. Must be "Incident", "Legal", "HR", or "Engineering"');
      error.statusCode = 400;
      throw error;
    }
    // Validate sortBy
    if (sortBy && !["newest", "oldest", "recently_active"].includes(sortBy)) {
      const error = new Error(
        'Invalid sortBy. Must be "newest", "oldest", or "recently_active"',
      );
      error.statusCode = 400;
      throw error;
    }
    // Validate dateFrom
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      const error = new Error("Invalid dateFrom format. Use a valid ISO date.");
      error.statusCode = 400;
      throw error;
    }
    // Validate dateTo
    if (dateTo && isNaN(Date.parse(dateTo))) {
      const error = new Error("Invalid dateTo format. Use a valid ISO date.");
      error.statusCode = 400;
      throw error;
    }
    // Pass parameters to the service layer
    const result = await caseService.searchCases({
      userId,
      q,
      status,
      priority,
      category,
      dateFrom,
      dateTo,
      creatorId,
      sortBy,
      page,
      limit,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// pin case
const pinCase = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const result = await caseService.pinCase(caseId, userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// unpin case
const unpinCase = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const result = await caseService.unpinCase(caseId, userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// export archived case chat as PDF
const exportCasePdf = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;

    // 1. Fetch case details and check permissions
    const caseDoc = await caseService.getCaseById(caseId, userId);

    // 2. Verify status is archived
    if (caseDoc.status !== "archived") {
      const error = new Error("Access denied. Only archived cases can be exported to PDF.");
      error.statusCode = 400;
      throw error;
    }

    // 3. Fetch all messages (chronological order)
    const messages = await Message.find({ caseId })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email employeeId")
      .populate("mentions", "name email employeeId")
      .populate({
        path: "replyTo",
        select: "_id content type isDeleted fileName fileUrl",
        populate: { path: "senderId", select: "name" },
      })
      .lean();

    // 4. Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Case-Chat-Export-${caseId}.pdf"`
    );

    // 5. Generate and stream PDF
    await pdfService.generateCaseChatPdf(caseDoc, messages, res);
  } catch (error) {
    next(error);
  }
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
  searchCases,
  pinCase,
  unpinCase,
  unarchiveCase,
  updateCaseStatus,
  exportCasePdf,
};
