const TIKHUB_BASE_URL = "https://api.tikhub.io";
const DEFAULT_TIMEOUT_MS = 22000;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "VideoVault/1.0",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { message: text };
    }

    if (!response.ok) {
      const error =
        payload?.detail?.message_zh ||
        payload?.detail?.message ||
        payload?.message_zh ||
        payload?.message ||
        `TikHub HTTP ${response.status}`;
      throw new Error(typeof error === "string" ? error : JSON.stringify(error));
    }

    if (payload?.code && payload.code !== 200) {
      throw new Error(payload.message_zh || payload.message || `TikHub code ${payload.code}`);
    }

    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("TikHub 请求超时");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const found = value.find((item) => typeof item === "string" && item.trim());
      if (found) return found.trim();
    }
  }
  return "";
}

function formatDuration(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "--:--";

  const seconds = Math.round(milliseconds > 1000 ? milliseconds / 1000 : milliseconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
}

function formatCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count)) return "0";
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
  if (count >= 10000) return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`;
  return String(Math.max(0, Math.round(count)));
}

function extractHashtags(text) {
  return [...String(text || "").matchAll(/#([^#\s，,。！？!?]+)/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function proxiedImage(url) {
  if (!url) return "";
  return `/api/collector/image?url=${encodeURIComponent(url)}`;
}

function normalizeDouyin(item, keyword) {
  const id = firstString(item.aweme_id, item.awemeId, item.itemId);
  const author = item.author || {};
  const video = item.video || {};
  const statistics = item.statistics || {};
  const cover = video.cover || video.origin_cover || video.dynamic_cover || {};
  const play = video.play_addr || video.play_addr_h264 || video.download_addr || {};
  const coverUrl = firstString(cover.url_list, cover.urlList);
  const source = firstString(play.url_list, play.urlList);
  const title = firstString(item.desc, item.itemTitle, item.title, "抖音视频");

  if (!id || !source) return null;

  return {
    id: `dy-${id}`,
    title,
    creator: firstString(author.nickname, author.unique_id, "抖音作者"),
    platform: "抖音",
    duration: formatDuration(video.duration || item.duration),
    likes: formatCount(statistics.digg_count || item.diggCount || item.likeCount),
    tags: [...new Set([keyword, ...extractHashtags(title), "抖音"].filter(Boolean))].slice(0, 6),
    poster: proxiedImage(coverUrl),
    source,
    description: title,
    sourceKeyword: keyword,
    sourceUrl: firstString(item.share_url, item.shareUrl, `https://www.douyin.com/video/${id}`),
    collectedAt: Date.now(),
    real: true,
  };
}

function normalizeKuaishou(item, keyword) {
  const photo = item.photo || item;
  const author = item.author || photo.author || {};
  const id = firstString(photo.id, photo.photoId, photo.photo_id, item.id);
  const source = firstString(
    photo.photoUrl,
    photo.photo_url,
    photo.playUrl,
    photo.srcNoMark,
    photo.mainMvUrls,
  );
  const title = firstString(photo.caption, photo.title, item.caption, "快手视频");
  const coverUrl = firstString(photo.coverUrl, photo.cover_url, photo.coverUrls, photo.cover);

  if (!id || !source) return null;

  return {
    id: `ks-${id}`,
    title,
    creator: firstString(author.name, author.nickname, author.userName, "快手作者"),
    platform: "快手",
    duration: formatDuration(photo.duration || item.duration),
    likes: formatCount(photo.realLikeCount || photo.likeCount || item.likeCount),
    tags: [...new Set([keyword, ...extractHashtags(title), "快手"].filter(Boolean))].slice(0, 6),
    poster: proxiedImage(coverUrl),
    source,
    description: title,
    sourceKeyword: keyword,
    sourceUrl: `https://www.kuaishou.com/short-video/${id}`,
    collectedAt: Date.now(),
    real: true,
  };
}

