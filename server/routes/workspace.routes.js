const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/workspaces — get all workspaces for the current user
router.get('/', authMiddleware, workspaceController.getWorkspaces);

// POST /api/workspaces — create a workspace
router.post('/', authMiddleware, workspaceController.createWorkspace);

// GET /api/workspaces/:workspaceId — get single workspace with boards
router.get('/:workspaceId', authMiddleware, workspaceController.getWorkspace);

module.exports = router;
