This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy to Vercel

1. Import repository into Vercel and link to `fubumaki/resonai`.
2. Set Framework Preset: Next.js. Build command: `pnpm build`. Output: `.next`.
3. Set Environment Variable: `NEXT_PUBLIC_APP_NAME=Resonai`.
4. Deploy. After first deploy, verify routes: `/`, `/start`, `/listen`, `/practice`.

## Local development

- Node 20.x required. Install pnpm.
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Format: `pnpm run format`

## Features

Prosody practice (statement vs question) with expressiveness meter is available in practice flows; see `docs/qa-checklist.md`.

## 🚀 Development Roadmap

**Current focus: M2 milestone**

M1 delivered the core practice loop (FSM + Warmup + Reflection + IndexedDB storage).  
We are now in **M2**, building the first full daily trainer with pitch, resonance, and prosody.

### Active Issues (M2)
- [#7](../../issues/7) feat(audio): Complete LPC worklet + F1/F2 estimation & buckets  
- [#8](../../issues/8) feat(ui): Pitch Band drill with in-band% + lateral deviation  
- [#9](../../issues/9) feat(ui): Prosody mini-phrases + expressiveness meter  
- [#10](../../issues/10) feat(reflect): Orb v2 (resonance hue + tilt shimmer) + trend chips  
- [#11](../../issues/11) chore(core): Centralize thresholds & smoothing in `constants.ts`  
- [#12](../../issues/12) feat(labs): Add `/labs/pitch` and `/labs/lpc` harness pages  
- [#13](../../issues/13) docs: Tuning guide + QA checklist  
- [#14](../../issues/14) feat(safety): Strain guardrails + lower-intensity mode  

### Where to Start
1. See [`docs/m2-issues.md`](docs/m2-issues.md) for scope, tasks, and acceptance criteria.  
2. Work on issues #7–14 in order of dependencies (start with audio worklets, then UI drills).  
3. Each issue includes references to the **handoff report** and research docs for context.  

> **Note:** All audio and storage remain local-first. Privacy and safety guardrails are non-negotiable for M2.
