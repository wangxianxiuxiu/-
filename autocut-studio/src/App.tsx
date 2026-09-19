import {
  BadgeCheck,
  BrainCircuit,
  Captions,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileVideo,
  Film,
  FolderOpen,
  Gauge,
  HardDrive,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  Menu,
  MoveLeft,
  MoveRight,
  MonitorPlay,
  MoreHorizontal,
  Paintbrush,
  PanelRight,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  ScanSearch,
  Scissors,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Split,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeVideo, readVideoMetadata, replanSegments } from "./lib/analyzer";
import { createRenderJob, uploadAsset, waitForRenderJob } from "./lib/api";
import type {
  AnalysisResult,
  AspectRatio,
  EditStyle,
  RenderJob,
  RenderSettings,
  Resolution,
  SavedProject,
  SceneSegment,
  VideoMetadata
} from "./types";

const resolutionOptions: Array<{
  value: Resolution;
  label: string;
  detail: string;
}> = [
  { value: "2k", label: "2K", detail: "1440p" },
  { value: "4k", label: "4K", detail: "2160p" }
];

const aspectOptions: Array<{ value: AspectRatio; label: string; icon: string }> = [
  { value: "16:9", label: "横屏", icon: "16:9" },
  { value: "9:16", label: "竖屏", icon: "9:16" },
  { value: "1:1", label: "方形", icon: "1:1" }
];

const styleOptions: Array<{
  value: EditStyle;
  label: string;
  detail: string;
}> = [
  { value: "dynamic", label: "动感节奏", detail: "快切 / 卡点" },
  { value: "narrative", label: "叙事对白", detail: "转场克制" },
  { value: "product", label: "产品展示", detail: "强调细节" },
  { value: "clean", label: "干净商务", detail: "统一稳定" }
];

const transitionLabels = {
  cut: "硬切",
  dissolve: "溶解",
  slide: "滑动",
  flash: "闪白",
  glitch: "故障"
};

const effectLabels = {
  none: "无特效",
  "color-pop": "色彩增强",
  "punch-in": "局部推近",
  "soft-focus": "柔焦",
  "caption-pop": "字幕提示"
};

const effectFilters: Record<SceneSegment["effect"], string> = {
  none: "none",
  "color-pop": "saturate(1.22) contrast(1.06)",
  "punch-in": "saturate(1.04) contrast(1.04)",
  "soft-focus": "saturate(0.96) contrast(0.98) blur(0.4px)",
  "caption-pop": "saturate(1.08) contrast(1.04)"
};

