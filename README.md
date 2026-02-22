# Desi Converter

**All-in-One Document & Media Processing Platform**

A production-ready SaaS platform for PDF manipulation, image compression, and AI-powered media conversion. Built with Next.js, NestJS, and Docker.

## Quick Start with Docker

### Prerequisites
- Docker Desktop (must be running)

### Start the Application

```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### Access Points
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Docs | http://localhost:4000/docs |
| MinIO Console | http://localhost:9001 |

### Default Credentials
- **MinIO**: minioadmin / minioadmin

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Next.js   │────▶│   NestJS    │
│             │     │   :3000     │     │   :4000     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                   ┌──────────┐          ┌──────────┐          ┌──────────┐
                   │PostgreSQL│          │  Redis   │          │  MinIO   │
                   │  :5432   │          │  :6379   │          │  :9000   │
                   └──────────┘          └──────────┘          └──────────┘
                                               │
                                               ▼
                                        ┌──────────┐
                                        │  Worker  │
                                        │ (pdf-lib)│
                                        └──────────┘
```

## Sprint 1 Features

### ✅ Implemented
- [x] Docker-first architecture with all services containerized
- [x] User authentication (email/password + JWT)
- [x] File upload to MinIO storage (25MB limit)
- [x] Job queue system with Redis + BullMQ
- [x] PDF Merge tool (end-to-end working)
- [x] File reorder UI
- [x] Job status polling
- [x] Secure file download URLs

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/files/upload` | Upload file |
| POST | `/api/files/upload-multiple` | Upload multiple |
| GET | `/api/files/:id/download` | Download URL |
| POST | `/api/tools/merge` | Merge PDFs |
| GET | `/api/jobs/:id` | Job status |

## Project Structure

```
desi-converter/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # NestJS backend
├── workers/
│   └── pdf-processor/    # PDF merge worker
├── packages/
│   ├── prisma/           # Database schema
│   └── shared/           # Shared types
├── infra/
│   └── docker/           # Dockerfiles
└── docker-compose.yml    # All services
```

## Development Commands

```bash
# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart api

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild a specific service
docker-compose up --build api
```

## Environment Variables

See `.env.example` for all configuration options.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: NestJS, TypeScript, Prisma
- **Queue**: Redis + BullMQ
- **Storage**: MinIO (S3-compatible)
- **PDF Processing**: pdf-lib
- **Database**: PostgreSQL
