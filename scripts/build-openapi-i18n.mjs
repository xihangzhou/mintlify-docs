#!/usr/bin/env node
/**
 * Build localized OpenAPI from api-reference/openapi.json.
 * Usage: node scripts/build-openapi-i18n.mjs <locale>
 * Example: node scripts/build-openapi-i18n.mjs zh
 *
 * Requires scripts/locales/<locale>.json (en -> target string map).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const locale = process.argv[2];
if (!locale) {
  console.error("Usage: node scripts/build-openapi-i18n.mjs <locale>");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(root, "api-reference/openapi.json");
const localePath = path.join(root, "scripts/locales", `${locale}.json`);
const outPath = path.join(root, locale, "api-reference/openapi.json");

if (!fs.existsSync(localePath)) {
  console.error(`Missing translation map: ${localePath}`);
  console.error("Create it with English keys and translated values before running.");
  process.exit(1);
}

const STRINGS = JSON.parse(fs.readFileSync(localePath, "utf8"));

function translateValue(value) {
  if (typeof value !== "string") return value;
  return Object.prototype.hasOwnProperty.call(STRINGS, value) ? STRINGS[value] : value;
}

function walk(node) {
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "description" || key === "summary" || key === "name") {
        out[key] = translateValue(value);
      } else if (key === "tags" && Array.isArray(value)) {
        out[key] = value.map(translateValue);
      } else {
        out[key] = walk(value);
      }
    }
    return out;
  }
  return node;
}

const spec = JSON.parse(fs.readFileSync(srcPath, "utf8"));
spec.info.description = translateValue(spec.info.description);

const localized = walk(spec);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(localized, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