function formatDuration(value: number) {
  if (!Number.isFinite(value)) {
    return "00:00";
  }

  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function loadSavedProjects(): SavedProject[] {
  try {
    const raw = window.localStorage.getItem("autocut-projects");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fileWithoutExtension(name: string) {
  return name.replace(/\.[^.]+$/, "") || "未命名项目";
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 1080);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [projectName, setProjectName] = useState("未命名项目");
  const [settings, setSettings] = useState<RenderSettings>({
    resolution: "2k",
    aspectRatio: "16:9",
    style: "dynamic",
    autoTransitions: true,
    autoEffects: true
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadSavedProjects);
  const [undoStack, setUndoStack] = useState<SceneSegment[][]>([]);
  const [redoStack, setRedoStack] = useState<SceneSegment[][]>([]);

  const activeSegment = useMemo(
    () => analysis?.segments.find((segment) => segment.id === activeSegmentId) ?? null,
    [activeSegmentId, analysis]
  );
  const activeSegmentIndex = useMemo(
    () => analysis?.segments.findIndex((segment) => segment.id === activeSegmentId) ?? -1,
    [activeSegmentId, analysis]
  );

  const enabledSegments = useMemo(
    () => analysis?.segments.filter((segment) => segment.enabled) ?? [],
    [analysis]
  );

  const outputSize = useMemo(() => {
    const sizeMap = {
      "2k": {
        "16:9": "2560 × 1440",
        "9:16": "1440 × 2560",
        "1:1": "1440 × 1440"
      },
      "4k": {
        "16:9": "3840 × 2160",
        "9:16": "2160 × 3840",
        "1:1": "2160 × 2160"
      }
    };
    return sizeMap[settings.resolution][settings.aspectRatio];
  }, [settings.aspectRatio, settings.resolution]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    window.localStorage.setItem("autocut-projects", JSON.stringify(savedProjects.slice(0, 12)));
  }, [savedProjects]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSegment) {
      return;
    }

    video.playbackRate = activeSegment.playbackRate;
    video.volume = activeSegment.volume;

    const stopAtEnd = () => {
      if (video.currentTime >= activeSegment.end) {
        video.pause();
        setIsPlaying(false);
      }
    };

    video.addEventListener("timeupdate", stopAtEnd);
    return () => video.removeEventListener("timeupdate", stopAtEnd);
  }, [activeSegment]);

  async function handleFile(nextFile: File) {
    if (!nextFile.type.startsWith("video/")) {
      setNotice({ tone: "error", message: "请选择有效的视频文件" });
      return;
    }

    try {
      const nextMetadata = await readVideoMetadata(nextFile);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
      setMetadata(nextMetadata);
      setProjectName(fileWithoutExtension(nextFile.name));
      setAnalysis(null);
      setUndoStack([]);
      setRedoStack([]);
      setActiveSegmentId("");
      setAssetId("");
      setRenderJob(null);
      setIsPlaying(false);
      setNotice({
        tone: "success",
        message: `已读取 ${formatDuration(nextMetadata.duration)} 视频`
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "视频读取失败"
      });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files[0];
    if (nextFile) {
      void handleFile(nextFile);
    }
  }

  async function handleAnalyze() {
    if (!file || !metadata) {
      inputRef.current?.click();
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0.01);
    setAnalysisStage("启动分析");
    setRenderJob(null);

    try {
      const result = await analyzeVideo(file, settings.style, (progress, stage) => {
        setAnalysisProgress(progress);
        setAnalysisStage(stage);
      });

      setAnalysis(result);
      setUndoStack([]);
      setRedoStack([]);
      setActiveSegmentId(result.segments[0]?.id ?? "");
      const now = new Date().toISOString();
      setSavedProjects((projects) => [
        {
          id: crypto.randomUUID(),
          name: projectName,
          createdAt: now,
          duration: result.duration,
          sceneCount: result.sceneCount,
          resolution: settings.resolution,
          aspectRatio: settings.aspectRatio,
          status: "analyzed"
        },
        ...projects.filter((project) => project.name !== projectName)
      ]);
      setNotice({
        tone: "success",
        message: `已生成 ${result.sceneCount} 个镜头与效果方案`
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "分析失败"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisStage("");
    }
  }

  function updateSettings(patch: Partial<RenderSettings>) {
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);

    if (patch.style && analysis) {
      setUndoStack((stack) => [...stack.slice(-29), analysis.segments]);
      setRedoStack([]);
      setAnalysis({
        ...analysis,
        segments: replanSegments(analysis.segments, patch.style)
      });
    }
  }

  function updateSegments(
    updater: (segments: SceneSegment[]) => SceneSegment[],
    activeId?: string
  ) {
    if (!analysis) {
      return;
    }

    const nextSegments = updater(analysis.segments);
    setUndoStack((stack) => [...stack.slice(-29), analysis.segments]);
    setRedoStack([]);
    setAnalysis({
      ...analysis,
      segments: nextSegments,
      sceneCount: nextSegments.length
    });

    if (activeId) {
      setActiveSegmentId(activeId);
    }
  }

  function undoEdit() {
    if (!analysis || !undoStack.length) {
      return;
    }

    const previous = undoStack.at(-1)!;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [analysis.segments, ...stack].slice(0, 30));
    setAnalysis({
      ...analysis,
      segments: previous,
      sceneCount: previous.length
    });
    setActiveSegmentId((current) =>
      previous.some((segment) => segment.id === current) ? current : previous[0]?.id || ""
    );
  }

  function redoEdit() {
    if (!analysis || !redoStack.length) {
      return;
    }

    const next = redoStack[0];
    setRedoStack((stack) => stack.slice(1));
    setUndoStack((stack) => [...stack.slice(-29), analysis.segments]);
    setAnalysis({
      ...analysis,
      segments: next,
      sceneCount: next.length
    });
    setActiveSegmentId((current) =>
      next.some((segment) => segment.id === current) ? current : next[0]?.id || ""
    );
  }

  function toggleSegment(segmentId: string) {
    updateSegments((segments) =>
      segments.map((segment) =>
        segment.id === segmentId
          ? { ...segment, enabled: !segment.enabled }
          : segment
      )
    );
  }

  function cycleTransition(segmentId: string) {
    const transitions: SceneSegment["transition"][] = [
      "cut",
      "dissolve",
      "slide",
      "flash",
      "glitch"
    ];
    updateSegments((segments) =>
      segments.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }
          const currentIndex = transitions.indexOf(segment.transition);
          return {
            ...segment,
            transition: transitions[(currentIndex + 1) % transitions.length]
          };
        })
    );
  }

  function cycleEffect(segmentId: string) {
    const effects: SceneSegment["effect"][] = [
      "none",
      "color-pop",
      "punch-in",
      "soft-focus",
      "caption-pop"
    ];
    updateSegments((segments) =>
      segments.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }
          const currentIndex = effects.indexOf(segment.effect);
          return {
            ...segment,
            effect: effects[(currentIndex + 1) % effects.length]
          };
        })
    );
  }

  function updateSegment(
    segmentId: string,
    patch: Partial<SceneSegment>
  ) {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment;
        }

        const next = { ...segment, ...patch };
        next.start = Math.max(0, Math.min(next.start, next.end - 0.25));
        next.end = Math.min(metadata?.duration || next.end, Math.max(next.end, next.start + 0.25));
        next.playbackRate = Math.max(0.5, Math.min(2, next.playbackRate));
        next.volume = Math.max(0, Math.min(1.5, next.volume));
        next.duration = (next.end - next.start) / next.playbackRate;
        return next;
      })
    );
  }

  function trimSegment(edge: "start" | "end", value: number) {
    if (!activeSegment || !metadata) {
      return;
    }

    if (edge === "start") {
      updateSegment(activeSegment.id, {
        start: Math.max(0, Math.min(value, activeSegment.end - 0.25))
      });
      return;
    }

    updateSegment(activeSegment.id, {
      end: Math.min(metadata.duration, Math.max(value, activeSegment.start + 0.25))
    });
  }

  function splitActiveSegment() {
    if (!activeSegment) {
      return;
    }

    const playhead = videoRef.current?.currentTime ?? (activeSegment.start + activeSegment.end) / 2;
    const minimumPadding = 0.25;
    const splitAt = Math.max(
      activeSegment.start + minimumPadding,
      Math.min(activeSegment.end - minimumPadding, playhead)
    );

    if (splitAt <= activeSegment.start || splitAt >= activeSegment.end) {
      setNotice({ tone: "error", message: "当前播放位置无法分割" });
      return;
    }

    const secondId = crypto.randomUUID();
    updateSegments(
      (segments) =>
        segments.flatMap((segment) =>
          segment.id === activeSegment.id
            ? [
                {
                  ...segment,
                  end: splitAt,
                  duration: (splitAt - segment.start) / segment.playbackRate
                },
                {
                  ...segment,
                  id: secondId,
                  start: splitAt,
                  duration: (segment.end - splitAt) / segment.playbackRate,
                  transition: "cut"
                }
              ]
            : [segment]
        ),
      secondId
    );
    setNotice({ tone: "success", message: "镜头已分割" });
  }

  function duplicateActiveSegment() {
    if (!activeSegment) {
      return;
    }

    const duplicate: SceneSegment = {
      ...activeSegment,
      id: crypto.randomUUID(),
      transition: "cut"
    };
    updateSegments(
      (segments) => {
        const index = segments.findIndex((segment) => segment.id === activeSegment.id);
        const next = [...segments];
        next.splice(index + 1, 0, duplicate);
        return next;
      },
      duplicate.id
    );
    setNotice({ tone: "success", message: "已复制当前镜头" });
  }

  function moveActiveSegment(direction: -1 | 1) {
    if (!activeSegment) {
      return;
    }

    updateSegments((segments) => {
      const index = segments.findIndex((segment) => segment.id === activeSegment.id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= segments.length) {
        return segments;
      }

      const next = [...segments];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeActiveSegment() {
    if (!analysis || !activeSegment) {
      return;
    }

    if (analysis.segments.length <= 1) {
      setNotice({ tone: "error", message: "至少保留一个镜头" });
      return;
    }

    const index = analysis.segments.findIndex((segment) => segment.id === activeSegment.id);
    const nextSegments = analysis.segments.filter((segment) => segment.id !== activeSegment.id);
    updateSegments(
      () => nextSegments,
      nextSegments[Math.min(index, nextSegments.length - 1)]?.id
    );
    setNotice({ tone: "info", message: "已删除当前镜头" });
  }

  function previewSegment(segment: SceneSegment) {
    setActiveSegmentId(segment.id);
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = segment.start;
    video.playbackRate = segment.playbackRate;
    video.volume = segment.volume;
    void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      if (activeSegment && (video.currentTime < activeSegment.start || video.currentTime >= activeSegment.end)) {
        video.currentTime = activeSegment.start;
      }
      if (activeSegment) {
        video.playbackRate = activeSegment.playbackRate;
        video.volume = activeSegment.volume;
      }
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  async function handleRender() {
    if (!file || !metadata || !analysis || !enabledSegments.length) {
      setNotice({ tone: "error", message: "请先导入视频并生成剪辑方案" });
      return;
    }

    setIsRendering(true);
    setRenderJob({
      id: "preparing",
      status: "queued",
      progress: 0,
      stage: "上传素材"
    });

    try {
      let currentAssetId = assetId;
      if (!currentAssetId) {
        const asset = await uploadAsset(file, metadata);
        currentAssetId = asset.id;
        setAssetId(currentAssetId);
      }

      const renderSegments = enabledSegments.map((segment) => ({
        ...segment,
        transition: settings.autoTransitions ? segment.transition : "cut",
        effect: settings.autoEffects ? segment.effect : "none"
      }));
      const initialJob = await createRenderJob(currentAssetId, renderSegments, settings);
      const completedJob = await waitForRenderJob(initialJob.id, setRenderJob);

      if (completedJob.status === "failed") {
        throw new Error(completedJob.error || "渲染失败");
      }

      setSavedProjects((projects) => [
        {
          id: crypto.randomUUID(),
          name: projectName,
          createdAt: new Date().toISOString(),
          duration: analysis.duration,
          sceneCount: analysis.sceneCount,
          resolution: settings.resolution,
          aspectRatio: settings.aspectRatio,
          status: "rendered"
        },
        ...projects.filter((project) => project.name !== projectName)
      ]);
      setNotice({ tone: "success", message: "2K/4K 成片已渲染完成" });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "渲染失败"
      });
      setRenderJob({
        id: "failed",
        status: "failed",
        progress: 0,
        stage: "渲染失败",
        error: error instanceof Error ? error.message : "渲染失败"
      });
    } finally {
      setIsRendering(false);
    }
  }

  function downloadPlan() {
    if (!analysis) {
      return;
    }

    const payload = {
      project: projectName,
      source: file?.name,
      output: {
        resolution: settings.resolution,
        dimensions: outputSize,
        aspectRatio: settings.aspectRatio
      },
      settings,
      segments: enabledSegments.map((segment) => ({
        start: Number(segment.start.toFixed(3)),
        end: Number(segment.end.toFixed(3)),
        transition: settings.autoTransitions ? segment.transition : "cut",
        effect: settings.autoEffects ? segment.effect : "none",
        confidence: Number(segment.confidence.toFixed(3))
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName || "autocut"}-plan.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function resetProject() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl("");
    setMetadata(null);
    setAnalysis(null);
    setUndoStack([]);
    setRedoStack([]);
    setAssetId("");
    setRenderJob(null);
    setProjectName("未命名项目");
    setNotice({ tone: "info", message: "已建立空白项目" });
  }

  const renderComplete = renderJob?.status === "complete" && renderJob.outputUrl;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <Scissors size={18} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Autocut</strong>
            <span>Studio</span>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="关闭导航"
            title="关闭导航"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="主导航">
          <button className="nav-item active" type="button">
            <LayoutDashboard size={18} />
            <span>工作台</span>
          </button>
          <button className="nav-item" type="button">
            <FolderOpen size={18} />
            <span>项目</span>
            <span className="nav-count">{savedProjects.length}</span>
          </button>
          <button className="nav-item" type="button">
            <Layers3 size={18} />
            <span>素材库</span>
          </button>
          <button className="nav-item" type="button">
            <Settings2 size={18} />
            <span>渲染设置</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-heading">
            <span>最近项目</span>
            <button className="mini-button" type="button" onClick={resetProject}>
              <Plus size={14} />
              新建
            </button>
          </div>
          <div className="project-list">
            {savedProjects.length ? (
              savedProjects.slice(0, 5).map((project) => (
                <button className="project-row" type="button" key={project.id}>
                  <span className="project-thumb">
                    <Film size={16} />
                  </span>
                  <span className="project-copy">
                    <strong>{project.name}</strong>
                    <small>
                      {project.resolution.toUpperCase()} · {project.sceneCount} 镜头
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="sidebar-empty">暂无项目</div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>渲染服务</strong>
              <small>FFmpeg ready</small>
            </div>
            <BadgeCheck size={17} />
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="打开导航"
              title="打开导航"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="project-title">
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                aria-label="项目名称"
              />
              <span>
                {metadata
                  ? `${formatDuration(metadata.duration)} · ${metadata.width}×${metadata.height}`
                  : "等待素材"}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            {analysis && (
              <>
                <button
                  className="icon-button history-button"
                  type="button"
                  aria-label="撤销"
                  title="撤销"
                  disabled={!undoStack.length}
                  onClick={undoEdit}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  className="icon-button history-button"
                  type="button"
                  aria-label="重做"
                  title="重做"
                  disabled={!redoStack.length}
                  onClick={redoEdit}
                >
                  <Redo2 size={17} />
                </button>
              </>
            )}
            {analysis && (
              <button className="button ghost" type="button" onClick={downloadPlan}>
                <Download size={16} />
                剪辑方案
              </button>
            )}
            <button
              className="button secondary"
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file}
            >
              {isAnalyzing ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <BrainCircuit size={16} />
              )}
              智能分析
            </button>
            <button
              className="button primary"
              type="button"
              onClick={handleRender}
              disabled={isRendering || !analysis || !enabledSegments.length}
            >
              {isRendering ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              导出 {settings.resolution.toUpperCase()}
            </button>
            <button
              className="icon-button inspector-toggle"
              type="button"
              aria-label="切换设置面板"
              title="切换设置面板"
              onClick={() => setInspectorOpen((open) => !open)}
            >
              <PanelRight size={18} />
            </button>
          </div>
        </header>

        <div className="workspace">
          <section className="stage">
            {!file ? (
              <div
                className="drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) {
                      void handleFile(nextFile);
                    }
                    event.target.value = "";
                  }}
                />
                <div className="drop-icon">
                  <CloudUpload size={28} />
                </div>
                <h1>导入原始素材</h1>
                <p>MP4、MOV、MKV、WebM，单个文件上限 8 GB</p>
                <button
                  className="button primary large"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={17} />
                  选择视频
                </button>
                <div className="drop-specs">
                  <span>
                    <MonitorPlay size={15} />
                    2K / 4K
                  </span>
                  <span>
                    <Zap size={15} />
                    自动转场
                  </span>
                  <span>
                    <Captions size={15} />
                    智能特效
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="preview-shell">
                  <div className={`preview-frame ratio-${settings.aspectRatio.replace(":", "-")}`}>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      playsInline
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      style={{
                        filter: activeSegment ? effectFilters[activeSegment.effect] : "none",
                        transform: activeSegment?.effect === "punch-in" ? "scale(1.025)" : "scale(1)"
                      }}
                    />
                    {activeSegment?.effect === "caption-pop" && (
                      <div className="caption-chip">重点信息</div>
                    )}
                    <div className="preview-badge">
                      <MonitorPlay size={14} />
                      {outputSize}
                    </div>
                    {activeSegment && (
                      <div className="shot-badge">
                        <ScanSearch size={14} />
                        {Math.round(activeSegment.confidence * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="transport">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="回到开头"
                      title="回到开头"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }}
                    >
                      <RefreshCw size={17} />
                    </button>
                    <button
                      className="play-button"
                      type="button"
                      aria-label={isPlaying ? "暂停" : "播放"}
                      title={isPlaying ? "暂停" : "播放"}
                      onClick={togglePlayback}
                    >
                      {isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
                    </button>
                    <div className="timecode">
                      <strong>{formatTime(videoRef.current?.currentTime ?? 0)}</strong>
                      <span>/</span>
                      <span>{formatDuration(metadata?.duration ?? 0)}</span>
                    </div>
                    <div className="transport-spacer" />
                    <span className="preview-label">
                      <Maximize2 size={15} />
                      预览代理
                    </span>
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="analysis-card">
                    <div className="analysis-head">
                      <span className="analysis-icon">
                        <BrainCircuit size={18} />
                      </span>
                      <div>
                        <strong>{analysisStage}</strong>
                        <small>镜头边界 · 运动强度 · 曝光变化</small>
                      </div>
                      <b>{Math.round(analysisProgress * 100)}%</b>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${analysisProgress * 100}%` }} />
                    </div>
                  </div>
                )}

                {analysis && (
                  <div className="timeline-panel">
                    <div className="panel-head">
                      <div>
                        <strong>自动时间线</strong>
                        <span>
                          {analysis.sceneCount} 镜头 · {formatDuration(analysis.duration)}
                        </span>
                      </div>
                      <div className="legend-row">
                        <span>
                          <i className="legend-dot orange" />
                          转场
                        </span>
                        <span>
                          <i className="legend-dot cyan" />
                          特效
                        </span>
                      </div>
                    </div>
                    <div className="timeline">
                      {analysis.segments.map((segment, index) => (
                        <button
                          className={`timeline-segment ${
                            segment.id === activeSegmentId ? "active" : ""
                          } ${segment.enabled ? "" : "disabled"}`}
                          type="button"
                          key={segment.id}
                          style={{
                            flexGrow: Math.max(0.7, segment.duration),
                            animationDelay: `${index * 24}ms`
                          }}
                          onClick={() => previewSegment(segment)}
                        >
                          <span className="segment-index">{String(index + 1).padStart(2, "0")}</span>
                          <span className="segment-duration">{segment.duration.toFixed(1)}s</span>
                          <span className="segment-tags">
                            <i>{transitionLabels[segment.transition]}</i>
                            {segment.playbackRate !== 1 && (
                              <i>{segment.playbackRate}x</i>
                            )}
                            {segment.volume === 0 && <i>静音</i>}
                            {segment.fit === "contain" && <i>适配</i>}
                            {segment.effect !== "none" && (
                              <i className="effect-tag">{effectLabels[segment.effect]}</i>
                            )}
                          </span>
                          <span
                            className="segment-motion"
                            style={{ width: `${Math.round(segment.motion * 100)}%` }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className={`inspector ${inspectorOpen ? "is-open" : ""}`}>
            <div className="inspector-head">
              <div>
                <strong>输出与效果</strong>
                <span>项目级设置</span>
              </div>
              <button
                className="icon-button inspector-close"
                type="button"
                aria-label="关闭设置"
                title="关闭设置"
                onClick={() => setInspectorOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="inspector-scroll">
              <section className="control-section">
                <div className="control-title">
                  <span>
                    <MonitorPlay size={16} />
                    输出分辨率
                  </span>
                  <b>{settings.resolution.toUpperCase()}</b>
                </div>
                <div className="segmented two">
                  {resolutionOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={settings.resolution === option.value ? "active" : ""}
                      onClick={() => updateSettings({ resolution: option.value })}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                    </button>
                  ))}
                </div>
                <div className="size-readout">
                  <Maximize2 size={15} />
                  <span>{outputSize}</span>
                </div>
              </section>

              <section className="control-section">
                <div className="control-title">
                  <span>
                    <Film size={16} />
                    画面比例
                  </span>
                </div>
                <div className="segmented three">
                  {aspectOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={settings.aspectRatio === option.value ? "active" : ""}
                      onClick={() => updateSettings({ aspectRatio: option.value })}
                    >
                      <span className={`aspect-glyph glyph-${option.value.replace(":", "-")}`} />
                      <strong>{option.label}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="control-section">
                <div className="control-title">
                  <span>
                    <WandSparkles size={16} />
                    剪辑风格
                  </span>
                </div>
                <div className="style-grid">
                  {styleOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={settings.style === option.value ? "active" : ""}
                      onClick={() => updateSettings({ style: option.value })}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                      {settings.style === option.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="control-section">
                <div className="control-title">
                  <span>
                    <Sparkles size={16} />
                    自动优化
                  </span>
                </div>
                <label className="switch-row">
                  <span>
                    <strong>智能转场</strong>
                    <small>按镜头与节奏自动匹配</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.autoTransitions}
                    onChange={(event) =>
                      updateSettings({ autoTransitions: event.target.checked })
                    }
                  />
                  <i />
                </label>
                <label className="switch-row">
                  <span>
                    <strong>自动特效</strong>
                    <small>色彩、推近、字幕提示</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.autoEffects}
                    onChange={(event) => updateSettings({ autoEffects: event.target.checked })}
                  />
                  <i />
                </label>
              </section>

              {activeSegment && (
                <section className="control-section selected-shot">
                  <div className="control-title">
                    <span>
                      <SlidersHorizontal size={16} />
                      手动剪辑
                    </span>
                    <b>镜头 {String(activeSegmentIndex + 1).padStart(2, "0")}</b>
                  </div>

                  <div className="clip-toolbar">
                    <button
                      type="button"
                      title="向前移动"
                      aria-label="向前移动"
                      disabled={activeSegmentIndex <= 0}
                      onClick={() => moveActiveSegment(-1)}
                    >
                      <MoveLeft size={16} />
                      <span>前移</span>
                    </button>
                    <button
                      type="button"
                      title="向后移动"
                      aria-label="向后移动"
                      disabled={activeSegmentIndex >= (analysis?.segments.length ?? 1) - 1}
                      onClick={() => moveActiveSegment(1)}
                    >
                      <MoveRight size={16} />
                      <span>后移</span>
                    </button>
                    <button
                      type="button"
                      title="在播放位置分割"
                      aria-label="在播放位置分割"
                      onClick={splitActiveSegment}
                    >
                      <Split size={16} />
                      <span>分割</span>
                    </button>
                    <button
                      type="button"
                      title="复制镜头"
                      aria-label="复制镜头"
                      onClick={duplicateActiveSegment}
                    >
                      <Copy size={16} />
                      <span>复制</span>
                    </button>
                    <button
                      type="button"
                      title={activeSegment.enabled ? "隐藏镜头" : "恢复镜头"}
                      aria-label={activeSegment.enabled ? "隐藏镜头" : "恢复镜头"}
                      onClick={() => toggleSegment(activeSegment.id)}
                    >
                      {activeSegment.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      <span>{activeSegment.enabled ? "隐藏" : "恢复"}</span>
                    </button>
                    <button
                      className="danger-tool"
                      type="button"
                      title="删除镜头"
                      aria-label="删除镜头"
                      onClick={removeActiveSegment}
                    >
                      <Trash2 size={16} />
                      <span>删除</span>
                    </button>
                  </div>

                  <div className="shot-metrics">
                    <div>
                      <span>入点</span>
                      <strong>{formatTime(activeSegment.start)}</strong>
                    </div>
                    <div>
                      <span>出点</span>
                      <strong>{formatTime(activeSegment.end)}</strong>
                    </div>
                    <div>
                      <span>输出</span>
                      <strong>{activeSegment.duration.toFixed(1)}s</strong>
                    </div>
                  </div>

                  <div className="range-control">
                    <div className="range-label">
                      <span>裁剪入点</span>
                      <b>{formatTime(activeSegment.start)}</b>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.25, activeSegment.end - 0.25)}
                      step={0.05}
                      value={activeSegment.start}
                      onChange={(event) => trimSegment("start", Number(event.target.value))}
                      aria-label="裁剪入点"
                    />
                  </div>

                  <div className="range-control">
                    <div className="range-label">
                      <span>裁剪出点</span>
                      <b>{formatTime(activeSegment.end)}</b>
                    </div>
                    <input
                      type="range"
                      min={Math.min(metadata?.duration ?? activeSegment.end, activeSegment.start + 0.25)}
                      max={metadata?.duration ?? activeSegment.end}
                      step={0.05}
                      value={activeSegment.end}
                      onChange={(event) => trimSegment("end", Number(event.target.value))}
                      aria-label="裁剪出点"
                    />
                  </div>

                  <div className="inline-control">
                    <span>
                      <Gauge size={15} />
                      播放速度
                    </span>
                    <div className="mini-segmented">
                      {[0.5, 1, 1.5, 2].map((rate) => (
                        <button
                          type="button"
                          key={rate}
                          className={activeSegment.playbackRate === rate ? "active" : ""}
                          onClick={() => updateSegment(activeSegment.id, { playbackRate: rate })}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="range-control volume-control">
                    <div className="range-label">
                      <span>
                        {activeSegment.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        音量
                      </span>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() =>
                          updateSegment(activeSegment.id, {
                            volume: activeSegment.volume === 0 ? 1 : 0
                          })
                        }
                      >
                        {activeSegment.volume === 0 ? "恢复" : "静音"}
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={activeSegment.volume}
                      onChange={(event) =>
                        updateSegment(activeSegment.id, {
                          volume: Number(event.target.value)
                        })
                      }
                      aria-label="音量"
                    />
                  </div>

                  <div className="inline-control">
                    <span>
                      <Maximize2 size={15} />
                      画面适配
                    </span>
                    <div className="mini-segmented">
                      <button
                        type="button"
                        className={activeSegment.fit === "cover" ? "active" : ""}
                        onClick={() => updateSegment(activeSegment.id, { fit: "cover" })}
                      >
                        铺满
                      </button>
                      <button
                        type="button"
                        className={activeSegment.fit === "contain" ? "active" : ""}
                        onClick={() => updateSegment(activeSegment.id, { fit: "contain" })}
                      >
                        适配
                      </button>
                    </div>
                  </div>

                  <button
                    className="selector-row"
                    type="button"
                    onClick={() => cycleTransition(activeSegment.id)}
                  >
                    <span>
                      <Zap size={15} />
                      转场
                    </span>
                    <strong>{transitionLabels[activeSegment.transition]}</strong>
                    <ChevronRight size={15} />
                  </button>
                  <button
                    className="selector-row"
                    type="button"
                    onClick={() => cycleEffect(activeSegment.id)}
                  >
                    <span>
                      <Paintbrush size={15} />
                      特效
                    </span>
                    <strong>{effectLabels[activeSegment.effect]}</strong>
                    <ChevronRight size={15} />
                  </button>
                </section>
              )}

              {renderJob && (
                <section className="control-section render-status">
                  <div className="control-title">
                    <span>
                      {renderJob.status === "complete" ? (
                        <CircleCheck size={16} />
                      ) : renderJob.status === "failed" ? (
                        <CircleAlert size={16} />
                      ) : (
                        <LoaderCircle className="spin" size={16} />
                      )}
                      导出任务
                    </span>
                    <b>{Math.round(renderJob.progress * 100)}%</b>
                  </div>
                  <p>{renderJob.error || renderJob.stage}</p>
                  <div className="progress-track">
                    <span style={{ width: `${renderJob.progress * 100}%` }} />
                  </div>
                  {renderComplete && (
                    <a className="button primary full" href={renderJob.outputUrl} download>
                      <Download size={16} />
                      下载成片
                    </a>
                  )}
                </section>
              )}
            </div>
          </aside>
        </div>
      </main>

      <nav className="mobile-tabbar" aria-label="移动端快捷导航">
        <button className="active" type="button" onClick={() => setInspectorOpen(false)}>
          <LayoutDashboard size={20} />
          <span>工作台</span>
        </button>
        <button type="button" onClick={() => setInspectorOpen((open) => !open)}>
          <SlidersHorizontal size={20} />
          <span>剪辑</span>
        </button>
        <button type="button" onClick={() => inputRef.current?.click()}>
          <Plus size={20} />
          <span>导入</span>
        </button>
      </nav>

      {notice && (
        <div className={`toast ${notice.tone}`}>
          {notice.tone === "success" ? (
            <CircleCheck size={18} />
          ) : notice.tone === "error" ? (
            <CircleAlert size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          <span>{notice.message}</span>
          <button
            className="icon-button small"
            type="button"
            aria-label="关闭提示"
            title="关闭提示"
            onClick={() => setNotice(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default App;
