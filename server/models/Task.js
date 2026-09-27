const mongoose = require('mongoose');

// Section 3.5 — Task schema (exact fields from spec)
const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' }, // markdown supported
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true }, // denormalized for fast cross-board queries
    position: { type: Number, required: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [{ name: String, color: String }],
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    versionKey: '__v',
    optimisticConcurrency: true, // Mongoose optimistic locking on document save
  }
);

// Compound index 1 per spec Section 3.5 — fast board loads
TaskSchema.index({ board: 1, list: 1, position: 1 });

// Compound index 2 per spec Section 3.5 — fast "my tasks" queries
TaskSchema.index({ assignees: 1, dueDate: 1 });

module.exports = mongoose.model('Task', TaskSchema);
