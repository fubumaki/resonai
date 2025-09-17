# Cursor Developer Quick-Start

- Start with `docs/m2-issues.md` — those issues are scoped, acceptance-tested, and mapped to files; implement in order (LPC, Pitch Band, Prosody, Orb v2, constants, labs, docs, safety).
- Review `docs/design-guidelines/interactive-phonetics.md` to follow the shared UX patterns for pitch feedback, microphone prompts, and staged coaching before touching UI in `app/`, `components/`, `labs/`, or `coach/`.
- Use `/listen` for mic science checks and `/practice` for the FSM flow; keep latency low and never block on null F0.
- Tune thresholds only in `src/lib/constants.ts` (M2 task) so DSP + UX share one source; prefer gentle feedback over pass/fail.
- Run a mini-cohort every 2–3 weeks and validate against the acceptance criteria listed in each issue.
- Follow `docs/research-synthesis/README.md` for how Codex-Cloud prepares research artifacts; once a summary validates, a human updates `TASKS.md` so the canonical backlog stays manual.
