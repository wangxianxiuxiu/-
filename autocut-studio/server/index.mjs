import express from "express";
import multer from "multer";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import ffprobe from "@ffprobe-installer/ffprobe";
import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const workDir = path.join(rootDir, "work");
const uploadDir = path.join(workDir, "uploads");
const exportDir = path.join(workDir, "exports");
const tempDir = path.join(workDir, "temp");
const distDir = path.join(rootDir, "dist");
const ffmpegPath = process.env.FFMPEG_PATH || ffmpeg.path;
const ffprobePath = process.env.FFPROBE_PATH || ffprobe.path;

await Promise.all([
  fsp.mkdir(uploadDir, { recursive: true }),
  fsp.mkdir(exportDir, { recursive: true }),
  fsp.mkdir(tempDir, { recursive: true })
]);

const app = express();
const port = Number(process.env.PORT || 8787);
const jobs = new Map();
const assets = new Map();

app.use(express.json({ limit: "8mb" }));

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDir),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".mp4";
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024 * 1024
  }
});

function decodeOriginalName(name) {
  if (!name) {
    return "未命名素材";
  }

  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    return decoded.includes("\uFFFD") ? name : decoded;
  } catch {
    return name;
  }
}

function sanitizeSegments(segments) {
  if (!Array.isArray(segments) || !segments.length) {
    throw new Error("没有可渲染的片段");
  }

  return segments
    .filter((segment) => segment?.enabled !== false)
    .map((segment) => ({
      id: String(segment.id || crypto.randomUUID()),
      start: Math.max(0, Number(segment.start) || 0),
      end: Math.max(0, Number(segment.end) || 0),
      duration: 0,
      motion: Math.max(0, Number(segment.motion) || 0),
      brightness: Math.max(0, Number(segment.brightness) || 0),
      shotChange: Math.max(0, Number(segment.shotChange) || 0),
      confidence: Math.max(0, Number(segment.confidence) || 0),
      transition: ["cut", "dissolve", "slide", "flash", "glitch"].includes(segment.transition)
        ? segment.transition
        : "dissolve",
      effect: ["none", "color-pop", "punch-in", "soft-focus", "caption-pop"].includes(
        segment.effect
      )
        ? segment.effect
        : "none",
      playbackRate: Math.max(0.5, Math.min(2, Number(segment.playbackRate) || 1)),
      volume:
        segment.volume === undefined
          ? 1
          : Math.max(0, Math.min(2, Number(segment.volume) || 0)),
      fit: segment.fit === "contain" ? "contain" : "cover",
      enabled: true
    }))
    .filter((segment) => segment.end - segment.start >= 0.25)
    .sort((a, b) => a.start - b.start)
    .map((segment) => ({
      ...segment,
      duration: (segment.end - segment.start) / segment.playbackRate
    }));
}

function getOutputSize(settings) {
  const resolution = settings?.resolution === "4k" ? "4k" : "2k";
  const aspectRatio = ["16:9", "9:16", "1:1"].includes(settings?.aspectRatio)
    ? settings.aspectRatio
    : "16:9";

  const sizes = {
    "2k": {
      "16:9": [2560, 1440],
      "9:16": [1440, 2560],
      "1:1": [1440, 1440]
    },
    "4k": {
      "16:9": [3840, 2160],
      "9:16": [2160, 3840],
      "1:1": [2160, 2160]
    }
  };

  const [width, height] = sizes[resolution][aspectRatio];
  return { width, height, resolution, aspectRatio };
}

