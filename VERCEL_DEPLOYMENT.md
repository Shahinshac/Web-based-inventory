# Vercel Deployment Guide

**Short answer:** Use Vercel for the **frontend only** (recommended). Host the backend (Express + MongoDB) on Render/Railway/Heroku or a managed MongoDB Atlas + Node host.

## Why Vercel is for the frontend here ✅
- This project uses a Node/Express backend with MongoDB (not Flask/SQLite). The backend is stateful and requires persistent DB connections, so running it on Vercel's serverless functions is not recommended unless you refactor the API.
- Vercel excels at static sites and SPAs built with Vite/React (this repo's frontend lives in `web-app/client`).

## Deploy the Frontend to Vercel (step-by-step) 🔧
1. Push your repository to GitHub.
2. Go to https://vercel.com and sign in.
3. Click **Add New** → **Project** → Import your GitHub repo.
4. Set **Root Directory** to `web-app/client`.
5. Vercel will detect **Vite**. Confirm these settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variables in Vercel Project Settings → Environment Variables:
   - `VITE_API_URL` → `https://your-backend-url` (your Render or other backend URL)
   - (Optional) `VITE_ADMIN_PASSWORD` → local admin fallback (NOT for production)
7. Deploy and wait for the build to finish. Your site will be at `https://<project>.vercel.app`.

## Important Vercel config notes 🔍
- The repo contains `web-app/client/vercel.json` which now includes a `routes` entry with `{ "handle": "filesystem" }` followed by a catch-all that serves `index.html`. This ensures static assets are served directly and SPA routing works.
- Service worker (`/sw.js`) and `offline.html` live in `public/` — they will be deployed as static assets. Make sure `sw.js` cache headers are configured (the project already adds cache headers in `vercel.json`).
- During the build, Vite replaces `import.meta.env.VITE_API_URL` with the value from Vercel's environment variables. Ensure `VITE_API_URL` is set in Vercel for both Preview and Production environments.

## Backend recommendations (best practice) 🧭
- Deploy the backend to Render/Railway and use MongoDB Atlas for persistence:
  - Backend root: `web-app/server`
  - Add required env vars: `MONGODB_URI`, `DB_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT=4000`, `NODE_ENV=production`.
- If you must use Vercel for the API, refactor the Express server into serverless functions and use a managed DB (Vercel Postgres or external MongoDB), but note this requires substantial changes.

## Troubleshooting tips ⚠️
- Build failures: check the Vercel build logs and ensure Node.js version is compatible (Node 18+ recommended).
- Missing assets or broken SPA routing: ensure `vercel.json` contains the `filesystem` handler and a catch-all route to `index.html` (this repo already has that fix).
- API calls failing: verify `VITE_API_URL` matches your backend and CORS is enabled on the backend.

## Conclusion ✅
- Use Vercel for frontend deployment (`web-app/client`) — this is the simplest and most reliable path.
- Host the backend (Express + MongoDB) on a server with persistent storage (Render/Railway/Heroku/MongoDB Atlas).

If you want, I can:
1. Double-check `vercel.json` and test a production build locally, and
2. Add a short checklist to `DEPLOYMENT.md` showing exact Vercel env var names and verification steps.

---

