#!/usr/bin/env bash
# Fetch latest commit on a vmeg-serv branch, diff since last recorded sync, update state.
# Usage:
#   ./scripts/sync-vmeg-serv.sh [branch] [repo_path]
# Example:
#   ./scripts/sync-vmeg-serv.sh release
#   ./scripts/sync-vmeg-serv.sh main /Users/zhouxihang/Desktop/work/vmeg-serv
#
# Output: api-reference/.vmeg-serv.commit-diff.md (for agent / review)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_FILE="${ROOT}/scripts/vmeg-serv-sync-state.json"
DIFF_MD="${ROOT}/api-reference/.vmeg-serv.commit-diff.md"
BRANCH_ARG="${1:-}"
REPO_ARG="${2:-}"

node <<'NODE' "${STATE_FILE}" "${DIFF_MD}" "${BRANCH_ARG}" "${REPO_ARG}"
const fs = require("fs");
const { execSync } = require("child_process");

const [statePath, diffPath, branchArg, repoArg] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

const repo = repoArg || state.repo;
const branch = branchArg || state.branch;
const watchPaths = state.watchPaths?.length ? state.watchPaths : ["src/main/java/pro/vmeg/openapi"];

function sh(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

if (!fs.existsSync(repo) || !fs.existsSync(`${repo}/.git`)) {
  console.error(`Not a git repo: ${repo}`);
  process.exit(1);
}

sh("git fetch origin --prune", repo);

let remoteRef = `origin/${branch}`;
try {
  sh(`git rev-parse --verify ${remoteRef}`, repo);
} catch {
  remoteRef = branch;
  sh(`git rev-parse --verify ${remoteRef}`, repo);
}

const newCommit = sh(`git rev-parse ${remoteRef}`, repo);
const newSubject = sh(`git log -1 --format=%s ${newCommit}`, repo);
const newDate = sh(`git log -1 --format=%cI ${newCommit}`, repo);
const prevCommit = state.lastSyncedCommit;

const pathArgs = watchPaths.map((p) => `"${p}"`).join(" ");

let body = `# vmeg-serv sync diff\n\n`;
body += `- **Repo:** \`${repo}\`\n`;
body += `- **Branch:** \`${branch}\` (\`${remoteRef}\`)\n`;
body += `- **New HEAD:** \`${newCommit}\`\n`;
body += `- **Commit message:** ${newSubject}\n`;
body += `- **Commit date:** ${newDate}\n`;

if (prevCommit) {
  body += `- **Previous synced commit:** \`${prevCommit}\`\n\n`;
  if (prevCommit === newCommit) {
    body += `No new commits since last sync.\n`;
  } else {
    body += `## Commits (${prevCommit.slice(0, 7)}..${newCommit.slice(0, 7)})\n\n`;
    body += "```\n";
    body += sh(
      `git log --oneline ${prevCommit}..${newCommit} -- ${watchPaths.join(" ")}`,
      repo
    );
    body += "\n```\n\n";
    body += `## File diff (OpenAPI-related paths)\n\n`;
    body += "```diff\n";
    try {
      body += sh(
        `git diff ${prevCommit}..${newCommit} -- ${watchPaths.join(" ")}`,
        repo
      );
    } catch (e) {
      body += "(no diff or diff too large — run git diff locally)\n";
    }
    body += "\n```\n";
  }
} else {
  body += `- **Previous synced commit:** _(none — first sync)_\n\n`;
  body += `## Latest commit touching watched paths\n\n`;
  body += "```\n";
  body += sh(
    `git log -5 --oneline ${newCommit} -- ${watchPaths.join(" ")}`,
    repo
  );
  body += "\n```\n";
}

body += `\n## Next steps (docs repo)\n\n`;
body += `1. If \`vmeg-serv\` is running locally, pull OpenAPI into docs:\n`;
body += `   \`./scripts/sync-openapi.sh http://localhost:8080\`\n`;
body += `2. Read \`api-reference/.openapi.diff.md\` after OpenAPI sync.\n`;
body += `3. Update guides (en + zh) if behavior changed; run \`mint validate\`.\n`;

fs.mkdirSync(require("path").dirname(diffPath), { recursive: true });
fs.writeFileSync(diffPath, body);

const nextState = {
  ...state,
  repo,
  branch,
  lastSyncedCommit: newCommit,
  lastSyncedAt: new Date().toISOString(),
};
fs.writeFileSync(statePath, JSON.stringify(nextState, null, 2) + "\n");

console.log(`Recorded sync at ${newCommit}`);
console.log(`Wrote ${diffPath}`);
NODE
