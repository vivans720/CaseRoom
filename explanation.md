# CaseRoom — Complete Project Explanation

> **Purpose of this file:** Give any AI (or human) full context to understand, navigate, and modify this codebase without guessing.

---

## 1. What Is CaseRoom?

CaseRoom is a **real-time collaborative case management platform** for organizations. Think of it as a secure, case-centric messaging app where teams (investigators, legal, HR, engineering) can:

- Create and manage investigation **Cases** (like projects/channels)
- Send real-time **chat messages** within each case (text, images, videos, documents)
- **Annotate** uploaded files/images directly (pen, highlighter, text, rectangles, arrows)
- Create and track **Action Items / Tasks** with assignees, priorities, and due dates
- **Pin important messages** to the top of chat (WhatsApp-style cycling)
- Manage **participants** with role-based access control (Admin / Editor / Observer)
- Get real-time **notifications** (mentions, new messages, task assignments)
- See **online presence** (who's online, who's typing, last seen timestamps)
- **Search** messages, manage a **Media Vault** (all shared files in one place)
- **Export cases to PDF** for legal/compliance purposes

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18+ with TypeScript, Vite, React Router v6 |
| **Styling** | Tailwind CSS (utility-first) |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB via Mongoose 9 |
| **Real-time** | Socket.IO (WebSocket with fallback) |
| **Auth** | JWT tokens + OTP email verification (Nodemailer) |
| **File Storage** | Cloudinary (images, documents, media via multer-storage-cloudinary) |
| **PDF Export** | PDFKit |
| **Testing** | Jest + Supertest (backend), Vitest (frontend) |
| **Dev Tools** | Nodemon, Docker Compose support |

---

## 3. Project Structure

```
CaseRoom/
├── Backend/                    # Express + Socket.IO server
│   ├── src/
│   │   ├── app.js              # Express app setup (CORS, routes, middleware)
│   │   ├── server.js           # HTTP server + Socket.IO bootstrap + MongoDB connect
│   │   ├── config/             # DB connection config
│   │   ├── models/             # Mongoose schemas (8 models)
│   │   ├── controllers/        # Route handlers (7 controllers)
│   │   ├── services/           # Business logic (10 services)
│   │   ├── routes/             # Express route definitions (4 route files)
│   │   ├── middleware/         # Auth, error handling, file upload (multer)
│   │   └── sockets/            # Socket.IO event handlers + auth
│   ├── tests/                  # Jest integration tests
│   ├── seed.js                 # Database seed script
│   └── package.json
│
├── Frontend/                   # React + TypeScript SPA
│   ├── src/
│   │   ├── App.tsx             # Route definitions
│   │   ├── main.tsx            # Entry point (providers wrap here)
│   │   ├── types/index.ts      # All TypeScript interfaces/types
│   │   ├── components/         # UI components (8 feature folders)
│   │   │   ├── auth/           # Login, Register, ProtectedRoute
│   │   │   ├── cases/          # CaseSidebar, CaseSettingsPanel
│   │   │   ├── chat/           # ChatView, MessageBubble, MessageList, MessageInput,
│   │   │   │                   # PinnedMessageBanner, ChatHeader, AnnotationCanvas,
│   │   │   │                   # DocumentPreviewModal, ImagePreviewModal, MediaVaultPanel,
│   │   │   │                   # MessageSearchBar, PdfDocument, FileUploadButton, TypingIndicator
│   │   │   ├── notifications/  # NotificationToast
│   │   │   ├── participants/   # ParticipantsPanel
│   │   │   ├── profile/        # ContactPreviewModal
│   │   │   ├── tasks/          # TaskPanel, CreateTaskModal
│   │   │   └── ui/             # Reusable UI primitives (Avatar, Modal, Spinner, etc.)
│   │   ├── contexts/           # React Contexts (Auth, Socket, Notification)
│   │   ├── hooks/              # Custom hooks (11 hooks)
│   │   ├── services/           # API service modules (Axios-based)
│   │   ├── pages/              # Page components (Login, Register, Dashboard)
│   │   ├── config/             # Frontend config
│   │   └── utils/              # Utility functions
│   └── package.json
│
├── docker-compose.yml          # Docker setup
└── explanation.md              # ← This file
```

