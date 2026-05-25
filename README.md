# DevCoach

## Overview

DevCoach is a PR assistant project built with React + Vite on the frontend, Node.js + TypeScript + Express on the backend, and PostgreSQL + Prisma for persistence. It includes PR synchronization, AI-powered code review, cross-PR conflict detection, and a repository indexer / RAG pipeline.

## Quick Start (Docker)

1. Make sure a `.env` file exists at the project root and includes these keys:

- `DATABASE_URL` (for example: `postgresql://postgres@postgres:5432/devcoach_db?schema=public`)
- `PORT` (optional, default: `3000`)
- `GEMINI_API_KEY` (if you use the Gemini / GenAI integration)

2. Start the stack:

```bash
docker compose up --build
```

During the backend image build, the Dockerfile copies the `prisma` folder before `npm install`, so `prisma generate` can run successfully. The compose startup also waits for Postgres to become available before running `prisma db push`.

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

## Prisma / Database

- Schema: `backend/prisma/schema.prisma`
- Prisma config: `backend/prisma.config.ts`
- If you change the models, rerun the generation steps:

```bash
cd backend
npx prisma generate
npx prisma db push
```

## Main Features and Routes

- PR synchronization: `POST /api/github/prs` (`backend/src/routes/prs.route.ts`)
- AI code review: `POST /api/github/analyze` (`backend/src/routes/analyze.route.ts`) - the Gemini helper expects structured JSON
- Cross-PR conflict radar: `POST /api/github/check-conflicts` (`backend/src/routes/conflicts.route.ts`)
- Learning profile: learning memories stored in the `learningMemory` table
- Repo habits (RAG): `POST /api/repository-habits` (`backend/src/routes/repository-habits.route.ts`) - clones, indexes, retrieves, and runs AI analysis when needed

## Common Issues

## Useful Files

- Backend entry point: `backend/src/index.ts`
- Gemini helper: `backend/src/services/gemini.service.ts`
- Repository indexer: `backend/src/services/repo-indexer/*`
- Frontend entry: `frontend/src/main.tsx` and `frontend/src/App.tsx`
- Docker compose: `docker-compose.yml`
