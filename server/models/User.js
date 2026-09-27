const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Section 3.1 — User schema (exact fields from spec)
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // bcrypt hash, excluded by default
    avatar: { type: String, default: '' },
    lastSeen: { type: Date, default: Date.now },
    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      emailNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Pre-save hook: hash password before storing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare plaintext password to stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
