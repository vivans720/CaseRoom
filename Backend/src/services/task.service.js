const Task = require("../models/Task");
const Case = require("../models/Case");
const User = require("../models/User");
const notificationService = require("./notification.service");

const throwError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const populateTask = (query) =>
  query
    .populate("createdBy", "name email employeeId profilePictureUrl")
    .populate("assignees", "name email employeeId profilePictureUrl")
    .populate("completedBy", "name email employeeId profilePictureUrl");

/**
 * Get all tasks for a case
 */
const getCaseTasks = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }
  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const tasks = await populateTask(
    Task.find({ caseId }).sort({ createdAt: -1 })
  ).lean();

  return tasks;
};

/**
 * Create a new task in a case
 */
const createTask = async (caseId, userId, taskData, io = null) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }
  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const { title, description, priority, dueDate, assignees } = taskData;

  if (!title || !title.trim()) {
    throwError("Task title is required", 400);
  }

  let finalAssignees = Array.isArray(assignees) ? [...assignees] : [];

  const creatorUser = await User.findById(userId).select("name");

  const newTask = new Task({
    caseId,
    title: title.trim(),
    description: description ? description.trim() : "",
    priority: priority || "medium",
    dueDate: dueDate || null,
    assignees: finalAssignees,
    createdBy: userId,
  });

  await newTask.save();

  const populatedTask = await populateTask(Task.findById(newTask._id)).lean();

  // Create notifications for assigned users
  for (const assigneeId of finalAssignees) {
    if (assigneeId.toString() !== userId.toString()) {
      await notificationService.createNotification(
        {
          recipientId: assigneeId,
          type: "task_assigned",
          title: "New Task Assigned",
          body: `${creatorUser ? creatorUser.name : "Someone"} assigned you a task: "${title.trim()}" in case "${caseDoc.title}"`,
          caseId,
          taskId: newTask._id,
          actorId: userId,
        },
        io
      );
    }
  }

  if (io) {
    io.to(`case_${caseId}`).emit("task_created", {
      caseId,
      task: populatedTask,
    });
  }

  return populatedTask;
};

/**
 * Update an existing task
 */
const updateTask = async (caseId, taskId, userId, updateData, io = null) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }
  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const task = await Task.findOne({ _id: taskId, caseId });
  if (!task) {
    throwError("Task not found", 404);
  }

  const previousStatus = task.status;
  const previousAssignees = task.assignees.map((id) => id.toString());

  if (updateData.title !== undefined) {
    if (!updateData.title.trim()) {
      throwError("Task title cannot be empty", 400);
    }
    task.title = updateData.title.trim();
  }

  if (updateData.description !== undefined) {
    task.description = updateData.description.trim();
  }

  if (updateData.priority !== undefined) {
    task.priority = updateData.priority;
  }

  if (updateData.dueDate !== undefined) {
    task.dueDate = updateData.dueDate || null;
  }

  if (updateData.assignees !== undefined) {
    task.assignees = Array.isArray(updateData.assignees) ? updateData.assignees : [];
  }

  if (updateData.status !== undefined && updateData.status !== previousStatus) {
    task.status = updateData.status;
    if (updateData.status === "done") {
      task.completedBy = userId;
      task.completedAt = new Date();
    } else {
      task.completedBy = null;
      task.completedAt = null;
    }
  }

  await task.save();

  const populatedTask = await populateTask(Task.findById(task._id)).lean();
  const updatingUser = await User.findById(userId).select("name");

  // Send notification to new assignees
  const currentAssignees = task.assignees.map((id) => id.toString());
  const newAssignees = currentAssignees.filter(
    (id) => !previousAssignees.includes(id) && id !== userId.toString()
  );

  for (const assigneeId of newAssignees) {
    await notificationService.createNotification(
      {
        recipientId: assigneeId,
        type: "task_assigned",
        title: "Task Assigned",
        body: `${updatingUser ? updatingUser.name : "Someone"} assigned you to task: "${task.title}"`,
        caseId,
        taskId: task._id,
        actorId: userId,
      },
      io
    );
  }

  // Notify creator/assignees if completed
  if (updateData.status === "done" && previousStatus !== "done") {
    const notifyTargets = new Set([
      task.createdBy.toString(),
      ...currentAssignees,
    ]);
    notifyTargets.delete(userId.toString());

    for (const targetId of notifyTargets) {
      await notificationService.createNotification(
        {
          recipientId: targetId,
          type: "task_completed",
          title: "Task Completed",
          body: `${updatingUser ? updatingUser.name : "Someone"} marked task "${task.title}" as done`,
          caseId,
          taskId: task._id,
          actorId: userId,
        },
        io
      );
    }
  }

  if (io) {
    io.to(`case_${caseId}`).emit("task_updated", {
      caseId,
      task: populatedTask,
    });
  }

  return populatedTask;
};

/**
 * Delete a task
 */
const deleteTask = async (caseId, taskId, userId, io = null) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }
  if (!caseDoc.isParticipant(userId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  const task = await Task.findOne({ _id: taskId, caseId });
  if (!task) {
    throwError("Task not found", 404);
  }

  const role = caseDoc.getParticipantRole(userId);
  const isCreator = task.createdBy.toString() === userId.toString();
  const isAssignee = task.assignees.some(
    (id) => id.toString() === userId.toString()
  );

  if (role !== "Admin" && !isCreator && !isAssignee) {
    throwError("Permission denied to delete this task", 403);
  }

  await task.deleteOne();

  if (io) {
    io.to(`case_${caseId}`).emit("task_deleted", {
      caseId,
      taskId,
    });
  }

  return { message: "Task deleted successfully", taskId };
};

module.exports = {
  getCaseTasks,
  createTask,
  updateTask,
  deleteTask,
};
