# 🛡️ CaseRoom — Real-Time Collaborative Case Management Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/WebRTC-Mesh_P2P-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/LangChain-Enabled-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/Chroma_Cloud-Vector_DB-FF6B6B?style=for-the-badge&logoColor=white" alt="Chroma Cloud" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📌 Executive Overview

**CaseRoom** is an enterprise-grade, real-time collaborative case management and digital investigation platform. Designed for modern security operations centers (SOC), incident response squads, digital forensics units, financial fraud auditors, HR investigation teams, and legal compliance departments, CaseRoom consolidates high-stakes teamwork into a unified, secure workspace.

CaseRoom eliminates fragmented communication by integrating **case-centric real-time messaging**, **low-latency WebRTC mesh audio/video conferencing**, **collaborative document and image canvas markup**, **action item and task boards**, and **automated legal compliance PDF exports** — all supercharged by a **production-hardened Cloud AI suite** powered by LangChain, Chroma Cloud Vector Store, Jina Embeddings, and an automated multi-provider LLM failover router.

---

## ✨ Key Features & Capabilities

### 📁 1. Case Management & Granular RBAC
- **Dynamic Case Hub**: Create, filter, search, prioritize, and manage open, in-progress, under-review, resolved, and archived cases.
- **Granular Permissions & RBAC**: Strict Role-Based Access Control (**Admin**, **Editor**, **Observer**) enforced across every API endpoint, WebSocket event, and UI interaction.
- **Categorization & Severity**: Classify cases into domain clusters (`Incident`, `Legal`, `HR`, `Engineering`) with dynamic priority rating (`Low`, `Medium`, `High`, `Critical`).
- **Personal Case Pinning**: Pin mission-critical cases to the top of your workspace sidebar for rapid context switching.

### 💬 2. Real-Time Messaging & Collaboration Engine
- **Instant Synchronization**: High-throughput message streaming powered by Socket.IO with sub-50ms latency.
- **Multi-Type Media Sharing**: Send text, code snippets, high-resolution images, video recordings, voice audio memos, and documents with instant previews.
- **Threaded Replies & Smart Mentions**: Context-preserving message threading and `@` user mentions triggering real-time desktop notifications.
- **WhatsApp-Style Cyclical Pinning**: Pin multiple crucial messages per case with cyclical header banners and instant scroll-to-view navigation.
- **Read Receipts & Reactions**: Interactive emoji reactions and double-tick read receipt tracking across all case participants.
- **Typing Indicators & Live Presence**: Real-time participant presence (`online`, `offline`, `last seen`) and dynamic typing indicators.
- **Centralized Media Vault**: Categorized evidence repository (Images, Media, Documents, Links) with search, filtering, and 1-click preview modal.

### 📹 3. WebRTC Mesh Video Conferencing & Host Suite
- **P2P Mesh Architecture**: Ultra-low-latency, browser-native multi-party audio, video, and screen-sharing directly inside case rooms.
- **Active Speaker Detection**: Web Audio API volume analysis dynamically highlighting active speakers with glowing visual badges.
- **Host Moderation Suite**: Enterprise host controls including 1-click **Mute All**, **Participant Kick**, and **Meeting Room Lock**.
- **Floating Picture-in-Picture (PiP)**: Keep live video streams and participant tiles visible in a draggable floating window while navigating case logs, vault files, and tasks.
- **Device Pre-Join Modal**: Live audio/video device selection, microphone input level meter, and camera preview testing before entering calls.
- **In-Stream System Meeting Cards**: Live meeting event cards embedded directly in the chat stream with real-time status badges (*Live Now with pulsing indicator* vs *Concluded*) and context-aware action buttons.

### 🎙️ 4. Meeting History & AI Breakdown Modal
- **Past Video Meetings Panel**: Dedicated top toolbar trigger (`MeetingHistoryPanel`) with chronological meeting archive.
- **AI Meeting Breakdown**: 1-click **"View Summary & Notes"** modal featuring:
  - **Tab 1: AI Breakdown & Tasks**: Executive summary card, key discussion topics, structured decisions, and actionable task items with 1-click **Add Task** creation.
  - **Tab 2: Raw Transcript & Notes**: Editable notes editor with **Save Notes** that auto-re-summarizes, copy dialogue to clipboard, and syntax-styled transcript viewer.

