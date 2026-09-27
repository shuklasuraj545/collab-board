const Workspace = require('../models/Workspace');
const Board = require('../models/Board');

/**
 * @desc  Get all workspaces where current user is owner, member, or has board access
 * @route GET /api/workspaces
 * @access Private
 */
const getWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find workspaces where user is owner or member
    let workspaces = await Workspace.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).populate('owner', 'name email avatar');

    // Also check if user belongs to any board whose workspace isn't already listed
    const userBoards = await Board.find({ members: userId, isArchived: false }).select('workspace');
    const userWorkspaceIds = userBoards.map((b) => b.workspace);

    if (userWorkspaceIds.length > 0) {
      const extraWorkspaces = await Workspace.find({
        _id: { $in: userWorkspaceIds },
      }).populate('owner', 'name email avatar');

      // Merge workspaces without duplicates
      const wsMap = new Map();
      workspaces.forEach((w) => wsMap.set(w._id.toString(), w));
      extraWorkspaces.forEach((w) => wsMap.set(w._id.toString(), w));
      workspaces = Array.from(wsMap.values());
    }

    res.status(200).json({ workspaces });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a workspace; creator is automatically added as admin member
 * @route POST /api/workspaces
 * @access Private
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required', code: 'VALIDATION_ERROR' });
    }

    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    const existing = await Workspace.findOne({ slug });
    if (existing) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const workspace = await Workspace.create({
      name,
      slug,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get single workspace with its boards (including boards shared with current user)
 * @route GET /api/workspaces/:workspaceId
 * @access Private
 */
const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId).populate(
      'owner',
      'name email avatar'
    );

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });
    }

    const userId = req.user._id.toString();

    // Fetch boards in this workspace where user is a board member or createdBy
    const boards = await Board.find({
      workspace: workspace._id,
      isArchived: false,
      $or: [{ members: req.user._id }, { createdBy: req.user._id }],
    }).select('title background members createdAt');

    res.status(200).json({ workspace, boards });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWorkspaces, createWorkspace, getWorkspace };
