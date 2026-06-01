#!/usr/bin/env node
/**
 * Add missing field descriptions to api-reference/openapi.json.
 * Run: node scripts/patch-openapi-descriptions.mjs
 * Then: node scripts/build-openapi-i18n.mjs zh
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const openapiPath = path.join(root, "api-reference/openapi.json");
const zhLocalePath = path.join(root, "scripts/locales/zh.json");

/** @type {Record<string, { en: string, zh: string }>} */
const FIELDS = {
  "OpenApiResponseBase.message": {
    en: "Human-readable detail when `code` is not success",
    zh: "当 `code` 非成功时的说明信息",
  },
  "OpenApiTtsCreateRequest.language": {
    en: "Target language for synthesis",
    zh: "合成目标语言",
  },
  "OpenApiTtsCreateRequest.trim": {
    en: "When `true`, trim leading and trailing silence from output audio",
    zh: "为 `true` 时裁剪输出音频首尾静音",
  },
  "OpenApiTtsCreateRequest.data": {
    en: "Lines to synthesize (max 50). Each item needs `text` and `voiceId` or `timbreRefAudio`",
    zh: "待合成文本（最多 50 条）。每条需 `text` 及 `voiceId` 或 `timbreRefAudio`",
  },
  "OpenApiTtsCreateRequest.outputFormat": {
    en: "Output audio container: `wav`, `mp3`, or `m4a`",
    zh: "输出音频格式：`wav`、`mp3` 或 `m4a`",
  },
  "OpenApiExtraData": {
    en: "Optional client metadata on async submit; echoed in the completion webhook (`extraData` in callback body). Not used on sync create endpoints.",
    zh: "异步提交时的可选客户端元数据；任务完成时在 Webhook 回调体 `extraData` 中回显。同步创建接口不使用。",
  },
  "OpenApiTtsDataItem.text": {
    en: "Text to synthesize",
    zh: "待合成文本",
  },
  "OpenApiTtsDataItem.emoWeight": {
    en: "Emotion strength from `emoRefAudio` / `emoPrompt` (0–1)",
    zh: "情感强度，配合 `emoRefAudio` / `emoPrompt` 使用（0–1）",
  },
  "OpenApiTtsDataItem.emoRefAudio": {
    en: "HTTPS URL of reference audio for emotion or delivery style",
    zh: "用于情感或演绎风格的参考音频 URL（HTTPS）",
  },
  "OpenApiTtsDataItem.emoPrompt": {
    en: "Text hint for desired emotion or speaking style",
    zh: "描述期望情感或说话风格的文本提示",
  },
  "OpenApiTtsCreateData.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiTtsCreateData.createdAt": {
    en: "Task creation time (ISO 8601)",
    zh: "任务创建时间（ISO 8601）",
  },
  "OpenApiTaskAcceptedData.taskId": {
    en: "Open API task ID; use for polling or correlation",
    zh: "Open API 任务 ID，可用于轮询或关联",
  },
  "OpenApiTranslateCreateRequest.language": {
    en: "Source and target locales for translation",
    zh: "翻译源语言与目标语言",
  },
  "OpenApiTranslateCreateRequest.segments": {
    en: "Text segments to translate (max 50)",
    zh: "待翻译文本片段（最多 50 条）",
  },
  "OpenApiTranslateCreateRequest.options": {
    en: "Optional translation engine settings (provider-specific)",
    zh: "可选翻译引擎参数（因引擎而异）",
  },
  "OpenApiTranslateSegment.text": {
    en: "Source text for this segment",
    zh: "该片段的原文",
  },
  "OpenApiTranslateSegment.gender": {
    en: "Speaker gender hint for this segment (e.g. `male`, `female`)",
    zh: "该片段说话人性别提示（如 `male`、`female`）",
  },
  "OpenApiTranslateSegment.speaker": {
    en: "Speaker label to keep voice consistent across segments",
    zh: "说话人标识，用于跨片段保持音色一致",
  },
  "OpenApiTranslateSegment.locale": {
    en: "Locale hint for this segment when it differs from `language.source`",
    zh: "片段级 locale 提示（与 `language.source` 不同时使用）",
  },
  "OpenApiTranslateSegment.context": {
    en: "Surrounding lines for disambiguation (strings)",
    zh: "上下文句子，用于消歧（字符串数组）",
  },
  "OpenApiTranslateSegment.start": {
    en: "Start time in seconds (subtitle-style segments)",
    zh: "开始时间（秒，字幕类片段）",
  },
  "OpenApiTranslateSegment.end": {
    en: "End time in seconds (subtitle-style segments)",
    zh: "结束时间（秒，字幕类片段）",
  },
  "OpenApiTranslateCreateData.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiTranslateCreateData.createdAt": {
    en: "Task creation time (ISO 8601)",
    zh: "任务创建时间（ISO 8601）",
  },
  "OpenApiCloneVoiceCreateRequest.voiceName": {
    en: "Display name for the cloned voice in your asset library",
    zh: "克隆音色在资产库中的展示名称",
  },
  "OpenApiCloneVoiceCreateRequest.sampleText": {
    en: "Optional transcript of `refAudio` to improve clone quality",
    zh: "`refAudio` 的可选对照文本，有助于提升克隆质量",
  },
  "OpenApiCloneVoiceCreateData.taskId": {
    en: "Open API task ID (async clone)",
    zh: "Open API 任务 ID（异步克隆）",
  },
  "OpenApiCloneVoiceCreateData.voiceId": {
    en: "New cloned voice ID for use in TTS",
    zh: "可用于 TTS 的新克隆音色 ID",
  },
  "OpenApiCloneVoiceCreateData.createdAt": {
    en: "Task creation time (ISO 8601)",
    zh: "任务创建时间（ISO 8601）",
  },
  "OpenApiMediaTranslationCreateRequest.source": {
    en: "Input material for this translation job",
    zh: "本任务的输入素材",
  },
  "OpenApiMediaTranslationCreateRequest.source.materialId": {
    en: "Uploaded material ID. See [Material upload](/guides/assets/material-upload)",
    zh: "已上传素材 ID。见 [素材上传](/zh/guides/assets/material-upload)",
  },
  "OpenApiMediaTranslationCreateRequest.language": {
    en: "Source and target locales for localization",
    zh: "本地化源语言与目标语言",
  },
  "OpenApiMediaTranslationCreateRequest.output": {
    en: "Output delivery preferences. See [Media translation](/guides/products/media-translation)",
    zh: "输出偏好。见 [音视频翻译](/zh/guides/products/media-translation)",
  },
  "OpenApiMediaTranslationCreateRequest.extraData": {
    en: "Optional client metadata; echoed in the completion webhook",
    zh: "可选客户端元数据；完成时在 Webhook 中回传",
  },
  "OpenApiMediaTranslationAcceptedData.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiMediaTranslationAcceptedData.status": {
    en: "Task status after acceptance (`running`, `failed`, or `finished`)",
    zh: "受理后的任务状态（`running`、`failed` 或 `finished`）",
  },
  "OpenApiMediaTranslationAcceptedData.createdAt": {
    en: "Task creation time (ISO 8601)",
    zh: "任务创建时间（ISO 8601）",
  },
  "OpenApiMediaTranslationCallbackData.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiMediaTranslationCallbackData.status": {
    en: "Final task status (`finished` or `failed`)",
    zh: "最终任务状态（`finished` 或 `failed`）",
  },
  "OpenApiTaskSummary.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiTaskSummary.status": {
    en: "Task status",
    zh: "任务状态",
  },
  "OpenApiTaskSummary.createdAt": {
    en: "Task creation time (ISO 8601)",
    zh: "任务创建时间（ISO 8601）",
  },
  "OpenApiTaskSummary.updatedAt": {
    en: "Last update time (ISO 8601)",
    zh: "最近更新时间（ISO 8601）",
  },
  "OpenApiTaskListData.records": {
    en: "Tasks on this page",
    zh: "本页任务列表",
  },
  "OpenApiTaskListData.total": {
    en: "Total tasks matching the query",
    zh: "符合筛选条件的任务总数",
  },
  "OpenApiTaskDetailData.taskId": {
    en: "Open API task ID",
    zh: "Open API 任务 ID",
  },
  "OpenApiTaskDetailData.status": {
    en: "Current task status",
    zh: "当前任务状态",
  },
  "OpenApiTaskDeleteRequest.projId": {
    en: "Project ID (from API Key scope)",
    zh: "项目 ID（API Key 所属项目）",
  },
  "OpenApiTaskDeleteRequest.taskId": {
    en: "Task ID to delete (logical delete)",
    zh: "要删除的任务 ID（逻辑删除）",
  },
  "OpenApiMaterialUploadCompleteRequest.fileName": {
    en: "Original file name including extension",
    zh: "原始文件名（含扩展名）",
  },
  "OpenApiMaterialUploadCompleteRequest.materialId": {
    en: "Material ID from gen-upload-url or multipart initiate",
    zh: "来自预签名或分片初始化返回的素材 ID",
  },
  "OpenApiMaterialUploadCompleteRequest.fileHash": {
    en: "MD5 hash of the uploaded file (must match upload request)",
    zh: "上传文件的 MD5（须与上传请求一致）",
  },
  "OpenApiMaterialMultipartPresignRequest.materialId": {
    en: "Material ID from multipart initiate",
    zh: "分片初始化返回的素材 ID",
  },
  "OpenApiMaterialMultipartPresignRequest.uploadId": {
    en: "Multipart upload session ID from initiate",
    zh: "分片初始化返回的上传会话 ID",
  },
  "OpenApiMaterialMultipartPresignRequest.fileHash": {
    en: "MD5 hash of the full file",
    zh: "完整文件的 MD5",
  },
  "OpenApiMaterialMultipartPresignRequest.fileName": {
    en: "Original file name including extension",
    zh: "原始文件名（含扩展名）",
  },
  "OpenApiMaterialMultipartCompletePart.partNumber": {
    en: "Part index (1-based)",
    zh: "分片序号（从 1 开始）",
  },
  "OpenApiMaterialMultipartCompleteRequest.materialId": {
    en: "Material ID from multipart initiate",
    zh: "分片初始化返回的素材 ID",
  },
  "OpenApiMaterialMultipartCompleteRequest.uploadId": {
    en: "Multipart upload session ID",
    zh: "分片上传会话 ID",
  },
  "OpenApiMaterialMultipartCompleteRequest.fileHash": {
    en: "MD5 hash of the full file",
    zh: "完整文件的 MD5",
  },
  "OpenApiMaterialMultipartCompleteRequest.fileName": {
    en: "Original file name including extension",
    zh: "原始文件名（含扩展名）",
  },
  "OpenApiMaterialMultipartCompleteRequest.parts": {
    en: "Uploaded parts with `partNumber` and `eTag` from each PUT",
    zh: "已上传分片列表，含每片的 `partNumber` 与 PUT 返回的 `eTag`",
  },
  "OpenApiMaterialMultipartAbortRequest.materialId": {
    en: "Material ID from multipart initiate",
    zh: "分片初始化返回的素材 ID",
  },
  "OpenApiMaterialMultipartAbortRequest.uploadId": {
    en: "Multipart upload session ID to abort",
    zh: "要中止的分片上传会话 ID",
  },
  "OpenApiMaterialMultipartAbortRequest.fileHash": {
    en: "MD5 hash of the file (must match initiate)",
    zh: "文件 MD5（须与初始化请求一致）",
  },
  "OpenApiMaterialMultipartAbortRequest.fileName": {
    en: "Original file name including extension",
    zh: "原始文件名（含扩展名）",
  },
  "OpenApiMaterialDeleteRequest.materialId": {
    en: "Material ID to delete (logical delete)",
    zh: "要删除的素材 ID（逻辑删除）",
  },
  "OpenApiMaterialDto.materialId": {
    en: "Material ID",
    zh: "素材 ID",
  },
  "OpenApiMaterialDto.resolution": {
    en: "Video resolution when applicable (e.g. `1920x1080`)",
    zh: "视频分辨率（如适用，例如 `1920x1080`）",
  },
  "OpenApiMaterialDto.mimeType": {
    en: "MIME type of the main file",
    zh: "主文件的 MIME 类型",
  },
  "OpenApiMaterialDto.fileHash": {
    en: "MD5 hash of the main file",
    zh: "主文件 MD5",
  },
  "OpenApiMaterialDto.createTime": {
    en: "Registration time (ISO 8601)",
    zh: "注册时间（ISO 8601）",
  },
  "OpenApiMaterialDto.updateTime": {
    en: "Last update time (ISO 8601)",
    zh: "最近更新时间（ISO 8601）",
  },
  "OpenApiMaterialGenUploadUrlData.materialId": {
    en: "Material ID for this upload",
    zh: "本次上传对应的素材 ID",
  },
  "OpenApiMaterialMultipartInitiateData.materialId": {
    en: "Material ID for this multipart upload",
    zh: "本次分片上传对应的素材 ID",
  },
  "OpenApiMaterialMultipartInitiateData.s3Uri": {
    en: "Upload target URI; pass to complete-upload",
    zh: "上传目标 URI，完成上传时需回传",
  },
  "OpenApiMaterialMultipartInitiateData.uploadId": {
    en: "Multipart upload session ID",
    zh: "分片上传会话 ID",
  },
  "OpenApiMaterialMultipartInitiateData.expiresInSeconds": {
    en: "Seconds until presigned URLs expire",
    zh: "预签名 URL 有效秒数",
  },
  "OpenApiMaterialMultipartPresignPartUrl.partNumber": {
    en: "Part index (1-based)",
    zh: "分片序号（从 1 开始）",
  },
  "OpenApiMaterialMultipartPresignData.urls": {
    en: "Presigned PUT URLs for requested parts",
    zh: "所请求分片的预签名 PUT URL 列表",
  },
  "OpenApiMaterialMultipartPresignData.expiresInSeconds": {
    en: "Seconds until these URLs expire",
    zh: "上述 URL 有效秒数",
  },
  "OpenApiMaterialListData.records": {
    en: "Materials on this page",
    zh: "本页素材列表",
  },
  "OpenApiMaterialListData.total": {
    en: "Total materials matching the query",
    zh: "符合筛选条件的素材总数",
  },
  "OpenApiBasicVoiceDto.voiceId": {
    en: "System voice ID for TTS requests",
    zh: "系统音色 ID，用于 TTS 请求",
  },
  "OpenApiBasicVoiceDto.name": {
    en: "Internal voice name",
    zh: "音色内部名称",
  },
  "OpenApiBasicVoiceDto.localName": {
    en: "Localized voice name",
    zh: "本地化名称",
  },
  "OpenApiBasicVoiceDto.displayName": {
    en: "Display name in the voice picker",
    zh: "音色选择器中的展示名",
  },
  "OpenApiBasicVoiceDto.locale": {
    en: "Primary locale (BCP-47) for this preset",
    zh: "该预设的主 locale（BCP-47）",
  },
  "OpenApiBasicVoiceDto.localeName": {
    en: "Human-readable locale label",
    zh: "locale 的可读名称",
  },
  "OpenApiBasicVoiceDto.provider": {
    en: "Engine version tag for this preset (`V1`–`V5`)",
    zh: "该预设对应的引擎版本（`V1`–`V5`）",
  },
  "OpenApiBasicVoiceDto.gender": {
    en: "Gender label (e.g. male, female)",
    zh: "性别标签（如 male、female）",
  },
  "OpenApiBasicVoiceDto.style": {
    en: "Speaking style tag",
    zh: "说话风格标签",
  },
  "OpenApiBasicVoiceDto.rolePlay": {
    en: "Role-play or character tag",
    zh: "角色扮演/人设标签",
  },
  "OpenApiBasicVoiceDto.description": {
    en: "Marketing or catalog description",
    zh: "展示用描述文案",
  },
  "OpenApiBasicVoiceDto.personalities": {
    en: "Comma-separated personality tags",
    zh: "人格标签（逗号分隔）",
  },
  "OpenApiBasicVoiceDto.personalityList": {
    en: "Personality tags as a list",
    zh: "人格标签列表",
  },
  "OpenApiBasicVoiceDto.scenarios": {
    en: "Recommended use-case tags",
    zh: "推荐使用场景标签",
  },
  "OpenApiBasicVoiceDto.scenarioList": {
    en: "Use-case tags as a list",
    zh: "场景标签列表",
  },
  "OpenApiBasicVoiceDto.isHd": {
    en: "`1` if this is an HD voice",
    zh: "高清音色时为 `1`",
  },
  "OpenApiBasicVoiceDto.isPreferred": {
    en: "`1` if marked preferred in the catalog",
    zh: "目录中标记为优选时为 `1`",
  },
  "OpenApiBasicVoiceDto.score": {
    en: "Ranking score in list results",
    zh: "列表排序得分",
  },
  "OpenApiBasicVoiceDto.model": {
    en: "Catalog model tag (not a request `provider` value)",
    zh: "目录模型标签（非请求里的 `provider` 取值）",
  },
  "OpenApiBasicVoiceDto.cover": {
    en: "Cover image URL",
    zh: "封面图 URL",
  },
  "OpenApiBasicVoiceDto.audio": {
    en: "Sample preview audio URL",
    zh: "试听音频 URL",
  },
  "OpenApiBasicVoiceDto.createTime": {
    en: "Record creation time",
    zh: "记录创建时间",
  },
  "OpenApiBasicVoiceDto.updateTime": {
    en: "Record last update time",
    zh: "记录最近更新时间",
  },
  "OpenApiCloneVoiceDto.voiceId": {
    en: "Cloned voice ID for TTS",
    zh: "克隆音色 ID，用于 TTS",
  },
  "OpenApiCloneVoiceDto.name": {
    en: "Display name of the clone",
    zh: "克隆音色展示名",
  },
  "OpenApiCloneVoiceDto.provider": {
    en: "Engine version used when cloning (`V1`–`V5`)",
    zh: "克隆时使用的引擎版本（`V1`–`V5`）",
  },
  "OpenApiCloneVoiceDto.exampleLanguage": {
    en: "Sample language locale (BCP-47)",
    zh: "样本语言 locale（BCP-47）",
  },
  "OpenApiCloneVoiceDto.content": {
    en: "Sample text or transcript associated with the clone",
    zh: "与克隆关联的样本文本或转写",
  },
  "OpenApiCloneVoiceDto.audio": {
    en: "Sample or reference audio URL",
    zh: "样本或参考音频 URL",
  },
  "OpenApiCloneVoiceDto.taskId": {
    en: "Voice clone task ID that created this voice",
    zh: "创建该音色的克隆任务 ID",
  },
  "OpenApiCloneVoiceDto.createTime": {
    en: "Record creation time",
    zh: "记录创建时间",
  },
  "OpenApiCloneVoiceDto.updateTime": {
    en: "Record last update time",
    zh: "记录最近更新时间",
  },
  "OpenApiBasicVoiceListData.records": {
    en: "Voices on this page",
    zh: "本页音色列表",
  },
  "OpenApiBasicVoiceListData.total": {
    en: "Total voices matching filters",
    zh: "符合筛选条件的音色总数",
  },
  "OpenApiCloneVoiceListData.records": {
    en: "Cloned voices on this page",
    zh: "本页克隆音色列表",
  },
  "OpenApiCloneVoiceListData.total": {
    en: "Total clones matching filters",
    zh: "符合筛选条件的克隆音色总数",
  },
  "OpenApiBasicVoiceListRequest.voiceId": {
    en: "Filter by exact `voiceId`",
    zh: "按 `voiceId` 精确筛选",
  },
  "OpenApiBasicVoiceListRequest.searchName": {
    en: "Search by display or local name",
    zh: "按展示名或本地化名称搜索",
  },
  "OpenApiBasicVoiceListRequest.locale": {
    en: "Filter by locale (BCP-47). See [Supported languages](/guides/supported-languages)",
    zh: "按 locale（BCP-47）筛选。见 [支持的语言](/zh/guides/supported-languages)",
  },
  "OpenApiBasicVoiceListRequest.gender": {
    en: "Filter by gender",
    zh: "按性别筛选",
  },
  "OpenApiBasicVoiceListRequest.category": {
    en: "Filter by voice category",
    zh: "按音色分类筛选",
  },
  "OpenApiBasicVoiceListRequest.topIds": {
    en: "Pin these `voiceId` values to the top of the page",
    zh: "将这些 `voiceId` 置顶到本页结果前部",
  },
  "OpenApiBasicVoiceListRequest.currentPage": {
    en: "Page number (1-based)",
    zh: "页码（从 1 开始）",
  },
  "OpenApiBasicVoiceListRequest.pageSize": {
    en: "Page size",
    zh: "每页条数",
  },
  "OpenApiBasicVoiceListRequest.order": {
    en: "Sort direction: `asc` or `desc`",
    zh: "排序方向：`asc` 或 `desc`",
  },
  "OpenApiCloneVoiceListRequest.voiceId": {
    en: "Filter by exact `voiceId`",
    zh: "按 `voiceId` 精确筛选",
  },
  "OpenApiCloneVoiceListRequest.voiceIds": {
    en: "Filter by a list of `voiceId` values",
    zh: "按 `voiceId` 列表筛选",
  },
  "OpenApiCloneVoiceListRequest.searchName": {
    en: "Search by clone name",
    zh: "按克隆音色名称搜索",
  },
  "OpenApiCloneVoiceListRequest.currentPage": {
    en: "Page number (1-based)",
    zh: "页码（从 1 开始）",
  },
  "OpenApiCloneVoiceListRequest.pageSize": {
    en: "Page size",
    zh: "每页条数",
  },
  "OpenApiCloneVoiceListRequest.order": {
    en: "Sort direction: `asc` or `desc`",
    zh: "排序方向：`asc` 或 `desc`",
  },
  "OpenApiCloneVoiceUpdateRequest.voiceId": {
    en: "Clone `voiceId` to rename",
    zh: "要重命名的克隆 `voiceId`",
  },
  "OpenApiCloneVoiceUpdateRequest.voiceName": {
    en: "New display name",
    zh: "新的展示名称",
  },
  "OpenApiCloneVoiceDeleteRequest.voiceId": {
    en: "Clone `voiceId` to delete (logical delete)",
    zh: "要删除的克隆 `voiceId`（逻辑删除）",
  },
  "OpenApiCallbackEnvelope.version": {
    en: "Callback protocol version (currently `1.0`)",
    zh: "回调协议版本（当前为 `1.0`）",
  },
  "OpenApiCallbackEnvelope.event": {
    en: "Which product completed. Route your handler by this value: `openapi-tts` (TTS), `openapi-translate` (text translation), `openapi-clone-voice` (voice clone), `openapi-media-translation` (media translation). Listed in [Webhook request body](/guides/webhook-request).",
    zh: "已完成的产品类型。请按此值路由：`openapi-tts`（TTS）、`openapi-translate`（文本翻译）、`openapi-clone-voice`（声音克隆）、`openapi-media-translation`（音视频翻译）。详见 [Webhook 请求体](/zh/guides/webhook-request)。",
  },
  "OpenApiCallbackEnvelope.message": {
    en: "Detail when `code` is not success",
    zh: "当 `code` 非成功时的说明",
  },
};