### ✏️ 5. Real-Time Interactive Canvas & Document Annotation
- **Collaborative Canvas**: Draw directly over uploaded evidence, PDF reports, and images inside the `DocumentPreviewModal`.
- **Comprehensive Annotation Toolkit**: Pen, highlighter, text box, rectangle, and directional arrow tools with custom stroke width, color palette, and opacity sliders.
- **WebSocket Broadcast & DB Persistence**: Multi-user drawing actions synced in real time across active participants and persisted to MongoDB.

### 📋 6. Action Items & Task Tracking Board
- **Integrated Task Board**: Track investigative action items and operational deliverables directly within case rooms.
- **Workflow Attributes**: Manage status (`todo`, `in_progress`, `done`), priority (`low`, `medium`, `high`, `critical`), due dates, and multiple assignees.
- **Automated Notifications**: Real-time alerts delivered when tasks are assigned, updated, or marked as completed.
- **1-Click AI Task Ingestion**: Add tasks instantly from AI Chat Summaries, Meeting Breakdowns, Timelines, and Task Extractor suggestions.

### 📄 7. Compliance, Audit Trails & Legal PDF Export
- **One-Click Legal Export**: Server-side PDF generation via **PDFKit** generating comprehensive case dossiers.
- **Tamper-Evident Audit Dossier**: Includes case metadata, executive summary, participant access logs, chronologically ordered message histories, timestamps, task records, and evidence lists.

---

## 🤖 Enterprise Cloud AI Investigation Suite

CaseRoom incorporates an AI intelligence suite designed specifically for investigative rigor, factual consistency, and evidence synthesis.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CaseRoom Cloud AI Suite                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────┐    ┌──────────────────────┐   ┌───────────────────┐   │
│   │ Multi-Provider LLM  │    │ Chroma Cloud Vector  │   │ Jina AI Embeddings│   │
│   │ Router (Failover)   │    │ Store (CloudClient)  │   │ (v3, 1024-dim)    │   │
│   └──────────┬──────────┘    └──────────┬───────────┘   └─────────┬─────────┘   │
│              │                          │                         │             │
│              ▼                          ▼                         ▼             │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                       LangChain AI Services Orchestrator                │   │
│   ├─────────────────────────────────────────────────────────────────────────┤   │
│   │  • Conversational RAG Assistant (Vector-only, Confidence Scoring)       │   │
│   │  • Isolated Document Q&A (Page & Segment Citations)                     │   │
│   │  • Cross-Case Knowledge Assistant (Strict Double-Layer ACL)             │   │
│   │  • Contradiction & Fact Scanning Engine (Severity & Claim Pairs)        │   │
│   │  • AI Investigation Timeline Generator (Deterministic Event Mapping)    │   │
│   │  • Smart Action Item & Task Extractor (Deduplication against MongoDB)   │   │
│   │  • AI Duplicate Case Detector & Similar Cases Recommender               │   │
│   │  • Automated Structured Chat & Meeting Summarization                    │   │
│   │  • Hybrid Semantic & Exact Keyword Search Engine                        │   │
│   │  • Async Vector Indexing Pipeline with Stale Job Auto-Recovery Daemon   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🧠 AI Capabilities Matrix

