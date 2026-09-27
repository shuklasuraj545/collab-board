const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitation.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, sendInvitationSchema, respondInvitationSchema } = require('../utils/validators');

// POST /api/invitations/send — send an invitation by email
router.post('/send', authMiddleware, validate(sendInvitationSchema), invitationController.sendInvitation);

// GET /api/invitations/pending — list pending invitations for current user
router.get('/pending', authMiddleware, invitationController.getPendingInvitations);

// POST /api/invitations/:invitationId/respond — accept or reject invitation
router.post(
  '/:invitationId/respond',
  authMiddleware,
  validate(respondInvitationSchema),
  invitationController.respondToInvitation
);

module.exports = router;
