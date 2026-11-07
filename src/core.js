/* core.js —— 由 tools/split.mjs 生成后可自由编辑 */
export const $ = id => document.getElementById(id);
export const STEP=1/60, SNAP_TICKS=3, ARENA=150, BOSS_TIME=240, SHOP_RANGE=14;
export const CELL=40, GRID=8, HALF=GRID*CELL/2;          // 320m 见方，圆形航区半径 150m
export const MERCH_WINDOWS=[[38,64],[96,122],[154,180],[206,232]];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const hypot=(x,z)=>Math.sqrt(x*x+z*z);
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export let decoRnd=mulberry32(20261107);
export function cellOf(x,z){
  const cx=Math.floor((x+HALF)/CELL),cz=Math.floor((z+HALF)/CELL);
  if(cx<0||cz<0||cx>=GRID||cz>=GRID)return -1;
  return cz*GRID+cx;
}
export function cellCenter(i){return{x:(i%GRID)*CELL-HALF+CELL/2,z:Math.floor(i/GRID)*CELL-HALF+CELL/2};}
export function inArena(x,z,pad){return hypot(x,z)<ARENA-(pad||0);}