function buildVideoFilters(segment, settings) {
  const { width, height } = getOutputSize(settings);
  const punchScale = segment.effect === "punch-in" ? 1.055 : 1;
  const scaledWidth = Math.round(width * punchScale);
  const scaledHeight = Math.round(height * punchScale);
  const filters =
    segment.fit === "contain"
      ? [
          `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=decrease`,
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
          "setsar=1"
        ]
      : [
          `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase`,
          `crop=${width}:${height}`,
          "setsar=1"
        ];

  if (segment.effect === "color-pop") {
    filters.push("eq=contrast=1.07:saturation=1.16");
  }

  if (segment.effect === "soft-focus") {
    filters.push("gblur=sigma=0.7", "eq=contrast=1.02:saturation=0.98");
  }

  if (segment.effect === "caption-pop") {
    const boxWidth = Math.max(180, Math.round(width * 0.18));
    const boxHeight = Math.max(38, Math.round(height * 0.052));
    const boxX = Math.round(width * 0.72);
    const boxY = Math.round(height * 0.08);
    filters.push(
      `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=${boxHeight}:color=0xff6b35@0.88:t=fill`,
      "eq=contrast=1.03:saturation=1.06"
    );
  }

  if (segment.playbackRate !== 1) {
    filters.push(`setpts=PTS/${segment.playbackRate.toFixed(3)}`);
  }
  filters.push("fps=30", "format=yuv420p");
  return filters.join(",");
}

function transitionDuration(segment) {
  if (!segment || segment.transition === "cut") {
    return 0;
  }

  return Math.max(0.24, Math.min(0.42, segment.duration * 0.2));
}

