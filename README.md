# DrillStack

> A sport-agnostic, age-agnostic coaching knowledge base for managing drills, training sessions, and period plans.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)

**Repo:** https://github.com/jagduvi1/Drillstack

---

## What it does

DrillStack is a training knowledge base where coaches can:

- **Author drills** — with purpose, instruction focus, guided discovery questions, rules, success criteria, variations, common mistakes, diagrams, and post-session reflections
- **Build training sessions** — structured as Information → Warm-up → Train the Purpose → Cool-down → Reflection, with auto-calculated duration, equipment aggregation, and conflict warnings
- **Plan periods / seasons** — parallel focus blocks, weekly session assignment, observation notes, and coverage tracking
- **Search** — semantic (Qdrant), keyword (Meilisearch, feature-flagged), or hybrid
- **AI assistance** — tag suggestions, guided questions, common mistakes, variations, and summaries (provider-agnostic: OpenAI, Anthropic, Ollama)

All taxonomies (skills, roles, game forms, equipment, didactic strategies…) are **configurable at runtime** — no code changes needed to add a new sport or concept.

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
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/taxonomy?category=&sport=
POST   /api/taxonomy
DELETE /api/taxonomy/:id

GET    /api/drills
POST   /api/drills
GET    /api/drills/:id
PUT    /api/drills/:id
DELETE /api/drills/:id
POST   /api/drills/:id/diagrams
POST   /api/drills/:id/reflections

GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
DELETE /api/sessions/:id

GET    /api/plans
POST   /api/plans
GET    /api/plans/:id
PUT    /api/plans/:id
DELETE /api/plans/:id
GET    /api/plans/:id/coverage

GET    /api/search/semantic?q=
GET    /api/search/keyword?q=
GET    /api/search/hybrid?q=

POST   /api/ai/suggest-tags
POST   /api/ai/guided-questions
POST   /api/ai/common-mistakes
POST   /api/ai/variations
POST   /api/ai/summarize
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
