const { z } = require('zod');

// Auth validators
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// Board validators
const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  workspaceId: z.string().min(1, 'workspaceId is required'),
  background: z.string().optional(),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  background: z.string().optional(),
});

const inviteBoardSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Invitation validators
const sendInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  boardId: z.string().optional(),
  workspaceId: z.string().optional(),
});

const respondInvitationSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

// List validators
const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  boardId: z.string().min(1, 'boardId is required'),
  position: z.number(),
});

const reorderListSchema = z.object({
  newPosition: z.number(),
});

// Task validators
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  listId: z.string().min(1, 'listId is required'),
  boardId: z.string().min(1, 'boardId is required'),
  position: z.number(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(2000),
});

/**
 * validate — Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with spec-compliant error shape on validation failure.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    return res.status(400).json({ error: message, code: 'VALIDATION_ERROR' });
  }
  req.body = result.data; // replace with parsed/typed data
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createBoardSchema,
  updateBoardSchema,
  inviteBoardSchema,
  sendInvitationSchema,
  respondInvitationSchema,
  createListSchema,
  reorderListSchema,
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
};
