const mongoose = require('mongoose');

// Section 3.2 — Workspace schema (exact fields from spec)
const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
      },
    ],
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', WorkspaceSchema);