| AI Capability | Description | Technical Implementation |
|---|---|---|
| **Multi-Provider LLM Router** | Resilient failover router with automatic health tracking, timeout thresholds, and cooldowns. | Gemini (`gemini-3.5-flash`), Groq (`llama-3.3-70b-versatile`), Cerebras, OpenRouter, Mistral, and local Ollama. Safety settings configured to prevent false-positive blocks on forensic logs. |
| **Cloud Vector Store & Embeddings** | Managed cloud-native vector store with 1024-dimensional semantic embeddings. | Chroma Cloud (`CloudClient`) paired with Jina AI Embeddings (`jina-embeddings-v3`). |
| **Conversational RAG Assistant** | Natural-language case assistant answering complex queries from case history and evidence. | Chroma Cloud semantic retrieval, confidence scoring, prompt injection security guardrails, and clickable UI citation pills (`88% Relevance`). |
| **Isolated Document Q&A** | Query individual uploaded PDF and Word documents without cross-document data leakage. | Document-scoped vector filtering with page and segment citation badges (`[1] Invoice_4821.pdf — Page 3`). |
| **Cross-Case Knowledge Assistant** | Synthesize insights across multiple historical cases while strictly respecting user access privileges. | Double-layer ACL enforcement (Chroma filter + in-memory `authorizedCaseIdsSet` check) and source case diversity capping. |
| **Contradiction & Fact Scanner** | Detect conflicting claims, inconsistent timestamps, conflicting IP addresses, or contradictory witness statements. | Claim vector similarity comparison, severity ratings, pair deduplication, and structured UI insight cards. |
| **Investigation Timeline Generator** | Reconstruct a structured chronological event timeline from unstructured case chatter and documents. | Taxonomy mapping (`issue`, `finding`, `evidence`, `decision`, `action`, `resolution`), source snippet citations, and deterministic timestamp binding. |
| **Smart Task Extractor** | Extract actionable operational items from case conversations with automatic deduplication against MongoDB. | NLP entity extraction, existing task matching (`alreadyExists: true`), confidence ratings, and 1-click batch import. |
| **Duplicate Case Detection** | Real-time duplicate warning during case creation to prevent redundant investigations. | Cosine similarity scoring, multi-candidate ranking (top 5), and second-stage LLM match rationale verification. |
| **Similar Cases Recommender** | Discover related prior incidents to leverage precedent resolutions. | Hybrid scoring (85% vector similarity + 15% category match) with metadata reason pills. |
| **Async Vector Indexing Pipeline** | Asynchronous background indexing of messages, documents, and transcripts with zero request latency impact. | MongoDB job queue (`AIIndexJob`), stale job recovery daemon (>10 min lock auto-recovery), format-aware parsing (PDF, DOCX, TXT, CSV), and CLI backfill tooling. |

---

## 🛠️ Complete Technology Stack

```
CaseRoom Platform
├── Frontend Application
│   ├── Core Framework: React 19.2.4 + TypeScript ~6.0.2 + Vite 8.0.4
│   ├── Routing & State: React Router v7.14.1 + React Contexts
│   ├── Styling & UI: Tailwind CSS v4.2.2 + Lucide React Icons + Canvas API
│   ├── PDF & Media: pdfjs-dist + Emoji Picker React
│   └── Testing: Vitest 4.1 + React Testing Library 16.3 + Playwright 1.59 E2E
│
├── Backend Application
│   ├── Runtime & Server: Node.js 18+ + Express 5.2.1
│   ├── Database & ODM: MongoDB 7 + Mongoose 9.3.0
│   ├── Real-Time: Socket.IO 4.8.3 + WebRTC (Mesh P2P)
│   ├── Authentication: JWT (jsonwebtoken 9.0) + Bcrypt 6.0 + Nodemailer / Brevo OTP
│   ├── File Storage: Cloudinary (multer-storage-cloudinary)
│   ├── PDF Export: PDFKit 0.18.0 + pdf-parse + mammoth + csv-parse
│   └── Testing: Jest 30.3 + Supertest 7.2 + mongodb-memory-server 11.0
│
├── AI & Vector Orchestration
│   ├── Orchestrator: LangChain 1.5 + @langchain/core 1.2
│   ├── Multi-LLM Providers: Google GenAI, Groq, Cerebras, OpenRouter, Mistral, Ollama
│   ├── Vector Database: Chroma Cloud Vector Store (chromadb 3.5)
│   └── Embeddings: Jina AI Embeddings (jina-embeddings-v3, 1024 dimensions)
│
└── Infrastructure & DevOps
    ├── Containerization: Docker + Docker Compose (Multi-stage builds)
    ├── Continuous Integration: GitHub Actions Parallel CI Pipeline
    └── Cloud Hosting: Render (Backend API), Vercel (Frontend SPA), Chroma Cloud
```

---

## 🕹️ Interactive Walkthrough & Testing Guide

### 🔑 Pre-Seeded Demonstration Accounts

For rapid evaluation and testing, CaseRoom comes pre-configured with a comprehensive seed dataset containing **20 specialized users**, **36 realistic cases** across 4 domain clusters, **550+ investigation messages**, **84 tasks**, and **10 video meetings with transcripts**.

