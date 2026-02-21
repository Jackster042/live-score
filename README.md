# Live Score API

A production-ready, horizontally-scalable real-time sports scoring platform built with Node.js, TypeScript, and modern cloud-native architecture.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

Live Score API is a high-performance backend system designed for real-time sports event tracking. It supports horizontal scaling, real-time WebSocket broadcasts, automated match status transitions, and comprehensive monitoring.

### Key Features

- **Real-time Updates**: WebSocket-based live scoring with sub-100ms latency
- **Horizontal Scaling**: Multiple API instances share state via Redis Pub/Sub
- **TypeScript**: Fully typed codebase with strict mode enabled
- **Background Jobs**: BullMQ for scheduled match status transitions
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Monitoring**: Docker Stats, Redis Monitor, and Artillery load testing
- **Security**: Arcjet rate limiting and request validation
- **Testing**: Vitest unit tests, integration tests, and load testing suite

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │  Mobile App │  │   TV App    │  │   PWA       │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Load Balancer     │
                    │   (Nginx/Cloudflare)│
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│  API Instance 1   │ │  API Instance 2 │ │  API Instance N │
│  (Port 8000)      │ │  (Port 8001)    │ │  (Port 800N)    │
│                   │ │                 │ │                 │
│  ┌─────────────┐  │ │  ┌─────────────┐│ │  ┌─────────────┐│
│  │   Express   │  │ │  │   Express   ││ │  │   Express   ││
│  │  WebSocket  │  │ │  │  WebSocket  ││ │  │  WebSocket  ││
│  └──────┬──────┘  │ │  └──────┬──────┘│ │  └──────┬──────┘│
└─────────┼─────────┘ └─────────┼────────┘ └─────────┼────────┘
          │                     │                    │
          └─────────────────────┼────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │      REDIS          │
                    │   ┌─────────────┐   │
                    │   │   Pub/Sub   │   │  ◄── Cross-instance
                    │   └─────────────┘   │      broadcasting
                    │   ┌─────────────┐   │
                    │   │    Queue    │   │  ◄── BullMQ jobs
                    │   └─────────────┘   │
                    │   ┌─────────────┐   │
                    │   │    Cache    │   │  ◄── Response caching
                    │   └─────────────┘   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │    POSTGRESQL       │
                    │                     │
                    │  • matches          │
                    │  • commentary       │
                    │  • teams            │
                    │  • leagues          │
                    └─────────────────────┘
```

## Tech Stack

| Layer            | Technology     | Purpose                      |
| ---------------- | -------------- | ---------------------------- |
| **Language**     | TypeScript 5.9 | Type-safe development        |
| **Runtime**      | Node.js 20+    | Server runtime               |
| **Framework**    | Express 5      | HTTP API                     |
| **WebSocket**    | ws library     | Real-time communication      |
| **ORM**          | Drizzle ORM    | Database abstraction         |
| **Database**     | PostgreSQL 16  | Primary data store           |
| **Cache/Queue**  | Redis 7        | Pub/Sub, caching, job queues |
| **Jobs**         | BullMQ         | Background job processing    |
| **Security**     | Arcjet         | Rate limiting, bot detection |
| **Validation**   | Zod            | Schema validation            |
| **Testing**      | Vitest         | Unit and integration tests   |
| **Load Testing** | Artillery      | Performance testing          |

## Project Structure

```
live-score/
├── src/
│   ├── index.ts                 # API entry point
│   ├── worker.ts                # Background worker entry
│   ├── db/
│   │   ├── schema.ts            # Database schema (Drizzle)
│   │   └── db.ts                # Database connection
│   ├── jobs/
│   │   ├── queue.ts             # BullMQ queue setup
│   │   ├── worker.ts            # Job processors
│   │   └── processors/          # Job handlers
│   ├── redis/
│   │   ├── client.ts            # Redis connection & pub/sub
│   │   └── keys.ts              # Key naming conventions
│   ├── routes/
│   │   ├── matches.ts           # Match CRUD API
│   │   └── commentary.ts        # Commentary API
│   ├── ws/
│   │   └── server.ts            # WebSocket server
│   ├── services/
│   │   └── providers/           # External API adapters
│   ├── config/                  # Configuration management
│   ├── validation/              # Zod schemas
│   └── types/                   # TypeScript types
├── scripts/
│   ├── seed.ts                  # Database seeding
│   ├── load-test.yml            # Artillery load test config
│   ├── test-websocket.html      # WebSocket test client
│   ├── test-websocket-scaling.html  # Horizontal scaling test
│   └── *.ps1                    # PowerShell dev scripts│
├── test/                        # Test suites
├── docker-compose.yml           # Infrastructure setup
└── README.md                    # This file
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop
- Git

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd live-score

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Push database schema
npx drizzle-kit push

# Seed test data
npm run db:seed

