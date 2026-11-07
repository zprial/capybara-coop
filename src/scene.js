/* scene.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { $ } from './core.js';

export const scene=new THREE.Scene();
export const camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.5,600);
camera.position.set(0,25,18);
export const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
$('app').appendChild(renderer.domElement);
scene.fog=new THREE.Fog(0xf6a878,58,230);   // 远方朦胧，未知海域藏在雾里

export const timeU={value:0};
export function basic(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.84,metalness:.03,...opts});}
export function glowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d').createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,235,190,.75)');
  g.addColorStop(1,'rgba(255,190,120,0)');
  const ctx=c.getContext('2d');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
export const GLOW=glowTex();
export function spriteGlow(color,size,opacity=1){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color,transparent:true,
    blending:THREE.AdditiveBlending,depthWrite:false,opacity}));
  s.scale.set(size,size,1);return s;
}