| Account Role | Employee ID | Email | Default Password | Specialization |
|---|---|---|---|---|
| **Lead Investigator (Admin)** | `TEST-ADMIN` | `vivans720@gmail.com` | `TestPassword123!` | Incident Commander & Forensics |
| **Senior Security Engineer** | `TEST-SECURITY` | `vivans720+security@gmail.com` | `TestPassword123!` | Threat Hunting & Network Security |
| **Financial Fraud Specialist** | `TEST-FINANCE` | `vivans720+finance@gmail.com` | `TestPassword123!` | SWIFT Audit & Invoice Forensics |
| **Compliance & Legal Lead** | `TEST-LEGAL` | `vivans720+legal@gmail.com` | `TestPassword123!` | E-Discovery & Regulatory Audit |
| **HR Investigator** | `TEST-HR` | `vivans720+hr@gmail.com` | `TestPassword123!` | Workplace Relations & Policy |
| **DevOps & Engineering Lead** | `TEST-ENGINEERING` | `vivans720+engineering@gmail.com` | `TestPassword123!` | Infrastructure & Root-Cause |
| **General Employees** | `EMP001` - `EMP100` | Pre-registered corporate records | `TestPassword123!` | Analysts & Case Participants |

> **OTP Verification Note**:
> When logging in or registering with `TEST-ADMIN` or seeded test accounts, use OTP code **`123456`** to bypass email delivery during testing.

### 🛡️ Corporate Whitelist Security Model

1. **Restricted Employee Directory**: Only authorized corporate Employee IDs (`EMP001` through `EMP100` and `TEST-ADMIN` through `TEST-ENGINEERING`) present in the `EmployeeRecord` database can register.
2. **Anti-Tamper Registration**: Prevents external unauthorized registrations by validating incoming employee IDs against the corporate database before issuing OTP verification codes.
3. **Multi-Factor Authentication**: Every login and registration is safeguarded with 6-digit cryptographic OTP verification delivered via Brevo/Nodemailer.

---

## 📁 Repository Structure

```
CaseRoom/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Parallel GitHub Actions CI Pipeline
│
├── Backend/                           # Node.js + Express 5 + Socket.IO Server
│   ├── src/
│   │   ├── config/                    # DB, Cloudinary, LangChain & Chroma Cloud config
│   │   ├── controllers/               # Express Controllers (AI, Auth, Case, Meeting, etc.)
│   │   ├── middleware/                # JWT Auth, Error Handler, Multer File Upload
│   │   ├── models/                    # Mongoose Models (User, Case, Message, Task, AI Models)
│   │   ├── routes/                    # Express 5 API Route definitions
│   │   ├── services/                  # Core Domain Services (Auth, Case, Message, PDF, etc.)
│   │   │   └── ai/                    # Cloud AI Suite (RAG, Router, Timeline, Contradictions, etc.)
│   │   │       ├── embeddings/        # Jina AI Embeddings provider
│   │   │       └── llm/               # Multi-Provider Router & Factory (Gemini, Groq, Mistral, etc.)
│   │   ├── sockets/                   # Socket.IO Event Handlers & WebRTC Signaling
│   │   ├── app.js                     # Express app setup & middleware configuration
│   │   └── server.js                  # HTTP server bootstrap & Socket.IO initialization
│   ├── scripts/                       # Backfill and indexing utility scripts
│   ├── tests/                         # Jest + Supertest integration & unit test suites
│   ├── Dockerfile                     # Multi-stage production backend container
│   ├── seed.js                        # Comprehensive database seed script
│   └── package.json
│
├── Frontend/                          # React 19 + TypeScript + Vite SPA
│   ├── e2e/                           # Playwright End-to-End test suites & fixtures
│   ├── src/
│   │   ├── components/                # Modular UI components
│   │   │   ├── auth/                  # Login, Register, Forgot Password forms
│   │   │   ├── cases/                 # Case Sidebar, Settings, Search, Similar Cases
│   │   │   ├── chat/                  # Chat View, Message Bubbles, Canvas, Vault, AI Panels
│   │   │   ├── meeting/               # WebRTC Video Grid, PiP, Controls, Pre-Join, History
│   │   │   ├── notifications/         # Notification Bell, List, Toasts
│   │   │   ├── participants/          # Participant Roster & Role Assignment
│   │   │   ├── profile/               # User Profile, Avatar Cropper, Password Change
│   │   │   ├── tasks/                 # Task Panel, AI Task Extractor Modal
│   │   │   └── ui/                    # Reusable Design System (Modals, Badges, Inputs, Spinners)
│   │   ├── contexts/                  # React Contexts (Auth, Socket, Meeting, Notification)
│   │   ├── hooks/                     # Custom React Hooks (useMessages, usePresence, etc.)
│   │   ├── pages/                     # Top-level routes (Login, Register, Dashboard)
│   │   ├── services/                  # Axios REST services & WebRTC Peer Manager
│   │   ├── types/                     # Shared TypeScript interfaces & types
│   │   ├── App.tsx                    # Route definitions & application layout
│   │   └── main.tsx                   # React root entry point
│   ├── Dockerfile                     # Nginx production frontend container
│   ├── nginx.conf                     # Nginx reverse proxy configuration
│   ├── vite.config.ts                 # Vite bundler configuration
│   ├── vitest.config.mjs              # Vitest test runner configuration
│   ├── playwright.config.ts           # Playwright E2E configuration
│   └── package.json
│
├── docker-compose.yml                 # Multi-service Docker container orchestration
├── render.yaml                        # Render cloud deployment blueprint
├── .env.example                       # Complete environment variable template
└── README.md                          # Master project documentation
```

