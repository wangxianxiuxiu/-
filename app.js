const appRoot = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const STORAGE_KEYS = {
  saved: "video-vault:saved",
  settings: "video-vault:settings:v2",
  collected: "video-vault:collected",
};

const defaultSettings = {
  autoCollect: true,
  interval: "30",
  quality: "1080p",
  onlyWifi: true,
  dataSource: "tikhub",
  collectorUrl: "http://127.0.0.1:8080",
  tikhubApiKey: "",
  collectionPlatform: "dy",
  collectionLimit: "20",
  lastCollectionKeyword: "",
  autoKeywords: "",
  cookie: "",
  downloadDir: "D:\\VideoVault",
  theme: "dark",
};

const tagGroups = [
  {
    title: "服装穿搭",
    hint: "裙装、袜饰、制服与日常风格",
    tags: [
      { name: "黑丝", count: 128, poster: "assets/media/black-dress.jpg" },
      { name: "白丝", count: 96, poster: "assets/media/white-dress.jpg" },
      { name: "连衣裙", count: 183, poster: "assets/media/white-dress.jpg" },
      { name: "JK制服", count: 74, poster: "assets/media/jk-style.jpg" },
      { name: "汉服", count: 62, poster: "assets/media/hanfu.jpg" },
      { name: "职场穿搭", count: 112, poster: "assets/media/street-fashion.jpg" },
      { name: "街头潮流", count: 205, poster: "assets/media/jk-style.jpg" },
      { name: "运动风", count: 88, poster: "assets/media/sport-style.jpg" },
    ],
  },
  {
    title: "舞蹈",
    hint: "舞台、街舞、古典与身体训练",
    tags: [
      { name: "爵士舞", count: 141, poster: "assets/media/dance-one.jpg" },
      { name: "街舞", count: 119, poster: "assets/media/dance-three.jpg" },
      { name: "宅舞", count: 87, poster: "assets/media/dance-two.jpg" },
      { name: "古典舞", count: 73, poster: "assets/media/ballet.jpg" },
      { name: "芭蕾", count: 56, poster: "assets/media/ballet.jpg" },
      { name: "韩舞", count: 108, poster: "assets/media/dance-one.jpg" },
      { name: "民族舞", count: 45, poster: "assets/media/dance-two.jpg" },
    ],
  },
  {
    title: "生活方式",
    hint: "音乐、摄影、健身与旅行记录",
    tags: [
      { name: "音乐", count: 167, poster: "assets/media/stage-dance.jpg" },
      { name: "摄影", count: 132, poster: "assets/media/dance-three.jpg" },
      { name: "健身", count: 84, poster: "assets/media/sport-style.jpg" },
      { name: "旅行", count: 77, poster: "assets/media/street-fashion.jpg" },
    ],
  },
];

const sampleVideos = [
  {
    id: "v01",
    title: "黑色系穿搭，如何做出层次感",
    creator: "阿屿穿搭",
    platform: "抖音",
    duration: "00:42",
    likes: "12.8万",
    tags: ["黑丝", "职场穿搭", "连衣裙"],
    poster: "assets/media/black-dress.jpg",
    source: "assets/videos/sample-01.mp4",
    description:
      "用深浅材质、腰线比例和配饰控制黑色造型的层次。适合通勤、夜间聚会和日常街拍参考。",
  },
  {
    id: "v02",
    title: "夏夜白色系的松弛镜头",
    creator: "白昼衣橱",
    platform: "哔哩哔哩",
    duration: "01:08",
    likes: "8.6万",
    tags: ["白丝", "连衣裙", "街头潮流"],
    poster: "assets/media/white-dress.jpg",
    source: "assets/videos/sample-02.mp4",
    description:
      "从低饱和配色到镜头运动，拆解白或米白色服装在夜景中的质感和明暗关系。",
  },
  {
    id: "v03",
    title: "芭蕾基础训练：舒展与控制",
    creator: "形体练习室",
    platform: "哔哩哔哩",
    duration: "05:21",
    likes: "21.3万",
    tags: ["芭蕾", "古典舞", "形体"],
    poster: "assets/media/ballet.jpg",
    source: "assets/videos/sample-03.mp4",
    description:
      "包含热身后的大幅度伸展、重心转移和基础控制练习。建议在确认身体状态后循序进行。",
  },
  {
    id: "v04",
    title: "舞台肢体的力量与停顿",
    creator: "舞线",
    platform: "抖音",
    duration: "00:36",
    likes: "6.9万",
    tags: ["爵士舞", "韩舞", "舞蹈"],
    poster: "assets/media/dance-one.jpg",
    source: "assets/videos/sample-01.mp4",
    description:
      "用清晰的发力点和停顿建立舞台层次。片段侧重手部线条、步伐节奏和镜头适配。",
  },
  {
    id: "v05",
    title: "夜色街舞：一段随性律动",
    creator: "MOVE 街区",
    platform: "快手",
    duration: "00:51",
    likes: "4.2万",
    tags: ["街舞", "摄影", "音乐"],
    poster: "assets/media/dance-three.jpg",
    source: "assets/videos/sample-02.mp4",
    description:
      "记录夜景环境中的即兴舞蹈。画面重点是脚步节奏、身体方向和城市灯光的关系。",
  },
  {
    id: "v06",
    title: "小空间也能跳的爵士组合",
    creator: "栗子编舞",
    platform: "哔哩哔哩",
    duration: "02:14",
    likes: "15.7万",
    tags: ["爵士舞", "宅舞", "舞蹈"],
    poster: "assets/media/dance-two.jpg",
    source: "assets/videos/sample-03.mp4",
    description:
      "适合室内练习的小幅度组合，动作拆分为四个八拍，方便逐段学习和复看。",
  },
  {
    id: "v07",
    title: "运动训练中的核心稳定",
    creator: "基础力量",
    platform: "抖音",
    duration: "01:27",
    likes: "3.8万",
    tags: ["健身", "运动风", "训练"],
    poster: "assets/media/sport-style.jpg",
    source: "assets/videos/sample-01.mp4",
    description:
      "围绕核心稳定和髋部发力进行示范，画面保留动作节奏、呼吸和组间休息提示。",
  },
  {
    id: "v08",
    title: "在城市里寻找服装的色彩关系",
    creator: "街角画报",
    platform: "抖音",
    duration: "00:58",
    likes: "9.4万",
    tags: ["街头潮流", "摄影", "职场穿搭"],
    poster: "assets/media/street-fashion.jpg",
    source: "assets/videos/sample-02.mp4",
    description:
      "从街头环境提取颜色，再用服装的明度、材质和比例建立视觉关系，适合作为穿搭拍摄参考。",
  },
];

let state = {
  route: { view: "tags", id: null },
  activeTag: "",
  tagSearch: "",
  sort: "recent",
  historySearch: "",
  historyPlatform: "all",
  historySort: "recent",
  detailContext: "auto",
  collectedVideos: loadJSON(STORAGE_KEYS.collected, []),
  saved: new Set(loadJSON(STORAGE_KEYS.saved, [])),
  settings: { ...defaultSettings, ...loadJSON(STORAGE_KEYS.settings, {}) },
  connection: { status: "idle", message: "尚未测试" },
  serverKeyConfigured: false,
  rateLimit: { max: 40, windowMinutes: 10 },
  linkResolve: {
    loading: false,
    text: "",
    error: "",
  },
  search: {
    loading: false,
    active: false,
    platform: "dy",
    keyword: "",
    results: [],
    total: 0,
    error: "",
    demo: false,
  },
  collection: {
    status: "idle",
    running: false,
    message: "免费采集器待命",
    platform: "dy",
    keyword: "",
    currentKeyword: "",
    queue: [],
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
    added: 0,
    lastLog: "",
    logs: [],
  },
};

let videos = [...state.collectedVideos, ...sampleVideos];
let collectionPollTimer = null;
let autoCollectTimer = null;
let autoKeywordIndex = 0;

const routeMap = {
  tags: { label: "视频标签", icon: "tags" },
  videos: { label: "视频", icon: "clapperboard" },
  history: { label: "已获取", icon: "library" },
  settings: { label: "设置", icon: "settings-2" },
};

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persistSaved() {
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...state.saved]));
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function persistCollected() {
  localStorage.setItem(
    STORAGE_KEYS.collected,
    JSON.stringify(state.collectedVideos.slice(0, 400)),
  );
}

