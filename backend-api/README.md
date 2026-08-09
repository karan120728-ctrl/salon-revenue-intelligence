# Marlowe & Rose — Backend API

Fastify + TypeScript + Prisma + MySQL API for the Salon Revenue Intelligence platform.

## Setup

### 1. Prerequisites
- Node.js 18+
- MySQL 8+ running locally

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your MySQL credentials:
```
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/salon_intelligence"
JWT_SECRET="a-very-long-random-string"
```

### 4. Create the database
Open MySQL and run:
```sql
CREATE DATABASE salon_intelligence;
```

### 5. Run migrations
```bash
npm run db:migrate
```

### 6. Seed demo data
```bash
npm run db:seed
```
This creates the demo salon with login: `sarah@marloweandrose.co.uk` / `demo1234`

### 7. Start the dev server
```bash
npm run dev
```
Server starts on **http://localhost:3001**

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | ❌ | Create new salon account |
| POST | `/auth/login` | ❌ | Login and receive JWT token |
| GET | `/auth/me` | ✅ | Get current user info |
| GET | `/api/dashboard` | ✅ | KPIs, revenue chart, briefing data |
| GET | `/api/retention` | ✅ | Customer churn risk data |
| GET | `/api/noshow` | ✅ | Today's no-show risk scores |
| GET | `/api/staff` | ✅ | Staff performance metrics |
| GET | `/api/leak` | ✅ | Revenue leak analysis |
| GET | `/api/inventory` | ✅ | Stock levels and alerts |
| PATCH | `/api/inventory/:id` | ✅ | Update stock level |
| GET | `/health` | ❌ | Server health check |

> **Auth**: Protected routes require `Authorization: Bearer <token>` header.

## Business Logic (how the numbers are calculated)

This API is designed so **all analytics are computed from real database records**, not AI. AI only comes later to *explain* these numbers.

- **Churn risk**: Calculated from days overdue since expected return visit
- **No-show risk**: Rule-based scoring (past no-show rate, day of week, time of day)
- **Revenue leak**: Aggregated from actual NO_SHOW and CANCELLED appointment records
- **Staff utilisation**: Completed appointment ratio vs scheduled
- **Return rate**: Customers with >1 visit in 90 days
