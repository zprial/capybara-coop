/* sim.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { clamp, lerp, hypot, mulberry32, inArena, cellOf, cellCenter } from './core.js';
import { WEAPONS, MON, SHOP, SHOP_RANGE, ARENA, BOSS_TIME, GRID, CELL, EVENT_INFO, EVENT_KEYS, POI_INFO } from './config.js';
import { S, makePlayer } from './state.js';
import { OBSTACLES, THORNS, WORLD } from './world.js';
import { NET } from './net.js';
import { handleEvents } from './fx.js';

export function stepPlayerMotion(p,input,dt){
  p.fireCd=Math.max(0,(p.fireCd||0)-dt);
  p.invuln=Math.max(0,(p.invuln||0)-dt);
  let dx=(input.ax||0)-p.x, dz=(input.az||0)-p.z;
  const l=hypot(dx,dz)||1; dx/=l; dz/=l;
  p.aim=Math.atan2(dx,dz);
  const wp=WEAPONS[p.weapon]||WEAPONS.pistol;
  let shot=null;
  if(input.fire&&p.fireCd<=0&&!p.downed){
    p.fireCd=1/wp.rate;
    const imp=wp.recoil*(p.recoilMul||1)*(p.thrust||1);
    p.vx-=dx*imp; p.vz-=dz*imp;
    shot={wp,dx,dz};
  }
  p.vx+=(input.px||0)*3.0*dt; p.vz+=(input.pz||0)*3.0*dt;
  p.vx+=(p.curX||0)*dt; p.vz+=(p.curZ||0)*dt;    // 随机洋流
  p.warpCd=Math.max(0,(p.warpCd||0)-dt);
  const damp=Math.exp(-1.75*dt);
  p.vx*=damp;p.vz*=damp;
  const sp=hypot(p.vx,p.vz),max=p.downed?2:12.5;
  if(sp>max){p.vx*=max/sp;p.vz*=max/sp;}
  p.x+=p.vx*dt;p.z+=p.vz*dt;
  // 圆形航区边界
  const rr=hypot(p.x,p.z);
  if(rr>ARENA){const nx=p.x/(rr||1),nz=p.z/(rr||1);
    p.x=nx*ARENA;p.z=nz*ARENA;
    const dot=p.vx*nx+p.vz*nz;if(dot>0){p.vx-=dot*nx*1.5;p.vz-=dot*nz*1.5;}}
  // 岛群 / 礁石
  for(const o of OBSTACLES){
    const ox=p.x-o.x,oz=p.z-o.z,d=hypot(ox,oz),lim=o.r+1.0;
    if(d<lim){const nx=ox/(d||1),nz=oz/(d||1);p.x=o.x+nx*lim;p.z=o.z+nz*lim;
      const dot=p.vx*nx+p.vz*nz;if(dot<0){p.vx-=dot*nx*1.5;p.vz-=dot*nz*1.5;}}
  }
  return shot;
}

/* ------------------------------ 主机模拟 --------------------------------- */
export function spawnBullets(p,shot){
  const {wp,dx,dz}=shot;
  for(let i=0;i<wp.pellets;i++){
    const a=Math.atan2(dx,dz)+(Math.random()-.5)*wp.spread*2;
    const vx=Math.sin(a)*wp.speed+p.vx*.3, vz=Math.cos(a)*wp.speed+p.vz*.3;
    S.bullets.push({id:S.nextId++,team:'p',owner:p.id,x:p.x+Math.sin(a)*1.5,z:p.z+Math.cos(a)*1.5,
      vx,vz,life:wp.life,dmg:wp.dmg*(p.dmgMul||1)*(p.power||1),pierce:p.pierce||0,aoe:wp.aoe||0,
      r:wp.aoe?.7:.34,hit:[]});
  }
  S.events.push({t:'shot',id:p.id,x:p.x,z:p.z,dx,dz,w:p.weapon});
}
export function enemyBullet(x,z,vx,vz,dmg,life,r){
  S.bullets.push({id:S.nextId++,team:'e',x,z,vx,vz,life,dmg,pierce:0,aoe:0,r:r||.45,hit:[]});
}
export function spawnMonster(type,x,z){
  const d=MON[type];
  const hp=d.hp*(1+S.wave*.055);
  const m={id:S.nextId++,type,x,z,vx:0,vz:0,angle:0,hp,maxHp:hp,r:d.r,cd:1+Math.random()*2,dead:false,bonus:false};
  S.monsters.push(m);return m;
}
export function spawnWaveMonster(){
  const t=S.gameTime;
  let type='reef';
  const r=Math.random();
  if(t>40&&r>.82)type='brute'; else if(t>22&&r>.58)type='spitter';
  const p=S.players[Math.floor(Math.random()*S.players.length)]||S.players[0];
  let x,z,tries=0;
  do{const a=Math.random()*6.28,rad=26+Math.random()*16;
     x=clamp(p.x+Math.cos(a)*rad,-ARENA+5,ARENA-5);
     z=clamp(p.z+Math.sin(a)*rad,-ARENA+5,ARENA-5);tries++;}
  while(tries<14&&(!inArena(x,z,4)||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+4)));
  // 地貌影响怪物强度：海沟更凶险
  const ci=cellOf(x,z),bi=ci>=0?WORLD.cells[ci].biome:'shoal';
  const m=spawnMonster(type,x,z);
  if(m&&(bi==='trench'||bi==='thorn')){m.hp*=1.35;m.maxHp=m.hp;m.bonus=true;}
}
export function hurtPlayer(p,amount,reason){
  if(p.downed||p.dead||p.invuln>0)return;
  if(p.shield>0){p.shield--;p.invuln=.9;
    S.events.push({t:'shield',id:p.id,x:p.x,z:p.z});return;}
  p.hearts-=amount;p.invuln=.95;
  S.events.push({t:'hurt',id:p.id,x:p.x,z:p.z,reason});
  if(p.hearts<=0){p.hearts=0;p.downed=true;p.revive=0;S.events.push({t:'down',id:p.id,x:p.x,z:p.z});}
}
export function damageMonster(m,dmg,p){
  m.hp-=dmg;S.events.push({t:'hit',x:m.x,z:m.z,color:MON[m.type].color});
  if(m.hp<=0&&!m.dead){
    m.dead=true;
    const reward=Math.round(MON[m.type].coin*(m.bonus?2:1)*((S.event&&S.event.type==='swarm')?2:1));
    S.coins+=reward;S.kills++;
    if(p)p.kills++;
    // 掉落：越凶险的怪越容易掉道具
    if(Math.random()<(m.bonus?.55:.26)){
      const roll=Math.random();
      pushPickup(roll<.42?'coin':roll<.62?'heart':roll<.78?'shield':roll<.90?'boost':'speed',m.x,m.z,10+reward);
    }
    S.events.push({t:'kill',x:m.x,z:m.z,coin:MON[m.type].color});
  }
}
export function updateMerchant(dt){
  const m=S.merchant;
  // 随机事件「幽灵商船」临时占据商船
  if(S.event&&S.event.type==='ghost'){
    if(!m.ghost){
      m.ghost=true;m.active=true;m.x=S.event.x;m.z=S.event.z;m.name='幽灵商船';m.portId=-1;
      S.events.push({t:'merchant',x:m.x,z:m.z,name:m.name});
    }
    m.timeLeft=S.event.timeLeft;m.next=0;return;
  }
  if(m.ghost){m.ghost=false;m.active=false;m.name='';S.events.push({t:'merchantLeave'});}
  let active=false,left=0;
  for(const [a,b] of MERCH_WINDOWS){if(S.gameTime>=a&&S.gameTime<b){active=true;left=b-S.gameTime;break;}}
  if(active&&!m.active){
    // 每班换个港口：优先已探索、离队伍较近的，逼着你把地图跑开
    let pick=null,best=1e9;
    for(const q of S.ports){
      if(q.id===m.portId)continue;
      const d=Math.min(...S.players.map(p=>hypot(p.x-q.x,p.z-q.z)));
      const score=d+(S.explored[cellOf(q.x,q.z)]?0:55);
      if(score<best){best=score;pick=q;}
    }
    if(pick){m.x=pick.x;m.z=pick.z;m.portId=pick.id;m.name=pick.name;}
    S.events.push({t:'merchant',x:m.x,z:m.z,name:m.name});
  }
  if(!active&&m.active)S.events.push({t:'merchantLeave'});
  m.active=active;m.timeLeft=left;
  let nxt=Infinity;
  for(const [a] of MERCH_WINDOWS)if(a>S.gameTime){nxt=a;break;}
  m.next=nxt===Infinity?0:nxt-S.gameTime;
}
export function buy(playerId,itemId){
  // 任何拒绝都回传原因，避免界面「点了没反应」
  const fail=msg=>{S.events.push({t:'buyFail',id:playerId,msg});return msg;};
  if(S.phase!=='playing')return fail('本局已结束');
  if(!S.merchant.active)return fail('商船已离港，等下一班吧');
  const p=S.players[playerId];if(!p)return fail('玩家不存在');
  if(p.downed)return fail('倒地状态下不能交易');
  // 主机比客户端宽松 2m，抵消预测/权威位置误差
  if(hypot(p.x-S.merchant.x,p.z-S.merchant.z)>SHOP_RANGE+2)return fail('离商船太远了，靠近一点');
  const it=SHOP.find(i=>i.id===itemId);if(!it)return fail('商品不存在');
  if(S.coins<it.cost)return fail(`贝壳币不足 · 还差 ${it.cost-S.coins} ¢`);
  S.coins-=it.cost;
  if(it.kind==='weapon')p.weapon=it.val;
  else if(itemId==='dmg')p.dmgMul=+(p.dmgMul+.25).toFixed(2);
  else if(itemId==='recoil')p.recoilMul=+(p.recoilMul+.22).toFixed(2);
  else if(itemId==='pierce')p.pierce++;
  else if(itemId==='hull'){p.maxHearts=Math.min(8,p.maxHearts+1);p.hearts=Math.min(p.maxHearts,p.hearts+2);}
  S.events.push({t:'buy',id:playerId,item:it.id,name:it.name});
}
export function summonBoss(early){
  // 在队伍附近浮出，保证登场瞬间就在镜头内
  let cx=0,cz=0;for(const p of S.players){cx+=p.x;cz+=p.z;}
  cx/=S.players.length;cz/=S.players.length;
  const bx=clamp(cx+(Math.random()-.5)*9,-ARENA+7,ARENA-7);
  const bz=clamp(cz+12,-ARENA+7,ARENA-7);
  S.boss={id:S.nextId++,x:bx,z:bz,vx:0,vz:0,angle:0,hp:early?1250:1500,maxHp:early?1250:1500,
    r:4.6,ring:2.6,summon:6,slam:8,phase:1,dead:false,t:0};
  if(early)for(const p of S.players){
    p.maxHearts=Math.min(9,p.maxHearts+1);p.hearts=p.maxHearts;p.shield=Math.max(p.shield,2);}
  S.events.push({t:'boss',x:bx,z:bz,early:!!early});
}

