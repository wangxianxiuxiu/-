export type Resolution = "2k" | "4k";
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type EditStyle = "dynamic" | "narrative" | "product" | "clean";

export type TransitionKind =
  | "cut"
  | "dissolve"
  | "slide"
  | "flash"
  | "glitch";

export type EffectKind =
  | "none"
  | "color-pop"
  | "punch-in"
  | "soft-focus"
  | "caption-pop";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  type: string;
}

export interface SceneSegment {
  id: string;
  start: number;
  end: number;
  duration: number;
  motion: number;
  brightness: number;
  shotChange: number;
  confidence: number;
  transition: TransitionKind;
  effect: EffectKind;
  playbackRate: number;
  volume: number;
  fit: "cover" | "contain";
  enabled: boolean;
}

export interface AnalysisResult {
  duration: number;
  averageMotion: number;
  averageBrightness: number;
  sceneCount: number;
  segments: SceneSegment[];
}

export interface RenderSettings {
  resolution: Resolution;
  aspectRatio: AspectRatio;
  style: EditStyle;
  autoTransitions: boolean;
  autoEffects: boolean;
}

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "complete" | "failed";
  progress: number;
  stage: string;
  outputUrl?: string;
  error?: string;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  duration: number;
  sceneCount: number;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  status: "draft" | "analyzed" | "rendered";
}
