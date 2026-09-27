# CollabBoard — Project Architecture & Developer Guide

Welcome to the comprehensive architecture guide for **CollabBoard** — a real-time collaborative project management application (Trello + Notion-lite hybrid) built using the **MERN** stack (MongoDB, Express, React, Node.js), **Socket.io**, and **Redis**.

---

## 1. High-Level Application Workflow

```
 ┌────────────────┐     HTTP-Only JWT Cookie     ┌────────────────┐
 │  React Client  │ ───────────────────────────► │ Express Server │
 │   (Vite SPA)   │ ◄─────────────────────────── │ (Node HTTP Srv)│
 └───────┬────────┘                              └───────┬────────┘
         │                                               │
         │ WSS (WebSockets)                              │ Mongoose ORM
         ▼                                               ▼
 ┌────────────────┐      Pub / Sub Adapter       ┌────────────────┐
 │   Socket.io    │ ◄──────────────────────────► │    MongoDB     │
 │ (Room Scoped)  │      (@socket.io/redis)      │   + Redis      │
 └────────────────┘                              └────────────────┘
```

### End-to-End User Journey

1. **Authentication & Session Persistence (`/login`, `/register`)**
   - The user registers or signs in via `LoginForm` / `RegisterForm`.
   - The server validates credentials, hashes passwords using `bcryptjs`, generates a signed JWT token, and attaches it as an HTTP-only cookie named `accessToken`.
   - On page refresh, `AuthContext` calls `GET /api/auth/me`. The browser automatically includes the HTTP-only cookie, verifying the session without requiring user re-login.

2. **Dashboard & Workspaces (`/dashboard`)**
   - Upon authentication, `ProtectedRoute` renders `DashboardPage`.
   - `DashboardPage` fetches the user's workspaces (`GET /api/workspaces`) and associated boards.
   - Users can create workspaces, create new boards, or view boards shared with them by team members.

3. **Board Canvas & Drag-and-Drop (`/board/:boardId`)**
   - Navigating to `/board/:boardId` mounts `BoardPage`.
   - The client fetches the full board document (lists, tasks, assignees, comments, members) via `GET /api/boards/:boardId`.
   - `BoardCanvas` renders lists and task cards using `@dnd-kit/core` and `@dnd-kit/sortable`.
   - When a task is dragged, `useBoardDragAndDrop` optimistically updates local Zustand state (`boardStore.js`), snapshots the previous state for rollback, and emits `task:moved` over Socket.io.

4. **Real-Time Collaboration & Presence**
   - Upon mounting `BoardPage`, `useSocket` joins the board room (`socket.emit('board:join', { boardId })`).
   - Remote drag movements (`task:moved`), updates (`task:updated`), task additions (`task:created`), deletions (`task:deleted`), and comments (`comment:added`) sync across all connected clients on that board in ~200ms.
   - `usePresence` tracks local mouse movement (throttled to ~50ms / 20 events per second) and broadcasts `presence:mouse_move`. Other users see smooth colored live cursors rendered by `LiveCursorOverlay`.

5. **Invitation & Real-Time Notification Pipeline**
   - A board owner clicks **Invite** and enters a user's email (`POST /api/boards/:boardId/invite`).
   - The server creates a `pending` `Invitation` document and emits `notification:received` to the recipient's personal socket room (`user:<userId>`).
   - The recipient's `Navbar` displays an unread red badge counter. Clicking the bell opens `NotificationDropdown`.
   - When the recipient clicks **Accept** (`POST /api/invitations/:id/respond`), the user is added to `board.members`, the notification is cleared, and the shared board appears instantly on their dashboard.

---

## 2. Backend File Map (`/server`)

### Configuration (`/server/config`)
- **`db.js`**: Connects Node.js to MongoDB via Mongoose ORM.
- **`redis.js`**: Initializes Redis pub/sub clients and provides graceful fallback to single-instance mode if local Redis is down.

