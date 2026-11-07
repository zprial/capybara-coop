/* view.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { scene, camera, renderer } from './scene.js';
import { clamp, lerp, hypot } from './core.js';
import { SHOP_RANGE } from './config.js';
import { NET } from './net.js';
import { shake } from './fx.js';
import { grassData, fishData, dummy } from './world.js';
import { playerMeshes, ensurePlayerMeshes, monsterMeshes, makeMonsterMesh, poiMeshes, makePOIMesh, pickupMeshes, makePickupMesh, bulletMeshes, makeBulletMesh, merchantMesh, bossMesh } from './models.js';

export function interpArray(cur,prev,alpha){
  if(!cur)return[];
  if(!prev)return cur;
  const pm=new Map(prev.map(o=>[o.id,o]));
  return cur.map(c=>{
    const p=pm.get(c.id);if(!p)return c;
    const o={...c};
    for(const k of ['x','z','angle','hp','vx','vz'])if(typeof p[k]==='number'&&typeof c[k]==='number')o[k]=lerp(p[k],c[k],alpha);
    return o;
  });
}
export function viewState(){
  if(NET.role==='client'){
    if(!NET.lastSnap)return S;
    const a=clamp((performance.now()-NET.snapAt)/50,0,1);
    const L=NET.lastSnap,P=NET.prevSnap;
    return {
      ...L,
      players:interpArray(L.players,P?P.players:null,a),
      monsters:interpArray(L.monsters,P?P.monsters:null,a),
      bullets:interpArray(L.bullets,P?P.bullets:null,a),
      boss:L.boss
    };
  }
  return S;
}
export function syncEntities(V,dt,now){
  // 玩家（席位数量随房间人数变化）
  const np=(V.players||[]).length;
  ensurePlayerMeshes(np);
  for(let i=0;i<np;i++){
    const g=playerMeshes[i];
    let x,z,aim,vx,vz,downed,revive,weapon;
    if(NET.role==='client'&&i===NET.clientId&&NET.pred){
      x=NET.pred.x;z=NET.pred.z;aim=NET.pred.aim;vx=NET.pred.vx;vz=NET.pred.vz;
      const vp=V.players[i]||{};downed=vp.downed;revive=vp.revive;weapon=vp.weapon;
      g.position.x=lerp(g.position.x,x,1-Math.exp(-18*dt));
      g.position.z=lerp(g.position.z,z,1-Math.exp(-18*dt));
    }else{
      const p=V.players[i];if(!p)continue;
      x=p.x;z=p.z;aim=p.aim;vx=p.vx;vz=p.vz;downed=p.downed;revive=p.revive;weapon=p.weapon;
      g.position.x=lerp(g.position.x,x,1-Math.exp(-16*dt));
      g.position.z=lerp(g.position.z,z,1-Math.exp(-16*dt));
    }
    g.position.y=.10+Math.sin(now*1.9+i)*.06;
    g.rotation.y=lerp(g.rotation.y,aim,1-Math.exp(-13*dt));
    g.rotation.z=Math.sin(now*1.3+i)*.035;
    const sp=hypot(vx,vz);
    g.userData.wake.material.opacity=clamp(sp*.028,0,.30);
    g.userData.wake.scale.set(1,1,clamp(sp*.12,.5,1.8));
    g.userData.ring.material.opacity=downed?.25:.85;
    g.userData.downGlow.material.opacity=downed?.55+Math.sin(now*5)*.2:0;
    g.userData.downGlow.scale.setScalar(downed?3.4:1);
    const fl=g.userData.flash;
    fl.material.opacity=Math.max(0,fl.material.opacity-dt*9);
    const muzzleScale=weapon==='cannon'?1.5:1;fl.scale.set(1.8*muzzleScale,1.8*muzzleScale,1);
    g.userData.revive=revive;
  }
  // 怪物
  const seen=new Set();
  const mlist=V.monsters||[];
  for(const m of mlist){
    seen.add(m.id);
    let g=monsterMeshes.get(m.id);
    if(!g){g=makeMonsterMesh(m.type);scene.add(g);monsterMeshes.set(m.id,g);}
    g.position.set(m.x,.15+Math.sin(now*2+m.id)*.10,m.z);
    g.rotation.y=m.angle||0;
    const f=clamp((m.hp||0)/(m.maxHp||1),0,1);
    g.userData.barFill.scale.x=Math.max(.001,f);
    g.userData.barFill.position.x=-(1-f)*.78;
    g.userData.bar.quaternion.copy(camera.quaternion);
  }
  for(const [id,g] of monsterMeshes)if(!seen.has(id)){scene.remove(g);monsterMeshes.delete(id);}
  // 子弹
  const bseen=new Set();
  for(const b of (V.bullets||[])){
    bseen.add(b.id);let g=bulletMeshes.get(b.id);
    if(!g){g=makeBulletMesh(b);bulletMeshes.set(b.id,g);}
    g.position.set(b.x,.55,b.z);
    g.rotation.y=Math.atan2(b.vx,b.vz);
    g.children[0].scale.set(1,1,clamp(hypot(b.vx,b.vz)*.035,1,2.4));
  }
  for(const [id,g] of bulletMeshes)if(!bseen.has(id)){scene.remove(g);bulletMeshes.delete(id);}
  // 兴趣点：只有已探索格（或海雾散去）才显露，未知海域保持神秘
  const poiSeen=new Set(),showAll=!!(V.revealT>0);
  for(const q of (V.pois||[])){
    const ci=q.cell>=0?q.cell:cellOf(q.x,q.z);
    const visible=showAll||(ci>=0&&V.explored&&V.explored[ci])||q.revealed&&ci>=0&&V.explored&&V.explored[ci];
    if(!visible)continue;
    poiSeen.add(q.id);
    let g=poiMeshes.get(q.id);
    if(!g){g=makePOIMesh(q);scene.add(g);poiMeshes.set(q.id,g);}
    g.position.set(q.x,.1+Math.sin(now*1.3+q.spin)*.12,q.z);
    g.rotation.y=now*.35+q.spin;
    if(g.userData.halo)g.userData.halo.material.opacity=.4+Math.sin(now*2.5+q.spin)*.2;
  }
  for(const [id,g] of poiMeshes)if(!poiSeen.has(id)){scene.remove(g);poiMeshes.delete(id);}
  // 掉落物
  const pkSeen=new Set();
  for(const k of (V.pickups||[])){
    pkSeen.add(k.id);
    let g=pickupMeshes.get(k.id);
    if(!g){g=makePickupMesh(k);scene.add(g);pickupMeshes.set(k.id,g);}
    g.position.set(k.x,.1+Math.sin(now*2.6+k.id)*.16,k.z);
    g.rotation.y=now*1.6;
  }
  for(const [id,g] of pickupMeshes)if(!pkSeen.has(id)){scene.remove(g);pickupMeshes.delete(id);}
  // 商船
  const mer=V.merchant;
  merchantMesh.visible=!!mer&&mer.active;
  if(merchantMesh.visible){
    merchantMesh.position.set(mer.x,.1+Math.sin(now*.9)*.09,mer.z);
    merchantMesh.rotation.y=Math.sin(now*.35)*.06+.4;
  }
  // 首领
  const b=V.boss;
  bossMesh.visible=!!b&&!b.dead&&V.phase==='playing';
  if(bossMesh.visible){
    bossMesh.position.set(b.x,.2+Math.sin(now*1.1)*.18,b.z);
    bossMesh.rotation.y=b.angle||0;
    bossMesh.userData.tents.forEach((t,i)=>{
      t.userData.pivots.forEach((p,k)=>{
        p.rotation.z=(p.userData.base||0)+Math.sin(now*1.5+i*.8+k*.7)*(.18+k*.08);});
    });
  }
  // 准星
  window.__cross.position.set(mouseWorld.x,.32,mouseWorld.z);
  window.__cross.rotation.y=now*.5;
}
export function updateDecor(now){
  const gm=window.__grass;
  for(let i=0;i<grassData.length;i++){
    const d=grassData[i];
    dummy.position.set(d.x,-2.5,d.z);
    dummy.rotation.set(Math.sin(now*1.2+d.ph)*.14,d.rot,Math.cos(now*.9+d.ph)*.14);
    dummy.scale.set(d.s,d.s,d.s);dummy.updateMatrix();gm.setMatrixAt(i,dummy.matrix);
  }
  gm.instanceMatrix.needsUpdate=true;
  const fm=window.__fish;
  for(let i=0;i<fishData.length;i++){
    const f=fishData[i];f.a+=f.sp*.012;
    const x=f.cx+Math.cos(f.a)*f.r,z=f.cz+Math.sin(f.a)*f.r*.65;
    dummy.position.set(x,f.y+Math.sin(now*1.4+f.ph)*.18,z);
    dummy.rotation.set(0,-f.a+(f.sp>0?Math.PI/2:-Math.PI/2),Math.sin(now*3+f.ph)*.12);
    dummy.scale.setScalar(f.s);dummy.updateMatrix();fm.setMatrixAt(i,dummy.matrix);
  }
  fm.instanceMatrix.needsUpdate=true;
}
export function updateParticles(dt){
  for(const p of particles){
    if(!p.alive)continue;
    p.life-=dt;
    if(p.life<=0){p.alive=false;p.mesh.visible=false;continue;}
    p.vy-=9*dt;
    p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;
    if(p.mesh.position.y<.1){p.mesh.position.y=.1;p.vy*=-.3;p.vx*=.7;p.vz*=.7;}
    p.mesh.material.opacity=clamp(p.life/p.max,0,1);
  }
  for(let i=flashes.length-1;i>=0;i--){
    const f=flashes[i];f.life-=dt;
    if(f.life<=0){scene.remove(f.s);f.s.material.dispose();flashes.splice(i,1);continue;}
    const k=f.life/f.max;f.s.material.opacity=k;f.s.scale.setScalar(f.size*(1.6-k*.6));
  }
}
export function myView(V){
  if(NET.role==='client'&&NET.spectator)
    return (V.players&&V.players[0])||{x:0,z:0};
  const id=NET.role==='client'?NET.clientId:0;
  const p=(V.players&&V.players[id])||{x:0,z:0};
  if(NET.role==='client'&&NET.pred)return {...p,x:NET.pred.x,z:NET.pred.z,vx:NET.pred.vx,vz:NET.pred.vz};
  return p;
}
export let camFocus=new THREE.Vector3(0,0,0);
export function updateCamera(V,dt){
  const me=myView(V),list=V.players||[];
  let sx=0,sz=0,gap=0;
  for(const p of list){sx+=p.x;sz+=p.z;gap=Math.max(gap,hypot(p.x-me.x,p.z-me.z));}
  const n=list.length||1,cx=sx/n,cz=sz/n;
  // 默认把所有船一起框住；拉开太远时才逐渐偏向自己
  const bias=clamp((gap-18)/30,0,.45);
  let tx=lerp(cx,me.x,bias),tz=lerp(cz,me.z,bias);
  // 首领登场时把镜头拉开并一起框住巨兽，避免它躲进 HUD 面板后面
  const boss=V.boss&&!V.boss.dead?V.boss:null;
  if(boss){tx=lerp(tx,boss.x,.40);tz=lerp(tz,boss.z,.40);}
  camFocus.x=lerp(camFocus.x,tx,1-Math.exp(-4*dt));
  camFocus.z=lerp(camFocus.z,tz,1-Math.exp(-4*dt));
  const h=26+clamp(gap*.22,0,9)+(boss?7:0);
  const desired=new THREE.Vector3(camFocus.x,h,camFocus.z+h*.62);
  camera.position.lerp(desired,1-Math.exp(-3.2*dt));
  if(shake>0){
    camera.position.x+=(Math.random()-.5)*shake*.6;
    camera.position.y+=(Math.random()-.5)*shake*.4;
    shake=Math.max(0,shake-dt*2.2);
  }
  camera.lookAt(camFocus.x,0,camFocus.z-1.5);
}

