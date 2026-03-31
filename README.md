# DrillStack

> A sport-agnostic, age-agnostic coaching knowledge base for managing drills, training sessions, and period plans.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)

**Repo:** https://github.com/jagduvi1/Drillstack

---

## What it does

DrillStack is a complete training management platform for coaches across all sports:

- **Drill Library** — create, fork, version, star, and share drills with descriptions, coaching points, variations, safety notes, and skill progression chains
- **Tactic Boards** — interactive animated boards for 8+ sports (football, handball, hockey, basketball, futsal, floorball, volleyball, gymnastics) with player positions, arrows, and step-by-step animations
- **Training Sessions** — build sessions with blocks (drills, stations, matchplay, breaks), calendar scheduling, and auto-calculated duration + equipment lists
- **Period Plans** — season planning with weekly session assignment and focus areas
- **On-the-field execution** — session timer with block navigation, attendance tracking (tap players present), and AI-powered team splitting
- **Teams & Clubs** — role-based groups (owner/admin/trainer/viewer) with starred drill inheritance, player rosters, and club verification
- **User Contributions** — any user can add YouTube videos, drawings, and tactic boards to public drills with visibility controls (public/private/team)
- **AI Assistance** — drill generation, session suggestions, team splitting, and refinement (OpenAI, Anthropic, or Ollama)
- **Search** — semantic (Qdrant), keyword (Meilisearch), text filter, and drill-specific filters (sport, skill level, apparatus)
- **GDPR Compliant** — data export, account deletion, audit log retention, EXIF stripping, privacy policy
- **Reporting** — flag inappropriate content for admin review
- **Print/Export** — clean printable session plans

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Vector search | Qdrant |
| Keyword search | Meilisearch (feature-flagged) |
| AI / Embeddings | Provider-agnostic (OpenAI / Anthropic / Ollama) |
| Serving | nginx (Docker) |
| Orchestration | Docker Compose |

---

## Quick start

### 1 — Clone and configure

```bash
git clone https://github.com/jagduvi1/Drillstack.git
cd Drillstack
cp .env.example .env
# Edit .env — set AI_API_KEY and change secrets
```

### 2 — Start all services

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| Qdrant UI | http://localhost:6333/dashboard |
| Meilisearch | http://localhost:7700 |

### 3 — Seed initial taxonomy

```bash
docker compose exec backend npm run seed
```

This creates the default taxonomy (skills, coordination, roles, equipment, etc.) and a demo user:

```
Email:    coach@example.com
Password: coach123
```

---

## Environment variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `openai` / `anthropic` / `ollama` |
| `AI_API_KEY` | API key for the chosen provider |
| `AI_MODEL` | Model name (e.g. `gpt-4o`) |
| `EMBEDDING_PROVIDER` | Same options as `AI_PROVIDER` |
| `EMBEDDING_MODEL` | e.g. `text-embedding-3-small` |
| `ENABLE_MEILISEARCH` | `true` / `false` — feature-flag keyword search |

---

## API overview

```
# Auth & Account
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/preferences
GET    /api/auth/export          # GDPR: download all data
DELETE /api/auth/account         # GDPR: delete account

# Drills
GET    /api/drills               # ?sport=&skillLevel=&search=&starred=
POST   /api/drills
GET    /api/drills/:id
PUT    /api/drills/:id
DELETE /api/drills/:id
POST   /api/drills/:id/fork
POST   /api/drills/:id/star
POST   /api/drills/:id/claim
GET    /api/drills/:id/versions
GET    /api/drills/:id/progressions

# Sessions
GET    /api/sessions             # ?dateFrom=&dateTo=&sport=&group=
POST   /api/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
DELETE /api/sessions/:id
GET    /api/sessions/today
PUT    /api/sessions/:id/attendance

# Plans
GET    /api/plans
POST   /api/plans
GET    /api/plans/:id
PUT    /api/plans/:id
DELETE /api/plans/:id

# Tactics
GET    /api/tactics
POST   /api/tactics
GET    /api/tactics/:id
PUT    /api/tactics/:id
POST   /api/tactics/:id/clone
GET    /api/tactics/:id/versions

# Groups (Teams & Clubs)
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
POST   /api/groups/:id/members
POST   /api/groups/:id/star-drill/:drillId
PUT    /api/groups/:id/verify    # Admin: verify club

# Players
GET    /api/players/:groupId
POST   /api/players/:groupId
PUT    /api/players/:groupId/:playerId
DELETE /api/players/:groupId/:playerId

# Contributions (Videos, Drawings, Tactics on drills)
GET    /api/contributions/:drillId
POST   /api/contributions/:drillId/video
POST   /api/contributions/:drillId/drawing
POST   /api/contributions/:drillId/tactic

# AI
POST   /api/ai/generate          # Generate drill
POST   /api/ai/refine/:id        # Refine drill with AI
POST   /api/ai/split-simple      # Random equal split
POST   /api/ai/split-smart       # AI-powered balanced split

# Reports
POST   /api/reports
GET    /api/reports               # Admin only

# Search
GET    /api/search/semantic?q=
GET    /api/search/keyword?q=
```

---

## Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev       # nodemon on :4000

# Frontend
cd frontend
npm install
npm run dev       # Vite dev server on :3000 (proxies /api → :4000)

# Seed
cd backend
npm run seed
```

Requires local MongoDB, Qdrant, and Meilisearch (or update `.env` to point at hosted instances).

---

## Running tests

```bash
# Backend (uses in-memory MongoDB)
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## Production (Traefik)

The frontend service runs behind nginx and is designed to sit behind a Traefik reverse proxy in production. Add your Traefik labels to the `frontend` service in `docker-compose.yml` — no other changes are needed.

---

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