function normalizeBilibili(item, keyword) {
  const bvid = firstString(item.bvid, item.bv_id, item.bvId);
  const aid = firstString(item.aid, item.id);
  const author = item.author || item.owner || item.up || {};
  const title = firstString(item.title, item.name, "哔哩哔哩视频");
  const coverUrl = firstString(item.pic, item.cover, item.image, item.thumbnail);
  const duration = item.duration || item.length || item.duration_text;
  const likeCount = item.like || item.stat?.like || item.statistics?.like || 0;

  if (!bvid && !aid) return null;

  return {
    id: `bili-${bvid || aid}`,
    title: title.replace(/<[^>]+>/g, ""),
    creator: firstString(author.name, author.uname, author.nickname, "哔哩哔哩作者"),
    platform: "哔哩哔哩",
    duration: formatBilibiliDuration(duration),
    likes: formatCount(likeCount),
    tags: [...new Set([keyword, ...extractHashtags(title), "哔哩哔哩"].filter(Boolean))].slice(0, 6),
    poster: proxiedImage(coverUrl),
    source: "",
    description: firstString(item.description, item.desc, title),
    sourceKeyword: keyword,
    sourceUrl: bvid ? `https://www.bilibili.com/video/${bvid}` : `https://www.bilibili.com/video/av${aid}`,
    bvid,
    aid,
    cid: firstString(item.cid, item.pages?.[0]?.cid),
    needsPlayback: true,
    collectedAt: Date.now(),
    real: true,
  };
}

function normalizeTikTok(item, keyword) {
  const id = firstString(item.aweme_id, item.awemeId, item.id, item.item_id);
  const author = item.author || item.authorInfo || {};
  const video = item.video || item.videoInfo || {};
  const statistics = item.statistics || item.stats || {};
  const play = video.play_addr || video.playAddr || video.download_addr || video.downloadAddr || {};
  const cover = video.cover || video.origin_cover || video.originCover || video.dynamic_cover || {};
  const source = firstString(play.url_list, play.urlList, play.UrlList, play);
  const coverUrl = firstString(cover.url_list, cover.urlList, cover.UrlList, cover);
  const title = firstString(item.desc, item.title, "TikTok video");
  const username = firstString(author.unique_id, author.uniqueId, author.nickname);

  if (!id || !source) return null;

  return {
    id: `tt-${id}`,
    title,
    creator: firstString(author.nickname, username, "TikTok Creator"),
    platform: "TikTok",
    duration: formatDuration(video.duration || item.duration),
    likes: formatCount(statistics.digg_count || statistics.diggCount || item.likeCount),
    tags: [...new Set([keyword, ...extractHashtags(title), "TikTok"].filter(Boolean))].slice(0, 6),
    poster: proxiedImage(coverUrl),
    source,
    description: title,
    sourceKeyword: keyword,
    sourceUrl: username
      ? `https://www.tiktok.com/@${username}/video/${id}`
      : `https://www.tiktok.com/video/${id}`,
    collectedAt: Date.now(),
    real: true,
  };
}

function formatBilibiliDuration(value) {
  if (typeof value === "string" && value.includes(":")) return value;
  return formatDuration(Number(value) * 1000);
}

function extractShareUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return "";
  return match[0].replace(/[)\]}>，。！？!?、；;]+$/g, "");
}

export function detectSharePlatform(text) {
  const url = extractShareUrl(text);
  const bvid = String(text || "").match(/\bBV[a-zA-Z0-9]{10}\b/)?.[0] || "";
  if (!url && !bvid) return { platform: "", url: "" };

  let hostname = "";
  try {
    hostname = url ? new URL(url).hostname.toLowerCase() : "";
  } catch {
    hostname = "";
  }

  if (bvid || /(^|\.)bilibili\.com$|(^|\.)b23\.tv$/.test(hostname)) {
    return { platform: "bili", url: url || `https://www.bilibili.com/video/${bvid}` };
  }
  if (/(^|\.)douyin\.com$|(^|\.)iesdouyin\.com$/.test(hostname)) {
    return { platform: "dy", url };
  }
  if (/(^|\.)kuaishou\.com$|(^|\.)kuaishou\.cn$/.test(hostname)) {
    return { platform: "ks", url };
  }
  if (/(^|\.)tiktok\.com$/.test(hostname)) {
    return { platform: "tt", url };
  }

  return { platform: "", url };
}