### Mongoose Models (`/server/models`)
- **`User.js`**: User schema (name, unique email, bcrypt hashed password with `select: false`, avatar, lastSeen, preferences).
- **`Workspace.js`**: Workspace schema (name, unique slug, owner ref, members array with roles).
- **`Board.js`**: Board schema (title, background, workspace ref, ordered lists array, members array, activityLog, indexed on `{ workspace: 1 }`).
- **`List.js`**: List schema (title, board ref, ordered tasks array, position number, compound index on `{ board: 1, position: 1 }`).
- **`Task.js`**: Task schema (title, description, list ref, denormalized board ref, position number, assignees, priority, due date, comments, `__v` optimistic concurrency version key, compound indexes for fast queries).
- **`Invitation.js`**: Invitation schema (board ref, workspace ref, sender ref, recipientEmail, recipient ref, status enum: `'pending' | 'accepted' | 'rejected'`).

### Controllers (`/server/controllers`)
- **`auth.controller.js`**: Handles user registration, login, logout, and retrieving current user session (`getMe`).
- **`workspace.controller.js`**: Handles workspace creation, listing, and fetching workspace boards (including shared boards).
- **`board.controller.js`**: Handles board retrieval (with multi-level list/task population), creation, title/background updates, sending pending invitations, and member removal.
- **`list.controller.js`**: Handles list creation (pushes to `Board.lists`) and position reordering.
- **`task.controller.js`**: Handles task creation, updates, deletion, and comment additions (with socket broadcast sender-exclusion via `x-socket-id`).
- **`invitation.controller.js`**: Handles sending invitations, fetching pending invitations, and processing accept/reject responses.

### Middleware (`/server/middleware`)
- **`authMiddleware.js`**: Verifies JWT from HTTP-only cookie (`accessToken`) and attaches `req.user`.
- **`boardAccessMiddleware.js`**: Verifies `req.user` is a member or creator of `req.params.boardId` (attaches `req.board`).
- **`errorHandler.js`**: Centralized Express error handler returning standard `{ error, code }` JSON responses for validation, duplicate keys, or server errors.

### Routes (`/server/routes`)
- **`auth.routes.js`**: Defines `/api/auth` endpoints (`/register`, `/login`, `/logout`, `/me`).
- **`workspace.routes.js`**: Defines `/api/workspaces` endpoints (`/`, `/:workspaceId`).
- **`board.routes.js`**: Defines `/api/boards` endpoints (`/`, `/:boardId`, `/:boardId/invite`, `/:boardId/members/:memberId`).
- **`list.routes.js`**: Defines `/api/lists` endpoints (`/`, `/:listId/reorder`).
- **`task.routes.js`**: Defines `/api/tasks` endpoints (`/`, `/:taskId`, `/:taskId/comments`).
- **`invitation.routes.js`**: Defines `/api/invitations` endpoints (`/send`, `/pending`, `/:invitationId/respond`).

### Socket Handlers (`/server/socket`)
- **`index.js`**: Registers connection-level JWT cookie authentication (`io.use(...)`), personal user room auto-join (`user:<userId>`), and handler modules.
- **`boardRoom.handlers.js`**: Manages `board:join` (with DB membership verification) and `board:leave` room events.
- **`task.handlers.js`**: Handles real-time `task:moved` drag-and-drop events with version key (`__v`) optimistic lock validation.
- **`presence.handlers.js`**: Re-broadcasts `presence:mouse_move` events as `presence:cursor_update` to other room sockets.

### Utilities & Root (`/server`)
- **`utils/generateToken.js`**: Signs JWT tokens and sets `accessToken` HTTP-only cookies (`sameSite: 'lax'` in dev, `'none'` in cross-domain prod).
- **`utils/validators/index.js`**: Zod request body validation schemas and middleware factory.
- **`index.js`**: Main entry point initializing Express, HTTP server (`http.createServer(app)`), Socket.io, CORS, cookie parser, routes, and error handling.
- **`.env.example`**: Template listing all required environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `REDIS_URL`, `CLIENT_URL`).

---

## 3. Frontend File Map (`/client`)

### API & Socket Client (`/client/src/api` & `/client/src/socket`)
- **`api/axiosInstance.js`**: Pre-configured Axios client with `withCredentials: true` and request interceptor attaching `x-socket-id`.
- **`socket/socketClient.js`**: Singleton Socket.io client instance initialized with `withCredentials: true` and `autoConnect: false`.

