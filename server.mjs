#!/usr/bin/env node
/* ============================================================================
 * Capybara Co-op · 部署服务器（零依赖，单进程）
 *
 *   · 静态托管仓库根目录的 capybara-coop.html（唯一来源），并把同域中继地址注入页面
 *   · /relay 提供 WebSocket 中继：把收到的 JSON 原样广播给同房间的其他连接
 *   · /healthz 健康检查
 *
 * 环境变量：
 *   PORT        HTTP 端口，默认 8080
 *   HOST        监听地址，默认 0.0.0.0（Docker 内必须）；本地调试可设 127.0.0.1
 *   RELAY_PATH  WebSocket 路径，默认 /relay
 *   MAX_FRAME   单帧上限（字节），默认 2 MiB
 * ========================================================================== */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const RELAY_PATH = process.env.RELAY_PATH || '/relay';
const MAX_FRAME = Number(process.env.MAX_FRAME || 2 * 1024 * 1024);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* -------------------------------- 页面注入 -------------------------------- */
const htmlPath = path.join(ROOT, 'capybara-coop.html');
let source = fs.readFileSync(htmlPath, 'utf8');
const relayScript = `<script>window.__CAPY_RELAY__=(location.protocol==='https:'?'wss://':'ws://')+location.host+${JSON.stringify(RELAY_PATH)};</script>`;
const PAGE = source.includes('<!--CAPY_RELAY_CONFIG-->')
  ? source.replace('<!--CAPY_RELAY_CONFIG-->', relayScript)
  : source.replace('</head>', relayScript + '\n</head>');
source = null;

/* ------------------------------ WebSocket 中继 ---------------------------- */
const rooms = new Map();   // room -> Set<client>

function drop(c) {
  c.alive = false;
  if (!c.room) return;
  const set = rooms.get(c.room);
  if (set) {
    set.delete(c);
    if (!set.size) rooms.delete(c.room);
  }
}

function frame(opcode, data) {
  const len = data.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | opcode;                 // FIN + opcode，服务端不掩码
  return Buffer.concat([head, data]);
}
function send(c, opcode, data) {
  if (!c.alive || c.socket.destroyed) return;
  try { c.socket.write(frame(opcode, data)); } catch { drop(c); }
}

function broadcast(c, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg.room !== 'string' || !msg.room || msg.room.length > 64) return;

  if (msg.room !== c.room) {
    if (c.room) {
      const old = rooms.get(c.room);
      if (old) { old.delete(c); if (!old.size) rooms.delete(c.room); }
    }
    c.room = msg.room;
    if (!rooms.has(c.room)) rooms.set(c.room, new Set());
    rooms.get(c.room).add(c);
  }
  const data = Buffer.from(raw, 'utf8');
  for (const peer of rooms.get(c.room)) {
    if (peer !== c && peer.alive) send(peer, 0x1, data);
  }
}

function handleFrame(c, opcode, fin, payload) {
  if (opcode === 0x8) { drop(c); c.socket.end(); return; }   // close
  if (opcode === 0x9) { send(c, 0xA, payload); return; }     // ping -> pong
  if (opcode === 0xA) return;                                 // pong
  if (opcode !== 0x1 && opcode !== 0x0) return;               // 只接受文本/续帧
  c.frag.push(payload);
  c.fragLen += payload.length;
  if (c.fragLen > MAX_FRAME) { c.frag = []; c.fragLen = 0; drop(c); c.socket.destroy(); return; }
  if (!fin) return;
  const raw = Buffer.concat(c.frag, c.fragLen).toString('utf8');
  c.frag = []; c.fragLen = 0;
  broadcast(c, raw);
}

function feed(c, chunk) {
  c.buf = c.buf.length ? Buffer.concat([c.buf, chunk]) : Buffer.from(chunk);
  const b = c.buf;
  let off = 0;
  while (off + 2 <= b.length) {
    const b0 = b[off], b1 = b[off + 1];
    const fin = !!(b0 & 0x80), opcode = b0 & 0x0f, masked = !!(b1 & 0x80);
    let len = b1 & 0x7f, hdr = 2;
    if (len === 126) {
      if (off + 4 > b.length) break;
      len = b.readUInt16BE(off + 2); hdr = 4;
    } else if (len === 127) {
      if (off + 10 > b.length) break;
      const n = b.readBigUInt64BE(off + 2);
      if (n > BigInt(MAX_FRAME)) { drop(c); c.socket.destroy(); return; }
      len = Number(n); hdr = 10;
    }
    if (len > MAX_FRAME) { drop(c); c.socket.destroy(); return; }
    const maskLen = masked ? 4 : 0;
    if (off + hdr + maskLen + len > b.length) break;
    let payload = Buffer.from(b.subarray(off + hdr + maskLen, off + hdr + maskLen + len));
    if (masked) {
      const mask = b.subarray(off + hdr, off + hdr + 4);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    }
    off += hdr + maskLen + len;
    handleFrame(c, opcode, fin, payload);
  }
  c.buf = b.subarray(off);
}

/* --------------------------------- HTTP ---------------------------------- */
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/healthz') {
    let clients = 0;
    for (const s of rooms.values()) clients += s.size;
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, clients, uptime: Math.floor(process.uptime()) }));
    return;
  }
  // 仅返回内存中的游戏页面；basename 白名单杜绝目录穿越
  let p = u.pathname;
  if (p === '/' || p === '/capybara-coop.html') p = '/index.html';
  if (path.basename(p) !== 'index.html') {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  res.end(req.method === 'HEAD' ? '' : PAGE);
});

server.on('upgrade', (req, socket, head) => {
  let pathname, roomParam;
  try {
    const u = new URL(req.url, 'http://localhost');
    pathname = u.pathname;
    roomParam = u.searchParams.get('room');
  } catch { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (pathname !== RELAY_PATH || !key) {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  socket.setNoDelay(true);
  const c = { socket, buf: Buffer.alloc(0), room: null, frag: [], fragLen: 0, alive: true };
  // 握手即入房间：客户端不必先发消息就能收到广播
  if (roomParam && roomParam.length <= 64) {
    c.room = roomParam;
    if (!rooms.has(c.room)) rooms.set(c.room, new Set());
    rooms.get(c.room).add(c);
  }
  if (head && head.length) feed(c, head);
  socket.on('data', d => feed(c, d));
  socket.on('close', () => drop(c));
  socket.on('error', () => drop(c));
});

// 30s 心跳，浏览器会自动回 pong；也顺便清掉半开连接
setInterval(() => {
  for (const set of rooms.values()) for (const c of set) {
    if (c.alive) send(c, 0x9, Buffer.alloc(0));
  }
}, 30000).unref();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[capybara] ${sig} -> shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

server.listen(PORT, HOST, () => {
  console.log(`[capybara] HTTP   http://${HOST}:${PORT}/`);
  console.log(`[capybara] RELAY  ws(s)://<host>:${PORT}${RELAY_PATH}`);
  console.log(`[capybara] HEALTH http://${HOST}:${PORT}/healthz`);
});