---

## 4. Data Models (MongoDB / Mongoose)

### 4.1 User
- `employeeId` (unique, required) — Corporate employee identifier
- `name`, `email`, `phone`, `passwordHash`
- `profilePictureUrl`, `profilePicturePublicId` — Cloudinary avatar
- `lastSeen` — Updated on socket disconnect
- `pinnedCases[]` — User-specific pinned case list

### 4.2 EmployeeRecord
- `employeeId` (unique) — Whitelist of valid employee IDs
- Registration requires a matching EmployeeRecord to exist

### 4.3 Otp
- `email`, `otp`, `type` (registration / login / reset_password)
- `expiresAt` — TTL index auto-deletes expired OTPs (5-minute expiry)

### 4.4 Case
- `title`, `description`, `creatorId` → User
- `status`: Open | In Progress | Under Review | Resolved | Closed | active | archived
- `priority`: Low | Medium | High | Critical
- `category`: Incident | Legal | HR | Engineering
- `participants[]`: Array of `{ user: ObjectId, role: "Admin" | "Editor" | "Observer" }`
- **Instance methods:** `isParticipant(userId)`, `getParticipantRole(userId)`
- The case creator is always treated as **Admin** (hardcoded in `getParticipantRole`)

### 4.5 Message
- `caseId` → Case, `senderId` → User
- `type`: text | image | video | audio | document
- `content` (text body), `fileUrl`, `fileName`, `fileSize`, `fileMimeType`
- `replyTo` → Message (threaded replies)
- `mentions[]` → User (@ mentions)
- `isDeleted`, `deletedAt`, `editedAt` (soft delete + edit tracking)
- `readBy[]`: `{ userId, readAt }` — Read receipts
- `reactions[]`: `{ emoji, userIds[] }` — Message reactions
- `isPinned`, `pinnedAt`, `pinnedBy` → User — Pinned messages feature

### 4.6 Task (Action Items)
- `caseId` → Case, `title`, `description`
- `status`: todo | in_progress | done
- `priority`: low | medium | high | critical
- `assignees[]` → User
- `createdBy` → User, `completedBy` → User, `completedAt`, `dueDate`

### 4.7 Notification
- `recipientId` → User
- `type`: new_message | mentioned_in_message | added_to_case | removed_from_case | case_archived | case_unarchived | case_status_updated | case_deleted | role_updated | task_assigned | task_completed | task_status_updated
- `title`, `body`, `caseId`, `messageId`, `taskId`, `actorId`
- `isRead`, `readAt`

### 4.8 Annotation
- `caseId` → Case, `messageId` → Message (optional)
- `fileUrl`, `pageNumber`
- `type`: pen | highlighter | text | rectangle | arrow
- `coordinates`: `{ x, y, width, height, points[] }`
- `style`: `{ color, strokeWidth, opacity, fontSize }`
- `text` (for text annotations), `createdBy` → User

---

## 5. Authentication Flow

1. **Registration:** User submits `employeeId`, `name`, `email`, `phone`, `password`.
   - Backend verifies `employeeId` exists in `EmployeeRecord` collection.
   - Sends OTP to email via Nodemailer.
   - User submits OTP → account created → JWT returned.
2. **Login:** User submits `employeeId` + `password`.
   - Backend verifies credentials → sends OTP to email.
   - User submits OTP → JWT returned.
3. **JWT:** Stored in `localStorage` on frontend. Sent as `Authorization: Bearer <token>` header.
4. **Socket Auth:** JWT is sent as `auth.token` during socket handshake. Middleware verifies before allowing connection.
5. **Forgot Password:** Email-based OTP flow → `resetPassword` endpoint.

---

## 6. API Routes

All routes are prefixed with `/api/v1`.

