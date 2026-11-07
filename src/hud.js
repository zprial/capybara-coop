/* hud.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { $, cellOf, cellCenter } from './core.js';
import { GRID, CELL, HALF, ARENA, SHOP_RANGE, PHEX, teamName, POI_INFO, EVENT_INFO, BIOME_INFO, WEAPONS, SHOP } from './config.js';
import { NET } from './net.js';
import { WORLD, OBSTACLES, THORNS } from './world.js';
import { myView, viewState } from './view.js';
import { toast, sfx } from './fx.js';
import { buy } from './sim.js';

export let uiAt=0,shopOpen=false,shopSig='',lastPhase='lobby',bannerUntil=0;
export function showEventBanner(name,desc,color){
  const el=$('eventBanner');
  el.style.display='block';el.style.borderColor=color;
  $('evName').textContent='⚡ '+name;$('evName').style.color=color;
  $('evDesc').textContent=desc;
  bannerUntil=performance.now()+6500;
}
export function hideEventBanner(){$('eventBanner').style.display='none';bannerUntil=0;}
export function seatLabel(V,i){
  if(V.aiActive&&V.aiActive[i])return 'AI';
  if(NET.role==='client')return i===NET.clientId?'你':(i===0?'主机':'联机');
  if(NET.role==='host')return i===0?'主机':'联机';
  return i===0?'你':'AI';
}
export function compass(dx,dz){
  const a=((Math.atan2(dx,-dz)*180/Math.PI)+360)%360;
  return ['北','东北','东','东南','南','西南','西','西北'][Math.round(a/45)%8];
}
export function heartHtml(p){
  let s='';
  for(let i=0;i<p.maxHearts;i++)s+=`<span class="${i<p.hearts?'':'off'}" style="color:${i<p.hearts?'#ff7b7b':'#fff'}">♥</span>`;
  return s;
}
export function updateHUD(V,now){
  if(!V)return;
  const t=V.gameTime||0;
  $('waveNum').textContent=V.wave||1;
  $('timer').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
  const mi=$('merchantInfo');
  if(V.merchant&&V.merchant.active)mi.textContent=`商船在港 ${Math.ceil(V.merchant.timeLeft)}s`;
  else if(V.merchant&&V.merchant.next>0)mi.textContent=`商船 ${Math.ceil(V.merchant.next)}s`;
  else if(t<BOSS_TIME)mi.textContent=`首领 ${Math.ceil(BOSS_TIME-t)}s`;
  else mi.textContent='首领战';
  $('coinNum').textContent=V.coins||0;$('killNum').textContent=V.kills||0;
  // 探索 / 符文 / 增益 / 随机事件
  const exp=V.exploreCount||0,total=GRID*GRID,me0=myView(V);
  $('expPct').textContent=Math.round(exp/total*100)+'%';
  $('expFill').style.width=(exp/total*100)+'%';
  $('runeNum').textContent=(V.runes||0)+' / 3';
  let far=1e9,nearUnknown=null;
  for(const q of (V.pois||[])){
    const ci=q.cell>=0?q.cell:cellOf(q.x,q.z);
    if(ci>=0&&V.explored&&V.explored[ci])continue;
    const d=hypot((me0.x||0)-q.x,(me0.z||0)-q.z);
    if(d<far){far=d;nearUnknown=q;}
  }
  $('clueTxt').textContent=nearUnknown
    ?`${compass(nearUnknown.x-(me0.x||0),nearUnknown.z-(me0.z||0))} ${Math.round(far)}m 有信号`
    :'海图已探明';
  const p0=V.players[NET.role==='client'?NET.clientId:0]||{},bs=[];
  if(p0.shield>0)bs.push('🛡 护盾 ×'+p0.shield);
  if(p0.powerT>0)bs.push('✦ 双倍火力 '+Math.ceil(p0.powerT)+'s');
  if(p0.thrustT>0)bs.push('↯ 超载推进 '+Math.ceil(p0.thrustT)+'s');
  if(V.event&&V.event.type==='bloom')bs.push('🌸 荆棘开花');
  if(V.merchant&&V.merchant.ghost)bs.push('⛵ 幽灵商船');
  $('buffs').innerHTML=bs.map(x=>`<span class="buff">${x}</span>`).join('');
  if(V.event){
    const info=EVENT_INFO[V.event.type],el=$('eventBanner');
    el.style.display='block';el.style.borderColor=info.color;
    $('evName').textContent='⚡ '+info.name+' · '+Math.ceil(V.event.timeLeft)+'s';
    $('evName').style.color=info.color;$('evDesc').textContent=info.desc;
  }else if(performance.now()>bannerUntil)hideEventBanner();
  const bossOn=!!V.boss&&!V.boss.dead&&V.phase==='playing';
  $('bossWrap').style.display=bossOn?'block':'none';
  if(bossOn)$('bossBar').style.width=clamp(V.boss.hp/V.boss.maxHp*100,0,100)+'%';
  $('team').innerHTML=(V.players||[]).map((p,i)=>`
    <div class="pcard">
      <div class="avatar" style="color:${PHEX[i]}">🦫</div>
      <div class="pinfo">
        <div class="pname"><span style="color:${PHEX[i]}">${(i+1)+'P '+teamName(i)}</span>
          <span>${seatLabel(V,i)}</span></div>
        <div class="hearts">${heartHtml(p)}</div>
        <div class="wp ${p.downed?'downed':''}">${p.downed?'✖ 倒地 · 等待救援 '+Math.round((p.revive||0)/2.5*100)+'%':(WEAPONS[p.weapon]||WEAPONS.pistol).name+' · 伤害×'+(p.dmgMul||1).toFixed(2)+' · 推力×'+(p.recoilMul||1).toFixed(2)}</div>
      </div>
    </div>`).join('');
  // 提示
  const me=myView(V),myId=NET.role==='client'?NET.clientId:0;
  const mate=(V.players||[]).find(p=>p.id!==myId&&p.downed)||{};
  const pr=$('prompt');
  if(NET.spectator){pr.style.display='block';pr.textContent='👀 观战中 · 跟随 1P 视角，不参与操控';}
  else if(mate.downed){
    const d=hypot((me.x||0)-(mate.x||0),(me.z||0)-(mate.z||0));
    pr.style.display='block';
    pr.textContent=d<3.8?`按住 E 救起队友 · ${Math.round((mate.revive||0)/2.5*100)}%`:`队友倒地！距离 ${d.toFixed(0)}m · 朝反方向开火冲过去`;
  }else{
    let nearQ=null,qd=1e9;
    for(const q of (V.pois||[])){
      const d=hypot((me.x||0)-q.x,(me.z||0)-q.z);
      if(d<qd){qd=d;nearQ=q;}
    }
    if(nearQ&&qd<6.5){
      const info=POI_INFO[nearQ.type],dig=p0.dig||0;
      pr.style.display='block';
      pr.textContent=(nearQ.type==='wreck'||nearQ.type==='shrine')
        ?`按住 E ${nearQ.type==='wreck'?'打捞沉船':'供奉神龛（30 ¢）'} · ${Math.round(dig/(nearQ.type==='wreck'?2.2:1.2)*100)}%`
        :`${info.ic} ${info.name} · 靠近即可触发`;
    }else if(V.merchant&&V.merchant.active){
      const d=hypot((me.x||0)-V.merchant.x,(me.z||0)-V.merchant.z);
      pr.style.display='block';
      pr.textContent=d<10?'⛵ 商船在身边 · 按 B 打开补给站':`⛵ ${V.merchant.name||'商船'}在 ${d.toFixed(0)}m 外 · 用后坐力靠过去`;
    }else pr.style.display='none';
  }
  // 靠近商船时给一个可直接点击的入口
  const ob=$('openShop');
  const md=V.merchant?hypot((me.x||0)-V.merchant.x,(me.z||0)-V.merchant.z):999;
  ob.style.display=(V.merchant&&V.merchant.active&&!shopOpen&&md<=SHOP_RANGE&&
    !mate.downed&&!NET.spectator)?'inline-block':'none';
  // 商店：离港自动关闭并提示，避免面板开着却点不动
  if(shopOpen){
    if(!V.merchant||!V.merchant.active){closeShop();toast('⛵ 商船离港，补给站关闭','hot');}
    else renderShop(V);
  }
  // 网络面板
  $('roleTag').textContent=NET.spectator?'SPECTATOR · 观战':
    NET.role==='host'?'HOST · 权威服务器':NET.role==='client'?'CLIENT · 预测 + 和解':'SOLO · AI 队友';
  $('nTick').textContent=NET.role==='client'?NET.clientTick:(V.tick||0);
  $('nSnap').textContent=NET.snapRate.toFixed(0)+' Hz';
  $('nRtt').textContent=NET.rtt+' ms';
  $('nErr').textContent=NET.predErr.toFixed(2)+' m';
  // 结局
  if(V.phase==='victory'||V.phase==='defeat'){
    if(lastPhase!==V.phase){
      lastPhase=V.phase;
      $('endTitle').textContent=V.phase==='victory'?'浅海重归平静':'航区失守';
      $('endSub').textContent=V.phase==='victory'?'深渊巨兽沉入海底，两只水豚凯旋。':'两只水豚都倒下了，商船还在等你们……';
      $('endTime').textContent=$('timer').textContent;
      $('endKills').textContent=V.kills||0;$('endWave').textContent=V.wave||1;
      $('end').classList.remove('hidden');
    }
  }else lastPhase=V.phase;
  drawMap(V);
}
export const mapCtx=$('map').getContext('2d');
export function drawMap(V){
  const c=mapCtx,W=168,R=80,K=R/HALF,cx=84,cy=84;
  const P=(x,z)=>[cx+x*K,cy+z*K];
  c.clearRect(0,0,W,W);
  c.save();c.beginPath();c.arc(cx,cy,R,0,6.28);c.clip();
  c.fillStyle='#10242c';c.fillRect(0,0,W,W);
  const explored=V.explored||[],reveal=!!(V.revealT>0);
  const s=CELL*K;
  // 64 格迷雾：未探索只留微弱「信号」，不揭示内容
  for(let i=0;i<GRID*GRID;i++){
    const ctr=cellCenter(i),[px,py]=P(ctr.x-CELL/2,ctr.z-CELL/2);
    const open=!!explored[i]||reveal;
    if(open){
      const bi=WORLD.cells[i]?WORLD.cells[i].biome:'shoal';
      c.fillStyle=BIOME_INFO[bi].color;c.globalAlpha=.52;
      c.fillRect(px,py,s,s);c.globalAlpha=1;
    }else{
      c.fillStyle='rgba(14,34,42,.94)';c.fillRect(px,py,s,s);
      c.strokeStyle='rgba(120,190,200,.10)';c.lineWidth=.5;c.strokeRect(px+.5,py+.5,s-1,s-1);
    }
  }
  // 未知信号：只画模糊光点，勾人过去看
  if(!reveal){
    c.fillStyle='rgba(200,170,255,.55)';c.font='bold 9px sans-serif';c.textAlign='center';
    const seen=new Set();
    for(const q of (V.pois||[])){
      const ci=q.cell>=0?q.cell:cellOf(q.x,q.z);
      if(ci<0||explored[ci]||seen.has(ci))continue;
      seen.add(ci);
      const ctr=cellCenter(ci),[px,py]=P(ctr.x,ctr.z);
      c.globalAlpha=.35+.35*Math.sin(performance.now()/420+ci);
      c.fillText('?',px,py+3);
    }
    c.globalAlpha=1;
  }
  // 已探索区域才画地形细节
  for(const o of OBSTACLES){
    const ci=cellOf(o.x,o.z);if(ci<0||!explored[ci]&&!reveal)continue;
    const [x,y]=P(o.x,o.z);c.fillStyle='rgba(240,214,160,.8)';
    c.beginPath();c.arc(x,y,Math.max(1.2,o.r*K),0,6.28);c.fill();
  }
  c.fillStyle='rgba(255,80,110,.7)';
  for(const t of THORNS){
    const ci=cellOf(t.x,t.z);if(ci<0||!explored[ci]&&!reveal)continue;
    const [x,y]=P(t.x,t.z);c.beginPath();c.arc(x,y,1.7,0,6.28);c.fill();
  }
  // 港口（探索到才标）
  c.font='8px sans-serif';c.textAlign='center';
  for(const q of (V.ports||[])){
    const ci=cellOf(q.x,q.z);if(ci<0||!explored[ci]&&!reveal)continue;
    const [x,y]=P(q.x,q.z);c.fillStyle='rgba(255,210,119,.75)';c.fillRect(x-2,y-2,4,4);
  }
  // 兴趣点
  c.textAlign='center';
  for(const q of (V.pois||[])){
    const ci=q.cell>=0?q.cell:cellOf(q.x,q.z);
    if(ci<0||!explored[ci]&&!reveal)continue;
    const [x,y]=P(q.x,q.z);
    c.fillStyle='#'+POI_INFO[q.type].color.toString(16).padStart(6,'0');
    c.beginPath();c.arc(x,y,q.type==='rune'?3.6:2.7,0,6.28);c.fill();
    c.fillStyle='#10242c';c.font='bold 8px sans-serif';
    c.fillText(POI_INFO[q.type].ic,x,y+3);
  }
  // 怪物（只显示已探索格内的，保留未知感）
  c.fillStyle='rgba(255,120,120,.8)';
  for(const m of (V.monsters||[])){
    const ci=cellOf(m.x,m.z);if(ci<0||!explored[ci]&&!reveal)continue;
    const [x,y]=P(m.x,m.z);c.fillRect(x-1,y-1,2,2);
  }
  if(V.boss&&!V.boss.dead){const [x,y]=P(V.boss.x,V.boss.z);
    c.fillStyle='#ff4d6d';c.beginPath();c.arc(x,y,5,0,6.28);c.fill();}
  // 事件位置
  if(V.event){const [x,y]=P(V.event.x,V.event.z);
    c.strokeStyle=EVENT_INFO[V.event.type].color;c.lineWidth=1.5;
    c.beginPath();c.arc(x,y,7,0,6.28);c.stroke();
    c.fillStyle=EVENT_INFO[V.event.type].color;c.beginPath();c.arc(x,y,2.5,0,6.28);c.fill();}
  // 商船
  if(V.merchant&&V.merchant.active){const [x,y]=P(V.merchant.x,V.merchant.z);
    c.fillStyle='#ffd277';c.fillRect(x-4,y-4,8,8);
    c.strokeStyle='#ffd277';c.lineWidth=1;c.beginPath();c.arc(x,y,SHOP_RANGE*K,0,6.28);c.stroke();}
  // 玩家
  (V.players||[]).forEach((p,i)=>{const [x,y]=P(p.x,p.z);
    c.fillStyle=p.downed?'#ffffff':PHEX[i];c.beginPath();c.arc(x,y,3.6,0,6.28);c.fill();
    c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1;c.stroke();});
  c.restore();
  c.strokeStyle='rgba(255,210,150,.5)';c.lineWidth=1.5;
  c.beginPath();c.arc(cx,cy,R,0,6.28);c.stroke();
}
/* 商店列表只在数据变化时才重建 DOM：否则每帧重绘会吞掉真实鼠标的
   mousedown→mouseup（落在不同节点上就不触发 click），表现就是「点了没反应」。
   点击改用容器事件委托，双重保险。 */
