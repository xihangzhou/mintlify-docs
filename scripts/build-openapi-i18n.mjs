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

function localizeHref(href) {
  if (locale !== "zh" || typeof href !== "string") return href;
  if (href.startsWith("/zh/")) return href;
  if (href.startsWith("/api-reference/") || href.startsWith("/guides/")) {
    return `/zh${href}`;
  }
  return href;
}

function localizeXMint(mint, summary) {
  const out = { ...mint };
  if (typeof out.href === "string") {
    out.href = localizeHref(out.href);
  }
  if (typeof out.content === "string") {
    out.content = translateValue(out.content);
  }
  const metadata = { ...(out.metadata ?? {}) };
  const translatedSummary = typeof summary === "string" ? translateValue(summary) : summary;
  if (translatedSummary) {
    if (!metadata.sidebarTitle) metadata.sidebarTitle = translatedSummary;
    if (!metadata.title) metadata.title = translatedSummary;
  }
  for (const field of ["title", "sidebarTitle", "description"]) {
    if (typeof metadata[field] === "string") {
      metadata[field] = translateValue(metadata[field]);
    }
  }
  if (Object.keys(metadata).length > 0) {
    out.metadata = metadata;
  }
  return out;
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
      } else if (key === "x-mint" && value && typeof value === "object") {
        out[key] = walk(localizeXMint(value, node.summary));
      } else {
        out[key] = walk(value);
      }
    }
    return out;
  }
  return node;
}

const spec = JSON.parse(fs.readFileSync(srcPath, "utf8"));

const missing = new Set();
function collectMissing(node) {
  if (Array.isArray(node)) return node.forEach(collectMissing);
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (
        (key === "description" || key === "summary" || key === "name") &&
        typeof value === "string" &&
        !Object.prototype.hasOwnProperty.call(STRINGS, value)
      ) {
        missing.add(value);
      } else {
        collectMissing(value);
      }
    }
  }
}
collectMissing(spec);

const localized = walk(spec);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(localized, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
if (missing.size > 0) {
  console.warn(
    `Warning: ${missing.size} string(s) in OpenAPI have no entry in scripts/locales/${locale}.json`
  );
  for (const s of [...missing].sort()) {
    console.warn(`  - ${s.slice(0, 120)}${s.length > 120 ? "…" : ""}`);
  }
}
