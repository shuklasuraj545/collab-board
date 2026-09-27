const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, createTaskSchema, updateTaskSchema, addCommentSchema } = require('../utils/validators');

// POST /api/tasks — create task; also triggers task:created socket broadcast
router.post('/', authMiddleware, validate(createTaskSchema), taskController.createTask);

// PATCH /api/tasks/:taskId — partial update; triggers task:updated broadcast
router.patch('/:taskId', authMiddleware, validate(updateTaskSchema), taskController.updateTask);

// DELETE /api/tasks/:taskId — delete task; triggers task:deleted broadcast
router.delete('/:taskId', authMiddleware, taskController.deleteTask);

// POST /api/tasks/:taskId/comments — add comment; triggers comment:added broadcast
router.post(
  '/:taskId/comments',
  authMiddleware,
  validate(addCommentSchema),
  taskController.addComment
);

module.exports = router;
