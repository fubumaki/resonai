# Research Synthesis Workflow

## Overview
- [Interactive Phonetics UI guidelines](../design-guidelines/interactive-phonetics.md) capture how Codex-Cloud handoffs become UX-ready deliverables once summaries are accepted.
- [Codex-Cloud follow-up recommendations](../technical/codex-cloud-recommendations.md) record infra actions that spin out of the synthesis backlog.
- [Resonai audit response plan](../audit/resonai-audit-response.md) is where validated fixes and governance notes from synthesis outputs ultimately land.

## Directory layout
- `docs/research-summaries/` — checked-in per-document summaries (`*.md`) ready for review.
- `docs/research-synthesis/` — automation outputs (the master backlog plus this runbook).
- `reports/codex-cloud/manifests/` — raw manifest JSON captured from Codex-Cloud (create the directory if it does not exist yet).

## Command reference
### Render a single manifest
Run from the repo root:
```bash
pnpm exec tsx tools/codex-cloud/render-summary.ts \
  reports/codex-cloud/manifests/<slug>.json \
  docs/research-summaries/<slug>.md
```
The CLI loads the JSON manifest, folds together every nested `metadata` record, and writes a Markdown summary with YAML front matter populated from the manifest content. Leave the `output` argument blank to print the Markdown to stdout for inspection instead of writing a file.

### Batch render every manifest in a directory
```bash
for manifest in reports/codex-cloud/manifests/*.json; do
  slug=$(basename "${manifest}" .json)
  pnpm exec tsx tools/codex-cloud/render-summary.ts \
    "${manifest}" \
    "docs/research-summaries/${slug}.md"
done
```
The loop mirrors the single-manifest workflow for every JSON file and guarantees all summaries under `docs/research-summaries/` stay in sync with the latest Codex-Cloud drop.

### Validate the rendered summaries
```bash
pnpm exec vitest run tests/unit/tools/codex-cloud/render-summary.spec.ts
```
The unit suite confirms that nested `metadata` fields reach the generated front matter and that CLI writes happen atomically.

### Rebuild the master backlog
```bash
pnpm backlog:build
```
The backlog builder parses each Markdown summary, collects `key_tasks` from front matter or fenced code blocks, and regenerates `docs/research-synthesis/master-backlog.md`. Always review the diff and update `TASKS.md` manually once humans validate the backlog entries.

## File formats and naming conventions
### Input manifests (`reports/codex-cloud/manifests/*.json`)
- JSON objects may include `title`/`slug` properties plus any nested combination of `sections`, `records`, `items`, `sources`, or other collections.
- Every node can hold a `metadata` object; the renderer walks the tree, merges those objects, and emits YAML front matter.
- Keep strings trimmed and prefer arrays/objects for multi-value fields (`key_tasks`, `key_findings`, etc.).

### Research summaries (`docs/research-summaries/<slug>.md`)
- File names should match the manifest slug, e.g. `docs/research-summaries/mic-permission-audit.md`.
- Summaries are Markdown with a required YAML front matter block and an optional level-one `#` heading; the renderer adds the heading when a title exists.
- `key_tasks` can live directly in front matter or inside fenced ` ```yaml key_tasks` / ` ```json key_tasks` blocks when you need to annotate additional context.
- After Codex-Cloud renders and humans validate the file, update `TASKS.md` for any accepted backlog items so the human-owned task list stays authoritative.
