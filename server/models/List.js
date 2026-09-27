const mongoose = require('mongoose');

// Section 3.4 — List schema (exact fields from spec)
const ListSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], // ordered array
    position: { type: Number, required: true }, // order among sibling lists
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index per spec Section 3.4 — fast "get all lists for a board in order"
ListSchema.index({ board: 1, position: 1 });

module.exports = mongoose.model('List', ListSchema);
