import { randomUUID } from "node:crypto";
import {
  checkTikHub,
  getTikHubVideo,
  resolveShareLink,
  searchTikHub,
} from "./tikhub-provider.mjs";

const COLLECTOR_TIMEOUT_MS = 12000;
const rateLimitBuckets = new Map();

function effectiveTikHubKey(candidate) {
  return String(candidate || "").trim() || String(process.env.TIKHUB_API_KEY || "").trim();
}

function clientAddress(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return request.socket.remoteAddress || "unknown";
}

function enforceSharedRateLimit(request, response, usesServerKey) {
  if (!usesServerKey || process.env.RATE_LIMIT_DISABLED === "true") return true;

  const max = Math.max(Number(process.env.TIKHUB_RATE_LIMIT_MAX) || 40, 1);
  const windowMs = Math.max(Number(process.env.TIKHUB_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, 1000);
  const now = Date.now();

  if (rateLimitBuckets.size > 5000) {
    for (const [address, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(address);
    }
  }

  const key = clientAddress(request);
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) {
    response.writeHead(429, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
    });
    response.end(
      JSON.stringify({
        error: `共享 API 额度已达到当前 IP 的上限，请在 ${Math.ceil((bucket.resetAt - now) / 60000)} 分钟后重试`,
      }),
    );
    return false;
  }

  bucket.count += 1;
  return true;
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function isAllowedMediaHost(hostname) {
  const host = hostname.toLowerCase();
  const allowedSuffixes = [
    "douyinpic.com",
    "douyinvod.com",
    "byteimg.com",
    "kwaicdn.com",
    "kuaishou.com",
    "kspkg.com",
    "hdslb.com",
    "bilibili.com",
    "bilivideo.com",
    "tiktokcdn.com",
    "tiktok.com",
    "ibytedtos.com",
    "byteoversea.com",
    "muscdn.com",
  ];

  return allowedSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function normalizePlatform(value) {
  if (value === "ks") return "ks";
  if (value === "bili") return "bili";
  if (value === "tt") return "tt";
  return "dy";
}

async function proxyImage(response, rawUrl) {
  const target = new URL(String(rawUrl || ""));

  if (!["http:", "https:"].includes(target.protocol) || !isAllowedMediaHost(target.hostname)) {
    sendJson(response, 403, { error: "图片域名不在允许列表中" });
    return;
  }

  const targetResponse = await fetch(target, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: target.hostname.includes("tiktok") || target.hostname.includes("ibytedtos") || target.hostname.includes("byteoversea")
        ? "https://www.tiktok.com/"
        : target.hostname.includes("kuaishou")
        ? "https://www.kuaishou.com/"
        : target.hostname.includes("hdslb") || target.hostname.includes("bilibili")
          ? "https://www.bilibili.com/"
          : "https://www.douyin.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0 Safari/537.36",
    },
  });

  if (!targetResponse.ok) {
    sendJson(response, 502, { error: `图片获取失败: HTTP ${targetResponse.status}` });
    return;
  }

  const contentType = targetResponse.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    sendJson(response, 415, { error: "远端资源不是图片" });
    return;
  }

  const body = Buffer.from(await targetResponse.arrayBuffer());
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": "public, max-age=3600",
  });
  response.end(body);
}

