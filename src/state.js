/* state.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { mulberry32, inArena, cellOf, cellCenter } from './core.js';
import { GRID, CELL, MAX_SEATS } from './config.js';
import { OBSTACLES } from './world.js';

export function makePlayer(id,x,z){return{id,x,z,vx:0,vz:0,aim:0,hearts:5,maxHearts:5,downed:false,
  dead:false,revive:0,invuln:0,fireCd:0,weapon:'pistol',dmgMul:1,recoilMul:1,pierce:0,kills:0,
  shield:0,thrust:1,power:1,thrustT:0,powerT:0,curX:0,curZ:0,dig:0,digId:0,warpCd:0};}
export function makeState(){return{
  phase:'lobby',tick:0,gameTime:0,wave:1,spawnTimer:2.2,coins:0,kills:0,
  worldSeed:(Math.random()*2147483647)|0,
  players:[makePlayer(0,-8,8),makePlayer(1,8,8)],
  bullets:[],monsters:[],boss:null,bossDead:false,
  merchant:{active:false,x:0,z:0,timeLeft:0,next:0,portId:-1,ghost:false,name:''},
  ports:[],pois:[],pickups:[],explored:new Array(GRID*GRID).fill(0),exploreCount:0,
  event:null,eventTimer:22,runes:0,revealT:0,
  members:[],seats:[null,null],aiActive:[false,true],hostUid:null,
  events:[],pendingEvents:[],nextId:1,bothDown:0,
  remoteInputs:[{inp:null,tick:0,at:0},{inp:null,tick:0,at:0}],acks:[0,0]
};}
export let S=makeState();

/* 每局随机：港口、兴趣点。地形由 worldSeed 决定，两端一致；这里的内容每局都不同 */
export function initRun(st){
  const r=mulberry32((Math.random()*2147483647)|0);
  st.ports=[];
  for(let i=0;i<7;i++){
    let x,z,t=0;
    do{const a=r()*6.28,rad=35+r()*105;x=Math.cos(a)*rad;z=Math.sin(a)*rad;t++;}
    while(t<40&&(!inArena(x,z,14)||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+11)));
    st.ports.push({id:i,x,z,name:PORT_NAMES[i%PORT_NAMES.length]});
  }
  st.pois=[];
  const place=type=>{
    let ci,x,z,t=0;
    do{ci=Math.floor(r()*GRID*GRID);const c=cellCenter(ci);
       x=c.x+(r()-.5)*CELL*.72;z=c.z+(r()-.5)*CELL*.72;t++;}
    while(t<50&&(!inArena(x,z,12)||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+6)));
    st.pois.push({id:st.nextId++,type,x,z,cell:ci,found:false,revealed:false,spin:r()*6.28});
  };
  for(let i=0;i<3;i++)place('rune');     // 集齐 3 枚可提前召唤首领
  for(let i=0;i<3;i++)place('wreck');
  place('whirlpool');place('shrine');place('whirlpool');
  for(let i=0;i<11;i++)place('cache');
}

