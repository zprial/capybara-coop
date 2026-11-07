# 零依赖：无需 npm install；build context 就是仓库根目录
# 源码在 src/，构建产物 dist/capybara-coop.html 由 build.mjs 在镜像内生成
FROM node:22-alpine AS build
WORKDIR /app
COPY build.mjs ./
COPY src/ ./src/
RUN node build.mjs

FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=31118 \
    HOST=0.0.0.0 \
    RELAY_PATH=/relay

WORKDIR /app

COPY --from=build /app/dist/capybara-coop.html ./dist/capybara-coop.html
COPY server.mjs package.json ./

# 以非 root 用户运行
RUN addgroup -S capy && adduser -S -G capy capy \
 && chown -R capy:capy /app
USER capy

EXPOSE 31118

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