function normalizeBaseUrl(value) {
  const raw = String(value || "http://127.0.0.1:8080").trim().replace(/\/+$/, "");
  const parsed = new URL(raw);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("采集器地址只支持 http 或 https");
  }

  return parsed.toString().replace(/\/+$/, "");
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("请求体过大");
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function collectorFetch(baseUrl, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COLLECTOR_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : typeof data?.message === "string"
            ? data.message
            : `采集器返回 HTTP ${response.status}`;
      throw new Error(detail);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("连接采集器超时");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeId(platform, item) {
  if (platform === "dy") {
    return `dy-${item.aweme_id || item.aweme_url || randomUUID()}`;
  }
  return `ks-${item.video_id || item.video_url || randomUUID()}`;
}

function normalizeCount(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return "0";
  if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万`;
  return String(number);
}

function normalizeResult(platform, item, keyword) {
  const isDouyin = platform === "dy";
  const id = normalizeId(platform, item);
  const title = item.title || item.desc || (isDouyin ? "抖音视频" : "快手视频");
  const creator = item.nickname || "未知作者";
  const poster = isDouyin ? item.cover_url : item.video_cover_url;
  const source = isDouyin ? item.video_download_url : item.video_play_url;
  const platformLabel = isDouyin ? "抖音" : "快手";
  const sourceKeyword = item.source_keyword || keyword || "";
  const keywordTags = String(sourceKeyword)
    .split(/[\n,，;；]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tags = [...new Set([...keywordTags, platformLabel].filter(Boolean))];

  return {
    id,
    title,
    creator,
    platform: platformLabel,
    duration: "--:--",
    likes: normalizeCount(item.liked_count),
    tags,
    poster,
    source,
    description: item.desc || item.title || `${platformLabel}采集结果`,
    sourceKeyword,
    sourceUrl: isDouyin ? item.aweme_url : item.video_url,
    collectedAt: Date.now(),
    real: true,
  };
}

async function listSearchFiles(baseUrl, platform, limit) {
  const result = await collectorFetch(
    baseUrl,
    `/api/data/files?platform=${encodeURIComponent(platform)}&file_type=json`,
  );

  const files = Array.isArray(result?.files) ? result.files : [];
  return files
    .filter((file) => {
      const path = String(file.path || "").toLowerCase();
      const name = String(file.name || "").toLowerCase();
      return path.includes("json") && name.includes("contents") && name.endsWith(".json");
    })
    .sort((a, b) => Number(b.modified_at || 0) - Number(a.modified_at || 0))
    .slice(0, limit);
}

async function readSearchFile(baseUrl, file, limit) {
  const filePath = String(file.path || "")
    .replaceAll("\\", "/")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const result = await collectorFetch(
    baseUrl,
    `/api/data/files/${filePath}?preview=true&limit=${encodeURIComponent(limit)}`,
  );

  return Array.isArray(result?.data) ? result.data : [];
}

export async function handleCollectorRequest(request, response, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/collector/health") {
      const baseUrl = normalizeBaseUrl(url.searchParams.get("base"));
      const health = await collectorFetch(baseUrl, "/api/health");
      sendJson(response, 200, {
        ok: health?.status === "ok",
        message: health?.status === "ok" ? "采集器连接成功" : "采集器响应异常",
        baseUrl,
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/config") {
      sendJson(response, 200, {
        serverKeyConfigured: Boolean(String(process.env.TIKHUB_API_KEY || "").trim()),
        rateLimitMax: Math.max(Number(process.env.TIKHUB_RATE_LIMIT_MAX) || 40, 1),
        rateLimitWindowMinutes: Math.round(
          Math.max(Number(process.env.TIKHUB_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000, 1000) /
            60000,
        ),
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/image") {
      await proxyImage(response, url.searchParams.get("url"));
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/search/health") {
      const candidateKey = String(url.searchParams.get("key") || "").trim();
      const apiKey = effectiveTikHubKey(candidateKey);
      if (!enforceSharedRateLimit(request, response, !candidateKey && Boolean(apiKey))) return true;
      const result = await checkTikHub(apiKey);
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/collector/search") {
      const body = await readJsonBody(request);
      const platform = normalizePlatform(body.platform);
      const keyword = String(body.keyword || "").trim();
      const candidateKey = String(body.apiKey || "").trim();
      const apiKey = effectiveTikHubKey(candidateKey);
      const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);
      const demo = Boolean(body.demo);

      if (!keyword) {
        sendJson(response, 400, { error: "搜索关键词不能为空" });
        return true;
      }

      if (!demo && !enforceSharedRateLimit(request, response, !candidateKey && Boolean(apiKey))) return true;

      const result = await searchTikHub({
        apiKey,
        platform,
        keyword,
        limit,
        demo,
      });
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/collector/resolve") {
      const body = await readJsonBody(request);
      const candidateKey = String(body.apiKey || "").trim();
      const apiKey = effectiveTikHubKey(candidateKey);
      const text = String(body.text || "").trim();

      if (!text) {
        sendJson(response, 400, { error: "请粘贴视频分享链接或分享文本" });
        return true;
      }

      if (!enforceSharedRateLimit(request, response, !candidateKey && Boolean(apiKey))) return true;

      const result = await resolveShareLink({ apiKey, text });
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/video") {
      const candidateKey = String(url.searchParams.get("key") || "").trim();
      const apiKey = effectiveTikHubKey(candidateKey);
      if (!enforceSharedRateLimit(request, response, !candidateKey && Boolean(apiKey))) return true;
      const platform = normalizePlatform(url.searchParams.get("platform"));
      const result = await getTikHubVideo({
        apiKey,
        platform,
        id: String(url.searchParams.get("id") || "").trim(),
        cid: String(url.searchParams.get("cid") || "").trim(),
        bvid: String(url.searchParams.get("bvid") || "").trim(),
        aid: String(url.searchParams.get("aid") || "").trim(),
      });
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/status") {
      const baseUrl = normalizeBaseUrl(url.searchParams.get("base"));
      const status = await collectorFetch(baseUrl, "/api/crawler/status");
      sendJson(response, 200, status);
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/logs") {
      const baseUrl = normalizeBaseUrl(url.searchParams.get("base"));
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 200);
      const logs = await collectorFetch(baseUrl, `/api/crawler/logs?limit=${limit}`);
      sendJson(response, 200, logs);
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/collector/start") {
      const body = await readJsonBody(request);
      const baseUrl = normalizeBaseUrl(body.base);
      const platform = body.platform === "ks" ? "ks" : "dy";
      const keyword = String(body.keyword || "").trim();

      if (!keyword) {
        sendJson(response, 400, { error: "关键词不能为空" });
        return true;
      }

      const result = await collectorFetch(baseUrl, "/api/crawler/start", {
        method: "POST",
        body: JSON.stringify({
          platform,
          login_type: body.cookie ? "cookie" : "qrcode",
          crawler_type: "search",
          keywords: keyword,
          start_page: 1,
          enable_comments: false,
          enable_sub_comments: false,
          enable_media: false,
          save_option: "json",
          cookies: body.cookie || "",
          headless: false,
          max_notes_count: Math.min(Math.max(Number(body.limit) || 20, 1), 100),
        }),
      });

      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/collector/stop") {
      const body = await readJsonBody(request);
      const baseUrl = normalizeBaseUrl(body.base);
      const result = await collectorFetch(baseUrl, "/api/crawler/stop", {
        method: "POST",
        body: "{}",
      });
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/collector/results") {
      const baseUrl = normalizeBaseUrl(url.searchParams.get("base"));
      const platform = url.searchParams.get("platform") === "ks" ? "ks" : "dy";
      const keyword = String(url.searchParams.get("keyword") || "").trim();
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 40, 1), 100);
      const files = await listSearchFiles(baseUrl, platform, 12);
      const rows = [];

      for (const file of files) {
        rows.push(...(await readSearchFile(baseUrl, file, 100)));
        if (rows.length >= 800) break;
      }

      const matched = rows.filter((item) => {
        if (!keyword) return true;
        const sourceKeyword = String(item.source_keyword || "").toLowerCase();
        return sourceKeyword.includes(keyword.toLowerCase());
      });

      const seen = new Set();
      const items = [];

      for (const item of matched) {
        const normalized = normalizeResult(platform, item, keyword);
        if (!normalized.source || seen.has(normalized.id)) continue;
        seen.add(normalized.id);
        items.push(normalized);
        if (items.length >= limit) break;
      }

      sendJson(response, 200, {
        items,
        total: items.length,
        sourceFiles: files.map((file) => file.path),
      });
      return true;
    }

    sendJson(response, 404, { error: "未知的采集器接口" });
    return true;
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : "采集器代理请求失败",
    });
    return true;
  }
}