function parseTimestamp(value) {
  const match = value.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    return 0;
  }

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function runFfmpeg(args, options = {}) {
  const { expectedDuration = 0, onProgress, label = "ffmpeg" } = options;

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, {
      windowsHide: true
    });
    let stderr = "";

    process.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (stderr.length > 30000) {
        stderr = stderr.slice(-30000);
      }

      if (expectedDuration > 0 && onProgress) {
        const timestamps = [...text.matchAll(/time=(\d+:\d+:\d+(?:\.\d+)?)/g)];
        const lastTimestamp = timestamps.at(-1)?.[1];
        if (lastTimestamp) {
          onProgress(Math.min(1, parseTimestamp(lastTimestamp) / expectedDuration));
        }
      }
    });

    process.on("error", (error) => {
      reject(new Error(`${label} 启动失败: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = stderr
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-8)
        .join("\n");
      reject(new Error(`${label} 渲染失败\n${detail}`));
    });
  });
}

async function probeMedia(filePath) {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    filePath
  ]);
  return JSON.parse(stdout);
}

function quoteConcatPath(filePath) {
  return filePath.replaceAll("\\", "/").replaceAll("'", "'\\''");
}

async function renderNormalizedSegment({
  asset,
  segment,
  settings,
  targetPath,
  hasAudio,
  job,
  progressBase,
  progressRange
}) {
  const filters = buildVideoFilters(segment, settings);
  const sourceDuration = segment.end - segment.start;
  const args = [
    "-y",
    "-ss",
    segment.start.toFixed(3),
    "-t",
    sourceDuration.toFixed(3),
    "-i",
    asset.path
  ];

  if (!hasAudio) {
    args.push(
      "-f",
      "lavfi",
      "-t",
      segment.duration.toFixed(3),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=48000"
    );
  }

  if (hasAudio) {
    args.push(
      "-filter_complex",
      `[0:v]${filters}[v];[0:a]aresample=48000,asetpts=PTS-STARTPTS,volume=${segment.volume.toFixed(
        3
      )},atempo=${segment.playbackRate.toFixed(3)}[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]"
    );
  } else {
    args.push(
      "-filter_complex",
      `[0:v]${filters}[v];[1:a]anull[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]"
    );
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-pix_fmt",
    "yuv420p",
    "-shortest",
    "-movflags",
    "+faststart",
    targetPath
  );

  await runFfmpeg(args, {
    label: "片段渲染",
    expectedDuration: segment.duration,
    onProgress: (progress) => {
      job.progress = progressBase + progress * progressRange;
      job.stage = "渲染镜头与特效";
    }
  });
}

async function renderTrimmedPiece(sourcePath, start, duration, targetPath) {
  await runFfmpeg(
    [
      "-y",
      "-ss",
      start.toFixed(3),
      "-t",
      duration.toFixed(3),
      "-i",
      sourcePath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      targetPath
    ],
    { label: "时间线切片" }
  );
}

async function renderTransition(
  previousPath,
  nextPath,
  segment,
  targetPath,
  previousDuration
) {
  const duration = transitionDuration(segment);
  const half = Math.max(0.12, duration / 2);
  const color = segment.transition === "flash" ? "white" : "black";
  const noise = segment.transition === "glitch" ? "noise=alls=10:allf=t," : "";
  const previousStart = Math.max(0, previousDuration - half);
  const outPath = `${targetPath}.out.mp4`;
  const inPath = `${targetPath}.in.mp4`;
  const listPath = `${targetPath}.txt`;

  const commonOutputArgs = [
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart"
  ];

  await runFfmpeg(
    [
      "-y",
      "-ss",
      previousStart.toFixed(3),
      "-t",
      half.toFixed(3),
      "-i",
      previousPath,
      "-vf",
      `${noise}fade=t=out:st=0:d=${half.toFixed(3)}:color=${color}`,
      "-af",
      `afade=t=out:st=0:d=${half.toFixed(3)}`,
      ...commonOutputArgs,
      outPath
    ],
    { label: "渲染转场出场" }
  );

  await runFfmpeg(
    [
      "-y",
      "-ss",
      "0",
      "-t",
      half.toFixed(3),
      "-i",
      nextPath,
      "-vf",
      `${noise}fade=t=in:st=0:d=${half.toFixed(3)}:color=${color}`,
      "-af",
      `afade=t=in:st=0:d=${half.toFixed(3)}`,
      ...commonOutputArgs,
      inPath
    ],
    { label: "渲染转场入场" }
  );

  await fsp.writeFile(
    listPath,
    [outPath, inPath].map((filePath) => `file '${quoteConcatPath(filePath)}'`).join("\n"),
    "utf8"
  );
  await runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      targetPath
    ],
    { label: "合并转场" }
  );

  await Promise.all([
    fsp.rm(outPath, { force: true }),
    fsp.rm(inPath, { force: true }),
    fsp.rm(listPath, { force: true })
  ]);
}

async function renderProject(job, asset, segments, settings) {
  const jobTempDir = path.join(tempDir, job.id);
  const normalizedDir = path.join(jobTempDir, "normalized");
  const piecesDir = path.join(jobTempDir, "pieces");
  await fsp.mkdir(normalizedDir, { recursive: true });
  await fsp.mkdir(piecesDir, { recursive: true });

  const media = await probeMedia(asset.path);
  const hasAudio = media.streams?.some((stream) => stream.codec_type === "audio");
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const outgoingTransitions = segments.map((segment, index) => {
    if (index === segments.length - 1) {
      return "cut";
    }
    return segment.transition;
  });

  job.status = "rendering";
  job.stage = "准备素材";
  job.progress = 0.02;

  const normalizedPaths = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const targetPath = path.join(normalizedDir, `${String(index).padStart(3, "0")}.mp4`);
    const base = 0.04 + (index / segments.length) * 0.68;
    const range = 0.68 / segments.length;
    await renderNormalizedSegment({
      asset,
      segment,
      settings,
      targetPath,
      hasAudio,
      job,
      progressBase: base,
      progressRange: range
    });
    normalizedPaths.push(targetPath);
  }

  job.stage = "合成时间线";
  job.progress = 0.76;

  const timelinePieces = [];
  for (let index = 0; index < normalizedPaths.length; index += 1) {
    const segment = segments[index];
    const incoming =
      index > 0
        ? transitionDuration({
            ...segments[index - 1],
            transition: outgoingTransitions[index - 1]
          }) / 2
        : 0;
    const outgoing = transitionDuration({
      ...segment,
      transition: outgoingTransitions[index]
    }) / 2;
    const mainStart = incoming;
    const mainDuration = segment.duration - incoming - outgoing;

    if (mainDuration >= 0.18) {
      const piecePath = path.join(piecesDir, `${String(index).padStart(3, "0")}-main.mp4`);
      await renderTrimmedPiece(normalizedPaths[index], mainStart, mainDuration, piecePath);
      timelinePieces.push(piecePath);
    }

    if (outgoing > 0 && index < normalizedPaths.length - 1) {
      const transitionPath = path.join(
        piecesDir,
        `${String(index).padStart(3, "0")}-transition.mp4`
      );
      await renderTransition(
        normalizedPaths[index],
        normalizedPaths[index + 1],
        { ...segment, transition: outgoingTransitions[index] },
        transitionPath,
        segment.duration
      );
      timelinePieces.push(transitionPath);
    }
  }

  job.stage = "封装 2K/4K 成片";
  job.progress = 0.9;

  const concatPath = path.join(jobTempDir, "concat.txt");
  const concatBody = timelinePieces
    .map((piece) => `file '${quoteConcatPath(piece)}'`)
    .join("\n");
  await fsp.writeFile(concatPath, concatBody, "utf8");

  const outputName = `${job.id}.mp4`;
  const outputPath = path.join(exportDir, outputName);
  await runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath
    ],
    { label: "成片封装" }
  );

  const outputStat = await fsp.stat(outputPath);
  job.status = "complete";
  job.progress = 1;
  job.stage = "渲染完成";
  job.outputName = outputName;
  job.outputUrl = `/api/exports/${job.id}`;
  job.outputSize = outputStat.size;
  job.outputDuration = totalDuration;
  await fsp.rm(jobTempDir, { recursive: true, force: true });
}

app.get("/api/health", async (_request, response) => {
  response.json({
    ok: true,
    ffmpeg: Boolean(ffmpegPath),
    ffprobe: Boolean(ffprobePath)
  });
});

app.post("/api/assets", upload.single("file"), async (request, response) => {
  try {
    if (!request.file) {
      response.status(400).json({ error: "请选择视频文件" });
      return;
    }

    const metadata = request.body.metadata ? JSON.parse(request.body.metadata) : {};
    const id = crypto.randomUUID();
    const originalName = decodeOriginalName(request.file.originalname);
    const asset = {
      id,
      name: originalName,
      path: request.file.path,
      size: request.file.size,
      createdAt: new Date().toISOString(),
      metadata
    };
    assets.set(id, asset);

    response.status(201).json({
      id,
      name: originalName,
      metadata: asset.metadata
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "素材上传失败"
    });
  }
});

app.post("/api/render", async (request, response) => {
  try {
    const { assetId, segments: rawSegments, settings } = request.body || {};
    const asset = assets.get(assetId);
    if (!asset) {
      response.status(404).json({ error: "素材不存在，请重新上传" });
      return;
    }

    const segments = sanitizeSegments(rawSegments);
    const id = crypto.randomUUID();
    const job = {
      id,
      assetId,
      status: "queued",
      progress: 0,
      stage: "等待渲染",
      createdAt: new Date().toISOString()
    };
    jobs.set(id, job);

    renderProject(job, asset, segments, settings).catch((error) => {
      job.status = "failed";
      job.stage = "渲染失败";
      job.error = error instanceof Error ? error.message : "未知渲染错误";
    });

    response.status(202).json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "渲染任务创建失败"
    });
  }
});

app.get("/api/jobs/:jobId", (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) {
    response.status(404).json({ error: "任务不存在" });
    return;
  }

  response.json(job);
});

app.get("/api/exports/:jobId", async (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job || job.status !== "complete" || !job.outputName) {
    response.status(404).json({ error: "成片不存在或尚未完成" });
    return;
  }

  const outputPath = path.join(exportDir, job.outputName);
  response.setHeader("Content-Type", "video/mp4");
  response.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(job.outputName)}"`
  );
  response.sendFile(outputPath);
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Autocut API listening on http://127.0.0.1:${port}`);
});