---

## 🚀 Getting Started & Local Installation

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (v7.0+) or MongoDB Atlas URI
- **Docker & Docker Compose** *(Optional, for containerized execution)*

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CaseRoom.git
cd CaseRoom
```

---

### 2. Configure Backend Environment

Create a `.env` file inside the `Backend/` directory (or copy from root `.env.example`):

```env
# =========================
# DATABASE & SERVER
# =========================
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/caseroom

# =========================
# JWT AUTHENTICATION
# =========================
JWT_SECRET=your_super_secret_jwt_key_caseroom_2026
JWT_EXPIRES_IN=7d

# =========================
# CLOUDINARY FILE STORAGE
# =========================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=caseroom/attachments

# =========================
# EMAIL / OTP DELIVERY (BREVO / SMTP)
# =========================
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@caseroom.com

# =========================
# FILE UPLOAD LIMITS
# =========================
MAX_FILE_SIZE_MB=16

# =========================
# LLM PROVIDER CONFIGURATION
# =========================
LLM_PROVIDER_ORDER=gemini,groq,cerebras,openrouter,mistral,ollama
LLM_PROVIDER_TIMEOUT_MS=30000
LLM_PROVIDER_MAX_RETRIES=1
LLM_PROVIDER_COOLDOWN_MS=60000

# Provider API Keys (leave empty to skip provider)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
MISTRAL_API_KEY=your_mistral_api_key

# =========================
# AI SERVICES (VECTOR DB & EMBEDDINGS)
# =========================
JINA_API_KEY=your_jina_api_key
JINA_EMBED_MODEL=jina-embeddings-v3

CHROMA_API_KEY=your_chroma_cloud_api_key
CHROMA_HOST=api.trychroma.com
CHROMA_TENANT=your_chroma_tenant_id
CHROMA_DATABASE=your_chroma_database_name
```

---

### 3. Configure Frontend Environment

Create a `.env` file inside the `Frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

### 4. Install Dependencies & Seed Database

```bash
# Install Backend Dependencies
cd Backend
npm install

# Seed Database with Full Investigation Dataset
npm run seed

# (Optional) Run Vector Embedding Backfill Script
node scripts/backfillAll.js

# Start Backend in Development Mode
npm run dev
```

In a second terminal window:

```bash
# Install Frontend Dependencies
cd Frontend
npm install

# Start Frontend Vite Dev Server
npm run dev
```

The CaseRoom web application is now running at **`http://localhost:5173`**.

---

### 🐳 5. Run with Docker Compose

To start MongoDB, the Backend API, and the Frontend Nginx web server with a single command:

```bash
# From the project root
docker-compose up --build
```