### State Management (`/client/src/store` & `/client/src/context`)
- **`store/boardStore.js`**: Central Zustand store managing board, lists, tasks, member state, active modal task, and snapshot rollback.
- **`context/AuthContext.jsx`**: React context providing global user session, `login`, `register`, `logout`, and auto-auth verification on mount.

### Custom Hooks (`/client/src/hooks`)
- **`hooks/useAuth.js`**: Convenience hook to consume `AuthContext`.
- **`hooks/useSocket.js`**: Handles Socket.io lifecycle, room joining/leaving, and real-time task/notification event listeners.
- **`hooks/useBoardDragAndDrop.js`**: Wraps `dnd-kit` drag events, calculates source/destination list indices, applies optimistic Zustand updates, and emits `task:moved`.
- **`hooks/usePresence.js`**: Throttles mouse movement to ~50ms, emits `presence:mouse_move`, and manages remote cursor coordinates.

### Components (`/client/src/components`)
#### Auth Components (`/src/components/auth`)
- **`LoginForm.jsx`**: User login form with email/password validation.
- **`RegisterForm.jsx`**: User registration form with name/email/password fields.
- **`ProtectedRoute.jsx`**: Route guard that redirects unauthenticated users to `/login` and renders a loading spinner while session initializes.

#### Board Components (`/src/components/board`)
- **`BoardCanvas.jsx`**: Main board area rendering side-by-side lists wrapped in `@dnd-kit` `DndContext` and `DragOverlay`.
- **`ListColumn.jsx`**: Droppable column rendering tasks inside `SortableContext` with inline task creation form.
- **`TaskCard.jsx`**: Draggable task card component displaying title, priority badge, due date, comment count, and assignee avatars.
- **`TaskModal.jsx`**: Modal dialog for editing task title, description, priority, due date, comments, and task deletion (split into container and content components to respect React Rules of Hooks).
- **`LiveCursorOverlay.jsx`**: Renders live colored remote mouse cursor indicators and user name badges over the canvas.
- **`InviteMemberModal.jsx`**: Modal form for sending pending board invitations by email.
- **`ManageMembersModal.jsx`**: Modal listing current board members with owner badges and member removal controls.

#### Common Components (`/src/components/common`)
- **`Navbar.jsx`**: Top navigation header displaying logo, board title, unread notification bell badge, user avatar, and logout button.
- **`NotificationDropdown.jsx`**: Dropdown panel showing pending invitations with "Accept" and "Decline" action buttons.
- **`Avatar.jsx`**: Renders user profile image or generated name initials.
- **`Toast.jsx`**: Floating alert banner for success and error notifications.

### Pages & Root (`/client/src/pages` & `/client/src`)
- **`pages/LoginPage.jsx`**: Page container for `LoginForm`.
- **`pages/RegisterPage.jsx`**: Page container for `RegisterForm`.
- **`pages/DashboardPage.jsx`**: Workspace and board list overview page.
- **`pages/BoardPage.jsx`**: Main collaborative board view mounting `Navbar`, `BoardCanvas`, `LiveCursorOverlay`, `TaskModal`, and member modals.
- **`App.jsx`**: React Router navigation map wrapped in `AuthProvider`.
- **`main.jsx`**: Entry point mounting `App` into index HTML DOM element.

---

## 4. Key Feature Explanations

### 1. JWT Authentication via HTTP-Only Cookies
- **Why HTTP-Only Cookies?** Storing JWT tokens in `localStorage` or `sessionStorage` leaves applications vulnerable to Cross-Site Scripting (XSS) attacks. HTTP-only cookies cannot be accessed or read by client-side JavaScript (`document.cookie`), protecting session tokens from theft.
- **How it works in CollabBoard:**
  - Upon successful login/registration, the server calls `res.cookie('accessToken', token, { httpOnly: true, sameSite: 'lax', ... })`.
  - Both Axios (`axiosInstance.js`) and Socket.io (`socketClient.js`) configure `withCredentials: true` / `credentials: true`.
  - The browser automatically attaches the cookie to all HTTP requests and WebSocket handshakes.
  - Middleware (`authMiddleware.js` for Express, `io.use(...)` for Socket.io) parses the cookie and verifies the signature using `JWT_SECRET`.

