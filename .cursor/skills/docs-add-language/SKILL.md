---
name: docs-add-language
description: Adds one or more Mintlify locales to VMEG Open API docs by copying English structure, translating guides, configuring docs.json navigation, and generating localized OpenAPI specs. Use when the user asks to add a language, locale, i18n, Japanese, German, or expand multilingual support.
---

# Add new documentation language(s)

## Prerequisites

- Read `config/i18n-manifest.json` for page list and Mintlify language codes.
- Read current `docs.json` → `navigation.languages` (copy `en` block as template).

## Per new locale (e.g. `ja`, `de`, `ko`)

### 1. Choose Mintlify `language` code

Must be supported by Mintlify (see manifest `mintlifyLanguageCodes`). Use `zh` or `zh-Hans` for Simplified Chinese — do not duplicate an existing entry.

### 2. Create guide files

For each path in `config/i18n-manifest.json` → `sourcePages`:

| English | New locale |
|---------|------------|
| `index.mdx` | `{locale}/index.mdx` |
| `guides/quickstart.mdx` | `{locale}/guides/quickstart.mdx` |
| … | … |
| `api-reference/introduction.mdx` | `{locale}/api-reference/introduction.mdx` |

- Copy English file as structural base.
- Translate `title`, `description`, body, tab labels in prose.
- Keep code samples, HTTP paths, JSON field names in English.
- Fix internal links: `/{locale}/guides/...`

### 3. Localized OpenAPI

```bash
# Create scripts/locales/<locale>.json — all keys from English openapi strings, values translated
node scripts/build-openapi-i18n.mjs <locale>
```

Output: `{locale}/api-reference/openapi.json`

Until `scripts/locales/<locale>.json` is complete, API reference pages may show English summaries for missing keys.

### 4. `docs.json` navigation

Add a new object to `navigation.languages` (mirror `zh` structure):

```json
{
  "language": "ja",
  "tabs": [
    {
      "tab": "ガイド",
      "groups": [ /* translated group names; pages prefixed with ja/ */ ]
    },
    {
      "tab": "API リファレンス",
      "groups": [
        { "group": "概要", "pages": ["ja/api-reference/introduction"] },
        {
          "group": "エンドポイント",
          "openapi": {
            "source": "ja/api-reference/openapi.json",
            "directory": "ja/api-reference"
          }
        }
      ]
    }
  ],
  "navbar": { /* translated Help center / Get API Key labels */ }
}
```

Rules:

- Each page path appears in **only one** language.
- `openapi.directory` must match locale folder (`ja/api-reference`).

### 5. Validate

```bash
mint validate
```

Preview: `mint dev` → language switcher → new locale.

### 6. Update manifest / AGENTS

- Document new locale in `AGENTS.md` language section if it becomes a maintained language.

## Adding multiple languages in one task

Repeat steps 2–4 for each locale. Reuse the same English source; do not copy from `zh` unless targeting Chinese variants.

## After English content changes later

Use **docs-i18n-edit** to update all locales, or re-run translation for affected pages only.

## OpenAPI string maps

When English `api-reference/openapi.json` changes:

1. `node scripts/build-openapi-i18n.mjs zh` (and each locale)
2. Append new English `summary` / `description` keys to every `scripts/locales/*.json`

Reference: `scripts/locales/zh.json` for key format.
