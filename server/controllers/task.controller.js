const Task = require('../models/Task');
const List = require('../models/List');
const Board = require('../models/Board');

/**
 * Helper to emit real-time socket events for REST operations.
 * If the request includes 'x-socket-id' header, broadcasts to room EXCEPT the sender
 * to prevent duplicate echo bugs. Otherwise broadcasts to the whole room.
 */
const emitSocketEvent = (req, boardId, event, payload) => {
  const io = req.app.get('io');
  if (!io) return;

  const socketId = req.headers['x-socket-id'];
  const senderSocket = socketId ? io.sockets.sockets.get(socketId) : null;

  if (senderSocket) {
    senderSocket.to(boardId).emit(event, payload);
  } else {
    io.to(boardId).emit(event, payload);
  }
};

const invalidateBoardCache = async (boardId) => {
  // Hook for Slice 4 Redis cache invalidation
};

/**
 * @desc  Create a new task; also pushes its ObjectId into List.tasks
 * @route POST /api/tasks
 * @access Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, listId, boardId, position } = req.body;

    const [list, board] = await Promise.all([
      List.findById(listId),
      Board.findById(boardId),
    ]);

    if (!list) return res.status(404).json({ error: 'List not found', code: 'NOT_FOUND' });
    if (!board) return res.status(404).json({ error: 'Board not found', code: 'NOT_FOUND' });

    const task = await Task.create({
      title,
      list: listId,
      board: boardId,
      position,
      createdBy: req.user._id,
    });

    await List.findByIdAndUpdate(listId, { $push: { tasks: task._id } });

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    emitSocketEvent(req, boardId, 'task:created', populatedTask);
    await invalidateBoardCache(boardId);

    res.status(201).json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Partially update a task's content fields
 * @route PATCH /api/tasks/:taskId
 * @access Private
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, assignees, labels, dueDate, priority } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (assignees !== undefined) updateFields.assignees = assignees;
    if (labels !== undefined) updateFields.labels = labels;
    if (dueDate !== undefined) updateFields.dueDate = dueDate;
    if (priority !== undefined) updateFields.priority = priority;

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.author', 'name email avatar');

    if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });

    emitSocketEvent(req, task.board.toString(), 'task:updated', {
      taskId: task._id,
      changes: updateFields,
    });

    await invalidateBoardCache(task.board.toString());

    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a task; removes it from List.tasks
 * @route DELETE /api/tasks/:taskId
 * @access Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });

    const boardId = task.board.toString();
    const listId = task.list.toString();

    await Task.findByIdAndDelete(req.params.taskId);
    await List.findByIdAndUpdate(listId, { $pull: { tasks: task._id } });

    emitSocketEvent(req, boardId, 'task:deleted', {
      taskId: task._id,
      listId,
    });

    await invalidateBoardCache(boardId);

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Add a comment to a task
 * @route POST /api/tasks/:taskId/comments
 * @access Private
 */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $push: {
          comments: {
            author: req.user._id,
            text,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate('comments.author', 'name email avatar');

    if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });

    const newComment = task.comments[task.comments.length - 1];

    emitSocketEvent(req, task.board.toString(), 'comment:added', {
      taskId: task._id,
      comment: newComment,
    });

    res.status(201).json({ comment: newComment });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, updateTask, deleteTask, addComment };
