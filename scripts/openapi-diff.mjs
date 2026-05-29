#!/usr/bin/env node
/**
 * Summarize changes between two OpenAPI JSON files (for docs sync reviews).
 * Usage:
 *   node scripts/openapi-diff.mjs [before.json] [after.json]
 * Defaults: api-reference/.openapi.prev.json vs api-reference/openapi.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const afterPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(root, "api-reference/openapi.json");
const beforePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "api-reference/.openapi.prev.json");

if (!fs.existsSync(beforePath)) {
  console.log(`No baseline at ${beforePath} — run sync-openapi.sh first to create one.`);
  process.exit(0);
}

const before = JSON.parse(fs.readFileSync(beforePath, "utf8"));
const after = JSON.parse(fs.readFileSync(afterPath, "utf8"));

function listOperations(spec) {
  const ops = new Map();
  for (const [p, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op || typeof op !== "object" || !op.operationId) continue;
      const key = `${method.toUpperCase()} ${p}`;
      ops.set(key, {
        operationId: op.operationId,
        summary: op.summary ?? "",
        description: op.description ?? "",
        tags: (op.tags ?? []).join(", "),
      });
    }
  }
  for (const [name, hook] of Object.entries(spec.webhooks ?? {})) {
    const op = hook.post ?? hook.get;
    if (!op) continue;
    const key = `WEBHOOK ${name}`;
    ops.set(key, {
      operationId: op.operationId ?? name,
      summary: op.summary ?? "",
      description: op.description ?? "",
      tags: (op.tags ?? []).join(", "),
    });
  }
  return ops;
}

function listSchemas(spec) {
  return new Set(Object.keys(spec.components?.schemas ?? {}));
}

const bOps = listOperations(before);
const aOps = listOperations(after);
const bSchemas = listSchemas(before);
const aSchemas = listSchemas(after);

const addedOps = [...aOps.keys()].filter((k) => !bOps.has(k));
const removedOps = [...bOps.keys()].filter((k) => !aOps.has(k));
const changedOps = [...aOps.keys()].filter((k) => {
  if (!bOps.has(k)) return false;
  const a = aOps.get(k);
  const b = bOps.get(k);
  return a.summary !== b.summary || a.description !== b.description || a.tags !== b.tags;
});

const addedSchemas = [...aSchemas].filter((s) => !bSchemas.has(s));
const removedSchemas = [...bSchemas].filter((s) => !aSchemas.has(s));

function section(title, lines) {
  if (!lines.length) return;
  console.log(`\n## ${title}\n`);
  for (const line of lines) console.log(line);
}

console.log("# OpenAPI diff\n");
console.log(`Before: ${beforePath}`);
console.log(`After:  ${afterPath}`);

section(
  "Added endpoints",
  addedOps.map((k) => `- ${k} — ${aOps.get(k).summary || aOps.get(k).operationId}`)
);
section(
  "Removed endpoints",
  removedOps.map((k) => `- ${k} — ${bOps.get(k).summary || bOps.get(k).operationId}`)
);
section(
  "Changed endpoints (summary/description/tags)",
  changedOps.map((k) => {
    const b = bOps.get(k);
    const a = aOps.get(k);
    const parts = [];
    if (b.summary !== a.summary) parts.push(`summary: "${b.summary}" → "${a.summary}"`);
    if (b.description !== a.description)
      parts.push(`description changed (${b.description.length} → ${a.description.length} chars)`);
    if (b.tags !== a.tags) parts.push(`tags: ${b.tags} → ${a.tags}`);
    return `- ${k}: ${parts.join("; ")}`;
  })
);
section("Added schemas", addedSchemas.map((s) => `- ${s}`));
section("Removed schemas", removedSchemas.map((s) => `- ${s}`));

const infoChanged =
  before.info?.title !== after.info?.title ||
  before.info?.version !== after.info?.version ||
  before.info?.description !== after.info?.description;
if (infoChanged) {
  section("Info block changed", ["- See info.title / version / description in openapi.json"]);
}

const total =
  addedOps.length +
  removedOps.length +
  changedOps.length +
  addedSchemas.length +
  removedSchemas.length +
  (infoChanged ? 1 : 0);
if (total === 0) {
  console.log("\nNo structural or text changes detected between snapshots.\n");
}

console.log("\nNext: node scripts/build-openapi-zh.mjs && mint validate\n");