/* ===================== 探索 / 隐藏点 / 拾取 / 随机事件 ===================== */
export function pushPickup(type,x,z,value){
  S.pickups.push({id:S.nextId++,type,x:clamp(x+(Math.random()-.5)*2.4,-ARENA+3,ARENA-3),
    z:clamp(z+(Math.random()-.5)*2.4,-ARENA+3,ARENA-3),value:value||8,life:80});
}
export function applyPickup(p,k){
  if(k.type==='coin'){S.coins+=k.value||8;S.events.push({t:'loot',id:p.id,text:'+'+(k.value||8)+' ¢'});}
  else if(k.type==='heart'){p.hearts=Math.min(p.maxHearts,p.hearts+1);S.events.push({t:'loot',id:p.id,text:'+1 ♥ 船体修复'});}
  else if(k.type==='shield'){p.shield=3;S.events.push({t:'loot',id:p.id,text:'护盾 ×3'});}
  else if(k.type==='boost'){p.power=1.8;p.powerT=18;S.events.push({t:'loot',id:p.id,text:'双倍火力 18 秒'});}
  else if(k.type==='speed'){p.thrust=1.7;p.thrustT=18;S.events.push({t:'loot',id:p.id,text:'超载推进 18 秒'});}
}
export function updatePickups(dt){
  for(let i=S.pickups.length-1;i>=0;i--){
    const k=S.pickups[i];k.life-=dt;
    if(k.life<=0){S.pickups.splice(i,1);continue;}
    for(const p of S.players){
      if(p.downed)continue;
      if(hypot(p.x-k.x,p.z-k.z)<2.9){applyPickup(p,k);S.pickups.splice(i,1);break;}
    }
  }
}
export function updateExploration(){
  for(const p of S.players){
    if(p.downed)continue;
    const ci=cellOf(p.x,p.z);
    if(ci<0||S.explored[ci])continue;
    S.explored[ci]=1;S.exploreCount++;S.coins+=4;
    for(const q of S.pois)if(q.cell===ci)q.revealed=true;
    const bi=WORLD.cells[ci]?WORLD.cells[ci].biome:'shoal';
    S.events.push({t:'discover',id:p.id,cell:ci,x:p.x,z:p.z,name:BIOME_INFO[bi].name});
  }
}
export function openCache(q,p){
  const r=Math.random();
  if(r<.30)for(let i=0;i<3;i++)pushPickup('coin',q.x,q.z,14);
  else if(r<.50)pushPickup('heart',q.x,q.z);
  else if(r<.68)pushPickup('shield',q.x,q.z);
  else if(r<.84)pushPickup(r<.77?'boost':'speed',q.x,q.z);
  else{p.weapon=['shotgun','smg','cannon'][Math.floor(Math.random()*3)];
    S.events.push({t:'loot',id:p.id,text:'稀有武器 · '+WEAPONS[p.weapon].name});}
  S.coins+=6;
  S.events.push({t:'poiGone',id:q.id,x:q.x,z:q.z,kind:'cache'});
}
export function updatePOIs(dt,inputs){
  for(let i=S.pois.length-1;i>=0;i--){
    const q=S.pois[i];if(q.found){S.pois.splice(i,1);continue;}
    let p=null,best=1e9;
    for(const pl of S.players){if(pl.downed)continue;const d=hypot(pl.x-q.x,pl.z-q.z);if(d<best){best=d;p=pl;}}
    if(!p)continue;
    if(q.type==='cache'&&best<3.4){q.found=true;openCache(q,p);continue;}
    if(q.type==='rune'&&best<3.4){
      q.found=true;S.runes++;S.coins+=25;
      S.events.push({t:'rune',id:p.id,x:q.x,z:q.z,n:S.runes});
      if(S.runes>=3&&!S.boss&&!S.bossDead)summonBoss(true);
      S.events.push({t:'poiGone',id:q.id,x:q.x,z:q.z,kind:'rune'});continue;
    }
    if(q.type==='whirlpool'&&best<4.2&&(p.warpCd||0)<=0){
      let ci=-1,t=0;
      do{ci=Math.floor(Math.random()*GRID*GRID);t++;}while(t<40&&S.explored[ci]);
      const c=cellCenter(ci>=0?ci:0);
      p.x=clamp(c.x,-ARENA+8,ARENA-8);p.z=clamp(c.z,-ARENA+8,ARENA-8);
      p.vx*=.3;p.vz*=.3;p.warpCd=22;p.invuln=2.2;
      S.events.push({t:'warp',id:p.id,x:q.x,z:q.z,tx:p.x,tz:p.z});
      q.found=true;S.events.push({t:'poiGone',id:q.id,x:q.x,z:q.z,kind:'whirlpool'});continue;
    }
    if(q.type==='wreck'||q.type==='shrine'){
      const using=inputs[p.id]&&inputs[p.id].revive;
      if(best<4.6&&using){
        p.dig=(p.dig||0)+dt;p.digId=q.id;
        const need=q.type==='wreck'?2.2:1.2;
        if(p.dig>=need){
          p.dig=0;
          if(q.type==='shrine'&&S.coins<30){
            S.events.push({t:'loot',id:p.id,text:'神龛需要 30 ¢ 供奉'});p.dig=.6;continue;
          }
          q.found=true;
          if(q.type==='wreck'){
            const r=Math.random();
            if(r<.42)for(let k=0;k<4;k++)pushPickup('coin',q.x,q.z,20);
            else if(r<.68){pushPickup('heart',q.x,q.z);pushPickup('shield',q.x,q.z);}
            else if(r<.86){pushPickup('boost',q.x,q.z);pushPickup('speed',q.x,q.z);}
            else for(let k=0;k<3;k++)spawnMonster('brute',q.x+(Math.random()-.5)*9,q.z+(Math.random()-.5)*9);
            S.events.push({t:'loot',id:p.id,text:r<.86?'沉船打捞成功！':'惊动了沉睡的守卫！'});
          }else{
            S.coins-=30;const r=Math.random();
            if(r<.40){p.maxHearts=Math.min(9,p.maxHearts+1);p.hearts=p.maxHearts;
              S.events.push({t:'loot',id:p.id,text:'神龛赐福 · 心上限 +1 且回满'});}
            else if(r<.72){p.dmgMul=+(p.dmgMul+.5).toFixed(2);
              S.events.push({t:'loot',id:p.id,text:'神龛赐福 · 永久伤害 +50%'});}
            else{p.weapon='cannon';p.pierce++;
              S.events.push({t:'loot',id:p.id,text:'神龛赐福 · 深水重炮 + 穿甲'});}
          }
          S.events.push({t:'poiGone',id:q.id,x:q.x,z:q.z,kind:q.type});
        }
      }else if(p.digId===q.id)p.dig=Math.max(0,(p.dig||0)-dt*.8);
    }
  }
}
export function startRandomEvent(){
  const type=EVENT_KEYS[Math.floor(Math.random()*EVENT_KEYS.length)];
  const p=S.players[Math.floor(Math.random()*S.players.length)]||S.players[0];
  const a=Math.random()*6.28,rad=24+Math.random()*22;
  const x=clamp(p.x+Math.cos(a)*rad,-ARENA+14,ARENA-14);
  const z=clamp(p.z+Math.sin(a)*rad,-ARENA+14,ARENA-14);
  S.event={id:S.nextId++,type,x,z,timeLeft:26,elapsed:0,strike:0,cx:0,cz:0};
  S.eventTimer=38+Math.random()*20;
  S.events.push({t:'eventStart',type,x,z,name:EVENT_INFO[type].name,desc:EVENT_INFO[type].desc});
  if(type==='treasure'){
    for(let i=0;i<9;i++){
      const ang=Math.random()*6.28,rr=Math.random()*28;
      const qx=clamp(x+Math.cos(ang)*rr,-ARENA+8,ARENA-8),qz=clamp(z+Math.sin(ang)*rr,-ARENA+8,ARENA-8);
      S.pois.push({id:S.nextId++,type:'cache',x:qx,z:qz,cell:cellOf(qx,qz),
        found:false,revealed:true,spin:Math.random()*6.28});
    }
  }else if(type==='swarm'){
    for(let i=0;i<11;i++){
      const m=spawnMonster(i%4===0?'brute':(i%3===0?'spitter':'reef'),
        x+(Math.random()-.5)*22,z+(Math.random()-.5)*22);
      if(m)m.bonus=true;
    }
  }else if(type==='current'){
    const dir=Math.random()*6.28;S.event.cx=Math.cos(dir)*4.6;S.event.cz=Math.sin(dir)*4.6;
  }else if(type==='reveal')S.revealT=26;
}
export function endEvent(){
  const e=S.event;if(!e)return;
  for(const p of S.players){p.curX=0;p.curZ=0;}
  S.revealT=0;
  S.events.push({t:'eventEnd',type:e.type,name:EVENT_INFO[e.type].name});
  S.event=null;
}
export function updateEvent(dt){
  if(!S.event){
    S.eventTimer-=dt;
    if(S.eventTimer<=0)startRandomEvent();
    return;
  }
  const e=S.event;e.elapsed+=dt;e.timeLeft-=dt;
  if(e.type==='current')for(const p of S.players){p.curX=e.cx;p.curZ=e.cz;}
  if(e.type==='storm'||e.type==='meteor'){
    e.strike+=dt;
    if(e.strike>2.0){
      e.strike=0;
      const tp=S.players[Math.floor(Math.random()*S.players.length)]||S.players[0];
      const sx=clamp(tp.x+(Math.random()-.5)*18,-ARENA+5,ARENA-5);
      const sz=clamp(tp.z+(Math.random()-.5)*18,-ARENA+5,ARENA-5);
      S.events.push({t:'strike',x:sx,z:sz,r:5.5,type:e.type});
      for(const p of S.players)if(!p.downed&&hypot(p.x-sx,p.z-sz)<5.5)hurtPlayer(p,1,'雷击');
      for(let i=0;i<3;i++)pushPickup('coin',sx,sz,16);
    }
  }
  if(e.type==='bloom'){
    for(const p of S.players){
      if(p.downed)continue;
      let near=false;
      for(const t of THORNS)if(hypot(p.x-t.x,p.z-t.z)<t.r+7){near=true;break;}
      if(near){p.healT=(p.healT||0)+dt;if(p.healT>2.4){p.healT=0;
        p.hearts=Math.min(p.maxHearts,p.hearts+1);
        S.events.push({t:'loot',id:p.id,text:'荆棘花蜜 · +1 ♥'});}}
    }
  }
  if(e.timeLeft<=0)endEvent();
}
export function updateBuffs(dt){
  for(const p of S.players){
    if(p.powerT>0){p.powerT-=dt;if(p.powerT<=0)p.power=1;}
    if(p.thrustT>0){p.thrustT-=dt;if(p.thrustT<=0)p.thrust=1;}
  }
  S.revealT=Math.max(0,S.revealT-dt);
}
export function simulateHost(dt){
  if(S.phase!=='playing')return;
  S.tick++;S.gameTime+=dt;
  S.wave=1+Math.floor(S.gameTime/24);
  const inputs=hostInputs();
  for(let i=0;i<S.players.length;i++)
    S.acks[i]=i===0?S.tick:(S.remoteInputs[i]?.tick||0);
  for(const p of S.players){
    const shot=stepPlayerMotion(p,inputs[p.id],dt);
    if(shot)spawnBullets(p,shot);
  }
  // 救援：任意未倒地队友靠近并按住 E 都可扶起
  for(const p of S.players){
    if(!p.downed)continue;
    let near=false;
    for(const q of S.players){
      if(q===p||q.downed||q.dead)continue;
      if(inputs[q.id]&&inputs[q.id].revive&&hypot(q.x-p.x,q.z-p.z)<3.8){near=true;break;}
    }
    p.revive=clamp(p.revive+(near?dt:-dt*.7),0,2.5);
    if(p.revive>=2.5){p.downed=false;p.revive=0;p.hearts=Math.min(p.maxHearts,2);p.invuln=1.5;
      S.events.push({t:'revive',id:p.id,x:p.x,z:p.z});}
  }
  const down=S.players.filter(p=>p.downed).length;
  S.bothDown=down===S.players.length?S.bothDown+dt:0;
  if(S.bothDown>3){S.phase='defeat';S.events.push({t:'defeat'});}

  // 探索 / 隐藏点 / 拾取 / 增益 / 随机事件
  updateBuffs(dt);
  updateExploration();
  updatePOIs(dt,inputs);
  updatePickups(dt);
  updateEvent(dt);
  updateMerchant(dt);
  // 刷怪
  if(!S.boss){
    S.spawnTimer-=dt;
    if(S.spawnTimer<=0){
      const count=1+Math.floor(S.wave/4);
      for(let i=0;i<count;i++)spawnWaveMonster();
      S.spawnTimer=Math.max(.62,2.15-S.wave*.10);
    }
  }
  if(!S.boss&&!S.bossDead&&S.gameTime>=BOSS_TIME)summonBoss(false);

  // 子弹
  for(let i=S.bullets.length-1;i>=0;i--){
    const b=S.bullets[i];b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;
    if(b.life<=0||hypot(b.x,b.z)>ARENA+10){S.bullets.splice(i,1);continue;}
    let hit=false;
    if(b.team==='p'){
      for(const m of S.monsters){
        if(m.dead||b.hit.includes(m.id))continue;
        if(hypot(m.x-b.x,m.z-b.z)<m.r+b.r){hit=true;b.hit.push(m.id);damageMonster(m,b.dmg,S.players[b.owner]);if(!b.aoe&&b.pierce<=0)break;}
      }
      if(S.boss&&!S.boss.dead&&hypot(S.boss.x-b.x,S.boss.z-b.z)<S.boss.r+b.r&&!b.hit.includes(S.boss.id)){
        hit=true;b.hit.push(S.boss.id);S.boss.hp-=b.dmg;S.events.push({t:'hit',x:b.x,z:b.z,color:0xff8c5a});
      }
      if(hit&&b.aoe){
        for(const m of S.monsters)if(!m.dead&&hypot(m.x-b.x,m.z-b.z)<b.aoe)damageMonster(m,b.dmg*.55,S.players[b.owner]);
        S.events.push({t:'boom',x:b.x,z:b.z,r:b.aoe});S.bullets.splice(i,1);continue;
      }
      if(hit){ if(b.pierce>0)b.pierce--; else {S.bullets.splice(i,1);continue;} }
    }else{
      for(const p of S.players){
        if(p.downed||p.invuln>0)continue;
        if(hypot(p.x-b.x,p.z-b.z)<1.0+b.r){hurtPlayer(p,1,'远程');S.bullets.splice(i,1);hit=true;break;}
      }
      if(hit)continue;
    }
  }
  S.monsters=S.monsters.filter(m=>!m.dead);

  // 怪物 AI
  for(const m of S.monsters){
    const def=MON[m.type];
    let target=null,best=1e9;
    for(const p of S.players){if(p.downed||p.dead)continue;const d=hypot(p.x-m.x,p.z-m.z);if(d<best){best=d;target=p;}}
    if(!target)continue;
    const dx=target.x-m.x,dz=target.z-m.z,d=dx*dx+dz*dz||1;
    // 轻微分离
    let sx=0,sz=0;
    for(const o of S.monsters){if(o===m)continue;const ox=m.x-o.x,oz=m.z-o.z,od=hypot(ox,oz);
      if(od<.01||od>m.r+o.r+1)continue;sx+=ox/(od*od);sz+=oz/(od*od);}
    const spd=def.speed*(m.type==='brute'?.9+S.wave*.01:1);
    m.vx=(dx/Math.sqrt(d))*spd+sx*.9;m.vz=(dz/Math.sqrt(d))*spd+sz*.9;
    if(m.type==='spitter'&&best<14){
      m.vx*=.28;m.vz*=.28;m.cd-=dt;
      if(m.cd<=0){m.cd=2.4;const a=Math.atan2(dz,dx);
        enemyBullet(m.x,m.z,Math.cos(a)*9.5,Math.sin(a)*9.5,1,2.4,.42);
        S.events.push({t:'spit',x:m.x,z:m.z});}
    }
    m.x+=m.vx*dt;m.z+=m.vz*dt;
    m.angle=Math.atan2(m.vx,m.vz);
    // 荆棘阻挡怪物
    for(const t of THORNS){const ox=m.x-t.x,oz=m.z-t.z,dd=hypot(ox,oz);
      if(dd<t.r+m.r){m.x=t.x+ox/(dd||1)*(t.r+m.r);m.z=t.z+oz/(dd||1)*(t.r+m.r);}}
    if(best<def.r+1.0)hurtPlayer(target,def.dmg,'近身');
  }
  // 荆棘伤害玩家（「荆棘开花」事件期间停火）
  const bloom=S.event&&S.event.type==='bloom';
  for(const p of S.players){
    if(p.downed||bloom)continue;
    for(const t of THORNS){const d=hypot(p.x-t.x,p.z-t.z);
      if(d<t.r+1.05){hurtPlayer(p,1,'荆棘');const nx=(p.x-t.x)/(d||1),nz=(p.z-t.z)/(d||1);
        p.x=t.x+nx*(t.r+1.1);p.z=t.z+nz*(t.r+1.1);p.vx+=nx*2;p.vz+=nz*2;break;}}
  }
  // 首领
  if(S.boss&&!S.boss.dead){
    const b=S.boss;b.t+=dt;
    let tx=0,tz=0,n=0;for(const p of S.players){tx+=p.x;tz+=p.z;n++;}tx/=n;tz/=n;
    const a=Math.atan2(tx-b.x,tz-b.z);
    const spd=b.phase===2?1.7:1.15;
    b.vx=Math.sin(a)*spd;b.vz=Math.cos(a)*spd;b.x+=b.vx*dt;b.z+=b.vz*dt;b.angle=a;
    if(b.hp<b.maxHp*.5)b.phase=2;
    const rate=b.phase===2?.68:1;
    b.ring-=dt;b.summon-=dt;b.slam-=dt;
    if(b.ring<=0){b.ring=3.6*rate;const cnt=b.phase===2?18:12;
      for(let i=0;i<cnt;i++){const ang=i/cnt*Math.PI*2+b.t*.4;
        enemyBullet(b.x,b.z,Math.sin(ang)*10,Math.cos(ang)*10,1,4,.5);}
      S.events.push({t:'ring',x:b.x,z:b.z});}
    if(b.summon<=0){b.summon=9*rate;for(let i=0;i<3;i++)
      spawnMonster(i===2?'spitter':'reef',b.x+(Math.random()-.5)*10,b.z+(Math.random()-.5)*10);}
    if(b.slam<=0){b.slam=7*rate;S.events.push({t:'slam',x:b.x,z:b.z,r:10});
      for(const p of S.players)if(!p.downed&&hypot(p.x-b.x,p.z-b.z)<10)hurtPlayer(p,1,'冲击波');}
    if(b.hp<=0){b.dead=true;S.bossDead=true;S.phase='victory';S.events.push({t:'victory',x:b.x,z:b.z});}
  }
  // 事件：主机本地立即播放一次，同时转存给客户端快照
  if(S.events.length){
    handleEvents(S.events);
    S.pendingEvents.push(...S.events);
    S.events=[];
  }
}

