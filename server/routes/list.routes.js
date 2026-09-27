const express = require('express');
const router = express.Router();
const listController = require('../controllers/list.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, createListSchema, reorderListSchema } = require('../utils/validators');

// POST /api/lists — create a list, also pushes to Board.lists
router.post('/', authMiddleware, validate(createListSchema), listController.createList);

// PATCH /api/lists/:listId/reorder — update list position
router.patch(
  '/:listId/reorder',
  authMiddleware,
  validate(reorderListSchema),
  listController.reorderList
);

module.exports = router;
