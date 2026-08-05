const express = require("express");

const caseController = require("../controllers/case.controller");
const { handleUpload } = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

const messageController = require("../controllers/message.controller");

const router = express.Router();

const annotationController = require("../controllers/annotation.controller");
const meetingController = require("../controllers/meeting.controller");

// Apply auth middleware to all case routes
router.use(protect);

router.post("/", caseController.createCase);
router.get("/search", caseController.searchCases);
router.get("/all", caseController.fetchAllCases);
router.get("/:caseId/meeting/active", meetingController.getActiveMeeting);
router.get("/:id", caseController.getCaseById);
router.put("/:id/participants", caseController.updateParticipants);
router.put("/:id/archive", caseController.archiveCase);
router.put("/:id/unarchive", caseController.unarchiveCase);
router.put("/:id/status", caseController.updateCaseStatus);
router.get("/:id/export-pdf", caseController.exportCasePdf);
router.get("/:id/messages", messageController.getCaseMessages);
router.get("/:id/messages/search", messageController.searchMessages);
router.get("/:id/messages/page/:messageId", messageController.getMessagePage);
router.get("/:id/vault", messageController.getCaseVault);
router.get("/:id/unread-count", messageController.getUnreadCount);
router.post(
  "/:id/messages/upload",
  handleUpload,
  messageController.uploadFileMessage,
);
router.patch("/:id/messages/:messageId", messageController.editMessage);
router.delete("/:id/messages/:messageId", messageController.deleteMessage);

// Pinned messages routes
router.get("/:id/messages/pinned", messageController.getPinnedMessages);
router.post("/:id/messages/:messageId/pin", messageController.pinMessage);
router.delete("/:id/messages/:messageId/pin", messageController.unpinMessage);


// Annotation routes
router.get("/:caseId/annotations", annotationController.getAnnotations);
router.post("/:caseId/annotations", annotationController.createAnnotation);
router.put(
  "/:caseId/annotations/:annotationId",
  annotationController.updateAnnotation
);
router.delete(
  "/:caseId/annotations/:annotationId",
  annotationController.deleteAnnotation
);

// Task / Action Item routes
const taskController = require("../controllers/task.controller");
router.get("/:caseId/tasks", taskController.getCaseTasks);
router.post("/:caseId/tasks", taskController.createTask);
router.patch("/:caseId/tasks/:taskId", taskController.updateTask);
router.delete("/:caseId/tasks/:taskId", taskController.deleteTask);

router.get("/", caseController.getAllCases);
router.delete("/:id", caseController.deleteCase);
router.get("/:id/participants", caseController.getCaseParticipants);
router.put("/:id/pin", caseController.pinCase);
router.delete("/:id/pin", caseController.unpinCase);

module.exports = router;
