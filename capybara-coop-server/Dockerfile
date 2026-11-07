# 零依赖：无需 npm install，镜像只包含一个 Node 运行时 + 两个源文件
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    RELAY_PATH=/relay

WORKDIR /app

COPY server.mjs package.json ./
COPY public/ ./public/

# 以非 root 用户运行
RUN addgroup -S capy && adduser -S -G capy capy \
 && chown -R capy:capy /app
USER capy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
