#!/usr/bin/env node
/**
 * Sync language tables from vmeg-web-mono into guides/supported-languages.mdx (EN + ZH).
 *
 * Usage: node scripts/generate-supported-languages.mjs [path-to-translated-language.ts]
 * Default: ../vmeg-web-mono_1/packages/core/src/constants/translated-language.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const defaultLangFile = path.join(
  root,
  "../vmeg-web-mono_1/packages/core/src/constants/translated-language.ts"
);
const defaultLabelsFile = path.join(
  root,
  "../vmeg-web-mono_1/packages/vue-related/src/views/Dashboard/hooks/useLanguages.ts"
);

const langFile = process.argv[2] || defaultLangFile;
const labelsFile = process.argv[3] || defaultLabelsFile;

function extractLabels(source) {
  const start = source.indexOf("const RAW_BASE");
  if (start === -1) return {};
  const slice = source.slice(start);
  const end = slice.indexOf("\n};");
  const block = end === -1 ? slice : slice.slice(0, end + 3);
  const labels = {};
  for (const m of block.matchAll(/"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g)) {
    labels[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return labels;
}

if (!fs.existsSync(langFile)) {
  console.error(`Missing language file: ${langFile}`);
  process.exit(1);
}

const langSource = fs.readFileSync(langFile, "utf8");

function extractMapArray(source, mapName, key) {
  const mapStart = source.indexOf(`export const ${mapName}`);
  if (mapStart === -1) throw new Error(`Missing ${mapName}`);
  const slice = source.slice(mapStart);
  const keyRe = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = slice.match(keyRe);
  if (!match) throw new Error(`Missing ${mapName}["${key}"]`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const sourceLanguages = extractMapArray(langSource, "originalLanguageMap", "2").filter(
  (code) => code !== "auto"
);
const targetLanguages = extractMapArray(langSource, "targetLanguageMap", "2");

let languageLabels = {};
if (fs.existsSync(labelsFile)) {
  languageLabels = extractLabels(fs.readFileSync(labelsFile, "utf8"));
}

function escapeCell(text) {
  return String(text).replace(/\|/g, "\\|");
}

function markdownTable(codes, codeHeader, nameHeader) {
  const lines = [
    `| ${codeHeader} | ${nameHeader} |`,
    "| --- | --- |",
    ...codes.map((code) => {
      const name = escapeCell(languageLabels[code] || code);
      return `| \`${code}\` | ${name} |`;
    }),
  ];
  return lines.join("\n");
}

const enPath = path.join(root, "guides/supported-languages.mdx");
const zhPath = path.join(root, "zh/guides/supported-languages.mdx");

const enContent = `---
title: "Supported languages"
description: "Source and target locale codes for Open API products"
icon: "globe"
---

Use **BCP-47-style locale codes** in request bodies, for example \`en-US\`, \`zh-CN\`, \`ja-JP\`.

## Source languages

Use as \`language.source\` in media translation.

${markdownTable(sourceLanguages, "Locale code", "Language")}

## Target languages

Use as \`language.target\` for TTS, text translation, and media translation.

${markdownTable(targetLanguages, "Locale code", "Language")}

## In API requests

| Field | Used by |
|-------|---------|
| \`language.source\` | Media translation |
| \`language.target\` | TTS, text translation, media translation |
| \`sampleLanguage\` | Voice clone (see [Voice clone](/guides/products/voice-clone)) |

Field types and examples: [API reference](/api-reference/introduction).
`;

const zhContent = `---
title: "支持的语言"
description: "Open API 源语言与目标语言区域代码"
icon: "globe"
---

请求体中使用 **BCP-47 风格**区域代码，例如 \`en-US\`、\`zh-CN\`、\`ja-JP\`。

## 源语言

用于音视频翻译等请求中的 \`language.source\`。

${markdownTable(sourceLanguages, "区域代码", "语言")}

## 目标语言

用于 TTS、文本翻译、音视频翻译的 \`language.target\`。

${markdownTable(targetLanguages, "区域代码", "语言")}

## 在请求中的用法

| 字段 | 使用场景 |
|------|----------|
| \`language.source\` | 音视频翻译 |
| \`language.target\` | TTS、文本翻译、音视频翻译 |
| \`sampleLanguage\` | 声音克隆（见 [声音克隆](/zh/guides/products/voice-clone)） |

字段类型与示例见 [API 参考](/zh/api-reference/introduction)。
`;

fs.writeFileSync(enPath, enContent);
fs.writeFileSync(zhPath, zhContent);

const legacySnippet = path.join(root, "snippets/SupportedLanguageLists.jsx");
if (fs.existsSync(legacySnippet)) {
  fs.unlinkSync(legacySnippet);
}
const legacyDataPath = path.join(root, "snippets/supported-languages-data.jsx");
if (fs.existsSync(legacyDataPath)) {
  fs.unlinkSync(legacyDataPath);
}

console.log(
  `Wrote ${enPath} and ${zhPath} (${sourceLanguages.length} source, ${targetLanguages.length} target)`
);
