const taskService = require("../services/task.service");

const getCaseTasks = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;

    const tasks = await taskService.getCaseTasks(caseId, userId);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const io = req.app.get("io");

    const task = await taskService.createTask(caseId, userId, req.body, io);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { caseId, taskId } = req.params;
    const userId = req.user.id;
    const io = req.app.get("io");

    const task = await taskService.updateTask(
      caseId,
      taskId,
      userId,
      req.body,
      io
    );
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { caseId, taskId } = req.params;
    const userId = req.user.id;
    const io = req.app.get("io");

    const result = await taskService.deleteTask(caseId, taskId, userId, io);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCaseTasks,
  createTask,
  updateTask,
  deleteTask,
};
