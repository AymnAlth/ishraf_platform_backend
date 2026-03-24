# Ishraf Platform Backend

Modular monolith backend scaffold built with Node.js, TypeScript, Express, PostgreSQL, and a SQL-first data layer.

## Stack

- Node.js 24
- TypeScript
- Express
- PostgreSQL
- `pg`
- `node-pg-migrate`
- `zod`
- `pino`
- `vitest`

## Quick Start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and adjust the values.

   Important:
   `DATABASE_SCHEMA` defaults to `eshraf` for the live application schema.
   For the test database use `.env.test` or `.env.test.example`.

3. Run migrations:

   ```bash
   pnpm db:migrate
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

## Available Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:db:bootstrap`
- `pnpm test:db:reset`
- `pnpm db:migrate`
- `pnpm db:migrate:down`
- `pnpm deploy:bootstrap-admin`
- `pnpm deploy:smoke`

## Deployment and Staging

The recommended Wave 1 staging deployment target is:

- Render Web Service
- Neon Postgres

Deployment references:

- `src/docs/DEPLOY_RENDER_NEON.md`
- `.env.render.example`
- `render.yaml`

Operational defaults for hosted staging:

- `NODE_ENV=production`
- `DATABASE_SCHEMA=public`
- `TRUST_PROXY=true`
- `AUTH_EXPOSE_RESET_TOKEN_IN_RESPONSE=false`
- health check path: `/health/ready`

Important:

- `GET /health` is liveness only
- `GET /health/ready` checks database readiness
- migrations should run against `DATABASE_URL_MIGRATIONS` when present
- the first hosted admin account should be created with `pnpm deploy:bootstrap-admin`

## Integration Test Safety

Integration tests and test database reset commands are destructive. They target a
dedicated PostgreSQL test database only.

The project now includes a committed `.env.test` with a test-only configuration.
The default test target is:

- database: `ishraf_platform_test`
- schema: `public`

Destructive helpers refuse to run unless:

- `NODE_ENV=test`
- the database name clearly looks like a test database
- the schema is `public`

This prevents accidental execution against the live `eshraf` schema.

Integration tests still require an explicit opt-in, but the project now wires it
through the script itself so you do not need to export shell variables manually:

```bash
pnpm test:integration
```

These commands load `.env.test` automatically:

```bash
pnpm test:db:bootstrap
pnpm test:db:reset
pnpm test:integration
```

If you need a clean template for tests instead of the local file, use:

```text
.env.test.example
```

The reset strategy is `TRUNCATE + RESEED` before every integration test. This keeps
fixtures predictable and prevents data leakage between tests.

## Current Wave 1 Status

The backend is currently a production-oriented `modular monolith` for Wave 1, not a microservices split.

Frontend-ready operational modules now include:

- `auth`
- `users`
- `academic-structure`
- `students`
- `attendance`
- `assessments`
- `behavior`
- `transport`
- `communication`
- `reporting`
- `homework`

The backend-authoritative handoff document for the frontend team is:

- `src/docs/BACKEND_WAVE1_STATUS.md`

## Auth API

The current auth surface implements:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/me`

OpenAPI and Postman files are available under `src/docs/`.

## Documentation Map

- Backend handoff: `src/docs/BACKEND_WAVE1_STATUS.md`
- API reference: `src/docs/API_REFERENCE.md`
- Deployment guide: `src/docs/DEPLOY_RENDER_NEON.md`
- Legacy alignment note: `src/docs/LEGACY_DOC_ALIGNMENT.md`
