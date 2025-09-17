# Lane Acceptance Criteria

This document enumerates the merge gates for the automated lanes referenced by the governance prompt. Each lane has a narrow mission, a branch naming convention, and a non-negotiable checklist that must be satisfied before merge.

## Lane Overview

| Lane | Alias | Mission | Branch Prefix | Typical Evidence |
| --- | --- | --- | --- | --- |
| A1 | SSOT refresh | Keep CI single-source-of-truth artefacts current. | `agent/ssot-*` | Updated `.artifacts/SSOT.md`, refreshed `RUN_AND_VERIFY.md` header, JSON reports. |
| B1 | Flake control | Quarantine or fix flaky specs without regressing reset/audio invariants. | `agent/flaky-*` | Playwright retries, reset script notes, audio health assertions. |
| C1 | Stability hardening | Toggle stability-lane settings and guard CI budgets. | `agent/stability-*` | `QUALITY-GATES/budgets.json` diff rationale, feature flag tables, soak results. |
| D1 | Docs sync | Align governance, runbooks, and task copy with the latest behaviour. | `agent/docs-*` | Updated checklists, decision logs, changelog excerpts. |

---

## A1 — SSOT Refresh

**Scope**: Runs that regenerate CI artefacts or update the authoritative status summary.

**Acceptance checklist**:

- [ ] `.artifacts/SSOT.md` regenerated from the latest JSON artefacts (commit hash and timestamps match `RUN_AND_VERIFY.md`).
- [ ] `RUN_AND_VERIFY.md` top block updated with current "Last green commit" and suite tallies.
- [ ] `reports/unit.json`, `reports/e2e.json`, and any other JSON reporters checked in or attached as artefacts are refreshed from the same run.
- [ ] `tools/self_improve/signals.json` or other derived SSOT files diffed and reconciled, or an explicit "no change" note left in the PR description.
- [ ] Verification commands logged in the PR (`pnpm run test:unit:json`, `pnpm run test:e2e:json`, `pnpm exec tsx scripts/ci-summary.ts`).

**Fail-fast triggers**:

- Do not merge if any suite shows new failures without an accompanying issue link and owner assignment.
- Abort if SSOT timestamps conflict across files (indicates mixed artefact sources).

---

## B1 — Flake Control & Reset/Audio Invariants

**Scope**: Stabilising flaky Playwright/Vitest specs, quarantining unstable flows, and ensuring deterministic resets for audio-heavy paths.

**Acceptance checklist**:

- [ ] Root cause or quarantine rationale documented, including reproduction steps and failure frequency (link to CI run or trace).
- [ ] Reset invariants validated: app/device resets leave IndexedDB, localStorage, and feature flags in the expected baseline state. Document the reset command or helper used (`scripts/reset-local-state.ts`, `page.evaluate(() => window.__appReset())`, etc.).
- [ ] Audio invariants preserved: microphone permission prompts, worklet initialisation, and audio context lifecycles behave identically before and after the change (note manual verification or automated assertion added).
- [ ] Flaky tests either stabilised (showing green reruns) or quarantined with a TODO/issue ID and SSOT updated to reflect the skipped coverage.
- [ ] Any SSOT touchpoints (e.g., marking tests flaky) mirrored in `.artifacts/SSOT.md` and `RUN_AND_VERIFY.md` with updated flake annotations.

**Fail-fast triggers**:

- Do not skip or quarantine a test without linking to the tracking issue and updating the SSOT lane.
- Roll back if audio smoke tests (`playwright/tests/mic_flow.spec.ts`, `playwright/tests/smoke.spec.ts`) regress.

---

## C1 — Stability Hardening

**Scope**: Adjusting stability-lane settings, CI budgets, environment knobs, or other guardrails that affect run-to-run determinism.

**Acceptance checklist**:

- [ ] Proposed changes to `QUALITY-GATES/budgets.json`, Playwright/Vitest timeouts, or agent job budgets documented alongside rationale and expected impact.
- [ ] Stability toggles (feature flags, retry counts, worker concurrency) captured in a before/after table inside the PR description or linked doc.
- [ ] Proof of stability: attach soak test evidence (multiple CI runs or local loops) showing the new settings reduce flake without increasing failures elsewhere.
- [ ] Reset/audio invariants re-verified when toggling stability settings that touch rehearsal flows (link to B1 checklist results if reused).
- [ ] Rollback plan noted for any non-trivial change (which file to revert, which env var to reset).

**Fail-fast triggers**:

- Abort merge if budgets would permit new failures (never raise thresholds without written lead approval).
- Postpone if stability toggles introduce new quarantines without B1 coordination.

---

## D1 — Documentation Sync

**Scope**: Keeping governance, runbooks, templates, and prompts aligned with shipped behaviour.

**Acceptance checklist**:

- [ ] Updated documents cross-linked in `TASKS.md`, `RUN_AND_VERIFY.md`, or relevant runbooks so new guidance is discoverable.
- [ ] SSOT references (commands, artefact names, owners) validated against the current repo structure; outdated paths removed.
- [ ] Any procedural change reflected in the PR template (`PR_TEMPLATE.md`) or QA materials (`QA_PLAYBOOK.md`, `QA_SNAPSHOT_TEMPLATE.md`) when applicable.
- [ ] Changelog/governance diffs summarised in the PR description with a "Docs updated" checkbox ticked.
- [ ] Screenshots or tables regenerated when copy changes affect UI/UX documentation (attach updated assets or note "no visual change").

**Fail-fast triggers**:

- Do not merge docs-only PRs that contradict the active SSOT lane or omit links for new checklists.
- Escalate if documentation changes require follow-up tasks—open items in `TASKS.md` before merge.

---

## Shared Expectations

These apply to every lane:

- Maintain lane discipline: one active PR per lane to keep review focused.
- Reference this document from PR descriptions so reviewers can trace checklist completion.
- Update `.agent/state.json` or queue metadata only via the automation scripts—manual edits must be justified.
- When in doubt, pause and consult the lead; governance is only effective when the lanes stay predictable.