function extractCandidates(payload, platform) {
  const candidates = [];
  const seen = new Set();
  const visited = new Set();

  function visit(value) {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);

    if (platform === "dy") {
      const id = firstString(value.aweme_id, value.awemeId, value.itemId);
      const hasVideo = value.video && (value.video.play_addr || value.video.play_addr_h264 || value.video.download_addr);
      if (id && hasVideo && !seen.has(id)) {
        seen.add(id);
        candidates.push(value);
      }
    } else if (platform === "ks") {
      const photo = value.photo;
      const id = firstString(photo?.id, photo?.photoId, photo?.photo_id, value.id);
      const hasKuaishouMedia =
        photo &&
        (photo.photoUrl || photo.photo_url || photo.playUrl || photo.srcNoMark || photo.mainMvUrls);
      if (id && hasKuaishouMedia && !seen.has(id)) {
        seen.add(id);
        candidates.push(value);
      }
    } else if (platform === "bili") {
      const bvid = firstString(value.bvid, value.bv_id, value.bvId);
      const aid = firstString(value.aid, value.id);
      const hasVideo = bvid || (aid && (value.pic || value.duration || value.arcurl || value.author));
      if (hasVideo && (bvid || aid) && !seen.has(bvid || aid)) {
        seen.add(bvid || aid);
        candidates.push(value);
      }
    } else if (platform === "tt") {
      const id = firstString(value.aweme_id, value.awemeId, value.item_id);
      const hasVideo = value.video && (value.video.play_addr || value.video.playAddr);
      if (id && hasVideo && !seen.has(id)) {
        seen.add(id);
        candidates.push(value);
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    for (const nested of Object.values(value)) visit(nested);
  }

  visit(payload);
  return candidates;
}

function paginationFrom(payload) {
  const root = payload?.data || {};
  const pagination = root.pagination || {};
  return {
    offset: pagination.offset ?? root.cursor ?? 0,
    page: pagination.next_page ?? null,
    searchId: pagination.search_id || "",
    backtrace: pagination.backtrace || root.backtrace || "",
    hasMore: pagination.has_more ?? root.has_more ?? 0,
    cursor: root.pcursor || pagination.pcursor || "",
  };
}

async function searchDouyin({ apiKey, keyword, limit, demo }) {
  if (demo) {
    const payload = await fetchJson(`${TIKHUB_BASE_URL}/api/v1/demo/douyin_search/app/general_search`);
    return {
      items: extractCandidates(payload, "dy")
        .map((item) => normalizeDouyin(item, keyword || "演示"))
        .filter(Boolean)
        .slice(0, limit),
      pages: 1,
      demo: true,
    };
  }

  const endpoints = [
    {
      name: "综合搜索 V3",
      path: "/api/v1/douyin/search/fetch_general_search_v3",
      body: {
        keyword,
        offset: 0,
        page: 1,
        search_id: "",
        backtrace: "",
      },
    },
    {
      name: "综合搜索 V1",
      path: "/api/v1/douyin/search/fetch_general_search_v1",
      body: {
        keyword,
        cursor: 0,
        sort_type: "0",
        publish_time: "0",
        filter_duration: "0",
        content_type: "1",
        search_id: "",
        backtrace: "",
      },
    },
    {
      name: "综合搜索 V2",
      path: "/api/v1/douyin/search/fetch_general_search_v2",
      body: {
        keyword,
        cursor: 0,
        sort_type: "0",
        publish_time: "0",
        filter_duration: "0",
        content_type: "1",
        search_id: "",
        backtrace: "",
      },
    },
  ];
  const failures = [];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(`${TIKHUB_BASE_URL}${endpoint.path}`, {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify(endpoint.body),
      });
      const items = [];

      for (const candidate of extractCandidates(payload, "dy")) {
        const item = normalizeDouyin(candidate, keyword);
        if (!item || items.some((existing) => existing.id === item.id)) continue;
        items.push(item);
        if (items.length >= limit) break;
      }

      if (items.length) {
        return { items, pages: 1, demo: false, endpoint: endpoint.name };
      }
      failures.push(`${endpoint.name}: 返回 0 条`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      failures.push(`${endpoint.name}: ${message}`);
    }
  }

  throw new Error(`抖音搜索端点均未返回视频。${failures.join("；")}`);
}

async function searchKuaishou({ apiKey, keyword, limit }) {
  const payload = await fetchJson(
    `${TIKHUB_BASE_URL}/api/v1/kuaishou/app/search_video_v2?keyword=${encodeURIComponent(keyword)}&pcursor=`,
    { headers: authHeaders(apiKey) },
  );
  const items = [];

  for (const candidate of extractCandidates(payload, "ks")) {
    const item = normalizeKuaishou(candidate, keyword);
    if (!item || items.some((existing) => existing.id === item.id)) continue;
    items.push(item);
    if (items.length >= limit) break;
  }

  return { items, pages: 1, demo: false };
}

