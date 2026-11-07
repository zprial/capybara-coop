/* build.mjs —— 零依赖构建：把 src/ ES 模块按依赖序拼装回单文件 HTML。
 *
 *   node build.mjs            -> dist/capybara-coop.html
 *
 * 模块系统约定：
 *   - src/three.js 保留为动态 import（CDN 运行时加载），不参与内联；
 *   - 其余模块按 MODULES 顺序拼接；每模块的 import 行被剥掉，
 *     顶层 export 前缀剥掉（单文件作用域内所有名字共享，等价于原单文件）；
 *   - 函数级循环依赖在单文件作用域下天然成立，与拆分前行为一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

/* 拼接顺序 = 分层依赖序（被依赖者在前） */
const MODULES = [
  'core.js', 'config.js', 'state.js', 'net.js',
  'scene.js', 'pipeline.js', 'world.js', 'models.js',
  'fx.js', 'input.js', 'sim.js', 'snapshot.js', 'msg.js',
  'view.js', 'hud.js', 'loop.js', 'main.js',
];

function moduleBody(file) {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
  return raw.split('\n')
    .filter(l => !/^\s*import\b/.test(l))          // 剥 import
    .map(l => l.replace(/^export\s+(?=(const|let|function|async function|class)\b)/, '')) // 剥 export
    .join('\n');
}

const threeLoader = `let THREE;
async function loadThree(){
  const urls=[
    'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
    'https://unpkg.com/three@0.161.0/build/three.module.js',
    'https://esm.sh/three@0.161.0'
  ];
  let err;
  for(const u of urls){ try{ return await import(u); }catch(e){ err=e; } }
  throw err;
}
THREE = await loadThree();`;

const banner = `/* 水豚双舟 · 由 build.mjs 从 src/ 拼装生成，请勿手改；改动请编辑 src/ 后重新构建 */`;

function build() {
  const parts = [banner, threeLoader];
  for (const m of MODULES) parts.push(`\n/* ================= ${m} ================= */\n` + moduleBody(m));
  const js = parts.join('\n');

  // 壳：从旧单文件提取 <style> 与 </style> 之前的 head、以及 body 结构
  const legacy = fs.readFileSync(path.join(ROOT, 'src', 'shell.html'), 'utf8');
  const style = legacy.match(/<style>([\s\S]*?)<\/style>/)[1];
  const bodyHtml = legacy.split('<!--SCRIPT-->')[0].split('<body>')[1].trim();

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>水豚双舟 · 夕照浅海合作射击</title>
<!--CAPY_RELAY_CONFIG-->
<style>${style}</style>
</head>
<body>
${bodyHtml}
<script type="module">
${js}
</script>
</body>
</html>
`;
  fs.mkdirSync(DIST, { recursive: true });
  const out = path.join(DIST, 'capybara-coop.html');
  fs.writeFileSync(out, html);
  console.log(`built ${path.relative(ROOT, out)} (${(html.length / 1024).toFixed(1)} KB)`);
}

build();
