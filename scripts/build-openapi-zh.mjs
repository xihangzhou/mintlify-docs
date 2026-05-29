#!/usr/bin/env node
/** @deprecated Use: node scripts/build-openapi-i18n.mjs zh */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "build-openapi-i18n.mjs");
const r = spawnSync(process.execPath, [script, "zh"], { stdio: "inherit" });
process.exit(r.status ?? 1);