async function searchBilibili({ apiKey, keyword, limit }) {
  const pageSize = Math.min(Math.max(limit, 1), 50);
  const payload = await fetchJson(
    `${TIKHUB_BASE_URL}/api/v1/bilibili/web/fetch_general_search?keyword=${encodeURIComponent(keyword)}&order=totalrank&page=1&page_size=${pageSize}&duration=0&pubtime_begin_s=0&pubtime_end_s=0`,
    { headers: authHeaders(apiKey) },
  );
  const items = [];

  for (const candidate of extractCandidates(payload, "bili")) {
    const item = normalizeBilibili(candidate, keyword);
    if (!item || items.some((existing) => existing.id === item.id)) continue;
    items.push(item);
    if (items.length >= limit) break;
  }

  if (!items.length) {
    throw new Error("哔哩哔哩搜索成功，但没有解析到视频；请确认 API Key 有该端点的访问权限");
  }

  return { items, pages: 1, demo: false, endpoint: "哔哩哔哩综合搜索" };
}

async function searchTikTok({ apiKey, keyword, limit }) {
  const count = Math.min(Math.max(limit, 1), 50);
  const payload = await fetchJson(
    `${TIKHUB_BASE_URL}/api/v1/tiktok/app/v3/fetch_video_search_result?keyword=${encodeURIComponent(keyword)}&offset=0&count=${count}&sort_type=0&publish_time=0&region=US`,
    { headers: authHeaders(apiKey) },
  );
  const items = [];

  for (const candidate of extractCandidates(payload, "tt")) {
    const item = normalizeTikTok(candidate, keyword);
    if (!item || items.some((existing) => existing.id === item.id)) continue;
    items.push(item);
    if (items.length >= limit) break;
  }

  if (!items.length) {
    throw new Error("TikTok 搜索成功，但没有解析到视频；请确认 API Key 有该端点的访问权限");
  }

  return { items, pages: 1, demo: false, endpoint: "TikTok App V3 视频搜索" };
}

function findValueByKey(value, keys, visited = new Set()) {
  if (!value || typeof value !== "object" || visited.has(value)) return "";
  visited.add(value);

  for (const key of keys) {
    const found = value[key];
    if (typeof found === "string" && found.trim()) return found.trim();
    if (typeof found === "number") return String(found);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueByKey(item, keys, visited);
      if (found) return found;
    }
    return "";
  }

  for (const nested of Object.values(value)) {
    const found = findValueByKey(nested, keys, visited);
    if (found) return found;
  }
  return "";
}

function findMediaUrl(value, visited = new Set()) {
  if (!value || typeof value !== "object" || visited.has(value)) return "";
  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaUrl(item, visited);
      if (found) return found;
    }
    return "";
  }

  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "string" && /^https?:\/\//i.test(nested)) {
      if (
        key.toLowerCase().includes("url") ||
        nested.includes("bilivideo.com") ||
        nested.includes(".mp4")
      ) {
        return nested;
      }
    }
  }

  for (const nested of Object.values(value)) {
    const found = findMediaUrl(nested, visited);
    if (found) return found;
  }
  return "";
}

async function getBilibiliPlayback({ apiKey, bvid, aid, cid }) {
  let resolvedCid = cid;
  let poster = "";
  let title = "";
  let resolvedBvid = bvid;
  let resolvedAid = aid;

  if (!resolvedCid) {
    const detail = await fetchJson(
      `${TIKHUB_BASE_URL}/api/v1/bilibili/web/fetch_one_video?bv_id=${encodeURIComponent(resolvedBvid || resolvedAid)}`,
      { headers: authHeaders(apiKey) },
    );
    resolvedCid = findValueByKey(detail, ["cid"]);
    poster = findValueByKey(detail, ["pic"]);
    title = findValueByKey(detail, ["title"]);
    resolvedBvid = resolvedBvid || findValueByKey(detail, ["bvid"]);
    resolvedAid = resolvedAid || findValueByKey(detail, ["aid"]);
  }

  if (!resolvedCid) throw new Error("未能获取哔哩哔哩视频 cid");

  const playPayload = await fetchJson(
    `${TIKHUB_BASE_URL}/api/v1/bilibili/web/fetch_video_playurl?bv_id=${encodeURIComponent(resolvedBvid || resolvedAid)}&cid=${encodeURIComponent(resolvedCid)}`,
    { headers: authHeaders(apiKey) },
  );
  const source = findMediaUrl(playPayload);
  if (!source) throw new Error("哔哩哔哩接口没有返回可用播放地址");

  return {
    source,
    poster: poster ? proxiedImage(poster) : "",
    title,
    bvid: resolvedBvid,
    aid: resolvedAid,
    cid: resolvedCid,
  };
}

