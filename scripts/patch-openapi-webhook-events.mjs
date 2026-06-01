#!/usr/bin/env node
/**
 * Align webhook docs with backend: callback JSON `event` is per-product (openapi-*), not task.completed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const specPath = path.join(root, "api-reference/openapi.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const EVENT = {
  tts: {
    value: "openapi-tts",
    product: "Text to speech",
    api: "[Create TTS (async)](/api-reference/tts/create-tts-async)",
    data: "`data` includes synthesis `results` and `taskId`",
  },
  translate: {
    value: "openapi-translate",
    product: "Text translation",
    api: "[Create text translation (async)](/api-reference/text-translation/create-text-translation-async)",
    data: "`data.items` holds translated segments aligned with your request",
  },
  clone: {
    value: "openapi-clone-voice",
    product: "Voice clone",
    api: "[Create voice clone (async)](/api-reference/clone-voice/create-voice-clone-async)",
    data: "`data.voiceId` (and related fields when successful)",
  },
  media: {
    value: "openapi-media-translation",
    product: "Media translation",
    api: "[Create media translation (async)](/api-reference/media-translation/create-media-translation-async)",
    data: "`data.result` with CDN deliverables",
  },
};

const CALLBACK_BY_OP = {
  ttsCreateAsync: EVENT.tts,
  translateCreateAsync: EVENT.translate,
  cloneVoiceCreateAsync: EVENT.clone,
  mediaTranslationCreateAsync: EVENT.media,
};

const SCHEMA_BY_NAME = {
  OpenApiTtsTaskCompletedCallback: EVENT.tts,
  OpenApiTranslateTaskCompletedCallback: EVENT.translate,
  OpenApiCloneVoiceTaskCompletedCallback: EVENT.clone,
  OpenApiMediaTranslationTaskCompletedCallback: EVENT.media,
  OpenApiMediaTranslationCallbackData: EVENT.media,
};

function callbackSummary(e) {
  return `Webhook when async task finishes (\`event\`: \`${e.value}\`)`;
}

function callbackDescription(e) {
  return (
    `HTTP **request body** VMEG POSTs to your [Webhook](/guides/webhooks) URL when a ${e.product} async task finishes. ` +
    `The JSON field \`event\` is \`${e.value}\` (see [Webhook request body](/guides/webhook-request)). ` +
    `Not part of the create-async **Response** above. Full schema: ${e.api} → **Callbacks**.`
  );
}

function schemaDescription(e) {
  return (
    `Webhook callback **request body** for ${e.product} when \`event\` is \`${e.value}\`. ` +
    `${e.data}. See [Webhook request body](/guides/webhook-request) and ${e.api} → **Callbacks**.`
  );
}

for (const pathItem of Object.values(spec.paths ?? {})) {
  for (const op of Object.values(pathItem)) {
    if (!op?.operationId || !CALLBACK_BY_OP[op.operationId]) continue;
    const e = CALLBACK_BY_OP[op.operationId];
    const cb = op.callbacks?.taskCompleted?.["https://{yourWebhookUrl}"]?.post;
    if (!cb) continue;
    cb.summary = callbackSummary(e);
    cb.description = callbackDescription(e);
  }
}

const envelope = spec.components?.schemas?.OpenApiCallbackEnvelope;
if (envelope?.properties?.event) {
  envelope.description =
    "Shared top-level fields of the webhook POST body when an async task finishes. See [Webhook request body](/guides/webhook-request) for the `event` field and per-product values.";
  envelope.properties.event = {
    type: "string",
    enum: [
      EVENT.tts.value,
      EVENT.translate.value,
      EVENT.clone.value,
      EVENT.media.value,
    ],
    example: EVENT.tts.value,
    description:
      "Which product completed. Route your handler by this value: `openapi-tts` (TTS), `openapi-translate` (text translation), `openapi-clone-voice` (voice clone), `openapi-media-translation` (media translation). Listed in [Webhook request body](/guides/webhook-request).",
  };
}

for (const [name, e] of Object.entries(SCHEMA_BY_NAME)) {
  const schema = spec.components?.schemas?.[name];
  if (!schema) continue;
  if (name === "OpenApiMediaTranslationCallbackData") {
    schema.description = `Task payload inside webhook \`data\` when \`event\` is \`${e.value}\`. ${e.data}.`;
    continue;
  }
  schema.description = schemaDescription(e);
  const dataDesc = schema.allOf?.[1]?.properties?.data?.description;
  if (dataDesc !== undefined) {
    schema.allOf[1].properties.data.description = `Product-specific results when \`event\` is \`${e.value}\`. ${e.data}.`;
  }
}

fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`Patched webhook event docs in ${specPath}`);
