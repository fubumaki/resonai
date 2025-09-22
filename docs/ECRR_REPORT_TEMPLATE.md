# ECRR Report Template

Copy this file, rename it to `docs/ECRR_REPORTS/<date>-<slug>.md`, and fill in all sections with actual data.

---

```markdown
# ECRR Report — <Feature/PR Title>

- **Date / Author**: YYYY-MM-DD — <your name/agent>
- **Scope**: <what you touched; files, flows, or user journey>

---

## Examine (facts)
- **URL/build**: <link or SHA>
- **crossOriginIsolated**: <true/false> (console evidence)
- **Mic settings**: { echoCancellation:false, noiseSuppression:false, autoGainControl:false }, sampleRate:<value>
- **Flow integrity**: warm-up -> glide -> phrase -> reflection OK? <yes/no>
- **Local data footprint**: <size/state; reset performed?>

---

## Clean (actions)
- SW/caches cleared: <yes/no>
- IndexedDB/localStorage reset: <yes/no>
- Port killed/restarted: <yes/no>
- Agent worker state: <running/stopped>, LOCK=<present/absent>
- Other cleanups: <list>

---

## Results
- **Before -> After**: <1-3 bullet points of changes or fixes>
- **Regressions**: <none or list>
- **Follow-ups**: <tickets/TODOs if any>

---

## Role
- **Who**: <ChatGPT Agent / Cursor Agent / Codex Agent / codex-local / BossCat / Human>
- **Responsibilities this cycle**: <short note>
- **Artifacts produced**: <reports, tests, code, configs>
- **Handoff notes**: <next agent or step>

---
```

---

This pairs with `docs/ECRR.md`. Together they lock in **ECRR** as both philosophy and practice.
