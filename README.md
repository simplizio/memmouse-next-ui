# MemMouse — Control Plane (Demo)

A minimal control plane for **projects / namespaces / services / data contracts** on top of Redis. Dark, glassy UI (Next.js App Router) with live-ready structure for policies, events, and pipelines.

## Features
- Projects overview with quotas & usage
- Namespaces list + details:
    - Freeze/Unfreeze, usage & metrics
    - **Edit policy** (quota, default TTL, eviction)
    - **Service bindings** with key patterns, **scopes**, and **rate limits (read/write RPS)**
- Services catalog: list/create/edit/delete, **rotate token**, **download config**
- Config API for agents (per-service, token-protected)
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

### Projects
- `GET /api/projects` — list
- `POST /api/projects` — create

### Namespaces
- `GET /api/projects/:id/namespaces` — list
- `POST /api/projects/:id/namespaces` — create
- `GET /api/projects/:id/namespaces/:nsId` — get
- `PATCH /api/projects/:id/namespaces/:nsId` — **update policy/status** (e.g. `{ ttl, eviction, quotaBytes }`)
- `DELETE /api/projects/:id/namespaces/:nsId` — remove

### Service bindings (per namespace)
- GET /api/projects/:id/namespaces/:nsId/bindings — list

- POST /api/projects/:id/namespaces/:nsId/bindings — upsert
- body: { serviceId, serviceName, permissions, patterns[], scopes[], rate:{readRps,writeRps} }

- GET /api/projects/:id/namespaces/:nsId/bindings/:serviceId — get one

- PATCH /api/projects/:id/namespaces/:nsId/bindings/:serviceId — update

- DELETE /api/projects/:id/namespaces/:nsId/bindings/:serviceId — delete

### Services
- GET /api/projects/:id/services — list
- POST /api/projects/:id/services — create { id, name, scopes[] }
- GET /api/projects/:id/services/:serviceId — get
- PATCH /api/projects/:id/services/:serviceId — edit { name, scopes[] }
- DELETE /api/projects/:id/services/:serviceId — delete
- POST /api/projects/:id/services/:serviceId/rotate — issue new active token
- GET /api/projects/:id/services/:serviceId/bindings — list nsIds bound to service
- GET /api/projects/:id/services/:serviceId/config — agent config (requires Authorization: Bearer <token>)

### Events (stub)
- `GET /api/projects/:id/events?nsId=...` — returns `{ items: [] }` (placeholder)

### Dev tools
- GET /api/dev/seed?force=1&drop=1 — reseed demo data

- GET /api/dev/reindex?drop=1 — rebuild reverse index for bindings
  - In production require ?force=1

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
- Projects:
    - `mm:idx:projects` — Set of project ids
    - `mm:project:{id}` — JSON
- Namespaces:
    - `mm:idx:namespaces:{projectId}` — Set of namespace ids
    - `mm:namespace:{projectId}:{nsId}` — JSON
- **Bindings:**
    - `mm:idx:bindings:{projectId}:{nsId}` — Set of `serviceId`
    - `mm:binding:{projectId}:{nsId}:{serviceId}` — JSON
- Bootstrap marker: `mm:bootstrapped`

## Project overview (what you see)
- Capacity: total Used/Quota with progress

- Inventory: counts (Namespaces, Services, Bindings)

- Ops snapshot: aggregated reads/sec & writes/sec

- Top namespaces: by used bytes (top 5)

- Recent events: dev stub feed

## Security notes
- Service config requires a Bearer token (stored per service).

- For demo, config includes REDIS_URL; in real use, materialize Redis ACLs per binding.



## Try it
1) Start dev: `npm run dev`
2) Open `/projects` → pick a project
3) Go to **Namespaces** → **Open** a namespace
4) In details:
    - **Edit policy** → save (PATCHes Redis)
    - **+ Bind service** → add patterns/scopes/rate limits
    - Freeze/Unfreeze to toggle status


## Roadmap

### ✅ Done (demo)
- Projects overview (Redis-backed)
- Namespaces: list + details, usage, metrics, **Freeze/Unfreeze**
- **Edit policy** (quota, default TTL, eviction) — PATCH
- **Service bindings**: patterns, scopes, rate limits (read/write RPS)
- Glass UI: sticky navbar, dynamic sidebar, breadcrumbs
- Dev seeding & Redis keys layout
- Services & bindings
  - Service catalog (CRUD) — (list/create/edit/delete + details). 
  - API tokens: issue/rotate — (issue upon creation, also Rotate).

### 🔜 Next (core)
- **Services & bindings**
    - Redis ACL materialization per binding (+key patterns)
    - Rate-limit enforcement path (gateway/sidecar), soft/hard
- **Data contracts**
    - Contract registry (key patterns + JSON Schema)
    - Validate on write (soft/hard), versions (v1→v2)
    - Migration tool: rename by pattern, backfill, reindex
    - Indexed fields (secondary indexes) and query API
- **Pipelines / Bridges**
    - Mirror namespace → S3 (snapshot + incremental)
    - Ship to OLAP (ClickHouse) + status/health
    - CDC via Redis Streams; **pause/resume**, replay window, DLQ/retries
- **Live events & Audit**
    - Event bus (Redis Pub/Sub + Streams)
    - SSE/WebSocket with filters (project/ns/service)
    - Audit log of control-plane actions; export

### 🧭 Visualization (“Ant Trails”)
- Flow map: Services ↔ Namespaces graph
- Edge weights by ops/throughput/latency; live glow on activity
- Drill-down by service/namespace; error hotspots

### 📣 Quotas & Alerts
- Enforce project/ns quotas with backpressure & kill switch
- Alert rules (80/90/100, ops/latency/errors)
- Notifiers: email/webhook (pluggable)

### 🛡️ RBAC & Org
- Roles: Owner/Admin/Dev/ReadOnly
- Org/workspace switcher; settings
- (Later) SCIM bootstrap

### 💾 Backups & Snapshots
- RDB/AOF snapshots per namespace/project
- Manual snapshot/restore + **dry-run** to sandbox

### 🧱 Hardening & DX
- OpenAPI spec + SDKs (Node/Go)
- Request validation, input schemas
- Logging (pino), metrics (Prom), healthz/readyz
- Tests: unit for repos/services, basic e2e
- Config/secrets, Redis TLS, Docker Compose


## License
Licensed under Apache 2.0 license