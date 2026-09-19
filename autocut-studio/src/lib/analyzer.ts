import type {
  AnalysisResult,
  EditStyle,
  EffectKind,
  SceneSegment,
  TransitionKind,
  VideoMetadata
} from "../types";

const SAMPLE_WIDTH = 160;
const SAMPLE_HEIGHT = 90;
const MAX_SAMPLES = 120;
const MIN_SEGMENT_DURATION = 1.15;
const MAX_SEGMENTS = 14;

interface FrameSample {
  time: number;
  brightness: number;
  red: number;
  green: number;
  blue: number;
  signature: Float32Array;
}

interface SegmentDraft {
  start: number;
  end: number;
  motion: number;
  brightness: number;
  shotChange: number;
}

function waitForEvent(target: EventTarget, event: string, timeout = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`等待 ${event} 超时`));
    }, timeout);

    const onEvent = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("浏览器无法读取这个视频文件"));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("视频定位超时"));
    }, 8000);

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("视频帧读取失败"));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.04, 0));
  });
}

function frameDistance(previous: FrameSample, current: FrameSample) {
  let signatureDelta = 0;
  const length = Math.min(previous.signature.length, current.signature.length);

  for (let index = 0; index < length; index += 1) {
    signatureDelta += Math.abs(previous.signature[index] - current.signature[index]);
  }

  const pixelDelta = length ? signatureDelta / length : 0;
  const colorDelta =
    (Math.abs(previous.red - current.red) +
      Math.abs(previous.green - current.green) +
      Math.abs(previous.blue - current.blue)) /
    3;
  const brightnessDelta = Math.abs(previous.brightness - current.brightness);

  return {
    motion: clamp(pixelDelta / 72),
    colorShift: clamp(colorDelta / 78),
    brightnessShift: clamp(brightnessDelta / 70)
  };
}

function chooseTransition(
  draft: SegmentDraft,
  style: EditStyle,
  position: number,
  total: number
): TransitionKind {
  if (position === 0) {
    return "cut";
  }

  if (style === "clean") {
    return draft.shotChange > 0.72 ? "cut" : "dissolve";
  }

  if (style === "narrative") {
    return draft.shotChange > 0.52 ? "dissolve" : "cut";
  }

  if (style === "product") {
    if (draft.brightness > 0.72 || draft.shotChange > 0.66) {
      return "slide";
    }
    return "dissolve";
  }

  if (draft.motion > 0.56) {
    return position % 3 === 0 ? "glitch" : "slide";
  }

  if (draft.shotChange > 0.7) {
    return "flash";
  }

  return position === total - 1 ? "dissolve" : "slide";
}

function chooseEffect(draft: SegmentDraft, style: EditStyle, position: number): EffectKind {
  if (style === "clean") {
    return position % 4 === 0 ? "color-pop" : "none";
  }

  if (style === "narrative") {
    if (draft.motion < 0.18 && draft.brightness > 0.42) {
      return "caption-pop";
    }
    return position % 3 === 0 ? "soft-focus" : "none";
  }

  if (style === "product") {
    if (draft.motion < 0.24) {
      return "punch-in";
    }
    return position % 2 === 0 ? "color-pop" : "none";
  }

  if (draft.motion > 0.52) {
    return position % 2 === 0 ? "punch-in" : "none";
  }

  if (draft.shotChange > 0.6) {
    return "color-pop";
  }

  return position % 3 === 0 ? "caption-pop" : "none";
}

function mergeShortSegments(segments: SegmentDraft[], duration: number) {
  if (!segments.length) {
    return [
      {
        start: 0,
        end: duration,
        motion: 0.2,
        brightness: 0.5,
        shotChange: 0.35
      }
    ];
  }

  const merged: SegmentDraft[] = [];

  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && segment.end - segment.start < MIN_SEGMENT_DURATION) {
      previous.end = segment.end;
      previous.motion = (previous.motion + segment.motion) / 2;
      previous.brightness = (previous.brightness + segment.brightness) / 2;
      previous.shotChange = Math.max(previous.shotChange, segment.shotChange);
      continue;
    }

    merged.push({ ...segment });
  }

  if (merged.length && merged[0].end - merged[0].start < MIN_SEGMENT_DURATION) {
    merged[0].end = Math.min(duration, merged[0].start + MIN_SEGMENT_DURATION);
  }

  return merged;
}

