# CLAUDE.md — CRM Sales Tool (Forschungszulage Pipeline)

## Always Do First
- Read the plan file at `.claude/plans/silly-leaping-sonnet.md` to understand the full data model, views, and architecture before touching any code.
**Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Project Overview
- **App:** CRM Sales Tool — Pipeline-Management for tracking companies through a Forschungszulagengesetz sales process.
- **Language:** All UI text in **German**.
- **Multi-user** with JWT authentication. Every action must be attributed to the logged-in user.
- **Data persistence:** SQLite via Prisma ORM (zero-setup, file-based). Can migrate to PostgreSQL later.


## Screenshot Workflow
- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Tech Stack
- **Backend:** Node.js + Express.js + Prisma ORM + SQLite
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** JWT access tokens (15min) + refresh tokens (7d), bcrypt password hashing (12 rounds)
- **External APIs:** Perplexity API (company research), Bundesanzeiger (web scraping for Jahresabschluss)

## Local Development
- **Backend:** `cd backend && npm run dev` → runs on `http://localhost:3001`
- **Frontend:** `cd frontend && npm run dev` → runs on `http://localhost:5173`
- **Database:** SQLite (file-based, no extra install). Run `npx prisma migrate dev` in `/backend` to apply schema. Then `node prisma/seed.js` to create admin user.
- **Environment:** Copy `backend/.env.example` to `backend/.env` and fill in values.

## Pipeline Stages (in order)
1. `FIRMA_IDENTIFIZIERT` — Firma Identifiziert
2. `FIRMA_KONTAKTIERT` — Firma kontaktiert
3. `VERHANDLUNG` — Verhandlung
4. `CLOSED_WON` — Closed Won
5. `CLOSED_LOST` — Closed Lost

## Data Model (Prisma)
- **User:** id, email, passwordHash, name, role (ADMIN/USER), refreshToken, createdAt, lastLogin
- **Company:** id, name, website, pipelineStage, assignedToId (→User), createdById (→User), createdAt, updatedAt
- **Contact:** id, companyId (→Company), firstName, lastName, email, phone, position, createdAt
- **Comment:** id, entityType (COMPANY/CONTACT), entityId, userId (→User), content, createdAt

## Architecture Patterns

### Backend Structure
- `backend/src/server.js` — Express app entry point
- `backend/src/config/env.js` — Environment variable validation
- `backend/src/middleware/` — auth.js (JWT verify), authorize.js (role check), errorHandler.js
- `backend/src/routes/` — One file per resource (auth, companies, contacts, comments, perplexity, bundesanzeiger)
- `backend/src/services/` — Business logic, one file per resource
- `backend/src/utils/asyncHandler.js` — Async error wrapper for Express routes

### Frontend Structure
- `frontend/src/main.jsx` — React entry point
- `frontend/src/App.jsx` — Router setup (React Router v6)
- `frontend/src/context/AuthContext.jsx` — Auth state, login/logout, token management
- `frontend/src/pages/` — LoginPage, PipelinePage, CompanyDetailPage
- `frontend/src/components/` — PipelineBoard, CompanyCard, ContactForm, CommentSection, PerplexityPanel, BundesanzeigerPanel
- `frontend/src/services/api.js` — Axios instance with auth interceptor

### API Endpoints
- `POST /api/auth/login` — Login, returns tokens
- `POST /api/auth/refresh` — Refresh access token
- `GET/POST /api/companies` — List/create companies
- `GET/PUT/DELETE /api/companies/:id` — Single company CRUD
- `PATCH /api/companies/:id/stage` — Update pipeline stage (drag-and-drop)
- `GET/POST /api/companies/:id/contacts` — Contacts for a company
- `GET/POST /api/comments` — Comments (filtered by entityType + entityId)
- `POST /api/perplexity/research` — Query Perplexity for Forschungszulage info
- `GET /api/bundesanzeiger/:companyName` — Scrape Jahresabschluss data

## External Integrations

### Perplexity API
- Endpoint: `https://api.perplexity.ai/chat/completions`
- Model: `sonar` (or latest available)
- Prompt template focuses on Forschungszulagengesetz eligibility, R&D activities, and relevant company info
- API key stored in `PERPLEXITY_API_KEY` env var

### Bundesanzeiger Scraping
- Target: `https://www.bundesanzeiger.de`
- Search by company name, extract latest Jahresabschluss documents
- Parse key financials: Umsatz, Bilanzsumme, Jahresüberschuss
- Cache results to avoid excessive scraping

## Security
- All API routes (except auth) require valid JWT
- Passwords hashed with bcrypt (12 rounds)
- CORS configured for frontend origin only
- Rate limiting on auth endpoints (5 attempts per 15 min)
- Never expose passwordHash or refreshToken in API responses
- Sanitize user inputs to prevent XSS

## UI Design Guidelines
- **Colors:** Brand teal (`#0D7377`) with warm accent (`#F59E0B`). Pipeline stages get distinct colors.
- **Pipeline Board:** Kanban-style columns, drag-and-drop between stages
- **Company Cards:** Show name, assigned user, contact count, last activity
- **Typography:** Clean sans-serif, German UI labels
- **Responsive:** Desktop-first (CRM is primarily used on desktop)
- **Empty states:** Friendly messages with call-to-action when no data exists

## Hard Rules
- Every comment must show who wrote it and when
- Every pipeline stage change must be visible (who moved it, when)
- Never expose API keys to the frontend — all external API calls go through the backend
- Always validate and sanitize user input on the backend
- Use Prisma transactions for operations that touch multiple tables
