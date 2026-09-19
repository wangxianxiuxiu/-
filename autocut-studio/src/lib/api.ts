import type {
  RenderJob,
  RenderSettings,
  SceneSegment,
  VideoMetadata
} from "../types";

interface AssetResponse {
  id: string;
  name: string;
  metadata: VideoMetadata;
}

export async function uploadAsset(file: File, metadata: VideoMetadata): Promise<AssetResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("metadata", JSON.stringify(metadata));

  const response = await fetch("/api/assets", {
    method: "POST",
    body
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "素材上传失败");
  }

  return response.json();
}

export async function createRenderJob(
  assetId: string,
  segments: SceneSegment[],
  settings: RenderSettings
): Promise<RenderJob> {
  const response = await fetch("/api/render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assetId,
      segments,
      settings
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "渲染任务创建失败");
  }

  return response.json();
}

export async function getRenderJob(jobId: string): Promise<RenderJob> {
  const response = await fetch(`/api/jobs/${jobId}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "无法读取渲染进度");
  }

  return response.json();
}

export async function waitForRenderJob(
  jobId: string,
  onProgress: (job: RenderJob) => void
): Promise<RenderJob> {
  for (;;) {
    const job = await getRenderJob(jobId);
    onProgress(job);

    if (job.status === "complete" || job.status === "failed") {
      return job;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1100));
  }
}
