# Maintenance

## 🔧 Env Clean & Healthy — How to run (5 min)

Use this quick path before any PR or release:

```pwsh
# 0) Fast cleanup
pnpm run tidy

# 1) Install (lockfile is the source of truth)
pnpm i --frozen-lockfile

# 2) Build (should exit 0)
pnpm build

# 3) Optional smoke (fast, non-flaky lane)
pnpm test:smoke
```

**Acceptance criteria** (mirror in PR body):

* Tidy completes ( `== DONE ==`) 
* Install honors lockfile
* Build exits 0 (no CSP header warnings)
* (Optional) Smoke passes
*  `crossOriginIsolated === true` on / (headers wired correctly) 

> The canonical block lives at the top of RUN_AND_VERIFY.md — copy/paste its table into each PR.
