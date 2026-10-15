# DevCoach

DevCoach is a prototype AI-assisted pull request coach. It connects to GitHub, reviews pull request diffs with Gemini, detects possible conflicts between open pull requests, remembers recurring review findings, and explains repository-specific coding conventions.

This is intentionally a prototype. GitHub tokens are stored in browser `localStorage`, and Repository Habits currently supports public GitHub repositories.

## Architecture

```text
React + Vite frontend
        │ HTTP/JSON
        ▼
Express + TypeScript backend
        ├── GitHub integration (Octokit / REST API)
        ├── Gemini integration (structured generation + embeddings)
        └── PostgreSQL through Prisma
```

Backend responsibilities are separated into:

- `routes/` — HTTP endpoints
- `middleware/` — validation and global error handling
- `services/` — application workflows
- `integrations/github/` and `integrations/gemini/` — external APIs
- `services/repo-indexer/` — cloning, chunking, embedding, and retrieval
- `schemas/` — Zod request schemas

## Features

- GitHub token validation and pull request synchronization
- Structured Gemini code review with severity and code examples
- Cross-PR conflict radar based on changed files and AI reasoning
- Developer learning profile backed by recurring review concepts
- Repository-specific habits and recommendations
- 24-hour repository index cache in PostgreSQL
- Docker Compose development environment

## AI and RAG pipeline

The Repository Habits feature uses retrieval-augmented generation:

```text
public GitHub repository
        ↓
shallow clone and text-file scan
        ↓
code chunks
        ↓
Gemini embedding model
        ↓
cosine-similarity retrieval
        ↓
retrieved code context + developer task
        ↓
Gemini structured habits and recommendations
```

This is an embedding-based RAG pipeline. Dense vectors are stored in the `RepositoryIndex.indexData` JSON field and retrieved in application memory. The prototype does not use a separate vector database or `pgvector` yet. Old index formats are invalidated automatically when the index version or embedding model changes.

## Quick Start with Docker

1. Copy `.env.example` to `.env`.
2. Add a valid `GEMINI_API_KEY`.
3. Start the stack:

```bash
docker compose up --build
```

The services are available at:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## Local Development

Backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx tsx watch src/index.ts
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Main API routes

- `POST /api/github/validate` — validate a GitHub token
- `POST /api/github/prs` — synchronize pull requests
- `POST /api/github/analyze` — analyze a pull request diff
- `POST /api/github/check-conflicts` — analyze open PR conflicts
- `GET /api/github/learning-profile?username=...` — load learning memory
- `POST /api/repository-habits` — index a repository and generate habits
- `GET /api/health` — check backend configuration and availability

## Database

The Prisma schema is in `backend/prisma/schema.prisma`.

- `User` stores GitHub identities.
- `PullRequest` stores synchronized PRs and cached AI results.
- `LearningMemory` stores recurring review concepts.
- `RepositoryIndex` stores repository metadata and embedding-based index data.

## Known prototype limitations

- GitHub tokens are stored in browser `localStorage`.
- Repository Habits supports public GitHub repositories.
- Retrieval is performed in application memory rather than with `pgvector`.
- Embeddings are generated for a bounded number of repository chunks.
- Conflict Radar is an AI-assisted logical conflict detector, not a Git merge simulator.
- AI output can fall back to an empty result if Gemini is unavailable or rate-limited.

## Security

Never commit `.env` or real API keys. Use `.env.example` as the configuration template. If a key has ever been committed or exposed, revoke it and generate a replacement before sharing the project.

## Useful files

- `backend/src/index.ts` — backend entry point
- `backend/src/integrations/gemini/client.ts` — Gemini generation and embeddings
- `backend/src/services/gemini.service.ts` — structured AI workflows
- `backend/src/services/repo-indexer/indexer.service.ts` — repository RAG indexing and search
- `backend/src/routes/repository-habits.route.ts` — RAG endpoint
- `backend/prisma/schema.prisma` — database schema
- `frontend/src/App.tsx` — frontend routes
- `frontend/src/components/Dashboard.tsx` — dashboard shell
