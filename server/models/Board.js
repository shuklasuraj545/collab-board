const mongoose = require('mongoose');

// Section 3.3 — Board schema (exact fields from spec)
const BoardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    background: { type: String, default: '#0079BF' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    lists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'List' }], // ordered array — the order here IS the display order
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [{ name: String, color: String }],
    activityLog: [
      {
        action: String, // e.g. "task_moved", "member_added"
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound index per spec Section 3.3
BoardSchema.index({ workspace: 1 });

module.exports = mongoose.model('Board', BoardSchema);
