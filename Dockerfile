# 零依赖：无需 npm install；build context 就是仓库根目录
# 前端与服务端同一个镜像 —— COPY 根目录唯一的那份 HTML，不存在双副本
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=31118 \
    HOST=0.0.0.0 \
    RELAY_PATH=/relay

WORKDIR /app

COPY server.mjs package.json ./
COPY capybara-coop.html ./capybara-coop.html

# 以非 root 用户运行
RUN addgroup -S capy && adduser -S -G capy capy \
 && chown -R capy:capy /app
USER capy

EXPOSE 31118

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
