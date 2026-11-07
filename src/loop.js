/* loop.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { STEP, SNAP_TICKS } from './config.js';
import { S } from './state.js';
import { NET, netSend } from './net.js';
import { readInput } from './input.js';
import { simulateHost, stepPlayerMotion } from './sim.js';
import { sendSnapshot } from './snapshot.js';
import { broadcastRoom } from './msg.js';
import { spawnFlash, sfx } from './fx.js';
import { viewState, updateCamera, syncEntities, updateDecor, updateParticles } from './view.js';
import { updateHUD } from './hud.js';
import { renderer } from './scene.js';

export let acc=0,last=performance.now(),renderLast=last,tickCount=0;
/* 权威模拟与渲染解耦：标签页进入后台时 rAF 会被浏览器节流甚至暂停，
   定时器仍按真实时间推进并补算固定步长，保证 60Hz 服务器不因切后台停摆。 */
export function advance(now){
  const dt=Math.min(Math.max((now-last)/1000,0),1.0);
  last=now;acc+=dt;
  let guard=0;
  while(acc>=STEP&&guard++<90){ fixedStep(now); acc-=STEP; }
  if(acc>STEP*90)acc=0;
}
export function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(Math.max((now-renderLast)/1000,0),.1);renderLast=now;
  timeU.value=now/1000;
  // 鼠标 → 世界坐标
  raycaster.setFromCamera(new THREE.Vector2(mouse.x,mouse.y),camera);
  const hit=new THREE.Vector3();
  if(raycaster.ray.intersectPlane(aimPlane,hit)){mouseWorld.x=hit.x;mouseWorld.z=hit.z;}
  advance(now);
  const V=viewState();
  updateCamera(V,dt);
  syncEntities(V,dt,now/1000);
  updateDecor(now/1000);
  updateParticles(dt);
  if(now-uiAt>90){uiAt=now;updateHUD(V,now);}
  if(now-NET.rateAt>1000){NET.snapRate=NET.snapCount*1000/(now-NET.rateAt);NET.snapCount=0;NET.rateAt=now;}
  renderer.render(scene,camera);
}
export let lobbyBeat=0;
export function fixedStep(now){
  // 候船厅：不跑模拟，只周期性广播成员名单
  if(NET.role==='host'&&S.phase==='lobby'){
    if(++lobbyBeat%30===0)broadcastRoom();
    return;
  }
  const sim=(NET.role==='host'||NET.role==='solo')&&S.phase!=='lobby';
  if(sim){
    simulateHost(STEP);
    tickCount++;
    if(tickCount%SNAP_TICKS===0)sendSnapshot();
    if(tickCount%60===0&&NET.role==='host')netSend({type:'ping',t:performance.now()});
  }else if(NET.role==='client'){
    if(NET.connected&&NET.spectator){NET.clientTick++;return;}
    if(NET.connected&&NET.roomPhase!=='playing')return;
    if(NET.connected){
      const inp=readInput();
      NET.clientTick++;
      NET.lastInput=inp;
      NET.inputHistory.set(NET.clientTick,inp);
      // 客户端预测：输入立即在本地重放同一套运动模型
      if(NET.pred){
        const shot=stepPlayerMotion(NET.pred,inp,STEP);
        if(shot){
          const wp=shot.wp;
          spawnFlash(NET.pred.x+shot.dx*1.7,NET.pred.z+shot.dz*1.7,wp.color,1.2);
          sfx(NET.pred.weapon==='cannon'?'boom':NET.pred.weapon==='shotgun'?'shot2':'shot');
        }
      }
      // 输入直发：后台标签页里 setTimeout 会被节流，延迟上行会丢输入。
      // 模拟延迟只施加在下行快照上，预测/和解效果依然成立。
      netSend({type:'input',tick:NET.clientTick,inp});
    }
  }
}

