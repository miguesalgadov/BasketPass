# BasketPass

SaaS platform for comprehensive basketball team management. Multi-tenant, mobile-first, built for the Latin American market.

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, Prisma, PostgreSQL, Redis
- **Payments**: MercadoPago
- **Real-time**: Socket.io
- **Storage**: Cloudflare R2 / AWS S3

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Development

```bash
# Start infrastructure
docker compose up postgres redis -d

# Install dependencies
npm install

# Set up environment variables
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edit both files with your values

# Run database migrations
cd apps/api && npx prisma migrate dev

# Start development servers
npm run dev
```

### Docker (full stack)

```bash
docker compose up --build
```

## Project Structure

```
basketpass/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Express.js backend
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   └── config/       # Shared ESLint/TS config
└── docker-compose.yml
```

## Roles

| Role | Access |
|------|--------|
| SUPER_ADMIN | Full platform access |
| CLUB_ADMIN | Full club management |
| COACH | Team, training, stats management |
| PLAYER | Own profile, calendar, stats, payments |
| PARENT | Child's profile, calendar, payments |

## Plans

| Plan | Teams | Players | Price (ARS/mo) |
|------|-------|---------|----------------|
| Free | 1 | 15 | $0 |
| Starter | 3 | 50 | $5,000 |
| Pro | 10 | 200 | $15,000 |
| Enterprise | ∞ | ∞ | $40,000 |
