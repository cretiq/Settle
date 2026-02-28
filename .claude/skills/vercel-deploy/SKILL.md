---
name: vercel-deploy
description: "Vercel deployment for Settle. Covers deploy commands, env vars, project config, production vs preview, rollback. Use when working on deploy, deployment, vercel, hosting, production, preview, environment variables, CI/CD, build, redeploy, rollback."
---

# Vercel Deployment

## Purpose
Deploy and manage the Settle app on Vercel. GitHub integration auto-deploys on push to `main`.

## When to Use
- Deploying new versions to production or preview
- Managing environment variables on Vercel
- Debugging build failures
- Rolling back deployments

## Project Config

- **Vercel project:** `settle` under `cretiqs-projects`
- **Project ID:** `prj_GsMAEnESaVSxu51QqsyaHsEAvZNn` (in `.vercel/project.json`)
- **Production URL:** https://settle-henna.vercel.app
- **Dashboard:** https://vercel.com/cretiqs-projects/settle/settings
- **Framework:** Next.js 16 (auto-detected by Vercel)
- **Build command:** `npm run build` (default)
- **No `vercel.json`** — uses defaults

## Environment Variables

Two required env vars (both `NEXT_PUBLIC_`, so client-side):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ytngvkhpfwuqeldmwhsw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `sb_publishable_qyO0FH--0PocxwI4Kp3jqg_fsLz1cdL` |

These are in `.env.local` for local dev. On Vercel, add them persistently:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```

Or pass per-deploy with `-e KEY=VALUE` flags.

## Deploy Commands

```bash
# Production deploy (from local files)
npx vercel --yes --prod

# Preview deploy (generates temporary URL)
npx vercel --yes

# List recent deployments
npx vercel ls settle

# View build logs
npx vercel inspect <deployment-url> --logs

# Rollback to previous deployment
npx vercel rollback

# Redeploy specific deployment
npx vercel redeploy <deployment-url>
```

## GitHub Integration

Connected. `cretiq/Settle` is linked via Vercel dashboard (Settings → Git). Every push to `main` triggers a production deploy. PR comments and deployment status events are enabled.

Manual CLI deploy (`npx vercel --prod`) still works as a fallback.

## Build Details

- Build uses Turbopack (`next build`)
- Middleware present at `src/middleware.ts` (Supabase session refresh) — Vercel warns it's deprecated in favor of "proxy" convention in Next.js 16
- Static pages generated: `/`, `/_not-found`
- Dynamic routes: `/[slug]`, `/api/tabs`

## Edge Cases

- **`--name` flag is deprecated** — project name comes from `.vercel/project.json` after first link
- **Env vars passed with `-e` are per-deploy only** — use `vercel env add` for persistence
- **No `vercel.json` needed** — Next.js auto-detection handles everything
