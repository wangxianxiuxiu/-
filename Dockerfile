FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

COPY index.html styles.css app.js server.mjs collector-proxy.mjs tikhub-provider.mjs ./
COPY assets ./assets

EXPOSE 10000

CMD ["node", "server.mjs"]