function setByPath(schemas, path, description) {
  const [schemaName, ...rest] = path.split(".");
  let node = schemas[schemaName];
  if (!node) {
    console.warn("Unknown schema:", schemaName);
    return false;
  }
  for (const key of rest) {
    node = node?.properties?.[key];
    if (!node) {
      console.warn("Unknown path:", path);
      return false;
    }
  }
  if (!node.description) {
    node.description = description;
    return true;
  }
  return false;
}

function forceSetByPath(schemas, path, description) {
  const [schemaName, ...rest] = path.split(".");
  let node = schemas[schemaName];
  if (!node) return false;
  for (const key of rest) {
    node = node?.properties?.[key];
    if (!node) return false;
  }
  node.description = description;
  return true;
}

/** Guide links for materialId / voiceId (always overwrite). */
const ASSET_LINKS = {
  "OpenApiTtsCreateRequest.data": {
    en: "Lines to synthesize (max 50). Each item needs `text` and a [Voices](/guides/assets/voices) `voiceId` or `timbreRefAudio`",
    zh: "待合成文本（最多 50 条）。每条需 `text` 及 [音色](/zh/guides/assets/voices) 中的 `voiceId` 或 `timbreRefAudio`",
  },
  "OpenApiTtsDataItem.voiceId": {
    en: "System or cloned voice ID for this line. See [Voices](/guides/assets/voices); or use `timbreRefAudio` instead",
    zh: "本行使用的系统或克隆音色 ID。见 [音色](/zh/guides/assets/voices)；也可改用 `timbreRefAudio`",
  },
  "OpenApiCloneVoiceCreateData.voiceId": {
    en: "New cloned voice ID for TTS. See [Voices](/guides/assets/voices)",
    zh: "可用于 TTS 的新克隆音色 ID。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiMediaTranslationCreateRequest.source.materialId": {
    en: "Input material ID. See [Materials](/guides/assets/materials) (from [Material upload](/guides/assets/material-upload))",
    zh: "输入素材 ID。见 [素材](/zh/guides/assets/materials)（通过 [素材上传](/zh/guides/assets/material-upload) 获取）",
  },
  "OpenApiMaterialUploadCompleteRequest.materialId": {
    en: "Material ID from presigned upload. See [Materials](/guides/assets/materials)",
    zh: "预签名上传返回的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialMultipartPresignRequest.materialId": {
    en: "Material ID from multipart initiate. See [Materials](/guides/assets/materials)",
    zh: "分片初始化返回的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialMultipartCompleteRequest.materialId": {
    en: "Material ID from multipart initiate. See [Materials](/guides/assets/materials)",
    zh: "分片初始化返回的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialMultipartAbortRequest.materialId": {
    en: "Material ID from multipart initiate. See [Materials](/guides/assets/materials)",
    zh: "分片初始化返回的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialDeleteRequest.materialId": {
    en: "Material ID to delete. See [Materials](/guides/assets/materials)",
    zh: "要删除的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialDto.materialId": {
    en: "Material ID. See [Materials](/guides/assets/materials)",
    zh: "素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialGenUploadUrlData.materialId": {
    en: "Material ID for this upload. See [Materials](/guides/assets/materials)",
    zh: "本次上传的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiMaterialMultipartInitiateData.materialId": {
    en: "Material ID for this multipart upload. See [Materials](/guides/assets/materials)",
    zh: "本次分片上传的素材 ID。见 [素材](/zh/guides/assets/materials)",
  },
  "OpenApiBasicVoiceDto.voiceId": {
    en: "System preset voice ID. See [Voices](/guides/assets/voices)",
    zh: "系统预设音色 ID。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiCloneVoiceDto.voiceId": {
    en: "Cloned voice ID. See [Voices](/guides/assets/voices)",
    zh: "克隆音色 ID。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiBasicVoiceListRequest.voiceId": {
    en: "Filter by preset `voiceId`. See [Voices](/guides/assets/voices)",
    zh: "按系统预设 `voiceId` 筛选。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiBasicVoiceListRequest.topIds": {
    en: "Pin these preset `voiceId` values to the top. See [Voices](/guides/assets/voices)",
    zh: "将这些系统预设 `voiceId` 置顶。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiCloneVoiceListRequest.voiceId": {
    en: "Filter by cloned `voiceId`. See [Voices](/guides/assets/voices)",
    zh: "按克隆 `voiceId` 筛选。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiCloneVoiceListRequest.voiceIds": {
    en: "Filter by cloned voice IDs. See [Voices](/guides/assets/voices)",
    zh: "按克隆 `voiceId` 列表筛选。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiCloneVoiceUpdateRequest.voiceId": {
    en: "Cloned `voiceId` to rename. See [Voices](/guides/assets/voices)",
    zh: "要重命名的克隆 `voiceId`。见 [音色](/zh/guides/assets/voices)",
  },
  "OpenApiCloneVoiceDeleteRequest.voiceId": {
    en: "Cloned `voiceId` to delete. See [Voices](/guides/assets/voices)",
    zh: "要删除的克隆 `voiceId`。见 [音色](/zh/guides/assets/voices)",
  },
};

const spec = JSON.parse(fs.readFileSync(openapiPath, "utf8"));
const zh = JSON.parse(fs.readFileSync(zhLocalePath, "utf8"));
let applied = 0;
let skipped = 0;

for (const [path, { en, zh: zhText }] of Object.entries(FIELDS)) {
  if (setByPath(spec.components.schemas, path, en)) {
    applied++;
  } else {
    skipped++;
  }
  if (!zh[en]) {
    zh[en] = zhText;
  }
}

// Fix timbreRefAudio wording (was S3)
const timbrePath = spec.components.schemas.OpenApiTtsDataItem?.properties?.timbreRefAudio;
if (timbrePath) {
  const timbreEnLinked =
    "HTTPS reference audio when not using a [Voices](/guides/assets/voices) `voiceId`";
  const timbreZhLinked =
    "未使用 [音色](/zh/guides/assets/voices) 中 `voiceId` 时的参考音频 URL（HTTPS）";
  timbrePath.description = timbreEnLinked;
  zh[timbreEnLinked] = timbreZhLinked;
}

// Query params missing descriptions on some operations
const queryDesc = {
  projId: {
    en: "Project ID (from API Key scope)",
    zh: "项目 ID（API Key 所属项目）",
  },
  currentPage: { en: "Page number (1-based)", zh: "页码（从 1 开始）" },
  pageSize: { en: "Page size", zh: "每页条数" },
  taskId: { en: "Open API task ID", zh: "Open API 任务 ID" },
  status: { en: "Filter by task status", zh: "按任务状态筛选" },
  taskType: { en: "Filter by task type", zh: "按任务类型筛选" },
};

for (const pathItem of Object.values(spec.paths || {})) {
  for (const op of Object.values(pathItem)) {
    if (!op?.parameters) continue;
    for (const param of op.parameters) {
      if (param.in !== "query" || param.description) continue;
      const pack = queryDesc[param.name];
      if (pack) {
        param.description = pack.en;
        zh[pack.en] = pack.zh;
        applied++;
      }
    }
  }
}

let linked = 0;
for (const [path, { en, zh: zhText }] of Object.entries(ASSET_LINKS)) {
  if (forceSetByPath(spec.components.schemas, path, en)) {
    linked++;
    zh[en] = zhText;
  }
}

fs.writeFileSync(openapiPath, JSON.stringify(spec, null, 2) + "\n");
fs.writeFileSync(zhLocalePath, JSON.stringify(zh, null, 2) + "\n");
console.log(`Patched ${applied} descriptions (${skipped} already had text).`);
console.log(`Applied ${linked} materialId/voiceId guide links.`);
console.log("Run: node scripts/build-openapi-i18n.mjs zh");