export async function readVideoMetadata(file: File): Promise<VideoMetadata> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");
    return {
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
      size: file.size,
      type: file.type || "video"
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function analyzeVideo(
  file: File,
  style: EditStyle,
  onProgress: (progress: number, stage: string) => void
): Promise<AnalysisResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  if (!context) {
    URL.revokeObjectURL(url);
    throw new Error("浏览器不支持视频画面分析");
  }

  try {
    onProgress(0.04, "读取媒体信息");
    await waitForEvent(video, "loadedmetadata");

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) {
      throw new Error("无法读取视频时长");
    }

    const sampleCount = Math.max(20, Math.min(MAX_SAMPLES, Math.ceil(duration / 1.8)));
    const sampleInterval = duration / sampleCount;
    const samples: FrameSample[] = [];

    for (let index = 0; index < sampleCount; index += 1) {
      const time = Math.min(index * sampleInterval, duration - 0.04);
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const image = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const signature = new Float32Array(SAMPLE_WIDTH * SAMPLE_HEIGHT);
      let brightness = 0;
      let red = 0;
      let green = 0;
      let blue = 0;

      for (let pixel = 0; pixel < image.data.length; pixel += 4) {
        const r = image.data[pixel];
        const g = image.data[pixel + 1];
        const b = image.data[pixel + 2];
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        signature[pixel / 4] = luma;
        brightness += luma;
        red += r;
        green += g;
        blue += b;
      }

      const pixels = SAMPLE_WIDTH * SAMPLE_HEIGHT;
      samples.push({
        time,
        brightness: brightness / pixels / 255,
        red: red / pixels,
        green: green / pixels,
        blue: blue / pixels,
        signature
      });

      const progress = 0.08 + (index / sampleCount) * 0.72;
      onProgress(progress, "识别镜头与运动");
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const drafts: SegmentDraft[] = [];
    let segmentStart = 0;
    let totalMotion = 0;
    let totalBrightness = 0;
    let recentMotion = 0;
    let recentBrightness = samples[0]?.brightness ?? 0.5;

    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const current = samples[index];
      const distance = frameDistance(previous, current);
      totalMotion += distance.motion;
      totalBrightness += current.brightness;
      recentMotion = recentMotion * 0.64 + distance.motion * 0.36;
      recentBrightness = recentBrightness * 0.72 + current.brightness * 0.28;

      const shotChange = clamp(
        distance.motion * 0.48 +
          distance.colorShift * 0.28 +
          distance.brightnessShift * 0.24
      );
      const elapsed = current.time - segmentStart;
      const enoughSpace = duration - current.time > MIN_SEGMENT_DURATION;
      const naturalBoundary = shotChange > (style === "dynamic" ? 0.34 : 0.42);

      if (elapsed >= MIN_SEGMENT_DURATION && naturalBoundary && enoughSpace) {
        drafts.push({
          start: segmentStart,
          end: current.time,
          motion: recentMotion,
          brightness: recentBrightness,
          shotChange
        });
        segmentStart = current.time;
        recentMotion *= 0.4;
      }
    }

    drafts.push({
      start: segmentStart,
      end: duration,
      motion: recentMotion,
      brightness: recentBrightness,
      shotChange: 0.28
    });

    onProgress(0.86, "生成剪辑节奏");

    let segments = mergeShortSegments(drafts, duration);
    if (segments.length === 1 && duration > 4) {
      const targetCount = Math.min(6, Math.max(3, Math.round(duration / 12)));
      const segmentDuration = duration / targetCount;
      segments = Array.from({ length: targetCount }, (_, index) => {
        const start = index * segmentDuration;
        const end = index === targetCount - 1 ? duration : (index + 1) * segmentDuration;
        const relatedSamples = samples.filter((sample) => sample.time >= start && sample.time < end);
        const brightness =
          relatedSamples.reduce((sum, sample) => sum + sample.brightness, 0) /
          Math.max(relatedSamples.length, 1);
        return {
          start,
          end,
          brightness,
          motion: 0.18 + index * 0.035,
          shotChange: 0.26 + index * 0.04
        };
      });
    }

    if (segments.length > MAX_SEGMENTS) {
      const stride = segments.length / MAX_SEGMENTS;
      segments = Array.from({ length: MAX_SEGMENTS }, (_, index) => {
        const start = segments[Math.floor(index * stride)].start;
        const next = segments[Math.min(segments.length - 1, Math.floor((index + 1) * stride))];
        return { ...segments[Math.floor(index * stride)], start, end: next.end };
      });
    }

    const resultSegments: SceneSegment[] = segments.map((segment, index) => {
      const confidence = clamp(0.58 + segment.shotChange * 0.34 + segment.motion * 0.12);
      return {
        id: crypto.randomUUID(),
        start: segment.start,
        end: segment.end,
        duration: segment.end - segment.start,
        motion: segment.motion,
        brightness: segment.brightness,
        shotChange: segment.shotChange,
        confidence,
        transition: chooseTransition(segment, style, index, segments.length),
        effect: chooseEffect(segment, style, index),
        playbackRate: 1,
        volume: 1,
        fit: "cover",
        enabled: true
      };
    });

    const averageMotion = totalMotion / Math.max(samples.length - 1, 1);
    const averageBrightness = totalBrightness / Math.max(samples.length - 1, 1);

    onProgress(1, "方案完成");

    return {
      duration,
      averageMotion,
      averageBrightness,
      sceneCount: resultSegments.length,
      segments: resultSegments
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function replanSegments(segments: SceneSegment[], style: EditStyle): SceneSegment[] {
  return segments.map((segment, index) => {
    const draft: SegmentDraft = {
      start: segment.start,
      end: segment.end,
      motion: segment.motion,
      brightness: segment.brightness,
      shotChange: segment.shotChange
    };

    return {
      ...segment,
      transition: chooseTransition(draft, style, index, segments.length),
      effect: chooseEffect(draft, style, index)
    };
  });
}
