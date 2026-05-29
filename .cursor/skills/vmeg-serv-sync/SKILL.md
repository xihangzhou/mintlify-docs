---
name: vmeg-serv-sync
description: Syncs VMEG Open API docs with the vmeg-serv Git repo by recording branch HEAD commits and diffing OpenAPI-related Java changes since the last sync. Use when the user asks to sync backend, pull vmeg-serv changes, update docs from vmeg-serv, or sync a specific branch of /Users/zhouxihang/Desktop/work/vmeg-serv.
---

# vmeg-serv → docs sync

## Defaults

| Setting | Default |
|---------|---------|
| Repo | `/Users/zhouxihang/Desktop/work/vmeg-serv` |
| Branch | `main` (override per run) |
| State file | `scripts/vmeg-serv-sync-state.json` |
| Watched paths | `src/main/java/pro/vmeg/openapi` |

## Workflow

1. **Run backend commit sync** (always first):

   ```bash
   ./scripts/sync-vmeg-serv.sh [branch] [repo_path]
   ```

   Examples:

   ```bash
   ./scripts/sync-vmeg-serv.sh
   ./scripts/sync-vmeg-serv.sh release
   ./scripts/sync-vmeg-serv.sh main /Users/zhouxihang/Desktop/work/vmeg-serv
   ```

   This will:
   - `git fetch` the branch on `vmeg-serv`
   - Diff `lastSyncedCommit..HEAD` for watched paths
   - Write **`api-reference/.vmeg-serv.commit-diff.md`**
   - Update **`scripts/vmeg-serv-sync-state.json`** → `lastSyncedCommit`, `lastSyncedAt`

2. **Read** `api-reference/.vmeg-serv.commit-diff.md`. If empty or “no new commits”, stop unless the user still wants OpenAPI refresh.

3. **Pull OpenAPI spec** (requires running `vmeg-serv`):

   ```bash
   ./scripts/sync-openapi.sh http://localhost:8080
   ```

   Produces `api-reference/.openapi.diff.md` and updates `zh/api-reference/openapi.json`.

4. **Update documentation** from both diffs:
   - New/changed endpoints → English guides + `scripts/locales/*.json` + `build-openapi-i18n.mjs` for each locale
   - English OpenAPI text must stay English; backend Chinese `@Operation` → translate in `api-reference/openapi.json` before locale build

5. **Validate:**

   ```bash
   mint validate
   ```

## Changing default branch/repo

Edit `scripts/vmeg-serv-sync-state.json`, or pass branch/repo as CLI args (args override state for that run and are persisted).

## Reset sync baseline

Set `"lastSyncedCommit": null` in `scripts/vmeg-serv-sync-state.json` to treat the next run as first sync (no commit-range diff).

## Report to user

Summarize: new commit SHA, commit subject, files touched, whether OpenAPI sync ran, and which guide pages were updated.
