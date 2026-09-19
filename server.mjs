import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleCollectorRequest } from "./collector-proxy.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(root, safePath);
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");

  if (requestUrl.pathname.startsWith("/api/collector/")) {
    await handleCollectorRequest(request, response, requestUrl);
    return;
  }

  let filePath = resolveRequestPath(request.url || "/");

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, "index.html");
  }

  const ext = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".mp4" ? "public, max-age=3600" : "no-cache",
  });

  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Video Vault is running at http://${host}:${port}`);
});
