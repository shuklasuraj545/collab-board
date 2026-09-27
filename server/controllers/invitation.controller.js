const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');

/**
 * @desc  Send an invitation to join a board or workspace by email
 * @route POST /api/invitations/send
 * @access Private
 */
const sendInvitation = async (req, res, next) => {
  try {
    const { email, boardId, workspaceId } = req.body;
    const recipientEmail = email.toLowerCase().trim();

    if (!boardId && !workspaceId) {
      return res
        .status(400)
        .json({ error: 'Either boardId or workspaceId must be provided', code: 'VALIDATION_ERROR' });
    }

    // 1. Find user in MongoDB matching recipient email (optional, user might register later)
    const recipientUser = await User.findOne({ email: recipientEmail });

    // 2. Check if user is already a member of board or workspace
    if (boardId) {
      const board = await Board.findById(boardId);
      if (!board) return res.status(404).json({ error: 'Board not found', code: 'NOT_FOUND' });

      if (recipientUser) {
        const isMember = board.members.some((m) => m.toString() === recipientUser._id.toString());
        if (isMember) {
          return res.status(400).json({ error: 'User is already a member of this board', code: 'ALREADY_MEMBER' });
        }
      }
    }

    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

      if (recipientUser) {
        const isMember =
          workspace.owner.toString() === recipientUser._id.toString() ||
          workspace.members.some((m) => m.user.toString() === recipientUser._id.toString());
        if (isMember) {
          return res
            .status(400)
            .json({ error: 'User is already a member of this workspace', code: 'ALREADY_MEMBER' });
        }
      }
    }

    // 3. Check if a pending invitation already exists for this recipient & board/workspace
    const query = { recipientEmail, status: 'pending' };
    if (boardId) query.board = boardId;
    if (workspaceId) query.workspace = workspaceId;

    const existingInvite = await Invitation.findOne(query);
    if (existingInvite) {
      return res
        .status(400)
        .json({ error: 'An invitation is already pending for this email', code: 'ALREADY_INVITED' });
    }

    // 4. Save new Invitation document
    const invitation = await Invitation.create({
      sender: req.user._id,
      recipientEmail,
      recipient: recipientUser ? recipientUser._id : null,
      board: boardId || null,
      workspace: workspaceId || null,
      status: 'pending',
    });

    const populatedInvitation = await Invitation.findById(invitation._id)
      .populate('sender', 'name email avatar')
      .populate('board', 'title background')
      .populate('workspace', 'name');

    // 5. Real-time socket notification if recipient user is online
    const io = req.app.get('io');
    if (io && recipientUser) {
      // Send to personal socket room user:<userId>
      io.to(`user:${recipientUser._id}`).emit('notification:received', populatedInvitation);
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: populatedInvitation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Fetch all pending invitations for the authenticated user
 * @route GET /api/invitations/pending
 * @access Private
 */
const getPendingInvitations = async (req, res, next) => {
  try {
    const userEmail = req.user.email.toLowerCase();
    const userId = req.user._id;

    const invitations = await Invitation.find({
      status: 'pending',
      $or: [{ recipientEmail: userEmail }, { recipient: userId }],
    })
      .populate('sender', 'name email avatar')
      .populate('board', 'title background')
      .populate('workspace', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ invitations });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Respond to an invitation (accept or reject)
 * @route POST /api/invitations/:invitationId/respond
 * @access Private
 */
const respondToInvitation = async (req, res, next) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found', code: 'NOT_FOUND' });
    }

    // Verify recipient identity
    const userEmail = req.user.email.toLowerCase();
    const userId = req.user._id;
    const isRecipient =
      invitation.recipientEmail === userEmail ||
      (invitation.recipient && invitation.recipient.toString() === userId.toString());

    if (!isRecipient) {
      return res.status(403).json({ error: 'Access denied to this invitation', code: 'FORBIDDEN' });
    }

    if (invitation.status !== 'pending') {
      return res
        .status(400)
        .json({ error: `Invitation has already been ${invitation.status}`, code: 'INVALID_STATUS' });
    }

    if (action === 'accept') {
      invitation.status = 'accepted';
      invitation.recipient = userId;

      // Add user to board members if board invitation
      if (invitation.board) {
        const board = await Board.findById(invitation.board);
        if (board) {
          const isAlreadyMember = board.members.some((m) => m.toString() === userId.toString());
          if (!isAlreadyMember) {
            board.members.push(userId);
            board.activityLog.push({
              action: 'member_joined',
              actor: userId,
              timestamp: new Date(),
            });
            await board.save();
          }
        }
      }

      // Add user to workspace members if workspace invitation
      if (invitation.workspace) {
        const workspace = await Workspace.findById(invitation.workspace);
        if (workspace) {
          const isAlreadyMember = workspace.members.some(
            (m) => m.user.toString() === userId.toString()
          );
          if (!isAlreadyMember) {
            workspace.members.push({ user: userId, role: 'member' });
            await workspace.save();
          }
        }
      }
    } else if (action === 'reject') {
      invitation.status = 'rejected';
      invitation.recipient = userId;
    }

    await invitation.save();

    res.status(200).json({
      message: `Invitation ${action}ed successfully`,
      status: invitation.status,
      invitationId: invitation._id,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendInvitation, getPendingInvitations, respondToInvitation };