export async function resolveShareLink({ apiKey, text }) {
  if (!apiKey) throw new Error("请先填写 TikHub API Key");

  const detected = detectSharePlatform(text);
  if (!detected.platform) {
    throw new Error("没有识别到支持的分享链接，请粘贴抖音、快手、哔哩哔哩或 TikTok 链接");
  }

  let payload;
  if (detected.platform === "dy") {
    payload = await fetchJson(
      `${TIKHUB_BASE_URL}/api/v1/douyin/app/v3/fetch_one_video_by_share_url?share_url=${encodeURIComponent(detected.url)}`,
      { headers: authHeaders(apiKey) },
    );
    const candidate = extractCandidates(payload, "dy")[0];
    const item = candidate ? normalizeDouyin(candidate, "分享链接") : null;
    if (!item) throw new Error("抖音分享链接已识别，但没有返回可用视频");
    return { item, platform: "dy", sourceUrl: detected.url };
  }

  if (detected.platform === "ks") {
    payload = await fetchJson(
      `${TIKHUB_BASE_URL}/api/v1/kuaishou/app/fetch_one_video_by_url?share_text=${encodeURIComponent(text)}`,
      { headers: authHeaders(apiKey) },
    );
    const candidate = extractCandidates(payload, "ks")[0];
    const item = candidate ? normalizeKuaishou(candidate, "分享链接") : null;
    if (!item) throw new Error("快手分享链接已识别，但没有返回可用视频");
    return { item, platform: "ks", sourceUrl: detected.url };
  }

  if (detected.platform === "bili") {
    payload = await fetchJson(
      `${TIKHUB_BASE_URL}/api/v1/bilibili/web/fetch_one_video_v3?url=${encodeURIComponent(detected.url)}`,
      { headers: authHeaders(apiKey) },
    );
    const candidate = extractCandidates(payload, "bili")[0];
    const item = candidate ? normalizeBilibili(candidate, "分享链接") : null;
    if (!item) throw new Error("哔哩哔哩分享链接已识别，但没有返回可用视频");
    return { item, platform: "bili", sourceUrl: detected.url };
  }

  payload = await fetchJson(
    `${TIKHUB_BASE_URL}/api/v1/tiktok/app/v3/fetch_one_video_by_share_url?share_url=${encodeURIComponent(detected.url)}`,
    { headers: authHeaders(apiKey) },
  );
  const candidate = extractCandidates(payload, "tt")[0];
  const item = candidate ? normalizeTikTok(candidate, "分享链接") : null;
  if (!item) throw new Error("TikTok 分享链接已识别，但没有返回可用视频");
  return { item, platform: "tt", sourceUrl: detected.url };
}

export async function searchTikHub({ apiKey, platform, keyword, limit, demo = false }) {
  if (!demo && !apiKey) throw new Error("请先在设置中填写 TikHub API Key");

  if (platform === "ks") {
    if (demo) throw new Error("公开演示搜索目前只提供抖音缓存结果");
    return searchKuaishou({ apiKey, keyword, limit });
  }

  if (platform === "bili") {
    if (demo) throw new Error("公开演示搜索目前只提供抖音缓存结果");
    return searchBilibili({ apiKey, keyword, limit });
  }

  if (platform === "tt") {
    if (demo) throw new Error("公开演示搜索目前只提供抖音缓存结果");
    return searchTikTok({ apiKey, keyword, limit });
  }

  return searchDouyin({ apiKey, keyword, limit, demo });
}

export async function getTikHubVideo({ apiKey, platform, id, cid, bvid, aid }) {
  if (!apiKey) throw new Error("请先填写 TikHub API Key");

  if (platform === "bili") {
    return getBilibiliPlayback({
      apiKey,
      bvid: bvid || id,
      aid,
      cid,
    });
  }

  throw new Error("该平台不需要单独获取播放地址");
}

export async function checkTikHub(apiKey) {
  if (!apiKey) throw new Error("请先填写 TikHub API Key");
  const payload = await fetchJson(`${TIKHUB_BASE_URL}/api/v1/tikhub/user/get_user_info`, {
    headers: authHeaders(apiKey),
  });
  return {
    ok: true,
    message: "TikHub API Key 验证成功",
    data: payload?.data || null,
  };
}
