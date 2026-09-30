#!/usr/bin/env node
/**
 * Build the App-Synced API reference from the curated Standalone spec.
 * App-Synced reuses most request/response shapes, so we copy the covered endpoints,
 * move them under /openapi/v1/app, patch the differences, and drop unreferenced schemas.
 *
 * Usage: node scripts/build-app-synced-openapi.mjs
 * Writes api-reference/app-synced.json and zh/api-reference/app-synced.json.
 * Re-run after every api-reference/openapi.json (or zh) update.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const V1 = "/openapi/v1";
const APP = "/openapi/v1/app";
const COVERED = [
  "/task/media-translation/create-async",
  "/task/clone-voice/create",
  "/tasks/list",
  "/tasks/detail",
  "/tasks/delete",
  "/assets/material/upload/gen-upload-url",
  "/assets/material/upload/complete",
  "/assets/material/upload/multipart/initiate",
  "/assets/material/upload/multipart/presign-parts",
  "/assets/material/upload/multipart/complete",
  "/assets/material/upload/multipart/abort",
  "/assets/material/list",
  "/assets/material/delete",
  "/assets/voice/basic/list",
  "/assets/voice/clone/list",
  "/assets/voice/clone/update",
  "/assets/voice/clone/delete",
];
// Operations whose Standalone spec has no x-mint.href; give them stable App-Synced slugs.
const HREFS = {
  "/task/clone-voice/create": "voice-clone/create-clone-voice",
  "/assets/material/upload/multipart/abort": "assets/materials/multipart-abort",
};

const T = {
  en: {
    title: "VMEG Open API (App-Synced)",
    info: "Same protocol as the Standalone API, but every task, material, and cloned voice lives in your VMEG website account: jobs show up in **My tasks**, open in the editor, and can be re-exported. Poll `GET /openapi/v1/app/tasks/detail` for results (no webhooks). See [Standalone vs App-Synced](/guides/choose-api).\n\nLinked guides are written for the Standalone API. The steps are the same; use the `/openapi/v1/app` prefix instead of `/openapi/v1`.",
    tags: {
      "Media translation": "Translate and dub uploaded video/audio or a YouTube link on the same pipeline as vmeg.ai. The first pass renders the dubbed file; the job also appears in **My tasks** for editing and re-export. Poll [Query job status](/api-reference/app-synced/tasks/get-task-detail) for results.",
      "Voice clone": "Clone a voice from a short recording. The voice is saved to **My voices** on the website and returned as `cv_*` for translate-and-dub jobs.",
      "Task management": "List, inspect, or delete the video/audio translation jobs in your VMEG account, including jobs created on the website.",
      "Assets - Materials": "Upload and manage the files in your website material library (**My assets**). Finish the upload (single-file or multipart), then pass `materialId` to create-async.",
      "Assets - Voices": "List preset system voices (`sv_*`) and manage your cloned voices (`cv_*`, same as **My voices** on the website).",
    },
    createDesc: "Create a translate-and-dub job on the **same pipeline as vmeg.ai**. The first pass renders the dubbed output: poll [Query job status](/api-reference/app-synced/tasks/get-task-detail) until `status` is `finished`, then read `result.outputs[0]`. The job appears in **My tasks** on the website; open `editorUrl` to edit and re-export. Credits follow website pricing.\n\nDifferences from Standalone: `options` is optional; `source` takes `materialId` or `youtubeUrl` (no `sourceUrl`); `taskType` must match the material (`vt` video, `at` audio); `title` sets the job name on the website; `output` and `extraData` are rejected with `400`; burned-in subtitles use `options.subtitle` instead of `text`; results are polled, not delivered by webhook. Other unknown fields are ignored.",
    createResp: "Task accepted. `editorUrl` opens the job in the website editor.",
    dubbing: "Dubbing version, same as the website. `V1` (default): mature and reliable, auto-match a voice or choose one yourself. `V2`: more natural voices and richer emotions; it picks voices automatically, so it cannot be combined with `voiceClone` or `voiceSpeakers.selectedVoicesList`.",
    options: "Pipeline options (all optional). Voice rules match the website: `voiceClone.style` picks automatic dubbing; `voiceSpeakers.selectedVoicesList` picks voices manually (`sv_*` system, `cv_*` your cloned voices) and cannot be combined with `voiceClone`. `dubbingVersion: V2` cannot be combined with either. Leave `voiceSpeakers.timbreMethod` empty when you set voices; a conflicting value returns `400`.",
    style: "`emotional` (default) | `consistent` clone the original voices; `auto` lets VMEG decide; `tutorial` / `drama` are content presets; `smart` matches preset voices.",
    title_: "Job name shown in **My tasks** (max 255 characters). Defaults to the file name or the YouTube video title.",
    vc: "Automatic dubbing settings (optional). Omit to use website defaults.",
    mode: "role | mix | sentence. Only for `emotional` / `consistent`; optional.",
    provider: "Clone engine (`V1`–`V5`). Only for `emotional` / `consistent`; optional. See [Supported clone methods](/guides/supported-clone-methods).",
    sampleText: "Transcript of the reference audio (required)",
    youtubeUrl: "YouTube video URL (use `taskType: vt`)",
    materialId: "Material ID from [App-Synced upload](/api-reference/app-synced/assets/materials/gen-upload-url) or [List materials](/api-reference/app-synced/assets/materials/list-materials)",
    subtitle: "Optional `.srt` material with the source-language subtitles. Other file types return `400`.",
    targetSubtitle: "Optional `.srt` material with the translated subtitles. Other file types return `400`.",
    source: "Exactly one of `materialId` or `youtubeUrl`",
    taskTypeReq: "`vt` video translation | `at` audio translation. Must match the material type, otherwise `400`.",
    taskType: "`vt` video translation | `at` audio translation",
    taskId: "Task ID (same as the job ID on the website)",
    editorUrl: "Website editor URL for this job (sign in with the same VMEG account)",
    cloneDesc: "Clone a voice from a reference recording. The call is synchronous and returns when cloning finishes, which can take tens of seconds, so use a generous client timeout (for example 120 s). The voice is saved to **My voices** on the website and returned as `cv_*`; use it in `voiceSpeakers.selectedVoicesList`. `sampleLanguage` defaults to `en-US`; the engine is chosen automatically when `provider` is omitted. Requires a plan with voice cloning (`403` otherwise).",
    refAudio: "HTTPS reference audio URL (use `refAudioMaterialId` for uploaded files). Provide exactly one of the two.",
    refAudioMaterialId: "Material ID of an uploaded audio/video file",
    listSummary: "List jobs",
    listDesc: "Paginated video/audio translation jobs in your VMEG account, including jobs created on the website. `status` is `running`, `finished`, or `failed`.",
    detailDesc: "Poll one job. When `status` is `finished`, `result.outputs[0]` is the latest rendered file.\n\n`finished` is not permanent: re-exporting in the website editor sets the job back to `running`, and a failed re-export ends in `failed`. Earlier renders stay in `result.outputs`; `result.outputs[0]` is always the latest successful one.",
    deleteSummary: "Delete a job",
    deleteDesc: "Delete a job from your VMEG account. It also disappears from **My tasks** on the website (this applies to jobs created on the website too) and cannot be undone. Requires [`X-Idempotency-Key`](/guides/idempotency).",
    detailData: "App-Synced job detail",
    jobTitle: "Job name shown in **My tasks**",
    status: "`running` | `finished` | `failed`",
    userMessage: "Failure reason when `status` is `failed` (same text as the website)",
    outputs: "Rendered outputs, newest first",
    genUrlDesc: "Single-file upload **step 1**: get a presigned PUT URL and `materialId`. PUT the file to `uploadUrl`, then call [Complete single-file upload](/api-reference/app-synced/assets/materials/complete-upload). If `material` is returned, the same file is already in your library and no upload is needed. Required unless you create the job from `source.youtubeUrl`.",
    completeDesc: "Single-file upload **step 3**: register the file after the PUT succeeds and get the material back. Requires [`X-Idempotency-Key`](/guides/idempotency).",
    mpInitDesc: "Multipart upload **step 1**: start an upload and get `materialId` and `uploadId`. Requires [`X-Idempotency-Key`](/guides/idempotency).",
    eTag: "`ETag` header from the part's PUT response",
    partSize: "Suggested part size in bytes. Every part except the last must be at least 5 MB.",
    materialsDesc: "Paginated website material library (same files as **My assets**).",
    category: "File type: `video`, `audio`, `srt`, … (case-insensitive)",
    keyword: "Match part of the file name",
    materialIdQ: "Exact material ID",
    materialDeleteDesc: "Delete a material. It also disappears from **My assets** on the website. Requires [`X-Idempotency-Key`](/guides/idempotency).",
    basicListDesc: "List preset system voices. Use `voiceId` (`sv_*`) in `voiceSpeakers.selectedVoicesList`.",
    cloneListDesc: "Your cloned voices on the website (**My voices**). IDs are `cv_*`.",
    cloneDeleteDesc: "Delete a cloned voice. It also disappears from **My voices** on the website. Requires [`X-Idempotency-Key`](/guides/idempotency).",
    voiceId: "`sv_*` from [List system voices](/api-reference/app-synced/assets/voices/list-system-voices) or `cv_*` from [List cloned voices](/api-reference/app-synced/assets/voices/list-cloned-voices)",
    out: ["Dubbed video URL (empty for audio translation)", "Dubbed audio URL", "Lip-sync video URL when lip sync is enabled", "Thumbnail URL", "Export time"],
    subtitleOpt: "Burned-in subtitles (video translation only). Omit to render without subtitles, same as the website default. Replaces the Standalone `text` field; sending `text` returns `400`.",
    subType: "`none` no subtitles | `target` translated | `origin` original | `multi` both. When omitted: `target` if `templateId` is set, otherwise `none`. Audio translation accepts only `none`.",
    subTemplateId: "Style from [List subtitle templates](/api-reference/app-synced/media-translation/list-subtitle-templates). When omitted, the website's default style (the first template in the list) is used.",
    lipsync: "Lip sync on the dubbed video. Requires width and height of at least 360 px, same as the website; lower-resolution materials return `400`. YouTube sources are not pre-checked; make sure the video is at least 360p.",
    tplSummary: "List subtitle templates",
    tplDesc: "Subtitle styles offered by the website translation form. Pass `templateId` as `options.subtitle.templateId`; the first template is the website default.",
    tplId: "Subtitle template ID",
    tplName: "Template name",
    tplThumb: "Preview image URL (may be empty)",
    dedupe: "\n\nUploads are de-duplicated by `fileHash`: uploading a file that is already in your website library returns the existing material, and deleting that material also removes it from **My assets**.",
  },
  zh: {
    title: "VMEG 开放 API（应用同源版）",
    info: "与独立版协议一致，但任务、素材、克隆音色都在你的 VMEG 网站账号里：任务出现在**我的任务**，可在编辑器继续编辑并重新导出。结果通过轮询 `GET /openapi/v1/app/tasks/detail` 获取（无 Webhook）。见[独立版与应用同源版](/zh/guides/choose-api)。\n\n文中链接的指南按独立版编写，步骤相同，把路径前缀 `/openapi/v1` 换成 `/openapi/v1/app` 即可。",
    tags: {
      "媒体翻译": "在与 vmeg.ai 相同的链路上翻译配音已上传的视频/音频或 YouTube 链接。首轮即产出配音成片，任务同时出现在**我的任务**，可继续编辑并重新导出。结果请轮询[查询任务状态](/zh/api-reference/app-synced/tasks/get-task-detail)。",
      "声音克隆": "用一段短录音克隆音色。音色保存到网站**我的音色**，返回 `cv_*`，可用于翻译配音任务。",
      "任务管理": "列出、查看或删除你 VMEG 账号下的视频/音频翻译任务，包括在网站创建的任务。",
      "资产 - 素材": "上传并管理网站素材库（**我的资产**）里的文件。完成上传（单文件或分片）后，把 `materialId` 传给 create-async。",
      "资产 - 音色": "列出系统预设音色（`sv_*`），管理你的克隆音色（`cv_*`，与网站**我的音色**相同）。",
    },
    createDesc: "在**与 vmeg.ai 相同的链路**上创建视频/音频翻译配音任务。首轮即产出配音成片：轮询[查询任务状态](/zh/api-reference/app-synced/tasks/get-task-detail)直到 `status` 为 `finished`，再读取 `result.outputs[0]`。任务会出现在网站**我的任务**中，打开 `editorUrl` 可继续编辑并重新导出。积分按网站规则扣除。\n\n与独立版的差异：`options` 可省略；`source` 接受 `materialId` 或 `youtubeUrl`（不支持 `sourceUrl`）；`taskType` 必须与素材一致（`vt` 视频、`at` 音频）；`title` 设置网站上显示的任务名；传 `output`、`extraData` 返回 `400`；烧录字幕用 `options.subtitle`（替代 `text`）；结果需轮询获取，不走 Webhook。其他未知字段会被忽略。",
    createResp: "任务已受理。`editorUrl` 为该任务的网站编辑器地址。",
    dubbing: "配音版本，与网站一致。`V1`（默认）：成熟稳定，可自动匹配或手动选择音色。`V2`：声音更自然、情感更丰富，音色自动选择，不能与 `voiceClone`、`voiceSpeakers.selectedVoicesList` 同时传。",
    options: "处理选项（均可省略）。音色规则与网站一致：`voiceClone.style` 选择自动配音方式；`voiceSpeakers.selectedVoicesList` 手动指定音色（`sv_*` 系统音色、`cv_*` 你的克隆音色），不能与 `voiceClone` 同时传。`dubbingVersion: V2` 不能与这两者同时使用。指定音色时请不要传 `voiceSpeakers.timbreMethod`，传了且与音色设置冲突返回 `400`。",
    style: "`emotional`（默认）| `consistent` 克隆原声；`auto` 由 VMEG 自动选择；`tutorial` / `drama` 为内容类型预设；`smart` 匹配预置音色。",
    title_: "**我的任务**中显示的任务名（最多 255 个字符）。不传时取文件名或 YouTube 视频标题。",
    vc: "自动配音设置（可省略），省略时使用网站默认值。",
    mode: "role | mix | sentence。仅 `emotional` / `consistent` 可用，可省略。",
    provider: "克隆引擎（`V1`–`V5`）。仅 `emotional` / `consistent` 可用，可省略。见[支持的克隆方式](/zh/guides/supported-clone-methods)。",
    sampleText: "参考音频对应的文本（必填）",
    youtubeUrl: "YouTube 视频链接（配合 `taskType: vt`）",
    materialId: "素材 ID，来自[应用同源版上传](/zh/api-reference/app-synced/assets/materials/gen-upload-url)或[素材列表](/zh/api-reference/app-synced/assets/materials/list-materials)",
    subtitle: "可选，源语言字幕的 `.srt` 素材。其他文件类型返回 `400`。",
    targetSubtitle: "可选，译文字幕的 `.srt` 素材。其他文件类型返回 `400`。",
    source: "`materialId` 与 `youtubeUrl` 二选一",
    taskTypeReq: "`vt` 视频翻译 | `at` 音频翻译。必须与素材类型一致，否则返回 `400`。",
    taskType: "`vt` 视频翻译 | `at` 音频翻译",
    taskId: "任务 ID（与网站任务 ID 相同）",
    editorUrl: "该任务的网站编辑器地址（登录同一 VMEG 账号）",
    cloneDesc: "用参考录音克隆音色。接口是同步的，克隆完成才返回，可能需要几十秒，请把客户端超时设得宽松些（例如 120 秒）。音色保存到网站**我的音色**，返回 `cv_*`，可用于 `voiceSpeakers.selectedVoicesList`。`sampleLanguage` 默认 `en-US`；不传 `provider` 时自动选择克隆引擎。需要套餐包含声音克隆权益（否则返回 `403`）。",
    refAudio: "HTTPS 参考音频地址（已上传的文件请用 `refAudioMaterialId`），两者二选一。",
    refAudioMaterialId: "已上传音频/视频的素材 ID",
    listSummary: "任务列表",
    listDesc: "分页列出你 VMEG 账号下的视频/音频翻译任务，包括在网站创建的任务。`status` 为 `running`、`finished` 或 `failed`。",
    detailDesc: "轮询单个任务。`status` 为 `finished` 时，`result.outputs[0]` 是最新的成片。\n\n`finished` 不是最终状态：在网站编辑器重新导出会把任务置回 `running`，导出失败则变为 `failed`。之前的成片仍保留在 `result.outputs` 中，`result.outputs[0]` 始终是最近一次成功导出的成片。",
    deleteSummary: "删除任务",
    deleteDesc: "从你的 VMEG 账号删除任务，网站**我的任务**中也会消失（在网站创建的任务同样适用），删除后无法恢复。须 [`X-Idempotency-Key`](/zh/guides/idempotency)。",
    detailData: "应用同源版任务详情",
    jobTitle: "**我的任务**中显示的任务名",
    status: "`running` | `finished` | `failed`",
    userMessage: "`status` 为 `failed` 时的失败原因（与网站展示一致）",
    outputs: "成片列表，按时间倒序",
    genUrlDesc: "单文件上传**第 1 步**：获取预签名 PUT URL 与 `materialId`。把文件 PUT 到 `uploadUrl`，再调用[完成单文件上传](/zh/api-reference/app-synced/assets/materials/complete-upload)。如果返回了 `material`，说明素材库里已有同一文件，无需上传。除非用 `source.youtubeUrl` 创建任务，否则必须先上传。",
    completeDesc: "单文件上传**第 3 步**：PUT 成功后登记文件，返回素材信息。须 [`X-Idempotency-Key`](/zh/guides/idempotency)。",
    mpInitDesc: "分片上传**第 1 步**：发起上传，获取 `materialId` 与 `uploadId`。须 [`X-Idempotency-Key`](/zh/guides/idempotency)。",
    eTag: "该分片 PUT 响应中的 `ETag` 头",
    partSize: "建议的分片大小（字节）。除最后一片外，每片至少 5 MB。",
    materialsDesc: "分页查询网站素材库（与**我的资产**同一份数据）。",
    category: "文件类型：`video`、`audio`、`srt` 等（不区分大小写）",
    keyword: "按文件名模糊匹配",
    materialIdQ: "精确匹配素材 ID",
    materialDeleteDesc: "删除素材，网站**我的资产**中也会消失。须 [`X-Idempotency-Key`](/zh/guides/idempotency)。",
    basicListDesc: "列出系统预设音色。把 `voiceId`（`sv_*`）用于 `voiceSpeakers.selectedVoicesList`。",
    cloneListDesc: "你在网站的克隆音色（**我的音色**），ID 为 `cv_*`。",
    cloneDeleteDesc: "删除克隆音色，网站**我的音色**中也会消失。须 [`X-Idempotency-Key`](/zh/guides/idempotency)。",
    voiceId: "`sv_*` 来自[系统音色列表](/zh/api-reference/app-synced/assets/voices/list-system-voices)，`cv_*` 来自[克隆音色列表](/zh/api-reference/app-synced/assets/voices/list-cloned-voices)",
    out: ["成片视频 URL（音频翻译为空）", "成片音频 URL", "开启口型同步时的口型视频 URL", "缩略图 URL", "导出时间"],
    subtitleOpt: "烧录字幕（仅视频翻译）。省略时不烧录，与网站默认一致。替代独立版的 `text` 字段，传 `text` 返回 `400`。",
    subType: "`none` 不烧录 | `target` 译文 | `origin` 原文 | `multi` 双语。不传时：有 `templateId` 为 `target`，否则为 `none`。音频翻译只接受 `none`。",
    subTemplateId: "字幕样式，来自[字幕模板列表](/zh/api-reference/app-synced/media-translation/list-subtitle-templates)。不传时使用网站默认样式（列表第一个）。",
    lipsync: "对成片做口型同步。与网站一致，要求视频宽、高均不低于 360 像素，否则返回 `400`。YouTube 来源不做预校验，请自行确保视频不低于 360p。",
    tplSummary: "字幕模板列表",
    tplDesc: "网站翻译表单提供的字幕样式。把 `templateId` 传给 `options.subtitle.templateId`；列表第一个是网站默认样式。",
    tplId: "字幕模板 ID",
    tplName: "模板名称",
    tplThumb: "预览图 URL（可能为空）",
    dedupe: "\n\n上传按 `fileHash` 去重：上传网站素材库里已有的同一文件会直接返回已有素材，删除该素材时网站**我的资产**中也会一起消失。",
  },
};

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

function build(locale) {
  const t = T[locale];
  const hrefPrefix = locale === "zh" ? "/zh/api-reference/" : "/api-reference/";
  const src = JSON.parse(fs.readFileSync(path.join(root, locale === "zh" ? "zh" : "", "api-reference/openapi.json"), "utf8"));
  const spec = structuredClone(src);
  spec.info = { ...spec.info, title: t.title, description: t.info };
  spec.paths = {};
  for (const p of COVERED) {
    const item = structuredClone(src.paths[V1 + p]);
    if (!item) throw new Error(`Standalone spec is missing ${V1 + p}`);
    for (const op of Object.values(item)) {
      delete op.callbacks;
      op.operationId = `app${op.operationId[0].toUpperCase()}${op.operationId.slice(1)}`;
      op["x-mint"] ??= {};
      op["x-mint"].href = op["x-mint"].href
        ? op["x-mint"].href.replace(hrefPrefix, `${hrefPrefix}app-synced/`)
        : `${hrefPrefix}app-synced/${HREFS[p] ?? (() => { throw new Error(`No href for ${p}`); })()}`;
    }
    spec.paths[APP + p] = item;
  }
  const s = spec.components.schemas;

  s.AppTaskType = { type: "string", enum: ["vt", "at"], description: t.taskType };

  s.AppMediaTranslationSource = {
    type: "object",
    description: t.source,
    properties: {
      materialId: { type: "string", description: t.materialId },
      youtubeUrl: { type: "string", description: t.youtubeUrl },
      subtitleMaterialId: { type: "string", description: t.subtitle },
      targetSubtitleMaterialId: { type: "string", description: t.targetSubtitle },
    },
  };
  s.AppMediaTranslationVoiceClone = structuredClone(s.OpenApiMediaTranslationVoiceClone);
  s.AppMediaTranslationVoiceClone.required = [];
  s.AppMediaTranslationVoiceClone.description = t.vc;
  s.AppMediaTranslationVoiceClone.properties.mode.description = t.mode;
  s.AppMediaTranslationVoiceClone.properties.provider.description = t.provider;
  s.AppMediaTranslationVoiceClone.properties.style = {
    type: "string", enum: ["emotional", "consistent", "auto", "tutorial", "drama", "smart"], default: "emotional", description: t.style,
  };
  s.AppMediaTranslationOptions = structuredClone(s.OpenApiMediaTranslationOptions);
  s.AppMediaTranslationOptions.description = t.options;
  s.AppMediaTranslationOptions.properties.voiceClone = ref("AppMediaTranslationVoiceClone");
  s.AppMediaTranslationOptions.required = [];
  delete s.AppMediaTranslationOptions.properties.text;
  s.AppMediaTranslationOptions.properties.lipsync = { ...ref("OpenApiMediaTranslationLipsync"), description: t.lipsync };
  s.AppMediaTranslationOptions.properties = {
    dubbingVersion: { type: "string", enum: ["V1", "V2"], default: "V1", description: t.dubbing },
    subtitle: ref("AppMediaTranslationSubtitle"),
    ...s.AppMediaTranslationOptions.properties,
  };
  s.AppMediaTranslationSubtitle = {
    type: "object",
    description: t.subtitleOpt,
    properties: {
      type: { type: "string", enum: ["none", "target", "origin", "multi"], description: t.subType },
      templateId: { type: "string", description: t.subTemplateId },
    },
  };
  s.OpenApiMediaTranslationSelectedVoice.properties.voiceId.description = t.voiceId;

  const req = structuredClone(s.OpenApiMediaTranslationCreateRequest);
  req.required = ["taskType", "source", "language"];
  req.properties.taskType = { ...ref("AppTaskType"), description: t.taskTypeReq };
  req.properties.source = ref("AppMediaTranslationSource");
  req.properties.options = ref("AppMediaTranslationOptions");
  req.properties.title = { type: "string", maxLength: 255, description: t.title_ };
  delete req.properties.extraData;
  s.AppMediaTranslationCreateRequest = req;

  const accepted = s.OpenApiMediaTranslationAcceptedData.properties;
  accepted.taskId.description = t.taskId;
  accepted.taskType = ref("AppTaskType");
  s.AppMediaTranslationAcceptedResponse = {
    allOf: [ref("OpenApiResponseBase"), {
      type: "object",
      properties: {
        data: {
          allOf: [ref("OpenApiMediaTranslationAcceptedData"), {
            type: "object", properties: { editorUrl: { type: "string", description: t.editorUrl } },
          }],
        },
      },
    }],
  };

  s.AppCloneVoiceCreateRequest = structuredClone(s.OpenApiCloneVoiceCreateRequest);
  s.AppCloneVoiceCreateRequest.required = ["voiceName", "sampleText"];
  s.AppCloneVoiceCreateRequest.properties.refAudio.description = t.refAudio;
  s.AppCloneVoiceCreateRequest.properties.sampleText.description = t.sampleText;
  s.AppCloneVoiceCreateRequest.properties.refAudioMaterialId = { type: "string", description: t.refAudioMaterialId };
  delete s.AppCloneVoiceCreateRequest.properties.extraData;
  delete s.OpenApiCloneVoiceDto.properties.taskId;
  s.AppCloneVoiceCreateResponse = {
    allOf: [ref("OpenApiResponseBase"), { type: "object", properties: { data: ref("OpenApiCloneVoiceDto") } }],
  };

  s.OpenApiTaskSummary.properties.taskId.description = t.taskId;
  s.OpenApiTaskSummary.properties.taskType = ref("AppTaskType");
  s.OpenApiTaskSummary.properties.status.description = t.status;
  s.AppTaskOutput = {
    type: "object",
    properties: {
      videoUrl: { type: "string", description: t.out[0] },
      audioUrl: { type: "string", description: t.out[1] },
      lipsyncVideoUrl: { type: "string", description: t.out[2] },
      thumbnailUrl: { type: "string", description: t.out[3] },
      createdAt: { type: "string", description: t.out[4] },
    },
  };
  s.AppTaskDetailData = {
    type: "object",
    description: t.detailData,
    properties: {
      taskId: { type: "string", description: t.taskId },
      taskType: ref("AppTaskType"),
      status: { type: "string", enum: ["running", "finished", "failed"] },
      editorUrl: { type: "string", description: t.editorUrl },
      result: {
        type: "object",
        properties: {
          title: { type: "string", description: t.jobTitle },
          userMessage: { type: "string", description: t.userMessage },
          outputs: { type: "array", items: ref("AppTaskOutput"), description: t.outputs },
        },
      },
    },
  };
  s.AppTaskDetailResponse = {
    allOf: [ref("OpenApiResponseBase"), { type: "object", properties: { data: ref("AppTaskDetailData") } }],
  };

  delete s.OpenApiMaterialGenUploadUrlData.properties.s3Uri;
  delete s.OpenApiMaterialMultipartInitiateData.properties.s3Uri;
  s.OpenApiMaterialMultipartInitiateData.properties.recommendedPartSize.description = t.partSize;
  s.OpenApiMaterialMultipartCompletePart.properties.eTag.description = t.eTag;
  s.AppMaterialUploadCompleteRequest = structuredClone(s.OpenApiMaterialUploadCompleteRequest);
  s.AppMaterialUploadCompleteRequest.required = ["fileName", "materialId", "fileHash"];
  delete s.AppMaterialUploadCompleteRequest.properties.s3Uri;

  const at = (p, m = "post") => spec.paths[APP + p][m];
  const body = (op, name) => { op.requestBody.content["application/json"].schema = ref(name); };
  const ok = (op, name) => { op.responses["200"].content["application/json"].schema = ref(name); };

  const create = at("/task/media-translation/create-async");
  create.description = t.createDesc;
  body(create, "AppMediaTranslationCreateRequest");
  ok(create, "AppMediaTranslationAcceptedResponse");
  create.responses["200"].description = t.createResp;

  const clone = at("/task/clone-voice/create");
  clone.description = t.cloneDesc;
  body(clone, "AppCloneVoiceCreateRequest");
  ok(clone, "AppCloneVoiceCreateResponse");

  const list = at("/tasks/list", "get");
  list.summary = t.listSummary;
  list.description = t.listDesc;
  list.parameters.find((x) => x.name === "taskType").schema = { type: "string", enum: ["vt", "at"] };
  list.parameters.find((x) => x.name === "status").schema = { type: "string", enum: ["running", "finished", "failed"] };

  const detail = at("/tasks/detail", "get");
  detail.description = t.detailDesc;
  detail.parameters.find((x) => x.name === "taskId").description = t.taskId;
  ok(detail, "AppTaskDetailResponse");

  const del = at("/tasks/delete");
  del.summary = t.deleteSummary;
  del.description = t.deleteDesc;

  at("/assets/material/upload/gen-upload-url").description = t.genUrlDesc + t.dedupe;

  // App-Synced only: no Standalone counterpart to copy from.
  s.AppSubtitleTemplate = {
    type: "object",
    properties: {
      templateId: { type: "string", description: t.tplId, example: "10047" },
      name: { type: "string", description: t.tplName, example: "B_False_W_66C4FF_S_0062D2_DS_FFFFFF" },
      thumbnail: { type: "string", description: t.tplThumb, example: "https://d24i1cah63ad4k.cloudfront.net/materials/model/11.png" },
    },
  };
  const tplExample = [
    { templateId: "10062", name: "Inter-Bold-white-outline-shadow", thumbnail: "" },
    { templateId: "10047", name: "B_False_W_66C4FF_S_0062D2_DS_FFFFFF", thumbnail: "https://d24i1cah63ad4k.cloudfront.net/materials/model/11.png" },
    { templateId: "10031", name: "B_000000_W_FFFFFF_S_False_DS_False", thumbnail: "https://d24i1cah63ad4k.cloudfront.net/materials/model/1.png" },
  ];
  s.AppSubtitleTemplateListResponse = {
    allOf: [ref("OpenApiResponseBase"), {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            records: { type: "array", items: ref("AppSubtitleTemplate"), example: tplExample },
            total: { type: "integer", format: "int64", example: 12 },
          },
        },
      },
    }],
  };
  spec.paths[APP + "/assets/subtitle-template/list"] = {
    get: {
      tags: create.tags,
      summary: t.tplSummary,
      description: t.tplDesc,
      operationId: "appSubtitleTemplateList",
      "x-mint": {
        href: `${hrefPrefix}app-synced/media-translation/list-subtitle-templates`,
        metadata: { sidebarTitle: t.tplSummary, title: t.tplSummary },
      },
      responses: {
        200: { description: "Success", content: { "application/json": { schema: ref("AppSubtitleTemplateListResponse") } } },
      },
    },
  };
  const complete = at("/assets/material/upload/complete");
  complete.description = t.completeDesc;
  body(complete, "AppMaterialUploadCompleteRequest");
  at("/assets/material/upload/multipart/initiate").description = t.mpInitDesc;

  const materials = at("/assets/material/list", "get");
  materials.description = t.materialsDesc;
  materials.parameters = [
    ...[["category", t.category], ["keyword", t.keyword], ["materialId", t.materialIdQ]]
      .map(([name, description]) => ({ name, in: "query", required: false, description, schema: { type: "string" } })),
    ...materials.parameters.filter((x) => !["mimeType", "category", "keyword", "materialId"].includes(x.name)),
  ];
  at("/assets/material/delete").description = t.materialDeleteDesc;
  at("/assets/voice/basic/list").description = t.basicListDesc;
  at("/assets/voice/clone/list").description = t.cloneListDesc;
  at("/assets/voice/clone/delete").description = t.cloneDeleteDesc;

  const usedTags = new Set(Object.values(spec.paths).flatMap((item) => Object.values(item).flatMap((op) => op.tags ?? [])));
  spec.tags = (spec.tags ?? []).filter((tag) => usedTags.has(tag.name))
    .map((tag) => ({ ...tag, description: t.tags[tag.name] ?? tag.description }));

  // Drop schemas no covered endpoint references (TTS, text translation, webhook callbacks, …).
  const reachable = new Set();
  const queue = [JSON.stringify(spec.paths)];
  while (queue.length) {
    for (const [, name] of queue.pop().matchAll(/#\/components\/schemas\/([\w.-]+)/g)) {
      if (!reachable.has(name) && s[name]) {
        reachable.add(name);
        queue.push(JSON.stringify(s[name]));
      }
    }
  }
  for (const name of Object.keys(s)) if (!reachable.has(name)) delete s[name];

  // Standalone asset guides show s3Uri and /openapi/v1 IDs; send readers to the comparison page instead.
  const guides = locale === "zh" ? "/zh/guides/" : "/guides/";
  const assetGuide = new RegExp(`\\]\\(${guides}assets/(material-upload|materials|voices)\\)`, "g");
  const patched = JSON.parse(JSON.stringify({ paths: spec.paths, schemas: s }).replace(assetGuide, `](${guides}app-synced/overview)`));
  spec.paths = patched.paths;
  spec.components.schemas = patched.schemas;

  const out = path.join(root, locale === "zh" ? "zh" : "", "api-reference/app-synced.json");
  fs.writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
  console.log(`Wrote ${path.relative(root, out)} (${Object.keys(spec.paths).length} paths, ${reachable.size} schemas)`);
}

build("en");
build("zh");