- **Frontend App**: `http://localhost:80`
- **Backend API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`

---

## 🧪 Testing & Quality Assurance

CaseRoom implements a four-layer testing architecture ensuring rock-solid stability across backend endpoints, frontend UI components, and end-to-end user workflows.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Testing Architecture                                  │
├───────────────────────────────┬─────────────────────────────────────────────────┤
│ Layer                         │ Scope & Framework                               │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 1. Backend Integration Tests  │ Jest + Supertest + mongodb-memory-server        │
│                               │ (17 Test Suites, 200+ Assertions)               │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 2. Frontend Component Tests   │ Vitest + React Testing Library + jsdom          │
│                               │ (63+ Test Suites, 360+ Unit/Component Tests)   │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 3. End-to-End (E2E) Tests     │ Playwright + Chromium Route Interception        │
│                               │ (9 E2E Spec Suites covering all critical flows) │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 4. Continuous Integration     │ GitHub Actions Parallel CI Matrix Pipeline      │
└───────────────────────────────┴─────────────────────────────────────────────────┘
```

### Running Test Suites

```bash
# ---------------------------------------------------------
# 1. Backend Integration & Unit Tests
# ---------------------------------------------------------
cd Backend
npm test

# ---------------------------------------------------------
# 2. Frontend Unit & Component Tests
# ---------------------------------------------------------
cd Frontend
npm test                  # Single run
npm run test:watch        # Interactive watch mode
npm run test:coverage     # Code coverage breakdown

# ---------------------------------------------------------
# 3. Playwright End-to-End (E2E) Tests
# ---------------------------------------------------------
cd Frontend
npx playwright install chromium   # Install Chromium browser (first-time only)
npm run test:e2e                  # Headless E2E execution
npm run test:e2e:ui               # Playwright Interactive UI Mode
```

### Playwright E2E Test Highlights
- **Zero External Backend Dependency**: Playwright tests mock network requests via route interception (`page.route`), allowing rapid, isolated, and deterministic testing.
- **Automated WebServer Launch**: Vite server is auto-bootstrapped on an isolated port via `playwright.config.ts`.
- **Complete Feature Coverage**: E2E test specs cover Authentication, Dashboard, Case Settings, Real-time Messaging, Threaded Replies, Tasks, AI Assistant Panel, and Role-Based Access Control (RBAC).

---

## 📡 REST API & WebSocket Reference

### Authentication & User Directory (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/register/send-otp` — Validate employee ID whitelist and dispatch registration OTP.
- `POST /api/v1/auth/register` — Verify OTP and create authenticated user record.
- `POST /api/v1/auth/login` — Initiate login and dispatch 2FA OTP code.
- `POST /api/v1/auth/login/verify` — Verify OTP and issue signed JWT access token.
- `POST /api/v1/auth/forgot-password/send-otp` — Dispatch password reset OTP.
- `POST /api/v1/auth/forgot-password/reset` — Reset password using verified OTP.
- `GET /api/v1/auth/me` — Retrieve active authenticated session profile.
- `PATCH /api/v1/auth/profile-picture` — Upload and crop profile avatar via Cloudinary.
- `GET /api/v1/users/search` — Search verified employee directory.

### Case Operations & Collaboration (`/api/v1/cases`)
- `GET /api/v1/cases` — List accessible cases for authenticated user with pagination.
- `POST /api/v1/cases` — Create new investigation case (with automatic embedding).
- `GET /api/v1/cases/:id` — Retrieve full case details and participant list.
- `PUT /api/v1/cases/:id/status` — Update case workflow status (`Open`, `In Progress`, `Resolved`, `Closed`).
- `PUT /api/v1/cases/:id/archive` & `PUT /api/v1/cases/:id/unarchive` — Archive/unarchive case.
- `PUT /api/v1/cases/:id/pin` & `DELETE /api/v1/cases/:id/pin` — Toggle personal case sidebar pin.
- `PUT /api/v1/cases/:id/participants` — Update participant roles and add/remove members.
- `GET /api/v1/cases/:id/export-pdf` — Stream comprehensive PDFKit compliance audit report.

