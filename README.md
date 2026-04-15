# FunnelScout

FunnelScout is AI-powered sales pipeline intelligence for small GoHighLevel agencies: connect GHL, ingest opportunity events, and get weekly analysis with revenue-focused recommendations.

## Requirements

- **Node.js** 20.18+ (see `package.json` `engines`)
- **pnpm** 10.x (see `packageManager` in `package.json`)
- **Supabase** (PostgreSQL): project with connection strings in env (pooler + direct for migrations)
- **Environment variables**: [`.env.example`](.env.example) lists keys and comments

## Local setup

1. Install dependencies: `pnpm install`
2. Create **`.env.local`** from [`.env.example`](.env.example) and fill in real values for your Supabase project and integrations
3. Apply database migrations: `pnpm db:migrate` (uses `DATABASE_URL_DIRECT` from your env)
4. Start the app: `pnpm dev`, then open [http://localhost:3000](http://localhost:3000)

Background jobs use Inngest. Run `pnpm inngest:dev` in another terminal when you need the local worker.

## Common commands

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Next.js dev server       |
| `pnpm build`   | Production build         |
| `pnpm test`    | Vitest (unit/integration)|
| `pnpm db:studio` | Drizzle Kit Studio     |
| `pnpm db:seed` | Seed script              |