function refreshVideoCache() {
  videos = [...state.collectedVideos, ...sampleVideos];
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCollectionKeywords(value) {
  const seen = new Set();
  return String(value || "")
    .split(/[\n,，;；]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => {
      const key = keyword.toLowerCase();
      if (!keyword || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");

  if (raw.startsWith("video/")) {
    return { view: "video", id: decodeURIComponent(raw.slice(6)) };
  }

  if (raw === "videos" || raw === "history" || raw === "settings") {
    return { view: raw, id: null };
  }

  return { view: "tags", id: null };
}

function routeHash(view, id = "") {
  if (view === "video") return `#video/${encodeURIComponent(id)}`;
  return `#${view}`;
}

function navigate(view, id = "") {
  const nextHash = routeHash(view, id);
  if (window.location.hash === nextHash) {
    render();
    return;
  }

  window.location.hash = nextHash;
}

function applyTheme() {
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    state.settings.theme === "system"
      ? preferredDark
        ? "dark"
        : "light"
      : state.settings.theme;

  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#0d0e0d" : "#f1f0ea");
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/collector/config", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const result = await response.json();
    state.serverKeyConfigured = Boolean(result.serverKeyConfigured);
    state.rateLimit = {
      max: Number(result.rateLimitMax) || 40,
      windowMinutes: Number(result.rateLimitWindowMinutes) || 10,
    };
    render();
  } catch {
    // Local static-only use can continue with Demo mode.
  }
}

function getFilteredVideos() {
  let list = state.search.active
    ? [...state.search.results]
    : videos.filter((video) => !state.activeTag || video.tags.includes(state.activeTag));

  if (state.sort === "liked") {
    list = [...list].sort((a, b) => parseLikeCount(b.likes) - parseLikeCount(a.likes));
  }

  return list;
}

function getHistoryVideos() {
  const query = state.historySearch.trim().toLowerCase();
  let list = state.collectedVideos.filter((video) => {
    if (!video.real) return false;
    if (state.historyPlatform !== "all" && video.platform !== state.historyPlatform) return false;
    if (!query) return true;

    return [video.title, video.creator, video.description, ...(video.tags || [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (state.historySort === "liked") {
    list = [...list].sort((a, b) => parseLikeCount(b.likes) - parseLikeCount(a.likes));
  } else {
    list = [...list].sort(
      (a, b) => Number(b.collectedAt || 0) - Number(a.collectedAt || 0),
    );
  }

  return list;
}

function getDetailVideos() {
  if (state.detailContext === "history") return getHistoryVideos();
  return getFilteredVideos();
}

function parseLikeCount(value) {
  if (value.includes("万")) return Number.parseFloat(value) * 10000;
  return Number.parseFloat(value) || 0;
}

function getSystemStatus() {
  if (state.search.loading) return "正在搜索视频";
  if (state.collection.running) {
    const total = state.collection.total || 1;
    const current = Math.min(state.collection.completed + 1, total);
    return `正在采集 ${current}/${total}`;
  }
  if (state.settings.dataSource === "tikhub") return "TikHub 搜索模式";
  if (state.settings.dataSource === "demo") return "演示搜索模式";
  if (state.settings.dataSource === "collector") return "本地采集模式";
  return state.settings.autoCollect ? "示例库 · 自动收集已开启" : "示例库 · 自动收集已暂停";
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="topbar__inner">
        <button class="brand" type="button" data-nav="tags" aria-label="返回视频标签">
          <span class="brand__mark"><i data-lucide="scan-search"></i></span>
          <span class="brand__copy">
            <span class="brand__name">拾帧</span>
            <span class="brand__meta">个人视频库 · 本地优先</span>
          </span>
        </button>
        <div class="status-pill" title="当前使用本地示例内容">
          <span class="status-dot"></span>
          <span>${escapeHTML(getSystemStatus())}</span>
        </div>
      </div>
    </header>
  `;
}

function renderTags() {
  const query = state.tagSearch.trim().toLowerCase();
  const groups = tagGroups
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => !query || tag.name.toLowerCase().includes(query)),
    }))
    .filter((group) => group.tags.length);

  const totalTags = tagGroups.reduce((sum, group) => sum + group.tags.length, 0);

  return `
    <main class="page-main" id="main-content">
      <section class="page-intro">
        <p class="eyebrow">Discover</p>
        <h1 class="page-title">视频标签</h1>
        <p class="page-subtitle">
          从服装、舞蹈与生活方式出发，用标签建立自己的视频索引。点击任意标签即可查看对应视频。
        </p>
        <div class="intro-actions">
          <label class="search-field" aria-label="搜索视频标签">
            <i data-lucide="search"></i>
            <input
              id="tag-search"
              type="search"
              autocomplete="off"
              value="${escapeHTML(state.tagSearch)}"
              placeholder="搜索黑丝、白丝、街舞、芭蕾..."
            />
          </label>
          <span class="status-pill">${totalTags} 个标签 · ${videos.length} 条视频</span>
        </div>
      </section>

      ${
        groups.length
          ? groups.map(renderTagGroup).join("")
          : renderEmpty("没有匹配的标签", "换一个关键词，或清空搜索后查看全部标签。")
      }
    </main>
  `;
}

function renderTagGroup(group) {
  return `
    <section class="tag-section">
      <div class="section-heading">
        <h2 class="section-title">${escapeHTML(group.title)}</h2>
        <span class="section-meta">${group.tags.length} 个标签 · ${escapeHTML(group.hint)}</span>
      </div>
      <div class="tag-grid">
        ${group.tags
          .map(
            (tag) => `
              <button
                class="tag-tile"
                type="button"
                data-tag="${escapeHTML(tag.name)}"
                style="background-image:url('${escapeHTML(tag.poster)}')"
                aria-label="查看 ${escapeHTML(tag.name)} 标签视频"
              >
                <span class="tag-tile__content">
                  <span class="tag-tile__name">${escapeHTML(tag.name)}</span>
                  <span class="tag-tile__count">${tag.count} 条视频</span>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTikHubSearchPanel() {
  const provider = state.settings.dataSource;
  const demo = provider === "demo";
  const showingDemo = state.search.demo && state.search.active;
  const hasUserKey = Boolean(state.settings.tikhubApiKey.trim());
  const hasKey = hasUserKey || state.serverKeyConfigured;
  const platform = state.search.platform;
  const statusClass = state.search.error
    ? "is-error"
    : state.search.loading
      ? "is-running"
      : hasKey || demo || showingDemo
        ? "is-success"
        : "";
  const statusText = state.search.error
    ? state.search.error
    : state.search.loading
      ? "正在请求 TikHub 搜索接口"
      : demo
        ? "公开 Demo 模式，仅返回固定抖音缓存结果"
        : showingDemo
          ? "未配置 API Key，当前展示公开 Demo 结果"
        : hasKey
          ? hasUserKey
            ? "已使用浏览器中填写的 API Key"
            : "站点共享 API Key 已配置"
          : "填写 API Key 后可搜索四个平台";

  return `
    <section class="search-panel">
      <div class="search-panel__head">
        <div>
          <p class="eyebrow">Search API</p>
          <h2 class="search-panel__title">搜索视频</h2>
          <p class="search-panel__description">
            通过 TikHub 搜索抖音、快手、哔哩哔哩和 TikTok，结果直接进入视频流，不再依赖本地浏览器采集。
          </p>
        </div>
        <div class="collector-status ${statusClass}" aria-live="polite">
          <span class="collector-status__dot"></span>
          <span>${escapeHTML(statusText)}</span>
        </div>
      </div>

      <form class="api-search-form" data-api-search-form>
        <div class="platform-switch search-platform-switch" aria-label="搜索平台">
          <button
            class="${platform === "dy" ? "is-active" : ""}"
            type="button"
            data-search-platform="dy"
          >
            抖音
          </button>
          <button
            class="${platform === "ks" ? "is-active" : ""}"
            type="button"
            data-search-platform="ks"
          >
            快手
          </button>
          <button
            class="${platform === "bili" ? "is-active" : ""}"
            type="button"
            data-search-platform="bili"
          >
            哔哩哔哩
          </button>
          <button
            class="${platform === "tt" ? "is-active" : ""}"
            type="button"
            data-search-platform="tt"
          >
            TikTok
          </button>
        </div>
        <label class="search-field api-search-input" aria-label="搜索视频">
          <i data-lucide="search"></i>
          <input
            id="search-keyword"
            type="search"
            autocomplete="off"
            value="${escapeHTML(state.search.keyword)}"
            placeholder="${
              platform === "dy"
                ? "搜索抖音视频，如 黑丝、街舞"
                : platform === "ks"
                  ? "搜索快手视频，如 穿搭、舞蹈"
                  : platform === "bili"
                    ? "搜索哔哩哔哩视频，如 穿搭、舞蹈"
                    : "Search TikTok videos, e.g. dance, fashion"
            }"
          />
        </label>
        <button class="button button--primary api-search-submit" type="submit" ${state.search.loading ? "disabled" : ""}>
          <i data-lucide="${state.search.loading ? "loader-circle" : "search"}"></i>
          ${state.search.loading ? "搜索中" : `搜索最多 ${state.settings.collectionLimit} 条`}
        </button>
      </form>

      <form class="link-resolve-form" data-link-resolve-form>
        <div class="link-resolve-form__label">
          <i data-lucide="link-2"></i>
          <span>分享链接识别</span>
        </div>
        <label class="search-field link-resolve-input" aria-label="粘贴视频分享链接">
          <i data-lucide="clipboard-paste"></i>
          <input
            id="share-link"
            type="text"
            autocomplete="off"
            value="${escapeHTML(state.linkResolve.text)}"
            placeholder="粘贴抖音、快手、B站或 TikTok 分享链接/分享文本"
          />
        </label>
        <button class="button link-resolve-submit" type="submit" ${state.linkResolve.loading ? "disabled" : ""}>
          <i data-lucide="${state.linkResolve.loading ? "loader-circle" : "scan-link"}"></i>
          ${state.linkResolve.loading ? "识别中" : "识别并打开"}
        </button>
      </form>
      <div class="link-resolve-hint ${state.linkResolve.error ? "is-error" : ""}">
        <i data-lucide="${state.linkResolve.error ? "circle-alert" : "info"}"></i>
        <span>${escapeHTML(state.linkResolve.error || "支持完整分享文本，程序会自动提取其中的视频链接。")}</span>
      </div>

      <div class="api-search-foot">
        <span>
          ${
            demo
              ? "Demo 模式用于预览，不消耗 TikHub 额度。"
              : showingDemo
                ? "当前是免 Key 回退结果，配置 API Key 后才会执行真实关键词搜索。"
              : hasKey
                ? hasUserKey
                  ? "当前使用你填写的 Key，搜索会消耗该账号的 TikHub 额度。"
                  : `当前使用站点共享额度，每个 IP 每 ${state.rateLimit.windowMinutes} 分钟最多 ${state.rateLimit.max} 次请求。`
                : `<a href="https://tikhub.io/" target="_blank" rel="noreferrer">前往 TikHub 获取 API Key</a>`
          }
        </span>
        <span>当前库：${videos.length} 条视频</span>
      </div>
    </section>
  `;
}

function renderCollectorPanel() {
  if (state.settings.dataSource !== "collector") {
    return renderTikHubSearchPanel();
  }

  const platform = state.settings.collectionPlatform === "ks" ? "ks" : "dy";
  const queuedKeywords = state.collection.queue.length;
  const batchTotal = state.collection.total || 0;
  const completed = Math.min(state.collection.completed, batchTotal);
  const progress = batchTotal ? Math.round((completed / batchTotal) * 100) : 0;
  const keywordCount = parseCollectionKeywords(state.collection.keyword).length;
  const statusClass =
    state.collection.status === "running"
      ? "is-running"
      : state.collection.status === "success"
        ? "is-success"
        : state.collection.status === "error"
          ? "is-error"
          : "";

  return `
    <section class="collector-panel">
      <div class="collector-panel__head">
        <div>
          <h2 class="collector-title">采集新视频</h2>
          <p class="collector-description">
            使用免费的 MediaCrawler，从抖音或快手按关键词顺序采集。多个关键词请用逗号分隔。
          </p>
        </div>
        <div class="collector-status ${statusClass}" aria-live="polite">
          <span class="collector-status__dot"></span>
          <span data-collector-status>${escapeHTML(state.collection.message)}</span>
        </div>
      </div>

      <form class="collector-form" data-collector-form>
        <div class="platform-switch" aria-label="采集平台">
          <button
            class="${platform === "dy" ? "is-active" : ""}"
            type="button"
            data-collection-platform="dy"
          >
            抖音
          </button>
          <button
            class="${platform === "ks" ? "is-active" : ""}"
            type="button"
            data-collection-platform="ks"
          >
            快手
          </button>
        </div>
        <label class="search-field collector-search" aria-label="输入采集关键词">
          <i data-lucide="search"></i>
          <input
            id="collection-keyword"
            type="search"
            autocomplete="off"
            value="${escapeHTML(state.collection.keyword)}"
            placeholder="如 黑丝, 白丝, 街舞"
          />
        </label>
        <button class="button button--primary collector-submit" type="submit" ${state.collection.running ? "disabled" : ""}>
          <i data-lucide="${state.collection.running ? "loader-circle" : "download-cloud"}"></i>
          ${
            state.collection.running
              ? `正在采集 ${Math.min(completed + 1, batchTotal || 1)}/${batchTotal || 1}`
              : keywordCount > 1
                ? `顺序采集 ${keywordCount} 个关键词`
                : `采集最多 ${state.settings.collectionLimit} 条`
          }
        </button>
      </form>

      ${
        batchTotal
          ? `
            <div class="collector-progress" data-collector-progress>
              <div class="collector-progress__meta">
                <span data-collector-progress-text>
                  已完成 ${completed}/${batchTotal}，成功 ${state.collection.succeeded}，失败 ${state.collection.failed}
                </span>
                <span>新增 ${state.collection.added} 条</span>
              </div>
              <div class="collector-progress__track" aria-hidden="true">
                <span style="width:${progress}%"></span>
              </div>
              <div class="collector-progress__queue" data-collector-queue>
                ${
                  !state.collection.running && completed >= batchTotal
                    ? "本批次已完成"
                    : state.collection.currentKeyword
                    ? `当前：${escapeHTML(state.collection.currentKeyword)}`
                    : "等待下一个关键词"
                }
                ${queuedKeywords ? ` · 队列还有 ${queuedKeywords} 个` : ""}
              </div>
              ${
                state.collection.lastLog
                  ? `<div class="collector-log" data-collector-log>${escapeHTML(state.collection.lastLog)}</div>`
                  : ""
              }
            </div>
          `
          : ""
      }

      <div class="collector-suggestions">
        <span>快速关键词</span>
        ${["黑丝", "白丝", "连衣裙", "街舞", "爵士舞", "芭蕾"]
          .map(
            (keyword) => `
              <button type="button" data-keyword-suggestion="${keyword}">
                ${keyword}
              </button>
            `,
          )
          .join("")}
        ${
          state.collection.keyword
            ? `<button class="is-clear" type="button" data-clear-collection>清除结果</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderVideos() {
  const list = getDetailVideos();

  return `
    <main class="page-main" id="main-content">
      <section class="page-intro">
        <p class="eyebrow">Library</p>
        <h1 class="page-title">视频</h1>
        <p class="page-subtitle">
          这是筛选后的视频流。列表只负责浏览和打开视频，保存、上一个和下一个只会在单条视频页面出现。
        </p>
      </section>

      ${renderCollectorPanel()}

      <div class="video-toolbar">
        <div class="toolbar">
          ${
            state.search.active
              ? `
                <span class="active-filter">
                  搜索：${escapeHTML(state.search.keyword)} · ${list.length} 条
                  <button type="button" data-clear-search aria-label="清除搜索结果">
                    <i data-lucide="x"></i>
                  </button>
                </span>
              `
              : state.activeTag
              ? `
                <span class="active-filter">
                  ${escapeHTML(state.activeTag)}
                  <button type="button" data-clear-tag aria-label="清除标签筛选">
                    <i data-lucide="x"></i>
                  </button>
                </span>
              `
              : `<span class="section-meta">全部视频 · ${list.length} 条</span>`
          }
        </div>
        <div class="segmented" aria-label="视频排序">
          <button class="${state.sort === "recent" ? "is-active" : ""}" type="button" data-sort="recent">
            最近添加
          </button>
          <button class="${state.sort === "liked" ? "is-active" : ""}" type="button" data-sort="liked">
            热度优先
          </button>
        </div>
      </div>

      ${
        list.length
          ? `<div class="video-grid">${list.map(renderVideoCard).join("")}</div>`
          : state.search.error
            ? renderEmpty("搜索没有返回视频", state.search.error)
            : state.search.active
              ? renderEmpty(
                  "没有搜索到视频",
                  "换一个关键词，或检查 API Key、平台接口额度和 TikHub 返回状态。",
                )
              : renderEmpty("这个标签还没有视频", "可以切换到其他标签，或先执行一次视频搜索。")
      }
    </main>
  `;
}

function renderVideoCard(video) {
  const saved = state.saved.has(video.id);
  const poster = video.poster || "assets/media/street-fashion.jpg";

  return `
    <button class="video-card" type="button" data-open-video="${video.id}">
      <span class="video-card__media">
        <img src="${escapeHTML(poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        <span class="video-card__play"><i data-lucide="play"></i></span>
        <span class="video-card__platform">${escapeHTML(video.platform)}</span>
        ${saved ? `<span class="video-card__saved" title="已保存"><i data-lucide="bookmark-check"></i></span>` : ""}
        <span class="video-card__duration">${escapeHTML(video.duration)}</span>
      </span>
      <span class="video-card__body">
        <span class="video-card__title">${escapeHTML(video.title)}</span>
        <span class="video-card__meta">
          <span class="video-card__creator">${escapeHTML(video.creator)}</span>
          <span>${escapeHTML(video.likes)} 喜欢</span>
        </span>
        <span class="mini-tags">
          ${video.tags
            .slice(0, 2)
            .map((tag) => `<span class="mini-tag">${escapeHTML(tag)}</span>`)
            .join("")}
        </span>
      </span>
    </button>
  `;
}

function renderHistory() {
  const list = getHistoryVideos();
  const total = state.collectedVideos.filter((video) => video.real).length;
  const douyinCount = state.collectedVideos.filter((video) => video.platform === "抖音").length;
  const kuaishouCount = state.collectedVideos.filter((video) => video.platform === "快手").length;
  const bilibiliCount = state.collectedVideos.filter(
    (video) => video.platform === "哔哩哔哩",
  ).length;
  const tiktokCount = state.collectedVideos.filter(
    (video) => video.platform === "TikTok",
  ).length;

  return `
    <main class="page-main" id="main-content">
      <section class="page-intro">
        <p class="eyebrow">Library</p>
        <h1 class="page-title">已获取视频</h1>
        <p class="page-subtitle">
          这里保存所有成功获取过的视频。可以按平台、标题、作者、标签或来源关键词筛选。
        </p>
        <div class="intro-actions">
          <span class="status-pill">${total} 条已获取</span>
          <span class="status-pill">抖音 ${douyinCount}</span>
          <span class="status-pill">快手 ${kuaishouCount}</span>
          <span class="status-pill">哔哩哔哩 ${bilibiliCount}</span>
          <span class="status-pill">TikTok ${tiktokCount}</span>
        </div>
      </section>

      <div class="history-toolbar">
        <label class="search-field" aria-label="搜索已获取视频">
          <i data-lucide="search"></i>
          <input
            id="history-search"
            type="search"
            autocomplete="off"
            value="${escapeHTML(state.historySearch)}"
            placeholder="搜索标题、作者或标签"
          />
        </label>
        <div class="segmented" aria-label="平台筛选">
          ${["all", "抖音", "快手", "哔哩哔哩", "TikTok"]
            .map(
              (platform) => `
                <button
                  class="${state.historyPlatform === platform ? "is-active" : ""}"
                  type="button"
                  data-history-platform="${escapeHTML(platform)}"
                >
                  ${platform === "all" ? "全部" : escapeHTML(platform)}
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="segmented" aria-label="已获取视频排序">
          <button
            class="${state.historySort === "recent" ? "is-active" : ""}"
            type="button"
            data-history-sort="recent"
          >
            最近获取
          </button>
          <button
            class="${state.historySort === "liked" ? "is-active" : ""}"
            type="button"
            data-history-sort="liked"
          >
            热度优先
          </button>
        </div>
        <button class="button button--danger" type="button" data-clear-history ${total ? "" : "disabled"}>
          <i data-lucide="trash-2"></i>
          清空
        </button>
      </div>

      ${
        list.length
          ? `
            <div class="video-grid" data-video-context="history">
              ${list.map(renderVideoCard).join("")}
            </div>
          `
          : total
            ? renderEmpty("没有匹配的已获取视频", "换一个平台或关键词，或者清空筛选条件。")
            : renderEmpty(
                "还没有获取过视频",
                "在视频页使用搜索或本地采集后，结果会自动保存在这里。",
              )
      }
    </main>
  `;
}

function renderVideoDetail() {
  const video = videos.find((item) => item.id === state.route.id);

  if (!video) {
    return `
      <main class="page-main" id="main-content">
        <div class="empty-state">
          <div>
            <i data-lucide="video-off"></i>
            <strong>没有找到这条视频</strong>
            <p>它可能已被移除，返回视频流后重新选择。</p>
            <button class="button" type="button" data-nav="videos" style="margin-top:16px">
              <i data-lucide="arrow-left"></i>
              返回视频
            </button>
          </div>
        </div>
      </main>
    `;
  }

  const list = getFilteredVideos();
  const contextList = list.some((item) => item.id === video.id)
    ? list
    : videos.filter((item) => !state.activeTag || item.tags.includes(state.activeTag));
  const index = contextList.findIndex((item) => item.id === video.id);
  const previous = index > 0 ? contextList[index - 1] : null;
  const next = index >= 0 && index < contextList.length - 1 ? contextList[index + 1] : null;
  const saved = state.saved.has(video.id);
  const poster = video.poster || "assets/media/street-fashion.jpg";
  const canPlay = !video.needsPlayback || Boolean(video.source);

  return `
    <main class="page-main" id="main-content">
      <article class="detail-shell">
        <button class="button button--quiet detail-back" type="button" data-back-to-videos>
          <i data-lucide="arrow-left"></i>
          返回视频流
        </button>

        <div class="player-frame">
          ${
            canPlay
              ? `
                <video
                  id="current-video"
                  controls
                  playsinline
                  preload="metadata"
                  poster="${escapeHTML(poster)}"
                  src="${escapeHTML(video.source)}"
                ></video>
              `
              : `
                <div class="player-loading">
                  <i data-lucide="${video.playbackError ? "circle-alert" : "loader-circle"}"></i>
                  <strong>${video.playbackError ? "播放地址获取失败" : "正在获取播放地址"}</strong>
                  <span>${escapeHTML(video.playbackError || "哔哩哔哩视频需要先解析 cid 和流地址")}</span>
                </div>
              `
          }
        </div>

        <div class="detail-actions" aria-label="视频操作">
          <button class="button" type="button" data-previous="${previous ? previous.id : ""}" ${previous ? "" : "disabled"}>
            <i data-lucide="chevron-left"></i>
            上一个
          </button>
          <button class="button button--primary" type="button" data-save-video="${video.id}" ${canPlay ? "" : "disabled"}>
            <i data-lucide="download"></i>
            ${saved ? "已保存 · 再次下载" : "保存视频"}
          </button>
          <button class="button" type="button" data-next="${next ? next.id : ""}" ${next ? "" : "disabled"}>
            下一个
            <i data-lucide="chevron-right"></i>
          </button>
        </div>

        <section class="detail-info">
          <h1 class="detail-title">${escapeHTML(video.title)}</h1>
          <div class="detail-meta">
            <span><i data-lucide="at-sign"></i>${escapeHTML(video.creator)}</span>
            <span><i data-lucide="monitor-play"></i>${escapeHTML(video.platform)}</span>
            <span><i data-lucide="clock-3"></i>${escapeHTML(video.duration)}</span>
            <span><i data-lucide="heart"></i>${escapeHTML(video.likes)}</span>
          </div>
          <div class="detail-tags">
            ${video.tags
              .map(
                (tag) => `
                  <button class="detail-tag" type="button" data-tag="${escapeHTML(tag)}">
                    # ${escapeHTML(tag)}
                  </button>
                `,
              )
              .join("")}
          </div>
          <p class="detail-description">${escapeHTML(video.description)}</p>
        </section>
      </article>
    </main>
  `;
}

function renderSettings() {
  return `
    <main class="page-main" id="main-content">
      <section class="page-intro">
        <p class="eyebrow">Preferences</p>
        <h1 class="page-title">设置</h1>
        <p class="page-subtitle">
          管理自动收集、存储位置、下载偏好和免费 MediaCrawler 连接。未连接时仍可浏览内置示例。
        </p>
      </section>

      <div class="settings-shell">
        <section class="settings-group">
          <div class="settings-group__header">
            <h2 class="settings-group__title">自动收集</h2>
            <p class="settings-group__hint">个人使用时建议保持低频、只收集公开且有权保存的内容。</p>
          </div>
          ${renderToggleRow(
            "启用自动收集",
            "首次设置关键词后，按设定间隔重复采集最近使用的关键词。",
            "autoCollect",
            state.settings.autoCollect,
          )}
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">检查间隔</span>
              <span class="setting-row__description">间隔越长，对平台和本地资源的压力越小。</span>
            </div>
            <select class="setting-select setting-control" data-setting="interval">
              ${renderOptions(
                [
                  ["15", "每 15 分钟"],
                  ["30", "每 30 分钟"],
                  ["60", "每小时"],
                  ["240", "每 4 小时"],
                ],
                state.settings.interval,
              )}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">自动采集关键词</span>
              <span class="setting-row__description">多个关键词用逗号分隔，每次按顺序轮换采集。</span>
            </div>
            <input
              class="setting-input setting-control"
              type="text"
              data-setting="autoKeywords"
              value="${escapeHTML(state.settings.autoKeywords)}"
              placeholder="黑丝,白丝,街舞"
            />
          </div>
          ${renderToggleRow(
            "仅 Wi-Fi 下载",
            "移动网络下只同步标签和标题，不下载视频文件。",
            "onlyWifi",
            state.settings.onlyWifi,
          )}
        </section>

        <section class="settings-group">
          <div class="settings-group__header">
            <h2 class="settings-group__title">下载与存储</h2>
            <p class="settings-group__hint">保存按钮位于单条视频页面，视频流列表不会出现保存操作。</p>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">默认清晰度</span>
              <span class="setting-row__description">优先选择平台可提供的最高画质，失败时自动降级。</span>
            </div>
            <select class="setting-select setting-control" data-setting="quality">
              ${renderOptions(
                [
                  ["1080p", "1080p"],
                  ["720p", "720p"],
                  ["best", "最高可用"],
                ],
                state.settings.quality,
              )}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">下载目录</span>
              <span class="setting-row__description">仅供本地采集器读取，浏览器端保留展示值。</span>
            </div>
            <input
              class="setting-input setting-control"
              type="text"
              data-setting="downloadDir"
              value="${escapeHTML(state.settings.downloadDir)}"
            />
          </div>
        </section>

        <section class="settings-group">
          <div class="settings-group__header">
            <h2 class="settings-group__title">搜索与采集 API</h2>
            <p class="settings-group__hint">
              默认为 TikHub 搜索 API。Demo 模式可无 Key 预览；本地 MediaCrawler 仅作为备用。
            </p>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">API 模式</span>
              <span class="setting-row__description">TikHub 支持抖音、快手、哔哩哔哩和 TikTok 搜索；Demo 仅返回固定缓存。</span>
            </div>
            <select class="setting-select setting-control" data-setting="dataSource">
              ${renderOptions(
                [
                  ["tikhub", "TikHub API"],
                  ["demo", "公开 Demo"],
                  ["collector", "本地 MediaCrawler"],
                ],
                state.settings.dataSource,
              )}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">TikHub API Key</span>
              <span class="setting-row__description">
                ${
                  state.serverKeyConfigured
                    ? "站点已配置共享 Key。留空即可使用共享额度；填写后将消耗你自己的账号额度。"
                    : `新账号约有 50 次免费请求额度，<a href="https://tikhub.io/" target="_blank" rel="noreferrer">前往 TikHub 获取</a>。`
                }
              </span>
            </div>
            <input
              class="setting-input setting-control"
              type="password"
              data-setting="tikhubApiKey"
              value="${escapeHTML(state.settings.tikhubApiKey)}"
              autocomplete="off"
              spellcheck="false"
              placeholder="可选，留空使用站点共享 Key"
            />
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">每次搜索数量</span>
              <span class="setting-row__description">个人使用建议控制在 10 到 30 条，避免高频请求。</span>
            </div>
            <select class="setting-select setting-control" data-setting="collectionLimit">
              ${renderOptions(
                [
                  ["10", "最多 10 条"],
                  ["20", "最多 20 条"],
                  ["30", "最多 30 条"],
                  ["50", "最多 50 条"],
                ],
                state.settings.collectionLimit,
              )}
            </select>
          </div>
          ${
            state.settings.dataSource === "collector"
              ? `
                <div class="setting-row">
                  <div class="setting-row__copy">
                    <span class="setting-row__label">采集器地址</span>
                    <span class="setting-row__description">默认对应 MediaCrawler WebUI API 的本地端口。</span>
                  </div>
                  <input
                    class="setting-input setting-control"
                    type="url"
                    data-setting="collectorUrl"
                    value="${escapeHTML(state.settings.collectorUrl)}"
                    spellcheck="false"
                  />
                </div>
                <div class="setting-row">
                  <div class="setting-row__copy">
                    <span class="setting-row__label">登录 Cookie（可选）</span>
                    <span class="setting-row__description">留空时首次任务会打开浏览器扫码；Cookie 只保存在当前浏览器。</span>
                  </div>
                  <input
                    class="setting-input setting-control"
                    type="password"
                    data-setting="cookie"
                    value="${escapeHTML(state.settings.cookie)}"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="留空则扫码登录"
                  />
                </div>
              `
              : ""
          }
          <div class="settings-actions">
            <span class="connection-result ${connectionClass()}">
              <i data-lucide="${connectionIcon()}"></i>
              ${escapeHTML(state.connection.message)}
            </span>
            <button class="button" type="button" data-test-connection>
              <i data-lucide="plug-zap"></i>
              测试连接
            </button>
          </div>
        </section>

        <section class="settings-group">
          <div class="settings-group__header">
            <h2 class="settings-group__title">外观与数据</h2>
            <p class="settings-group__hint">主题会保存到本机，不会上传。</p>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">界面主题</span>
              <span class="setting-row__description">深色模式更接近参考图底部 Dock 的悬浮质感。</span>
            </div>
            <select class="setting-select setting-control" data-setting="theme">
              ${renderOptions(
                [
                  ["dark", "深色"],
                  ["light", "浅色"],
                  ["system", "跟随系统"],
                ],
                state.settings.theme,
              )}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-row__copy">
              <span class="setting-row__label">已保存视频</span>
              <span class="setting-row__description">当前本机记录了 ${state.saved.size} 条已保存视频。</span>
            </div>
            <button class="button button--danger setting-control" type="button" data-clear-saved ${state.saved.size ? "" : "disabled"}>
              <i data-lucide="trash-2"></i>
              清空记录
            </button>
          </div>
        </section>
      </div>
    </main>
  `;
}

function renderToggleRow(label, description, setting, value) {
  return `
    <div class="setting-row">
      <div class="setting-row__copy">
        <span class="setting-row__label">${escapeHTML(label)}</span>
        <span class="setting-row__description">${escapeHTML(description)}</span>
      </div>
      <button
        class="toggle setting-control"
        type="button"
        data-toggle="${escapeHTML(setting)}"
        aria-pressed="${value ? "true" : "false"}"
        aria-label="${escapeHTML(label)}"
      ></button>
    </div>
  `;
}

function renderOptions(options, selected) {
  return options
    .map(
      ([value, label]) =>
        `<option value="${escapeHTML(value)}" ${value === selected ? "selected" : ""}>${escapeHTML(label)}</option>`,
    )
    .join("");
}

function connectionClass() {
  if (state.connection.status === "ok") return "is-ok";
  if (state.connection.status === "error") return "is-error";
  return "";
}

function connectionIcon() {
  if (state.connection.status === "ok") return "circle-check";
  if (state.connection.status === "error") return "circle-alert";
  return "circle-dot";
}

function renderEmpty(title, description) {
  return `
    <div class="empty-state">
      <div>
        <i data-lucide="search-x"></i>
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(description)}</p>
      </div>
    </div>
  `;
}

function renderDock() {
  const activeView = state.route.view === "video" ? "videos" : state.route.view;

  return `
    <nav class="dock-shell" aria-label="主导航">
      ${Object.entries(routeMap)
        .map(([view, item]) => {
          const active = view === activeView;
          const badgeCount =
            view === "videos"
              ? state.saved.size
              : view === "history"
                ? state.collectedVideos.filter((video) => video.real).length
                : 0;
          const badge = badgeCount
            ? `<span class="dock-badge">${badgeCount > 99 ? "99+" : badgeCount}</span>`
            : "";
          return `
            <button
              class="dock-item ${active ? "is-active" : ""}"
              type="button"
              data-nav="${view}"
              aria-current="${active ? "page" : "false"}"
            >
              <span class="dock-icon">
                <i data-lucide="${item.icon}"></i>
                ${badge}
              </span>
              <span class="dock-label">${item.label}</span>
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
}

function renderView() {
  if (state.route.view === "videos") return renderVideos();
  if (state.route.view === "history") return renderHistory();
  if (state.route.view === "video") return renderVideoDetail();
  if (state.route.view === "settings") return renderSettings();
  return renderTags();
}

function render() {
  const searchValue = state.tagSearch;
  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      ${renderView()}
      ${renderDock()}
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2,
      },
    });
  }

  if (state.route.view === "tags") {
    const searchInput = document.querySelector("#tag-search");
    if (searchInput) {
      searchInput.value = searchValue;
    }
  }

  if (state.route.view === "video") {
    const currentVideo = videos.find((item) => item.id === state.route.id);
    if (currentVideo?.needsPlayback && !currentVideo.sourceLoading && !currentVideo.playbackError) {
      window.setTimeout(() => hydrateVideoPlayback(currentVideo.id), 0);
    }
  }
}

function showToast(message, icon = "check-circle-2") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHTML(message)}</span>`;
  toastRoot.append(toast);

  if (window.lucide) {
    window.lucide.createIcons({ nodes: [toast] });
  }

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function openVideo(id) {
  navigate("video", id);
}

function goToAdjacentVideo(id) {
  if (!id) return;
  navigate("video", id);
}

function saveVideo(videoId) {
  const video = videos.find((item) => item.id === videoId);
  if (!video) return;
  if (!video.source) {
    showToast("播放地址尚未解析完成，暂时不能保存。", "circle-alert");
    return;
  }

  state.saved.add(video.id);
  persistSaved();

  const link = document.createElement("a");
  link.href = video.source;
  link.download = `${video.title}.mp4`;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();

  showToast("已加入保存记录，并开始下载视频文件。");
  render();
}

async function testConnection() {
  state.connection = { status: "idle", message: "正在连接..." };
  render();

  try {
    let response;

    if (state.settings.dataSource === "demo") {
      state.connection = { status: "ok", message: "公开 Demo 模式可用，无需 API Key" };
      render();
      return;
    }

    if (state.settings.dataSource === "collector") {
      const base = encodeURIComponent(state.settings.collectorUrl.replace(/\/+$/, ""));
      response = await fetch(`/api/collector/health?base=${base}`, {
        headers: { Accept: "application/json" },
      });
    } else {
      const key = encodeURIComponent(state.settings.tikhubApiKey.trim());
      response = await fetch(`/api/collector/search/health?key=${key}`, {
        headers: { Accept: "application/json" },
      });
    }

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);

    state.connection = {
      status: "ok",
      message: result.message || "API 连接成功",
    };
  } catch (error) {
    state.connection = {
      status: "error",
      message: error instanceof Error ? error.message : "连接失败，请确认服务与端口",
    };
  }

  render();
}

function updateCollectorStatusUI() {
  const text = document.querySelector("[data-collector-status]");
  const indicator = document.querySelector(".collector-status");
  if (text) text.textContent = state.collection.message;

  if (indicator) {
    indicator.classList.remove("is-running", "is-success", "is-error");
    if (state.collection.status === "running") indicator.classList.add("is-running");
    if (state.collection.status === "success") indicator.classList.add("is-success");
    if (state.collection.status === "error") indicator.classList.add("is-error");
  }
}

async function loadCollectedResults(keyword, platform) {
  const base = encodeURIComponent(state.settings.collectorUrl.replace(/\/+$/, ""));
  const limit = Number(state.settings.collectionLimit) || 20;
  const response = await fetch(
    `/api/collector/results?base=${base}&platform=${encodeURIComponent(platform)}&keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
    { headers: { Accept: "application/json" } },
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "读取采集结果失败");
  }

  const incoming = Array.isArray(result.items) ? result.items : [];
  const merged = new Map();

  for (const item of incoming) {
    merged.set(item.id, item);
  }

  for (const item of state.collectedVideos) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }

  state.collectedVideos = [...merged.values()].slice(0, 160);
  persistCollected();
  refreshVideoCache();
  return incoming.length;
}

function updateCollectorProgressUI() {
  const total = state.collection.total || 0;
  const completed = Math.min(state.collection.completed, total);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const progressText = document.querySelector("[data-collector-progress-text]");
  const progressTrack = document.querySelector(".collector-progress__track span");
  const queueText = document.querySelector("[data-collector-queue]");
  const logText = document.querySelector("[data-collector-log]");

  if (progressText) {
    progressText.textContent =
      `已完成 ${completed}/${total}，成功 ${state.collection.succeeded}，失败 ${state.collection.failed}`;
  }

  if (progressTrack) progressTrack.style.width = `${progress}%`;

  if (queueText) {
    queueText.textContent =
      !state.collection.running && completed >= total && total > 0
        ? "本批次已完成"
        : state.collection.currentKeyword
          ? `当前：${state.collection.currentKeyword}${state.collection.queue.length ? ` · 队列还有 ${state.collection.queue.length} 个` : ""}`
          : "等待下一个关键词";
  }

  if (logText && state.collection.lastLog) {
    logText.textContent = state.collection.lastLog;
  }
}

function mergeCollectedVideos(incoming) {
  const merged = new Map();

  for (const item of incoming) {
    merged.set(item.id, item);
  }

  for (const item of state.collectedVideos) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }

  state.collectedVideos = [...merged.values()].slice(0, 400);
  persistCollected();
  refreshVideoCache();
}

async function runApiSearch(options = {}) {
  const provider = state.settings.dataSource;

  if (provider === "collector") {
    await startCollection(options);
    return 0;
  }

  const demo = provider === "demo";
  const requestedPlatform = options.platform || state.search.platform;
  let platform = ["dy", "ks", "bili", "tt"].includes(requestedPlatform)
    ? requestedPlatform
    : "dy";
  const input = document.querySelector("#search-keyword");
  const keyword = String(options.keyword ?? input?.value ?? state.search.keyword ?? "").trim();
  const apiKey = state.settings.tikhubApiKey.trim();
  const demoFallback = !demo && !apiKey && !state.serverKeyConfigured;

  if (!keyword) {
    input?.focus();
    showToast("先输入一个搜索关键词。", "circle-alert");
    return 0;
  }

  if (demoFallback && platform !== "dy") {
    platform = "dy";
  }

  state.search = {
    ...state.search,
    loading: true,
    active: true,
    keyword,
    platform,
    results: options.keepResults ? state.search.results : [],
    total: 0,
    error: "",
    demo: demo || demoFallback,
  };
  render();

  try {
    const response = await fetch("/api/collector/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        platform,
        keyword,
        limit: Number(state.settings.collectionLimit) || 20,
        demo: demo || demoFallback,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "搜索失败");

    const items = Array.isArray(result.items) ? result.items : [];
    mergeCollectedVideos(items);
    state.search = {
      ...state.search,
      loading: false,
      active: true,
      platform,
      results: items,
      total: items.length,
      error: "",
      demo: Boolean(result.demo) || demoFallback,
    };
    state.activeTag = "";
    state.settings.collectionPlatform = platform;
    if (!state.settings.autoKeywords) {
      state.settings.autoKeywords = keyword;
    }
    persistSettings();
    render();
    showToast(
      demoFallback
        ? `未配置 API Key，已用 Demo 返回 ${items.length} 条视频。`
        : items.length
          ? `${result.demo ? "Demo 返回" : "搜索完成"} ${items.length} 条视频。`
        : "搜索完成，没有返回视频。",
      items.length ? "check-circle-2" : "info",
    );
    scheduleAutoCollection();
    return items.length;
  } catch (error) {
    state.search = {
      ...state.search,
      loading: false,
      active: true,
      platform,
      results: [],
      total: 0,
      error: error instanceof Error ? error.message : "搜索失败",
    };
    render();
    showToast(state.search.error, "circle-alert");
    return 0;
  }
}

async function runShareResolve() {
  const input = document.querySelector("#share-link");
  const text = String(input?.value || state.linkResolve.text || "").trim();
  const apiKey = state.settings.tikhubApiKey.trim();

  if (!text) {
    state.linkResolve.error = "请粘贴视频分享链接或分享文本";
    input?.focus();
    render();
    return;
  }

  if (!apiKey && !state.serverKeyConfigured) {
    state.linkResolve = {
      loading: false,
      text,
      error: "分享链接识别需要先填写 TikHub API Key",
    };
    render();
    showToast("请先在设置中填写 TikHub API Key。", "circle-alert");
    return;
  }

  state.linkResolve = { loading: true, text, error: "" };
  render();

  try {
    const response = await fetch("/api/collector/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, text }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "分享链接识别失败");

    mergeCollectedVideos([result.item]);
    state.linkResolve = { loading: false, text, error: "" };
    state.detailContext = "auto";
    state.activeTag = "";
    showToast(`已识别 ${result.item.platform} 视频。`);
    navigate("video", result.item.id);
  } catch (error) {
    state.linkResolve = {
      loading: false,
      text,
      error: error instanceof Error ? error.message : "分享链接识别失败",
    };
    render();
  }
}

const playbackRequests = new Set();

async function hydrateVideoPlayback(videoId) {
  const video = videos.find((item) => item.id === videoId);
  if (!video?.needsPlayback || video.source || video.playbackError || playbackRequests.has(videoId)) return;

  const apiKey = state.settings.tikhubApiKey.trim();
  if (!apiKey && !state.serverKeyConfigured) {
    video.playbackError = "需要 TikHub API Key 才能解析哔哩哔哩播放地址";
    render();
    return;
  }

  playbackRequests.add(videoId);
  video.sourceLoading = true;
  video.playbackError = "";

  try {
    const params = new URLSearchParams({
      key: apiKey,
      platform: "bili",
      id: video.bvid || video.aid || "",
      bvid: video.bvid || "",
      aid: video.aid || "",
      cid: video.cid || "",
    });
    const response = await fetch(`/api/collector/video?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "获取播放地址失败");

    video.source = result.source;
    video.bvid = result.bvid || video.bvid;
    video.aid = result.aid || video.aid;
    video.cid = result.cid || video.cid;
    if (result.poster) video.poster = result.poster;
    if (result.title && !video.title) video.title = result.title;
    video.needsPlayback = false;
    video.sourceLoading = false;
    video.playbackError = "";
    persistCollected();
  } catch (error) {
    video.sourceLoading = false;
    video.playbackError = error instanceof Error ? error.message : "获取播放地址失败";
  } finally {
    playbackRequests.delete(videoId);
    refreshVideoCache();
    render();
  }
}

function stopCollectionPolling() {
  if (collectionPollTimer) {
    window.clearTimeout(collectionPollTimer);
    collectionPollTimer = null;
  }
}

function scheduleAutoCollection() {
  if (autoCollectTimer) {
    window.clearTimeout(autoCollectTimer);
    autoCollectTimer = null;
  }

  const keywords = parseCollectionKeywords(
    state.settings.autoKeywords || state.settings.lastCollectionKeyword,
  );

  const provider = state.settings.dataSource;
  if (
    !state.settings.autoCollect ||
    provider === "demo" ||
    !keywords.length ||
    (provider === "tikhub" && !state.settings.tikhubApiKey.trim() && !state.serverKeyConfigured)
  ) {
    return;
  }

  const minutes = Math.max(Number(state.settings.interval) || 30, 5);
  autoCollectTimer = window.setTimeout(() => {
    if (provider === "collector" && !state.collection.running) {
      startCollection({
        keywords,
        platform: state.settings.collectionPlatform,
      });
      return;
    }

    if (provider === "tikhub" && !state.search.loading) {
      const keyword = keywords[autoKeywordIndex % keywords.length];
      autoKeywordIndex += 1;
      runApiSearch({
        keyword,
        platform: state.settings.collectionPlatform,
      });
    }
  }, minutes * 60 * 1000);
}

async function pollCollection() {
  stopCollectionPolling();

  try {
    const base = encodeURIComponent(state.settings.collectorUrl.replace(/\/+$/, ""));
    const response = await fetch(`/api/collector/status?base=${base}`, {
      headers: { Accept: "application/json" },
    });
    const status = await response.json();
    if (!response.ok) throw new Error(status.error || "查询采集状态失败");

    if (status.status === "running") {
      const logResponse = await fetch(`/api/collector/logs?base=${base}&limit=8`, {
        headers: { Accept: "application/json" },
      });
      const logResult = await logResponse.json().catch(() => ({ logs: [] }));
      const logs = Array.isArray(logResult.logs) ? logResult.logs : [];
      if (logs.length) {
        state.collection.logs = logs;
        state.collection.lastLog = logs.at(-1)?.message || "";
      }
      state.collection = {
        ...state.collection,
        status: "running",
        running: true,
        message: `正在采集 ${Math.min(state.collection.completed + 1, state.collection.total)}/${state.collection.total} · ${state.collection.currentKeyword}`,
      };
      updateCollectorStatusUI();
      updateCollectorProgressUI();
      collectionPollTimer = window.setTimeout(pollCollection, 2200);
      return;
    }

    const logResponse = await fetch(`/api/collector/logs?base=${base}&limit=8`, {
      headers: { Accept: "application/json" },
    });
    const logResult = await logResponse.json().catch(() => ({ logs: [] }));
    const logs = Array.isArray(logResult.logs) ? logResult.logs : [];
    const lastLog = logs.at(-1)?.message || "";
    const count = await loadCollectedResults(
      state.collection.currentKeyword,
      state.collection.platform,
    );
    const hasError = logs.some((entry) => entry.level === "error");

    state.collection = {
      ...state.collection,
      status: "running",
      completed: Math.min(state.collection.completed + 1, state.collection.total),
      succeeded: state.collection.succeeded + (hasError ? 0 : 1),
      failed: state.collection.failed + (hasError ? 1 : 0),
      added: state.collection.added + count,
      lastLog,
      logs,
    };

    if (state.collection.queue.length) {
      state.collection.message = `准备采集下一关键词`;
      state.collection.currentKeyword = state.collection.queue[0];
      updateCollectorStatusUI();
      updateCollectorProgressUI();
      collectionPollTimer = window.setTimeout(runNextCollection, 900);
      return;
    }

    finishCollectionBatch();
  } catch (error) {
    state.collection = {
      ...state.collection,
      status: "error",
      running: false,
      message: error instanceof Error ? error.message : "采集失败",
      failed: state.collection.failed + 1,
      completed: Math.min(state.collection.completed + 1, state.collection.total),
    };
    render();
    showToast(state.collection.message, "circle-alert");
  }
}

function finishCollectionBatch() {
  const batchKeywords = parseCollectionKeywords(state.collection.keyword);
  const hasFailures = state.collection.failed > 0;
  const completed = Math.min(state.collection.completed, state.collection.total);

  state.collection = {
    ...state.collection,
    status: hasFailures && state.collection.succeeded === 0 ? "error" : "success",
    running: false,
    currentKeyword: "",
    message: `批量采集完成：${completed}/${state.collection.total}，新增 ${state.collection.added} 条`,
  };
  state.activeTag = batchKeywords.length === 1 ? batchKeywords[0] : "";
  render();
  showToast(state.collection.message, hasFailures ? "circle-alert" : "check-circle-2");
  scheduleAutoCollection();
}

async function runNextCollection() {
  if (!state.collection.queue.length) {
    finishCollectionBatch();
    return;
  }

  const keyword = state.collection.queue.shift();
  state.collection.currentKeyword = keyword;
  state.collection.running = true;
  state.collection.status = "running";
  state.collection.message = `正在启动「${keyword}」`;
  updateCollectorStatusUI();
  updateCollectorProgressUI();

  try {
    const response = await fetch("/api/collector/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base: state.settings.collectorUrl,
        platform: state.collection.platform,
        keyword,
        limit: Number(state.settings.collectionLimit) || 20,
        cookie: state.settings.cookie || "",
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "启动采集失败");

    state.settings.lastCollectionKeyword = keyword;
    persistSettings();
    state.collection.message = state.settings.cookie
      ? `正在采集 ${state.collection.completed + 1}/${state.collection.total} · ${keyword}`
      : `请扫码登录后采集 ${keyword}`;
    updateCollectorStatusUI();
    updateCollectorProgressUI();
    showToast(
      state.settings.cookie
        ? `开始采集「${keyword}」。`
        : `已打开登录页面，请扫码后采集「${keyword}」。`,
      "loader-circle",
    );
    collectionPollTimer = window.setTimeout(pollCollection, 2500);
  } catch (error) {
    state.collection.failed += 1;
    state.collection.completed = Math.min(state.collection.completed + 1, state.collection.total);
    state.collection.lastLog = error instanceof Error ? error.message : "启动采集失败";

    if (state.collection.queue.length) {
      state.collection.message = `「${keyword}」失败，继续下一个`;
      updateCollectorStatusUI();
      updateCollectorProgressUI();
      collectionPollTimer = window.setTimeout(runNextCollection, 800);
      return;
    }

    state.collection.status = "error";
    state.collection.running = false;
    state.collection.message = `采集失败：${state.collection.lastLog}`;
    render();
    showToast(state.collection.message, "circle-alert");
  }
}

async function startCollection(options = {}) {
  if (state.settings.dataSource !== "collector") {
    showToast("请先在设置中切换为“本地采集器”。", "circle-alert");
    return;
  }

  const input = document.querySelector("#collection-keyword");
  const rawKeywords = options.keywords ?? options.keyword ?? input?.value ?? state.collection.keyword ?? "";
  const keywords = Array.isArray(rawKeywords)
    ? parseCollectionKeywords(rawKeywords.join(","))
    : parseCollectionKeywords(rawKeywords);
  const platform = options.platform === "ks" ? "ks" : state.settings.collectionPlatform;

  if (!keywords.length) {
    input?.focus();
    showToast("先输入一个视频关键词。", "circle-alert");
    return;
  }

  if (state.collection.running) {
    const existing = new Set([state.collection.currentKeyword, ...state.collection.queue]);
    const pending = keywords.filter((keyword) => !existing.has(keyword));
    state.collection.queue.push(...pending);
    state.collection.total += pending.length;
    state.collection.message = `已追加 ${pending.length} 个关键词到队列`;
    updateCollectorStatusUI();
    updateCollectorProgressUI();
    showToast(`已追加 ${pending.length} 个关键词。`);
    return;
  }

  stopCollectionPolling();
  state.collection = {
    status: "running",
    running: true,
    message: `准备采集 ${keywords.length} 个关键词`,
    platform,
    keyword: keywords.join(","),
    currentKeyword: "",
    queue: keywords,
    total: keywords.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    added: 0,
    lastLog: "",
    logs: [],
  };
  state.settings.collectionPlatform = platform;
  state.settings.lastCollectionKeyword = keywords[0];
  if (!state.settings.autoKeywords) {
    state.settings.autoKeywords = keywords.join(",");
  }
  persistSettings();
  render();
  await runNextCollection();
}

function setTag(tag) {
  state.search.active = false;
  state.search.results = [];
  state.activeTag = tag;
  navigate("videos");
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    state.detailContext = "auto";
    navigate(nav.dataset.nav);
    return;
  }

  const tag = event.target.closest("[data-tag]");
  if (tag) {
    setTag(tag.dataset.tag);
    return;
  }

  const open = event.target.closest("[data-open-video]");
  if (open) {
    state.detailContext =
      open.closest("[data-video-context]")?.dataset.videoContext === "history"
        ? "history"
        : "auto";
    openVideo(open.dataset.openVideo);
    return;
  }

  const previous = event.target.closest("[data-previous]");
  if (previous && previous.dataset.previous) {
    goToAdjacentVideo(previous.dataset.previous);
    return;
  }

  const next = event.target.closest("[data-next]");
  if (next && next.dataset.next) {
    goToAdjacentVideo(next.dataset.next);
    return;
  }

  const save = event.target.closest("[data-save-video]");
  if (save) {
    saveVideo(save.dataset.saveVideo);
    return;
  }

  const back = event.target.closest("[data-back-to-videos]");
  if (back) {
    navigate("videos");
    return;
  }

  const clearTag = event.target.closest("[data-clear-tag]");
  if (clearTag) {
    state.activeTag = "";
    render();
    return;
  }

  const searchPlatform = event.target.closest("[data-search-platform]");
  if (searchPlatform) {
    const requestedPlatform = searchPlatform.dataset.searchPlatform;
    const nextPlatform = ["dy", "ks", "bili", "tt"].includes(requestedPlatform)
      ? requestedPlatform
      : "dy";
    if (state.settings.dataSource === "demo" && nextPlatform !== "dy") {
      showToast("公开 Demo 暂时只有抖音缓存结果，请先配置 API Key。", "circle-alert");
      return;
    }
    const input = document.querySelector("#search-keyword");
    state.search.keyword = String(input?.value || state.search.keyword || "");
    state.search.platform = nextPlatform;
    render();
    return;
  }

  const clearSearch = event.target.closest("[data-clear-search]");
  if (clearSearch) {
    state.search = {
      ...state.search,
      active: false,
      results: [],
      total: 0,
      error: "",
      loading: false,
    };
    render();
    return;
  }

  const historyPlatform = event.target.closest("[data-history-platform]");
  if (historyPlatform) {
    state.historyPlatform = historyPlatform.dataset.historyPlatform || "all";
    render();
    return;
  }

  const historySort = event.target.closest("[data-history-sort]");
  if (historySort) {
    state.historySort = historySort.dataset.historySort === "liked" ? "liked" : "recent";
    render();
    return;
  }

  const clearHistory = event.target.closest("[data-clear-history]");
  if (clearHistory) {
    if (window.confirm("确定清空全部已获取视频记录吗？此操作不会删除已经下载到本地的文件。")) {
      state.collectedVideos = [];
      persistCollected();
      refreshVideoCache();
      state.search.results = [];
      state.search.active = false;
      state.detailContext = "auto";
      showToast("已清空获取记录。");
      render();
    }
    return;
  }

  const platform = event.target.closest("[data-collection-platform]");
  if (platform) {
    const input = document.querySelector("#collection-keyword");
    state.collection.keyword = String(input?.value || state.collection.keyword || "");
    state.settings.collectionPlatform = platform.dataset.collectionPlatform === "ks" ? "ks" : "dy";
    persistSettings();
    render();
    return;
  }

  const suggestion = event.target.closest("[data-keyword-suggestion]");
  if (suggestion) {
    state.collection.keyword = suggestion.dataset.keywordSuggestion;
    render();
    startCollection();
    return;
  }

  const clearCollection = event.target.closest("[data-clear-collection]");
  if (clearCollection) {
    const keyword = state.collection.keyword.trim();
    fetch("/api/collector/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base: state.settings.collectorUrl }),
    }).catch(() => {});
    if (keyword) {
      const keywords = new Set(parseCollectionKeywords(keyword));
      state.collectedVideos = state.collectedVideos.filter(
        (video) => !video.real || !keywords.has(video.sourceKeyword),
      );
      persistCollected();
      refreshVideoCache();
    }
    state.collection = {
      ...state.collection,
      status: "idle",
      running: false,
      message: "免费采集器待命",
      keyword: "",
      currentKeyword: "",
      queue: [],
      total: 0,
      completed: 0,
      succeeded: 0,
      failed: 0,
      added: 0,
      lastLog: "",
      logs: [],
    };
    state.activeTag = "";
    stopCollectionPolling();
    if (autoCollectTimer) {
      window.clearTimeout(autoCollectTimer);
      autoCollectTimer = null;
    }
    render();
    return;
  }

  const sort = event.target.closest("[data-sort]");
  if (sort) {
    state.sort = sort.dataset.sort;
    render();
    return;
  }

  const toggle = event.target.closest("[data-toggle]");
  if (toggle) {
    const key = toggle.dataset.toggle;
    state.settings[key] = !state.settings[key];
    persistSettings();
    if (key === "autoCollect") scheduleAutoCollection();
    render();
    return;
  }

  const test = event.target.closest("[data-test-connection]");
  if (test) {
    testConnection();
    return;
  }

  const clearSaved = event.target.closest("[data-clear-saved]");
  if (clearSaved) {
    state.saved.clear();
    persistSaved();
    showToast("已清空本机保存记录。");
    render();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#tag-search")) {
    state.tagSearch = event.target.value;
    const start = event.target.selectionStart;
    render();
    const nextInput = document.querySelector("#tag-search");
    nextInput?.focus();
    if (start !== null) nextInput?.setSelectionRange(start, start);
    return;
  }

  if (event.target.matches("#collection-keyword")) {
    state.collection.keyword = event.target.value;
    return;
  }

  if (event.target.matches("#search-keyword")) {
    state.search.keyword = event.target.value;
    if (state.search.error) state.search.error = "";
    return;
  }

  if (event.target.matches("#history-search")) {
    state.historySearch = event.target.value;
    const start = event.target.selectionStart;
    render();
    const nextInput = document.querySelector("#history-search");
    nextInput?.focus();
    if (start !== null) nextInput?.setSelectionRange(start, start);
    return;
  }

  if (event.target.matches("#share-link")) {
    state.linkResolve.text = event.target.value;
    if (state.linkResolve.error) state.linkResolve.error = "";
    return;
  }

  const setting = event.target.closest("[data-setting]");
  if (setting) {
    state.settings[setting.dataset.setting] = setting.value;
    persistSettings();
    if (setting.dataset.setting === "theme") {
      applyTheme();
      render();
    }
  }
});

document.addEventListener("submit", (event) => {
  const resolveForm = event.target.closest("[data-link-resolve-form]");
  if (resolveForm) {
    event.preventDefault();
    const input = resolveForm.querySelector("#share-link");
    state.linkResolve.text = String(input?.value || "").trim();
    runShareResolve();
    return;
  }

  const apiForm = event.target.closest("[data-api-search-form]");
  if (apiForm) {
    event.preventDefault();
    const input = apiForm.querySelector("#search-keyword");
    state.search.keyword = String(input?.value || "").trim();
    runApiSearch();
    return;
  }

  const form = event.target.closest("[data-collector-form]");
  if (!form) return;

  event.preventDefault();
  const input = form.querySelector("#collection-keyword");
  state.collection.keyword = String(input?.value || "").trim();
  startCollection();
});

document.addEventListener("change", (event) => {
  const setting = event.target.closest("[data-setting]");
  if (!setting) return;

  state.settings[setting.dataset.setting] = setting.value;
  persistSettings();

  if (setting.dataset.setting === "theme") {
    applyTheme();
  }

  if (setting.dataset.setting === "tikhubApiKey") {
    for (const video of state.collectedVideos) {
      if (video.needsPlayback) video.playbackError = "";
    }
  }

  if (setting.dataset.setting === "dataSource") {
    state.connection = { status: "idle", message: "数据源已切换，等待测试" };
    state.search.active = false;
    state.search.results = [];
    state.search.error = "";
    state.collection.message = "免费采集器待命";
  }

  if (["autoCollect", "interval", "dataSource", "autoKeywords"].includes(setting.dataset.setting)) {
    scheduleAutoCollection();
  }

  render();
});

document.addEventListener("keydown", (event) => {
  if (state.route.view !== "video") return;
  if (event.target.matches("input, select, textarea")) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

  const list = getFilteredVideos();
  const index = list.findIndex((item) => item.id === state.route.id);
  if (index < 0) return;

  if (event.key === "ArrowLeft" && index > 0) {
    navigate("video", list[index - 1].id);
  }

  if (event.key === "ArrowRight" && index < list.length - 1) {
    navigate("video", list[index + 1].id);
  }
});

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.settings.theme === "system") {
    applyTheme();
  }
});

state.route = parseRoute();
applyTheme();
render();
loadServerConfig();
scheduleAutoCollection();
