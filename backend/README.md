# AURIXON Backend

## Foundation ✅ COMPLETE

**What I built:**
- User authentication (register, login, JWT tokens with bcrypt)
- Multi-tenant company management (CRUD operations)
- Role-based access control (RBAC: viewer, editor, company_admin, internal_admin)
- PostgreSQL database (33 tables for full ESG/Carbon tracking)
- 9 API endpoints for auth & company operations
- Error handling & security middleware (parameterized queries, JWT validation)

**Endpoints (all tested & working):**
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- POST `/api/auth/company/signup` - Create company + user
- GET `/api/auth/me` - Get current user
- GET/PUT `/api/companies/:id` - Get/update company
- GET/POST `/api/companies/:id/users` - List/invite users
- PUT/DELETE `/api/companies/:id/users/:uid` - Manage user roles

**Tech Stack:** Node.js 18+ LTS, Express 4.18+, PostgreSQL 12+, raw SQL, pg driver 8.11.3

---

## upcoming: Activities & CO2 Calculations (NEXT)

**What I'll build:**
- Activity creation/editing endpoints (stationary combustion, mobile sources, electricity, waste, etc.)
- CO2 calculation engine (GHG Protocol Scope 1, 2, 3)
- Reporting period management
- Emission factors administration
- Activity audit logging
- Analytics & reporting endpoints

**Foundation ready:** All 33 database tables exist; Phase 2 adds activity data endpoints and CO2 calculation logic.

---

## Quick Start

```bash
npm install
npm run db:init
npm start
```
Server: `http://localhost:3000`
