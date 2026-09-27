const List = require('../models/List');
const Board = require('../models/Board');

/**
 * @desc  Create a new list; also pushes its ObjectId into Board.lists
 * @route POST /api/lists
 * @access Private
 * Response 201: created list object
 */
const createList = async (req, res, next) => {
  try {
    const { title, boardId, position } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found', code: 'NOT_FOUND' });
    }

    // Verify user has board access
    const userId = req.user._id.toString();
    const isMember = board.members.some((m) => m.toString() === userId) ||
      board.createdBy?.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this board', code: 'FORBIDDEN' });
    }

    const list = await List.create({ title, board: boardId, position });

    // Push to Board.lists ordered array
    await Board.findByIdAndUpdate(boardId, { $push: { lists: list._id } });

    res.status(201).json({ list });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update a list's position (reorder among siblings)
 * @route PATCH /api/lists/:listId/reorder
 * @access Private
 * Response 200: { message: "Reordered" }
 */
const reorderList = async (req, res, next) => {
  try {
    const { newPosition } = req.body;

    const list = await List.findByIdAndUpdate(
      req.params.listId,
      { $set: { position: newPosition } },
      { new: true, runValidators: true }
    );

    if (!list) {
      return res.status(404).json({ error: 'List not found', code: 'NOT_FOUND' });
    }

    res.status(200).json({ message: 'Reordered' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createList, reorderList };
