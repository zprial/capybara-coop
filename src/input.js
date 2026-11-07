/* input.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { clamp, hypot } from './core.js';
import { MON } from './config.js';
import { S } from './state.js';

export const keys={}, mouse={x:0,y:0,down:false,inside:false};
export let mouseWorld={x:0,z:0};
export const raycaster=new THREE.Raycaster(), aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
export function readInput(){
  const px=(keys.d?1:0)-(keys.a?1:0)+(keys.arrowright?1:0)-(keys.arrowleft?1:0);
  const pz=(keys.s?1:0)-(keys.w?1:0)+(keys.arrowdown?1:0)-(keys.arrowup?1:0);
  return {ax:mouseWorld.x,az:mouseWorld.z,fire:!!(mouse.down||keys[' ']),revive:!!keys.e,
    px:clamp(px,-1,1),pz:clamp(pz,-1,1)};
}
export function idleInput(p){return{ax:p.x,az:p.z,fire:false,revive:false,px:0,pz:0};}
export function aiInput(p,id){
  let target=null,best=1e9;
  for(const m of S.monsters){const d=hypot(m.x-p.x,m.z-p.z);if(d<best){best=d;target=m;}}
  if(S.boss&&!S.boss.dead){const d=hypot(S.boss.x-p.x,S.boss.z-p.z)*.8;if(d<best){best=d;target=S.boss;}}
  let ax=p.x+Math.sin(S.gameTime*.7+id)*12,az=p.z+Math.cos(S.gameTime*.7+id)*12,
      fire=false,px=0,pz=0,revive=false;
  let mate=null,md=1e9;
  for(const q of S.players){
    if(q===p||!q.downed)continue;
    const d=hypot(q.x-p.x,q.z-p.z);if(d<md){md=d;mate=q;}
  }
  if(mate&&md>2.4){
    ax=p.x-(mate.x-p.x)/md*16;az=p.z-(mate.z-p.z)/md*16;fire=true;
    px=(mate.x-p.x)/md*.6;pz=(mate.z-p.z)/md*.6;
  }else if(mate){revive=true;}
  else if(target){
    ax=target.x;az=target.z;fire=best<34;
    if(best<8){px=-(target.x-p.x)/(best||1);pz=-(target.z-p.z)/(best||1);}
  }
  if(S.merchant.active&&S.coins>=70&&!target)fire=false;
  return {ax,az,fire,revive,px,pz};
}
export function hostInputs(){
  const a=[];
  for(let i=0;i<S.players.length;i++){
    if(i===0){a.push(readInput());S.aiActive[i]=false;continue;}
    if(!S.seats[i]){S.aiActive[i]=true;a.push(aiInput(S.players[i],i));continue;}
    const r=S.remoteInputs[i]||{inp:null,tick:0,at:0};
    const age=performance.now()-(r.at||0);
    if(age>3000){S.aiActive[i]=true;a.push(aiInput(S.players[i],i));continue;}
    S.aiActive[i]=false;
    if(!r.inp){a.push(idleInput(S.players[i]));continue;}
    const stale=age>700;
    a.push({...r.inp,fire:stale?false:r.inp.fire,revive:stale?false:r.inp.revive});
  }
  return a;
}