export function shopSignature(V){
  const me=myView(V);
  return [V.coins||0,!!(V.merchant&&V.merchant.active),me&&me.downed,
    me&&me.weapon,me&&me.dmgMul,me&&me.recoilMul,me&&me.pierce,
    me&&me.maxHearts,me&&me.hearts].join('|');
}
export function renderShop(V,force){
  const sig=shopSignature(V);
  if(!force&&sig===shopSig)return;
  shopSig=sig;
  const me=myView(V),coins=V.coins||0;
  $('shopCoins').textContent=coins;
  $('shopList').innerHTML=SHOP.map((it,i)=>{
    const enough=coins>=it.cost;
    const owned=it.kind==='weapon'&&me&&me.weapon===it.val;
    const ok=enough&&!(me&&me.downed);
    const note=owned?' · 已装备':(!enough?` · 还差 ${it.cost-coins} ¢`:'');
    return `<div class="item ${ok?'':'no'} ${owned?'owned':''}" data-i="${i}">
      <div class="ic">${it.ic}</div>
      <div class="tx"><b>${it.name} <span style="opacity:.5;font-weight:400">${i+1}</span></b>
        <span>${it.desc}${note}</span></div>
      <div class="pr">${owned?'✓':it.cost+' ¢'}</div></div>`;
  }).join('');
}
export function closeShop(){
  shopOpen=false;shopSig='';$('shop').style.display='none';
}
export function requestBuy(itemId){
  if(!shopOpen||NET.spectator)return;
  const V=viewState(),it=SHOP.find(i=>i.id===itemId);
  if(!it)return;
  if(!V.merchant||!V.merchant.active){toast('⛵ 商船已离港，等下一班吧','hot');closeShop();return;}
  const me=myView(V),coins=V.coins||0;
  if(me&&me.downed){toast('倒地状态下不能交易','hot');return;}
  if(me&&hypot(me.x-V.merchant.x,me.z-V.merchant.z)>SHOP_RANGE){
    toast('离商船太远了，靠近一点','hot');return;}
  if(coins<it.cost){toast(`🛒 贝壳币不足 · 还差 ${it.cost-coins} ¢`,'hot');sfx('hurt');return;}
  sfx('buy');
  if(NET.role==='client')netSend({type:'cmd',cmd:'buy',item:itemId});
  else buy(0,itemId);
  shopSig=''; // 让列表立刻刷新（主机端即时，客户端等快照）
}
export function toggleShop(){
  if(NET.spectator){toast('观战状态下不能交易');return;}
  const V=viewState();
  if(shopOpen){closeShop();return;}
  if(!V.merchant||!V.merchant.active){toast('⛵ 商船还没靠港','hot');return;}
  const me=myView(V);
  if(me&&me.downed){toast('倒地状态下不能交易','hot');return;}
  if(me&&hypot(me.x-V.merchant.x,me.z-V.merchant.z)>SHOP_RANGE){
    toast('要靠近商船才能交易','hot');return;}
  shopOpen=true;$('shop').style.display='block';renderShop(V,true);sfx('buy');
}

