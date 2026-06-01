#!/usr/bin/env node
/**
 * Add guide links to Task management, Assets - Materials, and Assets - Voices OpenAPI operations and tags.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const specPath = path.join(root, "api-reference/openapi.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const TAG_DESCRIPTIONS = {
  "Task management":
    "List, detail, and delete Open API tasks across all products. See [Products overview](/guides/products/overview) for sync vs async, task types, and integration flow.",
  "Assets - Materials":
    "Upload, list, and delete API-scoped video/audio. See [Assets overview](/guides/assets/overview), [Materials](/guides/assets/materials), and [Material upload](/guides/assets/material-upload).",
  "Assets - Voices":
    "System presets and cloned voices for TTS. See [Assets overview](/guides/assets/overview) and [Voices](/guides/assets/voices). Clones come from [Voice clone](/guides/products/voice-clone).",
};

const OPERATION_DESCRIPTIONS = {
  tasksList:
    "Paginated list of tasks created via product APIs (TTS, text translation, voice clone, media translation). See [Products overview](/guides/products/overview); async deliverables arrive via [Webhooks](/guides/webhooks).",
  tasksDetail:
    "Status and `result` for one `taskId` — use after `create-async` or when polling instead of webhooks. See [Products overview](/guides/products/overview).",
  tasksDelete:
    "Delete a task record. Requires [`X-Idempotency-Key`](/guides/idempotency). See [Products overview](/guides/products/overview).",
  materialGenUploadUrl:
    "Single-file upload **step 1**: presigned PUT URL (and `materialId`). Requires [`X-Idempotency-Key`](/guides/idempotency). Flow: [Material upload](/guides/assets/material-upload) · [Assets overview](/guides/assets/overview).",
  materialUploadComplete:
    "Single-file upload **step 3**: register the file after CDN PUT. Requires [`X-Idempotency-Key`](/guides/idempotency). Flow: [Material upload](/guides/assets/material-upload).",
  materialMultipartInitiate:
    "Multipart upload **step 1**: start upload and get `materialId` / `uploadId`. Requires [`X-Idempotency-Key`](/guides/idempotency). Flow: [Material upload](/guides/assets/material-upload).",
  materialMultipartPresign:
    "Multipart upload **step 2**: presigned URL per part. Requires [`X-Idempotency-Key`](/guides/idempotency). Flow: [Material upload](/guides/assets/material-upload).",
  materialMultipartComplete:
    "Multipart upload **final step**: commit parts and register the material. Requires [`X-Idempotency-Key`](/guides/idempotency). Flow: [Material upload](/guides/assets/material-upload).",
  materialMultipartAbort:
    "Cancel an in-progress multipart upload. Requires [`X-Idempotency-Key`](/guides/idempotency). See [Material upload](/guides/assets/material-upload).",
  materialList:
    "Paginated material library for your project. Use `materialId` in [Media translation](/guides/products/media-translation). See [Materials](/guides/assets/materials) and [Assets overview](/guides/assets/overview).",
  materialDelete:
    "Logical delete of a material. Requires [`X-Idempotency-Key`](/guides/idempotency). See [Materials](/guides/assets/materials).",
  voiceBasicList:
    "List read-only system preset voices; pick a `voiceId` for [Text to speech](/guides/products/text-to-speech). See [Voices](/guides/assets/voices) and [Assets overview](/guides/assets/overview).",
  voiceCloneList:
    "List cloned voices created by [Voice clone](/guides/products/voice-clone). See [Voices](/guides/assets/voices).",
  voiceCloneUpdate:
    "Rename a cloned voice display name. Requires [`X-Idempotency-Key`](/guides/idempotency). See [Voices](/guides/assets/voices).",
  voiceCloneDelete:
    "Logical delete of a cloned voice. Requires [`X-Idempotency-Key`](/guides/idempotency). See [Voices](/guides/assets/voices).",
};

for (const tag of spec.tags ?? []) {
  if (TAG_DESCRIPTIONS[tag.name]) {
    tag.description = TAG_DESCRIPTIONS[tag.name];
  }
}

let patched = 0;
for (const pathItem of Object.values(spec.paths ?? {})) {
  for (const op of Object.values(pathItem)) {
    if (!op?.operationId || !OPERATION_DESCRIPTIONS[op.operationId]) continue;
    op.description = OPERATION_DESCRIPTIONS[op.operationId];
    patched += 1;
  }
}

fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`Updated ${patched} operation(s) and ${Object.keys(TAG_DESCRIPTIONS).length} tag(s) in ${specPath}`);
