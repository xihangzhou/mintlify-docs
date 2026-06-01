#!/usr/bin/env node
/**
 * Add /v1 prefix to Open API paths in docs.
 *
 * - OpenAPI spec path keys: /openapi/** -> /openapi/v1/** (only if not already /openapi/vN/**)
 * - Guide MDX text: replace `/openapi/...` and `https://api.vmeg.ai/openapi/...` similarly
 *
 * Source of truth: vmeg-serv OpenApiConstants.API_VERSION_PREFIX (/openapi/v1)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const VERSION = "v1";
const PLAIN_PREFIX = "/openapi/";
const VERSIONED_PREFIX_RE = /^\/openapi\/v\d+\//;

function withV1Prefix(p) {
  if (typeof p !== "string") return p;
  if (!p.startsWith(PLAIN_PREFIX)) return p;
  if (VERSIONED_PREFIX_RE.test(p)) return p;
  return `/openapi/${VERSION}/` + p.slice(PLAIN_PREFIX.length);
}

function patchOpenApiSpec() {
  const specPath = path.join(root, "api-reference/openapi.json");
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const nextPaths = {};
  let changed = 0;
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    const nextP = withV1Prefix(p);
    if (nextP !== p) changed += 1;
    nextPaths[nextP] = item;
  }
  spec.paths = nextPaths;
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  return changed;
}

function walkFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function patchMdxFiles() {
  const dirs = [path.join(root, "guides"), path.join(root, "zh", "guides")];
  const mdxFiles = dirs.flatMap((d) => walkFiles(d)).filter((f) => f.endsWith(".mdx"));
  let touched = 0;
  for (const file of mdxFiles) {
    const raw = fs.readFileSync(file, "utf8");
    const next = raw
      // absolute URL
      .replace(/https:\/\/api\.vmeg\.ai\/openapi\/(?!v\d+\/)/g, `https://api.vmeg.ai/openapi/${VERSION}/`)
      // inline path literal
      .replace(/\/openapi\/(?!v\d+\/)/g, `/openapi/${VERSION}/`);
    if (next !== raw) {
      fs.writeFileSync(file, next);
      touched += 1;
    }
  }
  return { files: mdxFiles.length, touched };
}

const changedPaths = patchOpenApiSpec();
const mdx = patchMdxFiles();
console.log(
  `Patched OpenAPI paths: ${changedPaths} path key(s); MDX: touched ${mdx.touched}/${mdx.files} file(s).`
);

