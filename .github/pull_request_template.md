## Summary
Provide a concise description of the change and the why.

## Owner Checklist
- [ ] A1 - SSOT regenerated or explicitly deferred with rationale
- [ ] B1 - Reset flows verified (practice session, progress meter, toasts)
- [ ] C1 - Flaky ledger inspected or flagged for follow-up
- [ ] D1 - Governance docs/tasks updated when scope changes

## Verification
- [ ] Typecheck
- [ ] ESLint
- [ ] Unit tests (`pnpm run test:unit`)
- [ ] Playwright (Firefox lane)
- [ ] SSOT reporters (`pnpm run test:unit:json && pnpm run test:e2e:json`)

<!-- Macro: comment this once CI is green -->
`@cloud ready-for-gate`
