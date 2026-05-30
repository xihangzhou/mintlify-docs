# Documentation project instructions

## About this project

- VMEG Open API documentation site (Mintlify)
- **Docs site (production):** https://docs.vmeg.ai/api
- **API base URL (production):** https://api.vmeg.ai — no staging host in public docs
- API implementation source: `vmeg-serv` → `src/main/java/pro/vmeg/openapi`
- Pages are MDX with YAML frontmatter; site config in `docs.json`
- OpenAPI spec: `api-reference/openapi.json` (English); `zh/api-reference/openapi.json` (Chinese, generated)
- Run `mint dev` to preview; `mint validate` and `mint broken-links` before publishing
- **Guides nav:** Get started (`guides/introduction`) → Auth → Idempotency → Webhooks → Assets → Products → Limits. Each tab must use **`groups` only** (no mixing tab-level `pages` + `groups`). Do **not** add root `index.mdx` when using multiple tabs — use `docs.json` redirects (`/` → `/guides/introduction`) only; a root `index` breaks tab/sidebar sync. Do **not** use `navigation.global.anchors` together with `navigation.languages[].tabs` (sidebar may show only anchors). Put external links (Dashboard) in `navbar.links`. Prefer `"openapi": "path/to/openapi.json"` on the Endpoints group; avoid tab-level `openapi` + manual duplicate endpoint lists. Guides explain workflows; API reference holds exact schemas.
- **Supported languages:** `node scripts/generate-supported-languages.mjs` (reads `vmeg-web-mono` `translated-language.ts`)

## Language

- **English** (`index`, `guides/*`) is the source of truth for guide prose.
- **Chinese** (`zh/index`, `zh/guides/*`) mirrors the same structure; keep in sync when guides change.
- OpenAPI: English in `api-reference/openapi.json`; run `node scripts/build-openapi-i18n.mjs zh` (and other locales) after every OpenAPI change.
- Backend Java `@Operation` text may be Chinese; normalize to **English** in the English spec before generating Chinese.

## Mintlify MCP (Cursor)

This repo includes [Mintlify documentation MCP](https://mintlify.com/docs/mcp) in `.cursor/mcp.json` (`search_mintlify`, `query_docs_filesystem_mintlify`) for official Mintlify platform docs.

After adding or changing `.cursor/mcp.json`, reload Cursor (**Cmd+Shift+P** → **Developer: Reload Window**). In chat, ask *「What MCP tools do you have?」* to verify **Mintlify** is connected.

To let agents **edit** this site on Mintlify (branch + PR), use the separate [Mintlify MCP](https://www.mintlify.com/docs/ai/mintlify-mcp) at `https://mcp.mintlify.com` (OAuth) — not the same as the docs search MCP above.

## Cursor skills (project)

| Skill | When to use |
|-------|-------------|
| `vmeg-serv-sync` | Backend branch sync, commit diff, OpenAPI pull |
| `docs-i18n-edit` | User-specified guide wording; mirror all locales |
| `docs-add-language` | Add `ja`, `de`, etc. — copy EN structure + translate |

Skills live in `.cursor/skills/`. State: `scripts/vmeg-serv-sync-state.json`.

## Documentation update workflows

### Path A — Backend / OpenAPI changed (`vmeg-serv`)

Use when controllers, DTOs, or SpringDoc annotations under `pro.vmeg.openapi` change.

1. Start `vmeg-serv` locally (or point at a reachable instance).
2. Run:
   ```bash
   ./scripts/sync-openapi.sh http://localhost:8080
   ```
   This will:
   - Back up the previous spec to `api-reference/.openapi.prev.json`
   - Pull `GET /v3/api-docs/openapi`
   - Force `servers` to production only (`https://api.vmeg.ai`)
   - Regenerate `zh/api-reference/openapi.json`
   - Write `api-reference/.openapi.diff.md` (added/removed/changed endpoints and schemas)
3. Read `.openapi.diff.md` and decide if **guides** need updates (new fields, new endpoints, behavior changes).
4. Run `mint validate`.
5. In Cursor, you can say: *「根据 `api-reference/.openapi.diff.md` 更新文档」* — the agent should read the diff, update English guides if needed, mirror changes in `zh/`, and extend `scripts/build-openapi-zh.mjs` `STRINGS` if new English summaries appear.

**Optional (CI):** On `mintlify-docs` PRs, fail if `openapi.json` is stale compared to a fetched spec, or open a bot PR after `vmeg-serv` release. Cross-repo automation needs a deployed SpringDoc URL or artifact upload from `vmeg-serv` build.

### Path B — Guide wording / structure changed (you specify edits)

Use when behavior is unchanged but explanations, examples, or tone should change.

1. You describe the change precisely, e.g. *「`guides/idempotency` 第二节补充：幂等是为了防止重复无效请求」*.
2. Agent edits the **English** MDX first (`guides/...` or `index.mdx`).
3. Agent applies the **same meaning** to the matching **Chinese** file (`zh/guides/...`, `zh/index.mdx`).
4. Run `mint validate`.
5. Do **not** edit only one language unless you explicitly want a temporary gap.

**MDX rules (avoid blank pages):**

- External links: `<a href={apiKeyUrl}>label</a>` — not `[label]({apiKeyUrl})`.
- Snippet: `snippets/product-urls.jsx` — no `{...}` in comments; object literals in `.jsx` snippets break MDX parsing.

### Path C — Product URLs changed (`vmeg-web`)

Update `snippets/product-urls.jsx` (JSON.parse string only, no raw `{` object literals). Mirror any new keys in guide copy EN + ZH.

## Terminology

- Use **API Key** (not "token") for `/openapi/**` Bearer auth
- Use **Callback** / **Webhook** for async task delivery to customer URLs
- Use **materialId**, **taskId**, **voiceId** as field names match the API
- **projId**: project ID bound to the API Key
- Business success: `code === 200` in JSON body (not HTTP status alone)

## Style preferences

- Second person ("you"); active voice
- Sentence case for headings
- Bold for UI: **API Key**, **Dashboard**
- Code formatting for paths, headers, and commands

## Product URLs (www.vmeg.ai)

Centralize web app links in `snippets/product-urls.jsx`.

| Purpose | URL |
|---------|-----|
| Dashboard | `https://www.vmeg.ai/home` |
| API Configuration (API Key + Webhook) | `https://www.vmeg.ai/open-api-setting` |
| Get API Key (CTA, with login redirect) | `https://www.vmeg.ai/signIn?redirect=%2Fopen-api-setting` |
| Help center | `https://www.vmeg.ai/help-center/` |
| Published API docs (in-app doc button) | `https://docs.vmeg.ai/api` |
| Pricing / credits | `https://www.vmeg.ai/pricing` |
| My tasks | `https://www.vmeg.ai/my-tasks` |
| My assets | `https://www.vmeg.ai/my-assets` |
| Clone voice | `https://www.vmeg.ai/clone-voice` |

Paths from `vmeg-web-mono_1`: `ROUTE_URL.dashboard.apiConfiguration` → `/open-api-setting`.

## Content boundaries

- Document public `/openapi/**` integration only
- Console-only routes (`/api/openapi/auth/**`, `/api/openapi/callback/**`) are mentioned briefly, not full API reference
- Do not document internal admin, staging hosts, or unreleased endpoints
