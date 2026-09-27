const Board = require('../models/Board');

/**
 * boardAccessMiddleware — verifies that the authenticated user (req.user)
 * is a member of the board identified by req.params.boardId.
 *
 * Must be used AFTER authMiddleware in the chain.
 * On success calls next(), otherwise returns 403 or 404.
 *
 * Also attaches `req.board` so downstream controllers don't need to re-query.
 */
const boardAccessMiddleware = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);

    if (!board || board.isArchived) {
      return res.status(404).json({ error: 'Board not found', code: 'BOARD_NOT_FOUND' });
    }

    // A user has access if they appear in board.members OR are the createdBy user
    const userId = req.user._id.toString();
    const isMember = board.members.some((m) => m.toString() === userId);
    const isCreator = board.createdBy?.toString() === userId;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Not a member of this board', code: 'FORBIDDEN' });
    }

    req.board = board;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = boardAccessMiddleware;