### Auth (`/api/v1/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/register/send-otp` | Send registration OTP |
| POST | `/register` | Complete registration with OTP |
| POST | `/login` | Login (sends OTP) |
| POST | `/login/verify` | Verify login OTP |
| POST | `/forgot-password/send-otp` | Send password reset OTP |
| POST | `/forgot-password/reset` | Reset password with OTP |
| POST | `/resend-otp` | Resend any OTP |
| POST | `/signout` | Sign out |
| GET | `/me` | Get current user (protected) |
| POST | `/change-password` | Change password (protected) |
| PATCH | `/profile-picture` | Upload/update profile picture (protected) |

### Cases (`/api/v1/cases`) — All protected
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create case |
| GET | `/` | Get user's cases |
| GET | `/all` | Fetch all cases (paginated) |
| GET | `/search` | Search cases |
| GET | `/:id` | Get case by ID |
| DELETE | `/:id` | Delete case |
| PUT | `/:id/participants` | Update participants |
| PUT | `/:id/archive` | Archive case |
| PUT | `/:id/unarchive` | Unarchive case |
| PUT | `/:id/status` | Update case status |
| GET | `/:id/export-pdf` | Export case as PDF |
| GET | `/:id/participants` | Get case participants |
| PUT | `/:id/pin` | Pin case for current user |
| DELETE | `/:id/pin` | Unpin case |

### Messages (nested under cases) — All protected
| Method | Path | Description |
|---|---|---|
| GET | `/:id/messages` | Get paginated messages |
| GET | `/:id/messages/search` | Search messages |
| GET | `/:id/messages/page/:messageId` | Get page number for a message |
| GET | `/:id/vault` | Get media vault items |
| GET | `/:id/unread-count` | Get unread count |
| POST | `/:id/messages/upload` | Upload file message |
| PATCH | `/:id/messages/:messageId` | Edit message |
| DELETE | `/:id/messages/:messageId` | Delete message |
| GET | `/:id/messages/pinned` | Get all pinned messages |
| POST | `/:id/messages/:messageId/pin` | Pin a message (Admin only) |
| DELETE | `/:id/messages/:messageId/pin` | Unpin a message (Admin only) |

### Annotations (nested under cases) — All protected
| Method | Path | Description |
|---|---|---|
| GET | `/:caseId/annotations` | Get annotations |
| POST | `/:caseId/annotations` | Create annotation |
| PUT | `/:caseId/annotations/:annotationId` | Update annotation |
| DELETE | `/:caseId/annotations/:annotationId` | Delete annotation |

### Tasks (nested under cases) — All protected
| Method | Path | Description |
|---|---|---|
| GET | `/:caseId/tasks` | Get case tasks |
| POST | `/:caseId/tasks` | Create task |
| PATCH | `/:caseId/tasks/:taskId` | Update task |
| DELETE | `/:caseId/tasks/:taskId` | Delete task |

### Notifications (`/api/v1/notifications`) — All protected
| Method | Path | Description |
|---|---|---|
| GET | `/` | Get user notifications |
| PUT | `/:id/read` | Mark notification as read |
| PUT | `/read-all` | Mark all as read |

### Users (`/api/v1/users`) — All protected
| Method | Path | Description |
|---|---|---|
| GET | `/search` | Search users by name/email/employeeId |

---

## 7. Socket.IO Events

The server uses Socket.IO for all real-time features. Authentication is done via JWT in the socket handshake.

### Client → Server (emit)
| Event | Payload | Description |
|---|---|---|
| `join_case` | `{ caseId }` | Join a case room |
| `leave_case` | `{ caseId }` | Leave a case room |
| `send_message` | `{ caseId, content, replyToId?, mentionedUserIds? }` | Send text message |
| `typing_start` | `{ caseId }` | User started typing |
| `typing_stop` | `{ caseId }` | User stopped typing |
| `mark_read` | `{ caseId, messageIds[] }` | Mark messages as read |
| `get_online_users` | `{ caseId }` | Request online users list |
| `delete_message` | `{ caseId, messageId }` | Delete a message |
| `edit_message` | `{ caseId, messageId, content }` | Edit a message |
| `toggle_reaction` | `{ caseId, messageId, emoji }` | Add/remove emoji reaction |
| `annotation:create` | `{ caseId, annotation }` | Broadcast new annotation |
| `annotation:update` | `{ caseId, annotation }` | Broadcast annotation update |
| `annotation:delete` | `{ caseId, annotationId, fileUrl }` | Broadcast annotation delete |

