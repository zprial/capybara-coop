/* main.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { $ } from './core.js';
import { clamp } from './core.js';
import { MAX_SEATS, MAX_ROOM, BOSS_TIME, GRID, CELL } from './config.js';
import { S, makeState, makePlayer } from './state.js';
import { NET, makeTransport, netSend } from './net.js';
import { keys, mouse, mouseWorld, raycaster, aimPlane } from './input.js';
import { buildWorld, WORLD, OBSTACLES, THORNS } from './world.js';
import { scene, camera, renderer } from './scene.js';
import { ensurePlayerMeshes, playerMeshes, monsterMeshes, bulletMeshes, poiMeshes, pickupMeshes } from './models.js';
import { camFocus } from './view.js';
import { closeShop, toggleShop, requestBuy } from './hud.js';
import { advance, frame } from './loop.js';
import { onNetMessage, broadcastRoom } from './msg.js';
import { initRun } from './state.js';

export function escapeHtml(s){return String(s).replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function renderWait(){
  $('waitRoom').textContent=NET.room;
  const list=NET.members||[],players=list.filter(m=>!m.spectator).length;
  $('waitCount').textContent=list.length+' 人在线 · '+players+' 条船';
  $('waitList').innerHTML=list.map(m=>{
    const col=m.seat>=0&&m.seat<PHEX.length?PHEX[m.seat]:'#9fb0b8';
    const tag=m.uid===NET.hostUid?'房主 · ':'';
    const role=m.spectator?'观战':(m.seat+1)+'P '+teamName(m.seat);
    return `<div class="member"><span class="dot" style="background:${col};color:${col}"></span>
      <b>${escapeHtml(m.name)}</b><span>${tag}${role}</span></div>`;
  }).join('');
  $('btnStartRoom').style.display=NET.role==='host'?'inline-block':'none';
  $('waitHint').textContent=NET.role==='host'
    ?`房间可容纳 ${MAX_ROOM} 人、同场最多 ${MAX_SEATS} 条船；空位由 AI 补上，超出的连接自动观战。等人齐后点「开始游戏」。`
    :'等待房主开始游戏…（船位满了会作为观战加入，依然能看完整局）';
}
export function clearTransient(){
  NET.pred=null;NET.prevSnap=null;NET.lastSnap=null;NET.inputHistory.clear();NET.predErr=0;
  for(const [id,g] of monsterMeshes){scene.remove(g);}monsterMeshes.clear();
  for(const [id,g] of bulletMeshes){scene.remove(g);}bulletMeshes.clear();
  for(const [id,g] of poiMeshes){scene.remove(g);}poiMeshes.clear();
  for(const [id,g] of pickupMeshes){scene.remove(g);}pickupMeshes.clear();
  camFocus.set(0,0,0);
  shopOpen=false;shopSig='';$('shop').style.display='none';
  $('end').classList.add('hidden');lastPhase='playing';
}
export function beginRun(){
  const solo=NET.role==='solo';
  S=makeState();S.phase='playing';
  if(solo){
    S.members=[{uid:NET.uid,name:'你',seat:0,spectator:false}];
    S.hostUid=NET.uid;S.players=[makePlayer(0,-8,8),makePlayer(1,8,8)];
    S.seats=[NET.uid,null];S.aiActive=[false,true];
  }else{
    S.members=NET.members.map(m=>({...m}));S.hostUid=NET.uid;
    const humans=S.members.filter(m=>!m.spectator);
    const n=clamp(humans.length,2,MAX_SEATS);
    S.players=[];S.seats=[];S.aiActive=[];
    for(let i=0;i<n;i++){
      const m=humans[i];
      S.players.push(makePlayer(i,(i-(n-1)/2)*7,8));
      S.seats.push(m?m.uid:null);S.aiActive.push(!m);
    }
  }
  S.acks=new Array(S.players.length).fill(0);
  S.remoteInputs=S.players.map(()=>({inp:null,tick:0,at:0}));
  NET.worldSeed=S.worldSeed;buildWorld(S.worldSeed);initRun(S);
  ensurePlayerMeshes(S.players.length);
  for(let i=0;i<S.players.length;i++)playerMeshes[i].position.set(S.players[i].x,0,S.players[i].z);
  clearTransient();NET.roomPhase='playing';
  $('start').classList.add('hidden');$('wait').classList.add('hidden');
  toast('⛵ 300m 未知航区 · 用后坐力推船，探索迷雾里的秘密','hot');
  if(NET.role==='host')netSend({type:'start',worldSeed:S.worldSeed,seats:S.seats,
    n:S.players.length,members:S.members,phase:'playing'});
}
export function startGame(info){
  if(NET.role!=='client'){beginRun();return;}
  if(info&&info.worldSeed!=null){NET.worldSeed=info.worldSeed;buildWorld(info.worldSeed);}
  S=makeState();S.phase='playing';
  const n=(info&&info.n)||2;
  S.players=Array.from({length:n},(_,i)=>makePlayer(i,0,0));
  S.seats=(info&&info.seats)||[];S.members=(info&&info.members)||[];
  ensurePlayerMeshes(n);clearTransient();NET.roomPhase='playing';
  $('start').classList.add('hidden');$('wait').classList.add('hidden');
  toast(NET.spectator?'👀 观战模式 · 跟随 1P 视角':'⛵ 出发！按住左键开火，用后坐力推船','hot');
}
export function resetGame(){
  if(NET.role==='client')return;      // 客户端等主机的 reset 消息
  beginRun();
  if(NET.role==='host')netSend({type:'reset',worldSeed:S.worldSeed,seats:S.seats,
    n:S.players.length,members:S.members,phase:'playing'});
}
export function backToLobby(){
  S=makeState();S.phase='lobby';S.members=NET.members;S.hostUid=NET.uid;
  NET.roomPhase='lobby';clearTransient();
  $('end').classList.add('hidden');$('wait').classList.remove('hidden');
  renderWait();
  netSend({type:'lobby',members:NET.members,host:NET.uid});
}
export function enterRoom(isHost){
  NET.room=$('roomName').value.trim()||'capy-1';
  NET.inRoom=true;NET.roomPhase='lobby';
  $('start').classList.add('hidden');$('wait').classList.remove('hidden');
  if(isHost){
    NET.members=[{uid:NET.uid,name:($('playerName').value.trim()||'房主').slice(0,16),
      seat:0,spectator:false}];
    NET.hostUid=NET.uid;NET.spectator=false;NET.clientId=0;NET.connected=true;
    S=makeState();S.phase='lobby';S.members=NET.members;S.hostUid=NET.uid;
    broadcastRoom();
  }else{
    NET.members=[];NET.hostUid=null;NET.spectator=false;NET.connected=false;
  }
  renderWait();
}
export function leaveRoom(){
  if(NET.role==='host'||NET.role==='client')netSend({type:'bye'});
  if(NET.transport){NET.transport.close();NET.transport=null;}
  NET.inRoom=false;NET.connected=false;NET.spectator=false;NET.members=[];
  S=makeState();NET.role='solo';
  $('wait').classList.add('hidden');$('end').classList.add('hidden');
  $('start').classList.remove('hidden');
}
export function setupTransport(){
  NET.room=$('roomName').value.trim()||'capy-1';
  // 手填优先；服务器托管的页面由服务端注入同域中继地址，实现零配置联机
  NET.wsUrl=$('wsUrl').value.trim()||window.__CAPY_RELAY__||'';
  if(NET.transport)NET.transport.close();
  NET.transport=makeTransport(NET.room,NET.wsUrl);
  NET.transport.onMessage(onNetMessage);
}
$('btnSolo').onclick=()=>{
  NET.role='solo';NET.connected=false;NET.spectator=false;NET.clientId=0;
  NET.transport=null;NET.members=[{uid:NET.uid,name:'你',seat:0,spectator:false}];
  startGame();
};
$('btnHost').onclick=()=>{
  NET.role='host';setupTransport();enterRoom(true);
  toast('房间已创建 · 把网址和房间名发给队友，等人齐后点「开始游戏」','hot');
};
$('btnJoin').onclick=()=>{
  NET.role='client';setupTransport();enterRoom(false);
  $('btnJoin').textContent='正在寻找主机…';
  netSend({type:'hello',name:($('playerName').value.trim()||'玩家').slice(0,16)});
  setTimeout(()=>{if(!NET.connected){
    $('btnJoin').textContent='加入房间 · 另一台设备';
    toast('没找到主机：请先点「创建房间」，并确认房间名一致','hot');
  }},2500);
};
$('btnStartRoom').onclick=()=>{
  if(NET.role!=='host')return;
  beginRun();
};
$('btnLeaveRoom').onclick=leaveRoom;
$('btnRestart').onclick=()=>{
  if(NET.role==='client')netSend({type:'cmd',cmd:'reset'});
  else resetGame();
};
$('btnBackLobby').onclick=()=>{
  if(NET.role==='client')netSend({type:'cmd',cmd:'lobby'});
  else backToLobby();
};
$('shopClose').onclick=()=>closeShop();
$('openShop').onclick=()=>toggleShop();
// 事件委托：列表重绘也不会丢失点击
$('shopList').addEventListener('click',e=>{
  const el=e.target.closest('.item');if(!el)return;
  const it=SHOP[+el.dataset.i];if(it)requestBuy(it.id);
});
$('fastBtn').onclick=()=>{
  if(NET.role==='client')netSend({type:'cmd',cmd:'fast',val:30});
  else if(S.phase==='playing'){S.gameTime=Math.min(BOSS_TIME-.1,S.gameTime+30);toast('⏩ 快进 30 秒');}
};
$('lat').oninput=e=>{NET.latency=+e.target.value;$('latVal').textContent=e.target.value;};
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;
  if(k==='b'){e.preventDefault();toggleShop();}
  if(k==='escape'&&shopOpen)toggleShop();
  if(k>='1'&&k<='7'&&shopOpen)requestBuy(SHOP[+k-1].id);
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
export const cv=renderer.domElement;
cv.addEventListener('pointermove',e=>{
  mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight*2-1);mouse.inside=true;
});
cv.addEventListener('pointerdown',e=>{if(e.button===0)mouse.down=true;sfx('shot');});
addEventListener('pointerup',e=>{if(e.button===0)mouse.down=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{mouse.down=false;for(const k in keys)keys[k]=false;});

// 大厅显示当前中继模式，便于部署后排障
(function(){
  const auto=window.__CAPY_RELAY__,el=$('relayState'),inp=$('wsUrl');
  if(auto){
    inp.placeholder='留空即自动使用 '+auto;
    el.textContent='✓ 服务器中继已自动配置（跨设备可直连）';
    el.style.color='#8ce8b0';
  }else{
    el.textContent='本地模式 · 同浏览器双标签页直连';
    el.style.color='';
  }
})();
// 初始镜头对准起始区域
playerMeshes[0].position.set(-6,0,8);playerMeshes[1].position.set(6,0,8);
camera.lookAt(0,0,0);
NET.rateAt=performance.now();
// 独立于 rAF 的模拟心跳：后台标签页也能维持 60Hz 补算
setInterval(()=>advance(performance.now()),1000/30);
window.__capy={THREE,camera,scene,get state(){return S;},net:NET,
  world:WORLD,obstacles:OBSTACLES,thorns:THORNS};
requestAnimationFrame(frame);

