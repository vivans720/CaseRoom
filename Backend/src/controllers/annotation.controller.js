const Annotation = require("../models/Annotation");
const Case = require("../models/Case");

const sameId = (left, right) => {
  const leftId = left?._id || left;
  const rightId = right?._id || right;
  return Boolean(
    leftId &&
      rightId &&
      leftId.toString?.() === rightId.toString?.()
  );
};

// Support current schema plus older records created before participant field rename.
const isCaseParticipant = (caseDocument, userId) =>
  sameId(caseDocument.creatorId || caseDocument.createdBy, userId) ||
  caseDocument.participants?.some((participant) =>
    sameId(participant?.user || participant?.userId, userId)
  );

const isCaseAdmin = (caseDocument, userId) =>
  sameId(caseDocument.creatorId || caseDocument.createdBy, userId) ||
  caseDocument.participants?.some(
    (participant) =>
      sameId(participant?.user || participant?.userId, userId) &&
      participant.role === "Admin"
  );

const assertCaseParticipant = (caseDocument, userId) => {
  if (isCaseParticipant(caseDocument, userId)) return;

  const error = new Error("Access denied: Not a case participant");
  error.statusCode = 403;
  throw error;
};

const getAnnotations = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { fileUrl, messageId } = req.query;

    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    assertCaseParticipant(existingCase, req.user._id);

    const filter = { caseId };
    if (fileUrl) filter.fileUrl = fileUrl;
    if (messageId) filter.messageId = messageId;

    const annotations = await Annotation.find(filter)
      .populate("createdBy", "name email avatar color")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: annotations,
    });
  } catch (error) {
    next(error);
  }
};

const createAnnotation = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { messageId, fileUrl, pageNumber, type, coordinates, style, text } =
      req.body;

    if (!fileUrl || !type) {
      const error = new Error("fileUrl and type are required");
      error.statusCode = 400;
      throw error;
    }

    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }

    assertCaseParticipant(existingCase, req.user._id);

    const annotation = await Annotation.create({
      caseId,
      messageId: messageId || null,
      fileUrl,
      pageNumber: pageNumber || 1,
      type,
      coordinates: coordinates || {},
      style: style || {},
      text: text || "",
      createdBy: req.user._id,
    });

    const populatedAnnotation = await Annotation.findById(annotation._id).populate(
      "createdBy",
      "name email avatar color"
    );

    res.status(201).json({
      success: true,
      data: populatedAnnotation,
    });
  } catch (error) {
    next(error);
  }
};

const updateAnnotation = async (req, res, next) => {
  try {
    const { caseId, annotationId } = req.params;
    const { coordinates, style, text, pageNumber } = req.body;

    const annotation = await Annotation.findById(annotationId);
    if (!annotation) {
      const error = new Error("Annotation not found");
      error.statusCode = 404;
      throw error;
    }

    if (annotation.caseId.toString() !== caseId) {
      const error = new Error("Annotation does not belong to this case");
      error.statusCode = 400;
      throw error;
    }

    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }
    assertCaseParticipant(existingCase, req.user._id);

    if (!sameId(annotation.createdBy, req.user._id)) {
      if (!isCaseAdmin(existingCase, req.user._id)) {
        const error = new Error("Not authorized to modify this annotation");
        error.statusCode = 403;
        throw error;
      }
    }

    if (coordinates) annotation.coordinates = coordinates;
    if (style) annotation.style = { ...annotation.style, ...style };
    if (text !== undefined) annotation.text = text;
    if (pageNumber !== undefined) annotation.pageNumber = pageNumber;

    await annotation.save();

    const updated = await Annotation.findById(annotation._id).populate(
      "createdBy",
      "name email avatar color"
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAnnotation = async (req, res, next) => {
  try {
    const { caseId, annotationId } = req.params;

    const annotation = await Annotation.findById(annotationId);
    if (!annotation) {
      const error = new Error("Annotation not found");
      error.statusCode = 404;
      throw error;
    }

    if (annotation.caseId.toString() !== caseId) {
      const error = new Error("Annotation does not belong to this case");
      error.statusCode = 400;
      throw error;
    }

    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const error = new Error("Case not found");
      error.statusCode = 404;
      throw error;
    }
    assertCaseParticipant(existingCase, req.user._id);

    if (!sameId(annotation.createdBy, req.user._id)) {
      if (!isCaseAdmin(existingCase, req.user._id)) {
        const error = new Error("Not authorized to delete this annotation");
        error.statusCode = 403;
        throw error;
      }
    }

    await Annotation.findByIdAndDelete(annotationId);

    res.status(200).json({
      success: true,
      message: "Annotation deleted successfully",
      data: { annotationId },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
};