### Server → Client (broadcast)
| Event | Payload | Description |
|---|---|---|
| `new_message` | Message object | New message in case |
| `message_deleted` | `{ messageId, caseId, deletedBy, deletedAt }` | Message was deleted |
| `message_edited` | Updated Message object | Message was edited |
| `message_read` | `{ caseId, userId, messageIds }` | Read receipts updated |
| `reaction_updated` | `{ caseId, messageId, reactions[] }` | Reactions changed |
| `message_pinned` | `{ caseId, message }` | Message was pinned |
| `message_unpinned` | `{ caseId, messageId }` | Message was unpinned |
| `typing_start` | `{ userId, name }` | Someone started typing |
| `typing_stop` | `{ userId }` | Someone stopped typing |
| `online_users` | `{ caseId, onlineUsers[] }` | Online users response |
| `user_online` | `{ userId, caseId }` | User came online |
| `user_offline` | `{ userId, caseId, lastSeen }` | User went offline |
| `notification` | Notification object | New notification pushed |
| `joined_case` | `{ message, caseId }` | Confirm joined room |
| `left_case` | `{ message, caseId }` | Confirm left room |
| `annotation:created` | `{ caseId, annotation }` | Real-time annotation sync |
| `annotation:updated` | `{ caseId, annotation }` | Real-time annotation sync |
| `annotation:deleted` | `{ caseId, annotationId, fileUrl }` | Real-time annotation sync |
| `error` | `{ message }` | Error notification |

---

## 8. Frontend Architecture

### 8.1 Routing (React Router v6)
```
/login              → LoginPage
/register           → RegisterPage
/                   → DashboardPage (protected)
  /case/:caseId     → ChatView (nested inside DashboardPage via <Outlet>)
```

### 8.2 Layout
The DashboardPage has a **3-panel layout**:
1. **Left:** `CaseSidebar` — lists cases, search, create new case
2. **Center:** `ChatView` via `<Outlet>` — messages, input, header
3. **Right:** Contextual panel (toggled from ChatHeader buttons):
   - `participants` → ParticipantsPanel
   - `settings` → CaseSettingsPanel
   - `search` → MessageSearchBar
   - `media` → MediaVaultPanel
   - `tasks` → TaskPanel

### 8.3 Contexts (React Context API)
- **AuthContext** — Current user state, login/logout/register methods, JWT management
- **SocketContext** — Socket.IO connection singleton, auto-reconnect
- **NotificationContext** — Notification state, real-time push, mark-as-read, badge counts

### 8.4 Key Custom Hooks
| Hook | Purpose |
|---|---|
| `useAuth` | Access AuthContext (current user, token) |
| `useSocket` | Access SocketContext (socket instance) |
| `useMessages` | Paginated message state, append/delete/edit/pin handlers |
| `useCases` | Case list state, pagination, search, CRUD operations |
| `useCaseSocket` | Auto join/leave socket room when caseId changes |
| `usePresence` | Track online users and last seen for a case |
| `useTypingIndicator` | Typing start/stop with debounce |
| `useReadReceipts` | IntersectionObserver-based auto mark-as-read |
| `useNotifications` | Access NotificationContext |
| `useDashboardPanel` | Access outlet context for right panel state |
| `usePdfDocument` | PDF rendering via pdfjs-dist |
| `usePdfRenderer` | Canvas-based PDF page rendering |

### 8.5 Services (API Layer)
All services use an Axios instance (`api.ts`) with:
- Base URL from env: `VITE_API_URL`
- Auto-attach JWT via request interceptor
- Auto-redirect to `/login` on 401

| Service | Endpoints covered |
|---|---|
| `authService` | Registration, login, OTP, password, profile picture |
| `caseService` | Case CRUD, participants, archive, status, pin, export |
| `messageService` | Messages, search, edit, page, vault, pin/unpin |
| `taskService` | Task CRUD |
| `notificationService` | Notifications, mark read |
| `userService` | User search |
| `annotationService` | Annotation CRUD |

---

## 9. Role-Based Access Control (RBAC)

