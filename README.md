# Next.js ChatGPT Clone (Gemini + Auth0 + MongoDB)

A production-focused ChatGPT-style web app built with Next.js App Router.

It supports:

- Public guest chat (ephemeral, free-tier style flow)
- Authenticated chat with persistent history
- Streaming AI responses via Gemini
- Thread list with rename/delete actions
- Responsive UI with collapsible desktop sidebar

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Auth0 (`@auth0/nextjs-auth0` v4)
- MongoDB (official Node driver)
- Google Gemini (`@google/generative-ai`)
- Tailwind CSS + shadcn/ui primitives

## Features

### Guest mode

- Accessible from `/`
- Streams responses from Gemini
- No MongoDB persistence

### Authenticated mode

- Auth flow handled by Auth0 middleware proxy
- Chat route at `/chat` and `/chat/[chatId]`
- Messages persisted in MongoDB
- Daily request limit: 30 authenticated chat requests per user (UTC day)
- Auto thread title generation on first assistant response
- Inline rename + delete from thread actions menu

### UX details

- Sidebar can collapse to logo-only state
- Minimal thread row interactions (no heavy list animation)
- New chat state reset and stable URL update behavior

## Project Structure

```text
app/
	page.tsx                         # public guest chat UI
	chat/[[...chatId]]/
		page.tsx                       # server page + data loading
		ChatClient.tsx                 # authenticated chat client UI/state
	api/chat/
		guest/route.ts                 # guest streaming endpoint
		sendMessage/route.ts           # authenticated streaming + persistence
		getChatList/route.ts
		updateTitle/route.ts
		deleteChat/route.ts
components/
	ChatSidebar/ChatSidebar.tsx      # sidebar list + rename/delete menu
	Message/Message.tsx
lib/
	auth0.ts                         # Auth0 server client
	mongodb.ts                       # MongoDB connection
proxy.ts                           # Auth0 middleware entry
```

## Environment Variables

Create `.env.local` in the project root.

Required:

```bash
# Gemini
GEMINI_API_KEY=your_gemini_api_key

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

# Auth0 (Next.js SDK v4)
AUTH0_SECRET=long_random_32_byte_min_secret
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
APP_BASE_URL=https://your-domain.com
```

Notes:

- `AUTH0_SECRET` must be a strong random secret.
- In production, set `APP_BASE_URL` to your own deployed domain.
- For local development, you can override with `APP_BASE_URL=http://localhost:3000`.
- If `APP_BASE_URL` is omitted, the app can derive base URL from request host / `VERCEL_URL`.
- Add matching callback/logout URLs in Auth0 dashboard.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm start
```

## Scripts

- `pnpm dev` — start local dev server
- `pnpm build` — production build
- `pnpm start` — run built app
- `pnpm lint` — lint checks
- `pnpm test` — run unit + integration tests (Vitest)
- `pnpm test:watch` — run tests in watch mode
- `pnpm test:e2e` — run end-to-end tests (Playwright)

## Testing

- Unit/component tests are in `__tests__/components` and `__tests__/app`.
- Integration-style route tests are in `__tests__/api`.
- E2E tests are in `e2e` and run against a local dev server.

First-time Playwright setup:

```bash
npx playwright install chromium
```

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variables from `.env.local` into Vercel Project Settings.
4. Deploy.
5. Set `APP_BASE_URL` to your production URL (for example `https://your-domain.com`) in Vercel.
6. In Auth0 Dashboard, go to `Applications` → your `Regular Web Application` → `Settings`, then update:
   - **Allowed Callback URLs**
     - `https://your-domain.com/auth/callback`
     - `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**
     - `https://your-domain.com`
     - `http://localhost:3000`
   - **Allowed Web Origins**
     - `https://your-domain.com`
     - `http://localhost:3000`
7. Save changes in Auth0 and redeploy in Vercel if env vars changed.

## Auth0 Setup Template

Use these values with your own domain:

- **Application Type**: `Regular Web Application`
- **Application Login URI** (optional):
  - `https://your-domain.com`
- **Allowed Callback URLs**:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**:
  - `https://your-domain.com`
  - `http://localhost:3000`
- **Allowed Web Origins**:
  - `https://your-domain.com`
  - `http://localhost:3000`

These values match Auth0 Next.js SDK v4 routes used in this app (`/auth/login`, `/auth/logout`, `/auth/callback`) through `proxy.ts`.

## Deploy (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add all env vars in Vercel Project Settings
4. Set `APP_BASE_URL` to your production URL
5. Update Auth0 callback/logout/web origin values to match your domain
6. Deploy

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm test`
- `pnpm test:watch`
- `pnpm test:e2e`

## Validation before shipping

```bash
pnpm test
pnpm build
```

## Notes

- Authentication routes are handled by Auth0 middleware via `proxy.ts`.
- Main persisted collection is `gpt-chat`.
- If a thread is deleted while open, client redirects back to `/chat`.
