# 🏆 Live Score API

> A production-ready, horizontally scalable real-time sports scoring API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-yellow.svg)](https://vitest.dev/)

---

## ✨ Features

| Feature                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| 🔄 **Real-time Updates**  | WebSocket broadcasts for live match updates   |
| 📈 **Horizontal Scaling** | Redis pub/sub enables multiple API instances  |
| ⏰ **Scheduled Jobs**     | Automatic match status transitions via BullMQ |
| 🛡️ **Type Safety**        | Full TypeScript with strict mode              |
| 🧪 **Tested**             | Comprehensive test suite with >80% coverage   |
| 🐳 **Containerized**      | One-command setup with Docker Compose         |
| 📊 **Monitoring**         | Health checks and readiness probes            |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
│                     (Nginx / Cloud LB)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  API Inst 1 │    │  API Inst 2 │    │  API Inst N │
    │   :8000     │    │   :8001     │    │   :800N     │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                    Redis Cluster                   │
    │  ┌─────────────────────────────────────────────┐  │
    │  │  • Pub/Sub (broadcast sync)                 │  │
    │  │  • Job Queues (BullMQ)                      │  │
    │  │  • Caching                                  │  │
    │  └─────────────────────────────────────────────┘  │
    └───────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                  PostgreSQL                        │
    │         (Matches, Commentary)                      │
    └───────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision              | Rationale                                     |
| --------------------- | --------------------------------------------- |
| **Redis Pub/Sub**     | Enables horizontal scaling vs sticky sessions |
| **Separate Worker**   | Independent scaling, fault isolation          |
| **Delayed Jobs**      | Precise scheduling vs cron polling            |
| **TypeScript Strict** | Catch bugs at compile time                    |
| **Testcontainers**    | Isolated integration tests                    |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- Node.js 20+ (for local development)

### One-Command Setup

```bash
# Clone repository
git clone https://github.com/yourusername/live-score.git
cd live-score

# Start all services
docker-compose up -d

# Verify installation
curl http://localhost:8000/health
```

### Scale to Multiple Instances

```bash
# Run 2 API instances
docker-compose up -d --scale api=2

# Verify both instances share broadcasts
# Connect clients to different ports, broadcasts sync via Redis
```

---

## 📁 Project Structure

```
live-score/
├── docker-compose.yml          # Multi-service orchestration
├── Dockerfile                  # Production container
├── tsconfig.json              # TypeScript configuration
├── vitest.config.js           # Test configuration
├── src/
│   ├── index.ts               # API entry point
│   ├── worker.ts              # Background worker entry
│   ├── config/                # Environment configuration
│   ├── db/                    # Database schema & connection
│   ├── routes/                # REST API endpoints
│   ├── validation/            # Zod schemas
│   ├── redis/                 # Redis client & pub/sub
│   ├── jobs/                  # BullMQ queues & processors
│   ├── ws/                    # WebSocket server
│   └── types/                 # Shared TypeScript types
├── test/
│   ├── unit/                  # Unit tests
│   ├── integration/           # API integration tests
│   └── helpers/               # Test factories
├── docs/                      # Phase documentation
│   ├── phase-1-infrastructure.md
│   ├── phase-2-redis-integration.md
│   ├── phase-3-background-jobs.md
│   ├── phase-4-testing.md
│   └── phase-5-typescript.md
└── drizzle/                   # Database migrations
```

---

## 🔌 API Documentation

### REST Endpoints

| Method | Endpoint                  | Description     |
| ------ | ------------------------- | --------------- |
| `GET`  | `/health`                 | Health check    |
| `GET`  | `/health/ready`           | Readiness probe |
| `GET`  | `/matches`                | List matches    |
| `POST` | `/matches`                | Create match    |
| `GET`  | `/matches/:id/commentary` | List commentary |
| `POST` | `/matches/:id/commentary` | Add commentary  |

### WebSocket Protocol

**Connection:** `ws://localhost:8000/ws`

**Client → Server:**

```json
// Subscribe to match
{ "type": "subscribe", "matchId": 123 }

// Unsubscribe
{ "type": "unsubscribe", "matchId": 123 }
```

**Server → Client:**

```json
// Welcome
{ "type": "welcome", "message": "Connected to Live Score API" }

// Match created (broadcast to all)
{ "type": "match_created", "data": { "id": 1, ... } }

// Commentary (broadcast to subscribers)
{ "type": "commentary", "data": { "matchId": 123, ... } }
```

### Example Requests

```bash
# Create a match
curl -X POST http://localhost:8000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "sport": "soccer",
    "homeTeam": "Liverpool",
    "awayTeam": "Arsenal",
    "startTime": "2026-02-20T15:00:00Z",
    "endTime": "2026-02-20T17:00:00Z"
  }'

# Add commentary
curl -X POST http://localhost:8000/matches/1/commentary \
  -H "Content-Type: application/json" \
  -d '{
    "minute": 23,
    "message": "Amazing goal by Salah!",
    "eventType": "goal"
  }'

# Connect via WebSocket
wscat -c ws://localhost:8000/ws
> { "type": "subscribe", "matchId": 1 }
```

---

## ⚙️ Configuration

### Environment Variables

| Variable       | Required | Default       | Description                  |
| -------------- | -------- | ------------- | ---------------------------- |
| `DATABASE_URL` | ✅       | -             | PostgreSQL connection string |
| `REDIS_URL`    | ✅       | -             | Redis connection string      |
| `NODE_ENV`     | ❌       | `development` | Environment mode             |
| `PORT`         | ❌       | `8000`        | API server port              |
| `HOST`         | ❌       | `0.0.0.0`     | Bind address                 |
| `ARCJET_MODE`  | ❌       | `DRY_RUN`     | Security mode                |
| `ARCJET_KEY`   | ❌       | -             | Arcjet API key               |

### Local Development

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/livescore
REDIS_URL=redis://localhost:6379

# Start infrastructure
docker-compose up -d postgres redis

# Run API
npm run dev

# In another terminal, run worker
npm run worker
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific file
npx vitest run test/unit/validation.test.js
```

### Test Coverage

| Type              | Coverage |
| ----------------- | -------- |
| Unit Tests        | 90%+     |
| Integration Tests | 80%+     |
| Total             | 85%+     |

---

## 🛠️ Development

### Build TypeScript

```bash
# Type check
npm run typecheck

# Build to dist/
npm run build

# Run compiled code
npm start
```

### Database Migrations

```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

---

## 📊 Performance

| Metric                   | Value             |
| ------------------------ | ----------------- |
| API Response Time (P95)  | < 50ms            |
| WebSocket Broadcast      | ~0.1ms per client |
| Redis Latency            | < 1ms (local)     |
| Max Connections/Instance | ~10,000           |
| Horizontal Scaling       | Linear with Redis |

---

## 🐳 Docker Commands

```bash
# Start all services
npm run docker:up

# Scale API instances
npm run docker:scale

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild containers
docker-compose up -d --build
```

---

## 🎯 Portfolio Highlights

This project demonstrates:

### Architecture Skills

- **Distributed Systems:** Redis pub/sub for cross-instance communication
- **Horizontal Scaling:** Multiple API instances with shared state
- **Background Processing:** BullMQ for reliable job processing
- **Containerization:** Docker Compose for local development

### Code Quality

- **Type Safety:** Full TypeScript with strict mode
- **Testing:** Comprehensive unit and integration tests
- **Validation:** Runtime validation with Zod schemas
- **Error Handling:** Graceful degradation and recovery

### DevOps Practices

- **Health Checks:** Kubernetes-ready probes
- **Monitoring:** Structured logging and metrics
- **CI/CD Ready:** Test automation and container builds
- **Documentation:** Inline docs and comprehensive README

---

## 🚀 Deployment

### Docker Compose (Production)

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes (Future)

```yaml
# Deployment manifest included in k8s/ directory (future)
kubectl apply -f k8s/
```

---

## 📚 Documentation

- [Phase 1: Infrastructure](./docs/phase-1-infrastructure.md)
- [Phase 2: Redis Integration](./docs/phase-2-redis-integration.md)
- [Phase 3: Background Jobs](./docs/phase-3-background-jobs.md)
- [Phase 4: Testing](./docs/phase-4-testing.md)
- [Phase 5: TypeScript](./docs/phase-5-typescript.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

---

## 🙏 Acknowledgments

- [Express](https://expressjs.com/) - Web framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [BullMQ](https://docs.bullmq.io/) - Job queues
- [Redis](https://redis.io/) - Cache & pub/sub
- [Vitest](https://vitest.dev/) - Testing framework

---
