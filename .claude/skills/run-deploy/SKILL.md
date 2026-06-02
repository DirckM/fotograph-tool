---
name: run-deploy
description: Run, build, test and deploy Fotograph Tool. Use when the user wants to start the dev server, build, run tests, lint, or deploy this project, or asks how to run or ship it.
---

# Run & Deploy — Fotograph Tool

AI photography studio dashboard (Next.js app) where photographers compose hyper-realistic images from six modular elements: model, environment, pose, garments, composition, and lighting.

## Stack
- Framework: Next.js 16 (App Router), React 19, TypeScript
- Styling: Tailwind CSS v4, shadcn / Base UI components
- Backend: Supabase (auth, database, storage); Gemini + OpenAI SDKs; Pinterest API
- Package manager: npm (a `package-lock.json` is present)
- Hosting target: not yet wired — no `.vercel/` directory, no `vercel.json`, and no registry `project.md` entry exist. Vercel is the natural target for a Next.js app but the project is not linked.

## Local development
```bash
npm install
npm run dev
```
Dev server runs at http://localhost:3000.

## Build & production
```bash
npm run build
npm run start
```
`start` serves the production build at http://localhost:3000.

## Tests & lint
```bash
npm run lint              # ESLint
npm run test:model        # node scripts/test-model-flow.mjs (loads .env.local)
npm run test:screenshot   # node scripts/screenshot.mjs (loads .env.local)
```
No unit-test framework is configured; the `test:*` scripts are flow/screenshot harnesses and read `.env.local`.

## Deploy
Not yet wired. There is no `.vercel/` directory and no `vercel.json`, so the project is not linked to Vercel, and there is no registry `project.md` entry naming a hosting tool. To deploy to Vercel, link and deploy in one step:
```bash
export PATH="$HOME/.local/bin:$PATH"
vercel --prod --yes
```
This will create the Vercel project link on first run. Production env vars (see below) must be set in the Vercel project afterward.

## Environment variables
No `.env.example` file exists. The following keys are read by the code (set them in `.env.local` for development):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (also drives the `next.config.ts` image remote pattern)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key for client-side auth/queries
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key for server-side privileged operations
- `GEMINI_API_KEY` — Google Gemini API key for generation calls
- `PINTEREST_ACCESS_TOKEN` — Pinterest API token for asset import

`supabase-schema.sql` in the project root defines the database schema to apply to the Supabase project.

## Gotchas
- This is Next.js 16 — APIs and conventions differ from older versions. Check `node_modules/next/dist/docs/` before writing framework code.
- The `Training Images/` directory (~6.2 GB of client photos) is git-ignored and lives on the RunPod volume, not in the repo.
- The generation pipeline itself (ComfyUI / SDXL workflows on RunPod, pod resume + SSH, the editorial LoRAs, and kohya LoRA training) is covered by the separate global **fotograph-pipeline** skill. Use that skill for anything involving the ComfyUI workflows, the RunPod pod, or LoRA training — this skill only covers running, building, and deploying the Next.js app itself. See also `docs/comfyui-runpod-setup.md`.
