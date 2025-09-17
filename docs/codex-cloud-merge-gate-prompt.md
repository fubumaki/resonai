# Codex-Cloud Merge Gate Prompt

Codex-Cloud owns the merge gate for infrastructure and CI guardrails. This prompt block keeps the
assistant grounded in the SSOT artefacts the repository already publishes so every merge decision
repeats the same facts humans see in `RUN_AND_VERIFY.md` and `.artifacts/SSOT.md`.

## CI data sources

- `RUN_AND_VERIFY.md` — top section mirrors the SSOT summary and is the quickest way to view the
  most recent CI snapshot during review.【F:RUN_AND_VERIFY.md†L5-L21】
- `.artifacts/SSOT.md` — canonical markdown emitted by `scripts/ci-summary.ts`; it exposes the same
  commit metadata and suite totals Codex-Cloud can quote inside the prompt without re-running the
  reporters.【F:.artifacts/SSOT.md†L1-L16】【F:scripts/ci-summary.ts†L90-L115】

Both files expose identical columns, so do not expect richer metrics (coverage, regression deltas,
flake rates per spec, etc.) unless the SSOT generator is extended.

## Fields surfaced today

Use only the values the artefacts provide right now:

1. **Last green commit** — `RUN_AND_VERIFY.md` and `.artifacts/SSOT.md` either show the latest green
   short SHA with UTC timestamp or the placeholder `_pending — current run has failures (...)_` when
   suites are still red.【F:RUN_AND_VERIFY.md†L5-L12】【F:.artifacts/SSOT.md†L3-L9】
2. **Current commit** — appears when failures exist so Codex-Cloud can call out the SHA under
   investigation.【F:RUN_AND_VERIFY.md†L5-L12】【F:.artifacts/SSOT.md†L3-L9】
3. **Generated timestamp** — UTC timestamp stamped by the SSOT summary to ground when the snapshot
   was produced.【F:RUN_AND_VERIFY.md†L6-L8】【F:.artifacts/SSOT.md†L5-L9】
4. **Suite totals table** — per-suite counts for Vitest and Playwright (Firefox) including Passed,
   Failed, Skipped, Flaky, and Duration values.【F:RUN_AND_VERIFY.md†L9-L21】【F:.artifacts/SSOT.md†L9-L16】
5. **Flakiest specs** — optional list sourced from the SSOT artefact; empty when no flakes were
   detected.【F:.artifacts/SSOT.md†L12-L17】

Do not promise coverage %, regression stats, or other metrics until the SSOT pipeline exports them.

## Prompt block

Embed the following reference text inside the merge-gate system prompt so the assistant repeats only
observable facts:

```markdown
## CI snapshot (source: RUN_AND_VERIFY.md / .artifacts/SSOT.md)
- Last green commit: <value from SSOT>
- Current commit: <value when failures exist>
- Generated: <UTC timestamp from SSOT>
- Suites:
  | Suite | Passed | Failed | Skipped | Flaky | Duration |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | Vitest | <passed> | <failed> | <skipped> | <flaky> | <duration> |
  | Playwright (firefox) | <passed> | <failed> | <skipped> | <flaky> | <duration> |
- Flakiest specs: <list from SSOT, or “_No flaky specs detected._”>
```

If a richer gate needs run-by-run analytics or stability budgets, extend
`scripts/ci-summary.ts` first so the SSOT markdown carries those values, then update this prompt block
and `RUN_AND_VERIFY.md` together in the same PR.
