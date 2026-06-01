#!/usr/bin/env node
/**
 * Ensure every operation with x-mint.href has metadata.title and metadata.sidebarTitle
 * (Mintlify uses the href slug for the sidebar label otherwise).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const specPath = path.join(root, "api-reference/openapi.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

let patched = 0;

function patchOperation(op) {
  if (!op || typeof op !== "object" || typeof op.summary !== "string") return;
  const mint = op["x-mint"];
  if (!mint?.href) return;

  const metadata = { ...(mint.metadata ?? {}) };
  if (!metadata.sidebarTitle) metadata.sidebarTitle = op.summary;
  if (!metadata.title) metadata.title = op.summary;

  op["x-mint"] = { ...mint, metadata };
  patched += 1;
}

for (const pathItem of Object.values(spec.paths ?? {})) {
  for (const op of Object.values(pathItem)) {
    patchOperation(op);
  }
}

fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`Patched ${patched} operation(s) in ${specPath}`);
