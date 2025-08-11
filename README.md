# MemMouse — Control Plane (Demo)

A minimal control plane for **projects / namespaces / services / data contracts** on top of Redis. Dark, glassy UI (Next.js App Router) with live-ready structure for policies, events, and pipelines.

## Features
- Projects overview with quotas & usage
- Namespaces list, freeze/unfreeze, quotas/TTL/eviction
- Project wizard & Namespace wizard (cancel/close, ESC)
- Sticky glass navbar, dynamic sidebar, breadcrumbs
- Redis-backed storage (no Postgres)
- Dev seeding via API

## Stack
- **Next.js** (App Router), **Node runtime**
- **Tailwind v4**
- **Redis** via `ioredis`
- Icons: `lucide-react`

## Quick start
**Prereqs:** Node 18+ (20+ recommended), Redis running locally.

```bash
# 1) install
npm i

# 2) env
cp .env.local.example .env.local
# edit if needed:
# REDIS_URL=redis://localhost:6379
# DEV_AUTOSEED=1

# 3) dev
npm run dev
```

### Seed dev data (projects + namespaces):

- Auto: open /projects (dev calls seeder once)

- Manual: GET http://localhost:3000/api/dev/seed?force=1&drop=1

## API (dev)
All routes run on nodejs runtime (not Edge).

- GET /api/projects — list projects

- POST /api/projects — create project

- GET /api/projects/:id/namespaces — list namespaces

- POST /api/projects/:id/namespaces — create namespace

- GET /api/projects/:id/namespaces/:nsId — get one

- PATCH /api/projects/:id/namespaces/:nsId — update (e.g. status: "frozen")

- DELETE /api/projects/:id/namespaces/:nsId — remove

- GET /api/dev/seed?force=1&drop=1 — reseed demo data

## Project structure (high level)
```bash

src/
  app/
    api/…                 # route handlers (Redis, node runtime)
    projects/…            # pages & nested routes (overview, tabs)
  components/…            # ui, navigation, projects, namespaces
  server/
    redis/client.js       # ioredis client
    repos/…               # ProjectRepo, NamespaceRepo
    services/bootstrap.js # seeding logic
  lib/
    mockProjects.js
    mockNamespaces.js
```

## Styling
- Tailwind v4 (@import "tailwindcss"; in globals.css)

- Reusable helpers: mm-glass, mm-input, mm-select

- Glass navbar + pill breadcrumbs

## Redis tips
- Keys: mm:project:{id}, mm:idx:projects, mm:namespace:{projectId}:{nsId}, mm:idx:namespaces:{projectId}

- Inspect with RedisInsight → search mm:*

## Roadmap (next)
- Services & bindings (tokens/ACLs)

- Data contracts (schemas, validation, migrations)

- Pipelines/bridges (S3/OLAP, streams)

- Live events & audit


## License
Licensed under Apache 2.0 license