### 2. Optimistic Drag-and-Drop (`dnd-kit` + Zustand + Rollback)
- **Why Optimistic Updates?** Waiting for a server database roundtrip before updating UI cards creates visible lag (~100–300ms) that makes drag-and-drop feel sluggish.
- **How it works in CollabBoard:**
  1. When a user drops a task card, `useBoardDragAndDrop` immediately takes a snapshot of the current board state (`takeSnapshot()`) in the Zustand store.
  2. The store updates the local task list order immediately (`moveTaskOptimistic(...)`), making the UI respond instantly (0ms perceived latency).
  3. The client emits `task:moved` over Socket.io with payload `{ taskId, sourceListId, destListId, newIndex, clientVersion }`.
  4. If the server rejects the move (e.g., due to a version conflict or network error), the client catches `task:move:rejected` and rolls back state using `rollback()`, restoring the exact previous snapshot.

### 3. MongoDB Document Versioning (`__v` Optimistic Locking)
- **The Simultaneous Move Problem:** If User A and User B drag the exact same task card at the same time, a race condition occurs where the second write could overwrite the first write using stale positional assumptions.
- **How CollabBoard solves it:**
  - The `Task` schema enables Mongoose versioning (`versionKey: '__v'`, `optimisticConcurrency: true`).
  - When User A drags a task, they include `clientVersion` (`__v`).
  - The server queries `Task.findOne({ _id: taskId, __v: clientVersion })`.
  - If User B modified the task first, `__v` in MongoDB incremented. User A's query returns `null` (stale version detected).
  - The server rejects User A's stale write, emits `task:move:rejected` with the authoritative task object, and both clients converge on the identical server truth.

### 4. Redis Pub/Sub (`@socket.io/redis-adapter` Horizontal Scaling)
- **The Multi-Node Socket Problem:** In a multi-server production deployment behind a load balancer, User A might connect to Server Node 1 while User B connects to Server Node 2. Default Socket.io room broadcasts only reach sockets connected to the *same process*.
- **How CollabBoard solves it:**
  - `config/redis.js` initializes two Redis clients (`pubClient` and `subClient`) and attaches `@socket.io/redis-adapter` to the Socket.io server instance (`io.adapter(...)`).
  - When Server Node 1 emits `socket.to(boardId).emit(...)`, Socket.io publishes the message to Redis Pub/Sub.
  - Server Node 2 receives the Redis message and delivers it to its locally connected WebSockets.
  - If Redis is offline during local development, `config/redis.js` gracefully degrades to single-instance mode without crashing.

### 5. Live Cursor Tracking (Throttled WebSockets + Overlay)
- **Why Throttling?** A standard `mousemove` event fires up to 60–120 times per second per user. Transmitting every raw mouse event over WebSockets would overwhelm network bandwidth and CPU rendering loops.
- **How CollabBoard solves it:**
  - `usePresence.js` attaches a global `mousemove` listener and throttles emissions using `Date.now()` to ~50ms intervals (maximum 20 events per second per user).
  - Mouse coordinates `(x, y)` and user information are emitted via `presence:mouse_move`.
  - The server re-broadcasts coordinates via `socket.to(boardId).emit('presence:cursor_update')` (excluding the sender).
  - `LiveCursorOverlay.jsx` renders smooth absolute-positioned SVG cursors with user names and unique avatar colors. Ephemeral cursor entries auto-expire after 5 seconds of inactivity.

### 6. Invitation & Notification Pipeline
- **The Two-Way Approval Architecture:**
  - Rather than forcibly adding users to boards without their consent, CollabBoard uses an explicit **Invite → Notify → Respond** lifecycle.
- **How it works:**
  1. Owner submits an email in `InviteMemberModal.jsx` (`POST /api/boards/:boardId/invite`).
  2. The server verifies the user exists, checks that they aren't already a member, verifies no pending invite exists, and saves an `Invitation` document (`status: 'pending'`).
  3. The server emits `notification:received` to the recipient's personal socket room (`user:<recipientUserId>`).
  4. The recipient's `Navbar` receives the event and updates the red bell badge counter.
  5. The recipient opens `NotificationDropdown`, reviews the invitation, and clicks **Accept** (`POST /api/invitations/:id/respond`).
  6. The server updates the invitation status to `'accepted'`, adds `recipientUserId` to `board.members` & `workspace.members`, and saves. The newly shared board immediately appears on the recipient's dashboard!