# Build project
npm run build
```

### Development

#### Option 1: Interactive Menu (Recommended)

```bash
npm run dev
```

Select from:

- `[1] BASIC Setup` - 5 windows (API, Worker, Redis, Postgres, Test)
- `[2] FULL Setup` - 7 windows (+ Docker Stats, Load Test ready)
- `[3] Windows Terminal Tabs` - All services in one window
- `[4] Docker Stats` - Container monitoring
- `[5] Load Test` - Run Artillery tests
- `[6] Horizontal Scaling` - Verify Redis Pub/Sub

#### Option 2: Manual Start

```bash
# Terminal 1: Start API
npm run dev:ts

# Terminal 2: Start Worker
npm run worker:dev

# Terminal 3: Monitor Redis
npm run redis:monitor
```

### Verification

```bash
# Health check
curl http://localhost:8000/health

# Get matches
curl http://localhost:8000/api/matches

# Get match commentary
curl http://localhost:8000/api/matches/1/commentary

# Open WebSocket test client
start scripts/test-websocket.html
```

## API Documentation

### REST Endpoints

| Method | Endpoint                      | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/health`                     | Health check with service status   |
| GET    | `/api/matches`                | List all matches (with pagination) |
| POST   | `/api/matches`                | Create new match                   |
| GET    | `/api/matches/:id`            | Get match details                  |
| GET    | `/api/matches/:id/commentary` | Get match commentary               |
| POST   | `/api/matches/:id/commentary` | Add commentary event               |

### WebSocket Protocol

**Connect:** `ws://localhost:8000/ws`

**Client → Server:**

```json
{"action": "subscribe", "matchId": 1}
{"action": "unsubscribe", "matchId": 1}
```

**Server → Client:**

```json
{"type": "score:update", "matchId": 1, "data": {"homeScore": 2, "awayScore": 1}}
{"type": "commentary:new", "matchId": 1, "data": {...}}
{"type": "match:status", "matchId": 1, "data": {"status": "live"}}
```

## Testing

### Unit Tests

```bash
npm test
```

Coverage: 29 tests covering validation, match status logic, and utilities.

### Integration Tests

```bash
# Requires running PostgreSQL
npm run test:integration
```

### Load Testing

```bash
# Install Artillery (one-time)
npm install -g artillery

# Run load test
npm run test:load
```

Test configuration: `scripts/load-test.yml`

- 4 phases: Warm up → Normal → Peak → Cool down
- Tests match browsing, commentary, and health endpoints
- ~5 minute duration

### Horizontal Scaling Test

Verify multiple instances share broadcasts via Redis:

```bash
npm run test:scaling
```

Or use browser test:

```bash
start scripts/test-websocket-scaling.html
```

## Horizontal Scaling

### Running Multiple Instances

```bash
# Instance 1
$env:PORT=8000
npm run dev:ts

# Instance 2
$env:PORT=8001
npm run dev:ts
```

### Architecture Benefits

- **Stateless API**: Any instance can handle any request
- **Redis Pub/Sub**: WebSocket broadcasts reach all instances
- **Shared Database**: Consistent data across all instances
- **BullMQ**: Distributed job processing

### Verification

1. Connect WebSocket clients to different ports
2. Send update via Instance 1
3. Verify clients on Instance 2 receive it

## Database Schema

### Core Tables

**matches** - Match data and scores

- `id`, `homeTeam`, `awayTeam`, `homeScore`, `awayScore`
- `status`: scheduled | live | halftime | finished
- `startTime`, `endTime`, `elapsedSeconds`
- `stats` (JSONB): possession, shots, cards, etc.

**commentary** - Match events

- `matchId`, `minute`, `eventType`
- `actor`, `team`, `message`
- `metadata` (JSONB): assists, substitutions, VAR decisions

See [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for complete documentation.

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/live_score

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=8000
NODE_ENV=development

# Security
ARCJET_KEY=your_key_here
```

See `.env.example` for all options.

## Monitoring

### Docker Stats

```bash
npm run docker:stats
```

Shows real-time CPU, memory, and network for PostgreSQL and Redis containers.

### Redis Monitor

```bash
npm run redis:monitor
```

View all Redis commands in real-time to verify pub/sub broadcasts.

### PostgreSQL Logs

```bash
npm run postgres:logs
```

## Deployment

### Docker Compose (Production)

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '8000:8000'
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/live_score
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 3

  worker:
    build: .
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/live_score
      - REDIS_URL=redis://redis:6379

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
```

## Key Achievements

✅ **TypeScript Migration**: Complete codebase converted from JavaScript with strict mode
✅ **Real-time Architecture**: WebSocket + Redis Pub/Sub for horizontal scaling
✅ **Background Jobs**: BullMQ for match status automation
✅ **Comprehensive Testing**: Unit tests, integration tests, load tests
✅ **DevOps Ready**: Docker Compose, monitoring scripts, automated setup
✅ **Documentation**: 6 detailed documentation files

## Author

[Nemanja Stojanovic] - [GitHub] - [LinkedIn/GitHub]

---

**Built with modern cloud-native architecture principles for production-scale deployments.**
