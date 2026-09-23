---
name: nextjs-vercel
description: Build, debug, and deploy Next.js applications to Vercel with preflight checks.
---

# Next.js + Vercel

## Preflight
- `project_detect`
- inspect `package.json`, lockfile, Next config, env variable names, and `vercel.json` if present;
- install dependencies with the existing package manager;
- run lint/typecheck where configured;
- run the production build before deployment.

## Deployment
Use the structured `vercel` tool. Preview deploys can be used for validation. Production deploy requires explicit confirmation unless the permission profile is `yolo`.

If a Vercel build fails, read the remote/local build output and fix the actual failing package/module/config. Do not repeatedly redeploy unchanged code.
