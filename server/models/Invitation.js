const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

InvitationSchema.index({ recipientEmail: 1, status: 1 });
InvitationSchema.index({ board: 1, recipientEmail: 1, status: 1 });

module.exports = mongoose.model('Invitation', InvitationSchema);
