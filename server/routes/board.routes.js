const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const authMiddleware = require('../middleware/authMiddleware');
const boardAccessMiddleware = require('../middleware/boardAccessMiddleware');
const { validate, createBoardSchema, updateBoardSchema, inviteBoardSchema } = require('../utils/validators');

// GET /api/boards/:boardId — full board populated with lists → tasks
router.get('/:boardId', authMiddleware, boardAccessMiddleware, boardController.getBoard);

// POST /api/boards — create a board
router.post('/', authMiddleware, validate(createBoardSchema), boardController.createBoard);

// PATCH /api/boards/:boardId — partial update
router.patch(
  '/:boardId',
  authMiddleware,
  boardAccessMiddleware,
  validate(updateBoardSchema),
  boardController.updateBoard
);

// POST /api/boards/:boardId/invite — send invitation to user (pending state)
router.post(
  '/:boardId/invite',
  authMiddleware,
  boardAccessMiddleware,
  validate(inviteBoardSchema),
  boardController.inviteToBoard
);

// DELETE /api/boards/:boardId/members/:memberId — remove member (owner/admin only)
router.delete(
  '/:boardId/members/:memberId',
  authMiddleware,
  boardAccessMiddleware,
  boardController.removeMember
);

module.exports = router;