### Messages, Media Vault & Annotations
- `GET /api/v1/cases/:id/messages` — Fetch paginated chat history with replies and reactions.
- `POST /api/v1/cases/:id/messages/upload` — Upload media/document attachment and create message.
- `PATCH /api/v1/cases/:id/messages/:messageId` — Edit message content.
- `DELETE /api/v1/cases/:id/messages/:messageId` — Soft-delete message.
- `POST /api/v1/cases/:id/messages/:messageId/pin` — Pin message to case header.
- `GET /api/v1/cases/:id/vault` — Retrieve categorized media vault items (Images, Docs, Media, Links).
- `GET /api/v1/cases/:caseId/annotations` — Fetch canvas annotations for image/PDF evidence.
- `POST /api/v1/cases/:caseId/annotations` — Create canvas annotation with live WebSocket broadcast.

### Tasks & Action Items (`/api/v1/cases/:caseId/tasks`)
- `GET /api/v1/cases/:caseId/tasks` — List action items with assignee and priority filters.
- `POST /api/v1/cases/:caseId/tasks` — Create new task with due date and assignees.
- `PATCH /api/v1/cases/:caseId/tasks/:taskId` — Update task status (`todo`, `in_progress`, `done`).
- `DELETE /api/v1/cases/:caseId/tasks/:taskId` — Delete task.

### AI Investigation Services (`/api/v1/ai`)
- `POST /api/v1/ai/chat-summary` — Generate structured JSON summary of case discussion.
- `POST /api/v1/ai/meeting-summary` — Generate AI breakdown of video meeting transcript.
- `POST /api/v1/ai/case-assistant` — Conversational RAG assistant query with citation pills.
- `POST /api/v1/ai/document-qa` — Isolated document-specific Q&A with page references.
- `POST /api/v1/ai/timeline` — Generate chronological event timeline from case evidence.
- `POST /api/v1/ai/extract-tasks` — Extract action items with MongoDB deduplication.
- `POST /api/v1/ai/duplicate-check` — Real-time duplicate case detection during creation.
- `GET /api/v1/ai/similar-cases/:caseId` — Fetch related past cases using hybrid vector similarity.
- `POST /api/v1/ai/contradictions` & `GET /api/v1/ai/contradictions/:caseId` — Scan and list contradictory claims.
- `GET /api/v1/ai/search` — Hybrid vector + keyword semantic search.

---

## ⚡ WebSocket Real-Time Event Architecture

| Channel / Event | Direction | Payload & Description |
|---|---|---|
| `case:join` / `case:leave` | Client → Server | Join or leave case room socket namespace. |
| `message:send` / `message:new` | Bidirectional | Real-time message dispatch and broadcast. |
| `message:edit` / `message:delete` | Bidirectional | Message modification and soft-deletion sync. |
| `message:reaction` | Bidirectional | Emoji reaction addition or removal. |
| `message:pin` / `message:unpin` | Bidirectional | Dynamic WhatsApp-style pinned banner updates. |
| `typing:start` / `typing:stop` | Bidirectional | Real-time typing indicators with auto-timeout. |
| `presence:status` | Server → Client | Broadcast user online, offline, and last seen state. |
| `annotation:draw` | Bidirectional | Real-time canvas drawing coordinates and shape sync. |
| `meeting:join` / `meeting:signal` | Bidirectional | WebRTC mesh peer signaling (SDP offers, answers, ICE candidates). |
| `meeting:host_action` | Bidirectional | Host controls: Mute all participants, kick user, lock room. |
| `notification:new` | Server → Client | Instant push alerts for `@` mentions, assignments, and calls. |

---

## 🚢 Deployment & Production Guidelines

### Backend Deployment (Render)
The repository includes a ready-to-deploy `render.yaml` configuration:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a Web Service pointing to `Backend/` using Node environment.
3. Configure your production environment variables (`MONGODB_URI`, `JWT_SECRET`, `CHROMA_API_KEY`, `JINA_API_KEY`, LLM provider keys).

### Frontend Deployment (Vercel)
1. Import the `Frontend/` root directory into [Vercel](https://vercel.com).
2. Set Build Command to `npm run build` and Output Directory to `dist`.
3. Configure `VITE_API_URL` and `VITE_SOCKET_URL` pointing to your production backend.

---

