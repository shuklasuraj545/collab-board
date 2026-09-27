const Board = require('../models/Board');
const List = require('../models/List');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Invitation = require('../models/Invitation');

/**
 * @desc  Get a single board, fully populated (lists → tasks → assignees)
 * @route GET /api/boards/:boardId
 * @access Private + boardAccessMiddleware
 */
const getBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate('createdBy', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate({
        path: 'lists',
        match: { isArchived: false },
        options: { sort: { position: 1 } },
        populate: {
          path: 'tasks',
          match: { isArchived: false },
          options: { sort: { position: 1 } },
          populate: [
            { path: 'assignees', select: 'name email avatar' },
            { path: 'createdBy', select: 'name email avatar' },
            { path: 'comments.author', select: 'name email avatar' },
          ],
        },
      });

    res.status(200).json({ board });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a new board; creator is automatically added as a member
 * @route POST /api/boards
 * @access Private
 */
const createBoard = async (req, res, next) => {
  try {
    const { title, workspaceId, background } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });
    }
    const userId = req.user._id.toString();
    const isMember =
      workspace.owner.toString() === userId ||
      workspace.members.some((m) => m.user.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this workspace', code: 'FORBIDDEN' });
    }

    const board = await Board.create({
      title,
      workspace: workspaceId,
      background: background || '#0079BF',
      members: [req.user._id],
      createdBy: req.user._id,
    });

    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Partially update a board (title, background)
 * @route PATCH /api/boards/:boardId
 * @access Private + boardAccessMiddleware
 */
const updateBoard = async (req, res, next) => {
  try {
    const { title, background } = req.body;
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (background !== undefined) updateFields.background = background;

    const board = await Board.findByIdAndUpdate(
      req.params.boardId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({ board });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Invite a user to a board by email (creates pending invitation; does NOT add directly to board.members)
 * @route POST /api/boards/:boardId/invite
 * @access Private + boardAccessMiddleware
 */
const inviteToBoard = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { boardId } = req.params;
    const recipientEmail = email.toLowerCase().trim();

    // 1. Find user by email in MongoDB
    const recipientUser = await User.findOne({ email: recipientEmail });
    if (!recipientUser) {
      return res
        .status(404)
        .json({ error: 'User with this email does not exist', code: 'USER_NOT_FOUND' });
    }

    const board = req.board;

    // 2. Check if user is ALREADY in board.members
    const isAlreadyMember = board.members.some(
      (m) => m.toString() === recipientUser._id.toString()
    );
    if (isAlreadyMember) {
      return res
        .status(400)
        .json({ error: 'User is already a member of this board', code: 'ALREADY_MEMBER' });
    }

    // 3. Check if a pending invitation already exists for this board & email
    const pendingInvite = await Invitation.findOne({
      board: boardId,
      recipientEmail,
      status: 'pending',
    });
    if (pendingInvite) {
      return res
        .status(400)
        .json({ error: 'An invitation is already pending for this user', code: 'ALREADY_INVITED' });
    }

    // 4. Save new Invitation (status: 'pending') — DO NOT push user to board.members here!
    const invitation = await Invitation.create({
      board: boardId,
      workspace: board.workspace,
      sender: req.user._id,
      recipientEmail,
      recipient: recipientUser._id,
      status: 'pending',
    });

    const populatedInvitation = await Invitation.findById(invitation._id)
      .populate('sender', 'name email avatar')
      .populate('board', 'title background')
      .populate('workspace', 'name');

    // 5. Emit socket event notification:received to recipient user's socket room
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientUser._id}`).emit('notification:received', populatedInvitation);
    }

    res.status(201).json({
      message: 'Invitation sent successfully! Waiting for recipient to accept.',
      invitation: populatedInvitation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Remove a member from a board (Owner/Admin only)
 * @route DELETE /api/boards/:boardId/members/:memberId
 * @access Private + boardAccessMiddleware
 */
const removeMember = async (req, res, next) => {
  try {
    const { boardId, memberId } = req.params;
    const board = req.board;

    const currentUserId = req.user._id.toString();
    const boardOwnerId = board.createdBy ? board.createdBy.toString() : null;

    // 1. Check if req.user is board owner or creator
    if (boardOwnerId && currentUserId !== boardOwnerId) {
      return res
        .status(403)
        .json({ error: 'Unauthorized. Only board owners can remove members.', code: 'FORBIDDEN' });
    }

    // 2. Prevent owner from removing themselves
    if (memberId === currentUserId || memberId === boardOwnerId) {
      return res.status(400).json({ error: 'Cannot remove board owner', code: 'CANNOT_REMOVE_OWNER' });
    }

    // 3. Pull memberId from board.members array and save
    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      { $pull: { members: memberId } },
      { new: true }
    ).populate('members', 'name email avatar');

    res.status(200).json({
      message: 'Member removed successfully',
      memberId,
      members: updatedBoard.members,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBoard,
  createBoard,
  updateBoard,
  inviteToBoard,
  removeMember,
};
