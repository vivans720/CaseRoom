# 🛡️ CaseRoom — Real-Time Collaborative Case Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-18%2B-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/WebRTC-Mesh_P2P-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📌 Overview

**CaseRoom** is an enterprise-grade, real-time collaborative case management and investigation platform. Designed for modern incident handling, legal operations, HR investigations, and engineering teams, CaseRoom combines case-centric real-time messaging, WebRTC audio/video meetings, document annotation, task tracking, and legal PDF exports into a unified, secure workspace.

---

## ✨ Key Features

### 📁 Case Management & RBAC

- **Dynamic Case Hub**: Create, categorize, prioritize, and manage open/archived cases.
- **Granular Permissions**: Role-Based Access Control (**Admin**, **Editor**, **Observer**) enforcing access at API and UI levels.
- **Pinned Cases**: Personal case pinning for quick access.

### 💬 Real-Time Messaging & Media Sharing

- **Rich Messaging**: Text, images, videos, audio recordings, and documents with instant Socket.IO synchronization.
- **Threaded Replies & @Mentions**: Contextual message threading and user tagging with real-time notifications.
- **WhatsApp-Style Pinned Banners**: Cycle through multiple pinned messages with one-click scroll jump.
- **Read Receipts & Reactions**: Interactive emoji reactions and double-tick read receipt tracking.
- **Centralized Media Vault**: Categorized file storage (Images, Documents, Media) with optimized layout.

### 📹 Real-Time WebRTC Video Meetings

- **P2P Mesh Architecture**: Ultra-low-latency multi-party audio/video conferencing natively inside cases.
- **Active Speaker Detection**: Web Audio API volume measurement highlighting active speakers with glowing visual badges.
- **Host Control Suite**: Host mute all, participant kick, and meeting lock toggles.
- **Floating Picture-in-Picture (PiP)**: Keep video streams visible while continuing to navigate case history and chat.
- **Device Pre-Join Modal**: Live audio/video device selection and preview before joining call.

### ✏️ Real-Time Document & Image Annotation

- **Collaborative Canvas**: Draw directly over uploaded images and PDFs in the `DocumentPreviewModal`.
- **Annotation Tools**: Pen, highlighter, text box, rectangle, and directional arrow tools.
- **Live Sync**: Canvas operations synced via WebSockets and persisted to MongoDB.

### 📋 Action Items & Task Tracking

- **Integrated Task Board**: Track case action items directly within case panels.
- **Fields & Workflow**: Priority, due date, status (`todo`, `in_progress`, `done`), and assignees.
- **Automated Notifications**: Instant alerts when assigned or when tasks are completed.

### 📄 Compliance & PDF Export

- **One-Click Legal Export**: Server-side PDF rendering via **PDFKit** generating full audit trails, message logs, and case metadata.

### 📱 Responsive Mobile & Desktop UX

- **Tailwind CSS v4 & Dynamic Viewport (`dvh`)**: Elimination of mobile address bar cutoffs.
- **Slide-up Bottom Sheets**: Contextual right panels transition smoothly into mobile bottom sheets on narrow viewports.

---

## 🛠️ Tech Stack

| Layer                             | Technology                                                 |
| --------------------------------- | ---------------------------------------------------------- |
| **Frontend Framework**            | React 18+, TypeScript, Vite, React Router v6               |
| **Styling & UI**                  | Tailwind CSS v4, Lucide Icons, Canvas API                  |
| **Backend API**                   | Node.js, Express 5                                         |
| **Database & ODM**                | MongoDB, Mongoose 9                                        |
| **Real-Time Communication**       | Socket.IO, WebRTC (Mesh SFU/P2P)                           |
| **Authentication**                | JWT, Nodemailer / Brevo OTP Verification                   |
| **Cloud Storage**                 | Cloudinary (`multer-storage-cloudinary`)                   |
| **PDF Generation**                | PDFKit                                                     |
| **Testing**                       | Jest + Supertest (Backend), Vitest + Playwright (Frontend) |
| **Containerization & Deployment** | Docker Compose, Vercel (Frontend), Render (Backend)        |

---

## 📁 Repository Structure

```
CaseRoom/
├── Backend/                    # Node.js + Express 5 + Socket.IO Server
│   ├── src/
│   │   ├── config/             # Database connection & env configurations
│   │   ├── controllers/        # Route controllers (Auth, Cases, Messages, Tasks, etc.)
│   │   ├── middleware/         # Authentication, Error handling, File upload
│   │   ├── models/             # Mongoose Schemas (User, Case, Message, Task, etc.)
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Business logic & domain services
│   │   ├── sockets/            # Real-time event handlers & connection auth
│   │   ├── app.js              # Express application configuration
│   │   └── server.js           # Server entry point & socket initialization
│   ├── tests/                  # Jest API integration tests
│   ├── Dockerfile
│   └── package.json
│
├── Frontend/                   # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/         # Modular UI components (auth, cases, chat, meeting, tasks)
│   │   ├── contexts/           # React Context Providers (Auth, Socket, Notification, Meeting)
│   │   ├── hooks/              # Custom React hooks (useAuth, useMessages, usePresence, etc.)
│   │   ├── pages/              # Top-level Page components (Login, Register, Dashboard)
│   │   ├── services/           # Axios REST API services
│   │   ├── types/              # Global TypeScript interfaces & types
│   │   └── App.tsx             # Main routing & application layout
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml          # Docker orchestration file
├── .env.example                # Shared environment variable template
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI
- **Docker & Docker Compose** _(Optional, for containerized run)_

---

### Local Manual Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CaseRoom.git
cd CaseRoom
```

#### 2. Configure Backend Environment

Create a `.env` file inside the `Backend/` directory (or copy from root `.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/caseroom
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email OTP
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@caseroom.com

# File Limits
MAX_FILE_SIZE_MB=16
```

#### 3. Configure Frontend Environment

Create a `.env` file inside the `Frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

#### 4. Install Dependencies & Start Backend

```bash
cd Backend
npm install
npm run dev
```

#### 5. Install Dependencies & Start Frontend

In a new terminal window:

```bash
cd Frontend
npm install
npm run dev
```

The app will be accessible at `http://localhost:5173`.

---

### 🐳 Run with Docker Compose

To start MongoDB, Backend, and Frontend together with a single command:

```bash
# From the root directory
docker-compose up --build
```

- **Frontend**: `http://localhost:80`
- **Backend API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`

---

## 🧪 Testing

```bash
# Run Backend API integration tests (Jest)
cd Backend
npm test

# Run Frontend unit & component tests (Vitest)
cd Frontend
npm test
```

---
