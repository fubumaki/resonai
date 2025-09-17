# Resonai Maintenance Worker

This directory contains the configuration and scripts for the automated maintenance worker that keeps the Resonai codebase healthy.

## Files

- `config.json` - Worker configuration with budgets, maintenance cycles, and safety settings
- `state.json` - Current worker state (last run, budgets, failures, etc.)
- `agent_queue.json` - Job queue for maintenance tasks
- `LOCK` - Kill switch file (create this to pause the worker)

## Maintenance Cycles

The worker runs through these cycles in order:

1. **Refresh SSOT** - Updates `.artifacts/SSOT.md` and `RUN_AND_VERIFY.md`
2. **Quarantine Flaky Tests** - Tags flaky tests with `@flaky` and moves to nightly runs
3. **Enforce Selectors** - Adds missing `data-testid` attributes and ARIA live regions
4. **Fix CSP/A11y Drift** - Removes inline styles and `dangerouslySetInnerHTML`
5. **Lint & Format** - Runs ESLint --fix and Prettier on small batches
6. **Prune Unused Code** - Removes unused variables, imports, and functions
7. **Sync Governance** - Updates documentation to reflect current state

## Budgets

Each cycle respects these limits:
- **Max Jobs**: 2 per cycle
- **Max Files**: 10 per cycle  
- **Max Lines**: 200 per cycle

## Safety

- **Kill Switch**: Create `.agent/LOCK` to pause the worker
- **Backoff**: Automatic backoff after consecutive failures
- **Clean Working Dir**: Requires clean git state before running

## Usage

```bash
# Run maintenance cycle
npm run maintenance:run

# Check worker status
cat .agent/state.json

# Pause worker
touch .agent/LOCK

# Resume worker
rm .agent/LOCK
```

## Monitoring

The worker logs its activities and maintains state in `.agent/state.json`. Check this file to see:
- Last run timestamp
- Current cycle number
- Budget usage
- Consecutive failures
- Job history

## Troubleshooting

If the worker gets stuck or behaves unexpectedly:
1. Check `.agent/LOCK` exists (worker is paused)
2. Review `.agent/state.json` for error details
3. Check git status for uncommitted changes
4. Verify all required scripts exist in `package.json`
