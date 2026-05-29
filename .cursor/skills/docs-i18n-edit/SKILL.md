---
name: docs-i18n-edit
description: Applies user-specified edits to VMEG Mintlify docs in English and mirrors the same meaning to all configured locales (zh, etc.). Use when the user describes wording changes, section updates, or example fixes without backend OpenAPI changes.
---

# Guide edits with i18n mirror

## Source of truth

- **English:** `index.mdx`, `guides/*.mdx`, `api-reference/introduction.mdx`
- **Locales:** `{locale}/` prefix — today `zh/` (see `config/i18n-manifest.json` → `sourcePages`)
- **Do not** edit only one language unless the user explicitly allows a temporary gap.

## Workflow

1. Parse the user request into concrete targets:
   - File path(s) (e.g. `guides/idempotency`)
   - Section or paragraph to change
   - Intended meaning (not literal machine translation of their Chinese instruction unless they ask)

2. Edit **English** MDX first. Preserve:
   - YAML frontmatter `title` / `description`
   - Code blocks, paths, field names (`taskId`, `materialId`)
   - Production URLs only: API `https://api.vmeg.ai`, docs `https://docs.vmeg.ai/api`

3. Mirror to **each locale** listed in `docs.json` → `navigation.languages` (except `en`):
   - Path map: `guides/foo` → `zh/guides/foo`
   - Same structure (headings, steps, cards); translate prose to the locale language
   - Internal links use locale prefix: `/zh/guides/webhooks` not `/guides/webhooks`

4. **MDX safety** (blank-page prevention):
   - Product links: `<a href={apiKeyUrl}>label</a>` or `<a href={productUrls.myTasks}>…</a>`
   - Never `[text]({apiKeyUrl})`
   - Import: `from "/snippets/product-urls.jsx"`

5. Run `mint validate`. Fix broken internal links.

## OpenAPI / guides

- Wording-only changes: **do not** run `sync-openapi.sh`.
- If the user’s edit mentions new endpoints or fields, switch to **vmeg-serv-sync** skill instead.

## Checklist

```
- [ ] English MDX updated
- [ ] Every other language in docs.json updated (same pages)
- [ ] Links locale-prefixed where internal
- [ ] mint validate passed
```

## Example user request

> `guides/idempotency` 开头说明：幂等是为了防止重复无效请求；中英文都要。

→ Edit `guides/idempotency.mdx`, then `zh/guides/idempotency.mdx` with equivalent Chinese prose.
