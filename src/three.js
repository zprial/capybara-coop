/* three.js 动态加载：CDN 三级回退，开发与构建产物共用 */
export let THREE;
const urls = [
  'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
  'https://unpkg.com/three@0.161.0/build/three.module.js',
  'https://esm.sh/three@0.161.0'
];
let err;
for (const u of urls) { try { THREE = await import(u); break; } catch (e) { err = e; } }
if (!THREE) {
  document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;font:16px sans-serif;color:#fff;background:#10242c">无法加载 Three.js，请检查网络后刷新。</div>';
  throw err;
}
