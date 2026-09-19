# 部署指南

推荐使用 Railway Docker 部署。项目包含 Node 后端，不能只部署到 GitHub Pages。

## Railway 部署

1. 登录 Railway，选择 `New Project > Deploy from GitHub repo`。
2. 选择 GitHub 仓库：
   `https://github.com/wangxianxiuxiu/-`
3. Railway 会读取仓库根目录的 `railway.json` 和 `Dockerfile`。
4. 在 `Variables` 中新增 `TIKHUB_API_KEY`。
5. 根据需要设置 `TIKHUB_RATE_LIMIT_MAX` 和 `TIKHUB_RATE_LIMIT_WINDOW_MS`。
6. 在 `Settings > Networking > Public Networking` 中生成公网域名。
7. Railway 会输出一个 `https://...up.railway.app` 地址。

## 共享 Key 模式

后端优先使用用户浏览器填写的 TikHub Key。留空时使用服务器环境变量 `TIKHUB_API_KEY`。

默认限制：

- 每个 IP 每 10 分钟最多 40 次 TikHub 请求。
- 可通过 `TIKHUB_RATE_LIMIT_MAX` 修改次数。
- 可通过 `TIKHUB_RATE_LIMIT_WINDOW_MS` 修改时间窗口。

如果公开服务或分享给较多用户，建议根据 TikHub 余额和当前价格调低限额。

## 环境变量

| 变量 | 说明 |
|---|---|
| `TIKHUB_API_KEY` | 站点共享 TikHub Key，必须设置为 Secret |
| `TIKHUB_RATE_LIMIT_MAX` | 单个 IP 在时间窗口内的最大请求数 |
| `TIKHUB_RATE_LIMIT_WINDOW_MS` | 限流时间窗口，单位毫秒 |
| `HOST` | 部署环境设置为 `0.0.0.0` |
| `PORT` | Railway 自动提供，无需手工设置 |

## 本地验证 Docker

```powershell
docker build -t video-vault .
docker run --rm -p 4173:10000 `
  -e TIKHUB_API_KEY="你的_TikHub_Key" `
  video-vault
```

打开 `http://127.0.0.1:4173`。

## 注意事项

- 不要把 `TIKHUB_API_KEY` 提交到 Git。
- 公开部署前确认平台服务条款、版权和内容使用范围。
- 视频文件不会由本项目服务器托管，服务只代理接口和封面图片。
