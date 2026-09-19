# 部署指南

推荐使用 Render Docker Web Service 部署。项目包含 Node 后端，不能只部署到 GitHub Pages。

## Render 部署

1. 登录 Render，选择 `New > Blueprint`。
2. 连接 GitHub 仓库：
   `https://github.com/wangxianxiuxiu/-`
3. Render 会读取仓库根目录的 `render.yaml`。
4. 在环境变量中填写 `TIKHUB_API_KEY`。
5. 点击部署，等待服务状态变为 `Live`。
6. Render 会生成一个 `https://...onrender.com` 公网地址。

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
| `PORT` | Render 自动提供，无需手工设置 |

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
