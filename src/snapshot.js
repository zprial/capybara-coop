/* snapshot.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { STEP } from './config.js';
import { S } from './state.js';
import { NET, netSend } from './net.js';
import { stepPlayerMotion } from './sim.js';
import { buildWorld } from './world.js';
import { handleEvents } from './fx.js';

export function makeSnapshot(){
  return {
    type:'snap',tick:S.tick,gameTime:S.gameTime,wave:S.wave,phase:S.phase,
    players:S.players.map(p=>({...p})),
    bullets:S.bullets.map(b=>({...b,hit:undefined})),
    monsters:S.monsters.map(m=>({...m})),
    boss:S.boss?{...S.boss}:null,
    merchant:{...S.merchant},coins:S.coins,kills:S.kills,bossDead:S.bossDead,
    worldSeed:S.worldSeed,explored:S.explored,exploreCount:S.exploreCount,
    ports:S.ports,pois:S.pois,pickups:S.pickups,event:S.event,eventTimer:S.eventTimer,
    runes:S.runes,revealT:S.revealT,
    seats:S.seats,aiActive:S.aiActive,members:S.members,hostUid:S.hostUid,
    acks:[...S.acks],events:S.pendingEvents.splice(0),rtt:NET.rtt
  };
}
export function sendSnapshot(){
  const snap=makeSnapshot();
  NET.snapCount++;
  netSend(snap);
}
export function applySnapshot(snap){
  NET.prevSnap=NET.lastSnap;NET.lastSnap=snap;NET.snapAt=performance.now();
  NET.snapCount++;
  if(snap.rtt!=null&&NET.role==='client')NET.rtt=snap.rtt;
  // 世界种子变化时重建静态地形（合作双方看到同一张地图）
  if(snap.worldSeed!=null&&snap.worldSeed!==NET.worldSeed){
    NET.worldSeed=snap.worldSeed;buildWorld(snap.worldSeed);
  }
  const srv=snap.players[NET.clientId];
  if(srv){
    // 和解误差 = 收到权威状态前，本地预测位置与服务器位置的偏差
    if(NET.pred)NET.predErr=hypot(NET.pred.x-srv.x,NET.pred.z-srv.z);
    const pred={x:srv.x,z:srv.z,vx:srv.vx,vz:srv.vz,aim:srv.aim,fireCd:srv.fireCd,
      weapon:srv.weapon,recoilMul:srv.recoilMul,pierce:srv.pierce,downed:srv.downed,
      invuln:srv.invuln,thrust:srv.thrust||1,curX:srv.curX||0,curZ:srv.curZ||0,
      warpCd:srv.warpCd||0};
    // 回滚到权威状态，再重放未确认输入
    const ack=(snap.acks&&snap.acks[NET.clientId]!=null)?snap.acks[NET.clientId]:snap.tick;
    const start=Math.max(ack+1,NET.clientTick-180);
    for(let t=start;t<=NET.clientTick;t++){
      const inp=NET.inputHistory.get(t)||NET.lastInput;
      if(inp)stepPlayerMotion(pred,inp,STEP);
    }
    NET.pred=pred;
    const cutoff=NET.clientTick-240;
    for(const k of NET.inputHistory.keys())if(k<cutoff)NET.inputHistory.delete(k);
  }
  if(snap.events&&snap.events.length)handleEvents(snap.events);
}
export function delayed(fn,ms){ if(ms<=0)fn(); else setTimeout(fn,ms); }