Each case participant has one of three roles:

| Role | Permissions |
|---|---|
| **Admin** | Full control: send messages, edit/delete any message, manage participants, change roles, archive/unarchive, pin messages, create/manage tasks, export PDF, change case settings |
| **Editor** | Send messages, edit/delete own messages, create tasks, react, reply |
| **Observer** | Read-only: can view messages and files, but cannot send messages, create tasks, or modify anything |

The case **creator** (`creatorId`) is always treated as Admin.

---

## 10. Key Features Deep Dive

### 10.1 Messaging
- Messages are paginated (newest-first from API, reversed to oldest-first for display)
- Upward scroll loads older pages via IntersectionObserver
- Sender grouping: consecutive messages from same user within 1 minute are visually grouped
- Date separators (Today, Yesterday, full date)
- Reply threading with visual snippet
- @mentions with highlighted rendering
- Emoji reactions (👍 ❤️ 😂 😮 😢 🙏)
- Read receipts (double-tick indicator)
- Message edit and soft-delete
- Copy message text

### 10.2 File Handling
- Files uploaded to Cloudinary via multer middleware
- Supported types: image, video, audio, document
- Images render inline with preview modal + annotation support
- Documents (PDF) render via pdfjs with page navigation
- All files available in Media Vault panel (filterable by category)
- File download with fallback

### 10.3 Annotations
- Draw on images/PDFs in the DocumentPreviewModal
- Tools: pen, highlighter, text, rectangle, arrow
- Customizable: color, stroke width, opacity, font size
- Real-time sync via socket events
- Persisted per-file per-page in database

### 10.4 Pinned Messages
- Admins can pin/unpin messages via action button on message hover
- Pinned messages show a 📌 badge on the bubble
- PinnedMessageBanner at top of chat shows latest pin
- Clicking the banner jumps to the pinned message and cycles to the previous pin (WhatsApp style)
- Real-time sync: pinning/unpinning broadcasts to all room participants

### 10.5 Tasks / Action Items
- Task panel in right sidebar
- Create tasks with title, description, priority, due date, assignees
- Status workflow: todo → in_progress → done
- Assignees selected from case participants
- Task completion tracking (completedBy, completedAt)
- Notifications on assignment and completion

### 10.6 Notifications
- Server-side: created in `notification.service.js`, pushed via socket `notification` event
- Client-side: `NotificationContext` manages state, `NotificationToast` renders popups
- Triggers: new messages (to offline participants), @mentions, case events, task events
- Mark individual or all as read

### 10.7 Presence System
- In-memory presence tracking via `presence.service.js`
- `Map<userId, Set<socketId>>` — supports multiple tabs
- `user_online` / `user_offline` events broadcast to all case rooms
- `lastSeen` persisted to User model on final disconnect
- Frontend `usePresence` hook maintains live online set + last seen map

---

## 11. Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_USER=...          # Gmail for OTP
EMAIL_APP_PASSWORD=...  # Gmail App Password
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 12. Running the Project

```bash
# Backend
cd Backend
npm install
npm run dev          # starts nodemon on src/server.js (port 5000)

# Frontend
cd Frontend
npm install
npm run dev          # starts Vite dev server (port 5173)

# Tests
cd Backend && npm test
cd Frontend && npm test
```

---

## 13. Important Conventions

1. **API response format:** All endpoints return `{ success: boolean, data: T, message?: string }`
2. **Error handling:** Errors thrown with `error.statusCode` property, caught by global `errorHandler` middleware
3. **Pagination:** All list endpoints support `page` and `limit` query params. Response includes `total`, `page`, `totalPages`
4. **Soft deletes:** Messages are soft-deleted (`isDeleted: true`), content is cleared
5. **Socket rooms:** Each case has a room named `case_${caseId}`
6. **File uploads:** All go through Cloudinary. Multer middleware at `handleUpload` / `handleImageUpload`
7. **Population:** Messages populate `senderId`, `mentions`, `replyTo`. Cases populate `participants.user` and `creatorId`
8. **Timestamps:** All models use `{ timestamps: true }` for `createdAt` and `updatedAt`
