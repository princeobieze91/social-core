# SocialCore

Multi-user social media scheduling and publishing platform supporting Facebook and Instagram via Make.com webhook integration, and LinkedIn via direct API.

## Features

- Multi-user authentication (email/password, OAuth, Auth0)
- Workspace-based collaboration
- Scheduled post publishing with BullMQ + Redis
- AI-powered post review and optimization (Gemini)
- Meta (Facebook/Instagram) webhook integration via Make.com
- LinkedIn publishing via native API

## Tech Stack

- Frontend: React + Vite
- Backend: Express + TypeScript
- Database: Supabase (PostgreSQL)
- Queue: BullMQ + Redis
- AI: Google Gemini
- Automation: Make.com webhook

## Run Locally

**Prerequisites:** Node.js, Redis

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in required values in `.env`:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from your Supabase project)
   - `GEMINI_API_KEY` (from Google AI Studio)
   - `JWT_SECRET` (any secure random string)
   - `MAKE_WEBHOOK_URL` (your Make.com webhook URL)
   - `REDIS_URL` (default: `redis://localhost:6379`)
   - Optional: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
   - Optional: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
4. Set up Supabase database by running migrations in `migrations/`
5. Start Redis locally or via Docker:
   ```bash
   docker run -d -p 6379:6379 redis
   ```
6. Run the app:
   ```bash
   npm run dev
   ```
7. Open `http://localhost:3000`

## Deploy to Render

1. Push the repo to GitHub
2. Create a new Web Service on Render
3. Connect the repo and set:
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/server.cjs`
4. Add env vars in Render dashboard (see `.env.example` for keys)
5. Deploy

For scheduled jobs or Redis-backed BullMQ on Render, use a separate Redis instance (e.g., Render Redis or Upstash).

## Setup Make.com for Facebook/Instagram

1. In Make.com, create a new scenario and add a **Custom webhook** trigger
2. Copy the webhook URL into `MAKE_WEBHOOK_URL` in your environment
3. Add **Facebook Pages** module and create a connection to your Business Page
4. Map webhook data to the post fields
5. Save and activate the scenario

## Project Structure

- `server.ts` — Express API routes, Vite middleware, startup
- `src/db.ts` — Supabase database operations
- `src/workers/publisher.ts` — Platform-specific publishing logic
- `src/workers/queue.ts` — BullMQ queue and worker
- `src/workers/scheduler.ts` — Periodic scan for due posts
- `src/api.ts` — Frontend API helpers
- `src/oauth/` — OAuth flows for Facebook and LinkedIn

## License

MIT