# VACTIT - Modern Full-Stack Monorepo

A production-ready monorepo built with Next.js, following MVC patterns, n-tier architecture, and microservices design.

## 🏗️ Project Structure

```
VACTIT/
├── src/                          # All source code
│   ├── apps/
│   │   └── web/                  # Next.js main application
│   │       ├── app/              # App Router pages & API routes
│   │       ├── components/       # Web-specific components
│   │       ├── lib/              # Web utilities & auth
│   │       └── hooks/            # React hooks
│   │
│   ├── packages/                 # Shared packages
│   │   ├── ui/                   # Shared React components
│   │   ├── config/               # Shared configuration & utils
│   │   └── types/                # Shared TypeScript types
│   │
│   ├── services/                 # Microservices
│   │   ├── api/                  # Optional Fastify API service
│   │   └── worker/               # BullMQ background workers
│   │
│   ├── infra/                    # Infrastructure as Code
│   │   ├── docker/               # Docker & Docker Compose
│   │   ├── k8s/                  # Kubernetes manifests
│   │   └── terraform/            # Terraform IaC
│   │
│   ├── prisma/                   # Database schema & migrations
│   │   └── schema.prisma
│   │
│   └── .github/
│       └── workflows/            # CI/CD pipelines
│
├── docs/                         # Project documentation
├── pa/                           # Project artifacts
│
└── ... (config files in root)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/endy1002/VACTIT.git
cd VACTIT

# Install dependencies for all workspaces
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Development

```bash
# Run web app
npm run dev

# Run API service (optional)
npm run dev:api

# Run worker service
npm run dev:worker

# Run all services with Docker
cd src/infra/docker
docker-compose up
```

Visit:
- **Web App**: http://localhost:3000
- **API Service**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Architecture

### N-Tier Architecture

**Presentation Layer** (`src/apps/web/app/`)
- Next.js pages and API routes
- React Server Components
- Client components

**Business Logic Layer** (`src/apps/web/lib/`, `src/services/`)
- Authentication logic
- Data validation
- Business rules

**Data Access Layer** (`src/prisma/`, `src/apps/web/lib/prisma.ts`)
- Database operations
- Redis caching
- Data models

**Service Layer** (`src/services/`)
- **API Service**: Optional REST API with Fastify
- **Worker Service**: Background jobs with BullMQ

### MVC Pattern (in Next.js context)

**Model** - `src/prisma/schema.prisma`, `src/packages/types/`
- Data structures
- Database schema
- Type definitions

**View** - `src/apps/web/app/`, `src/apps/web/components/`, `src/packages/ui/`
- React components
- Page layouts
- UI elements

**Controller** - `src/apps/web/app/api/`, `src/apps/web/lib/`
- API routes
- Server actions
- Business logic

## Docker Setup

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Build images
cd infra/docker
docker-compose build

# View logs
docker-compose logs -f
```

## Available Scripts

### Root Level
```bash
npm run dev              # Run web app
npm run dev:api          # Run API service
npm run dev:worker       # Run worker service
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run type-check       # Type check all workspaces
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
```

### Workspace-Specific
```bash
# Web app
cd src/apps/web
npm run dev
npm run build
npm run start

# API service
cd src/services/api
npm run dev
npm run start

# Worker service
cd src/services/worker
npm run dev
npm run start
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety

### Backend
- **Next.js API Routes** - Primary API
- **Fastify** - Optional standalone API
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching & job queue

### Workers
- **BullMQ** - Job queue
- **Redis** - Queue backend

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Local orchestration
- **GitHub Actions** - CI/CD
- **Kubernetes** - Production orchestration (future)
- **Terraform** - Infrastructure as Code (future)

## Authentication

Uses **NextAuth.js v5** with:
- Credentials provider
- Prisma adapter
- JWT sessions

## 📊 Database

### Schema
See `prisma/schema.prisma` for the complete schema.

### Migrations
```bash
# Create migration
npm run prisma:migrate

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

## Deployment

### Docker Deployment
```bash
# Build and push images
docker build -f src/infra/docker/Dockerfile.web -t vactit-web .
docker build -f src/infra/docker/Dockerfile.api -t vactit-api .
docker build -f src/infra/docker/Dockerfile.worker -t vactit-worker .

# Deploy with Docker Compose
cd src/infra/docker
docker-compose up -d
```

### Environment Variables
Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/vactit_db
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
```

