/* world.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { scene } from './scene.js';
import { decoRnd, mulberry32, inArena, cellOf, hypot } from './core.js';
import { GRID, CELL, HALF, ARENA } from './config.js';
import { P, modelGroup, gridGeo, roundedBox, tubeGeo, latheGeo, deform, leafGeo, shade, basic, spriteGlow } from './pipeline.js';

/* ============ 大世界：按 seed 重建 320m 航区 ============ */
export const worldRoot=new THREE.Group();scene.add(worldRoot);

export function makeIsland(r,withLighthouse){
  const g=new THREE.Group();
  const sand=deform(new THREE.SphereGeometry(r,30,16),v=>{
    const k=1+.05*Math.sin(v.x*.7+v.z*.5)+.04*Math.cos(v.z*.9-v.x*.3);
    v.x*=k;v.z*=k;v.y*=.20;v.y+=.16*Math.max(0,1-Math.hypot(v.x,v.z)/(r*.75));
  });
  const mound=new THREE.Mesh(sand,basic(0xefd6a2,{flatShading:true}));mound.position.y=-.72;g.add(mound);
  const wet=new THREE.Mesh(new THREE.CylinderGeometry(r*.94,r*1.02,.22,32),basic(0xd9b987));
  wet.position.y=-.35;g.add(wet);
  const green=deform(new THREE.SphereGeometry(r*.6,22,10),v=>{v.y*=.13;});
  const grass=new THREE.Mesh(green,basic(0x63a367,{flatShading:true}));grass.position.y=1.05;g.add(grass);
  g.add(modelGroup(rockCluster(6,r*.75,-.1),[],{rough:.95,flat:true}));
  const n=Math.max(2,Math.round(r*.55));
  for(let i=0;i<n;i++){
    const a=decoRnd()*6.28,rr=decoRnd()*r*.55;
    g.add(palm(Math.cos(a)*rr,Math.sin(a)*rr,.55+decoRnd()*.4));
  }
  if(withLighthouse){const lh=lighthouse();lh.position.set(r*.15,0,-r*.1);lh.rotation.y=decoRnd()*6.28;g.add(lh);}
  const foam=new THREE.Mesh(new THREE.RingGeometry(r+1.0,r+2.4,48),
    new THREE.MeshBasicMaterial({color:0xfff4de,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}));
  foam.rotation.x=-Math.PI/2;foam.position.y=.06;g.add(foam);
  return g;
}
export function buildIslands(){
  OBSTACLES.length=0;
  const spots=[],count=8+Math.floor(decoRnd()*3);
  for(let i=0;i<count;i++){
    let x,z,r,t=0;
    do{const a=decoRnd()*6.28,rad=32+decoRnd()*108;
       x=Math.cos(a)*rad;z=Math.sin(a)*rad;r=5.5+decoRnd()*10.5;t++;}
    while(t<50&&(!inArena(x,z,r+9)||hypot(x,z)<28||spots.some(s=>hypot(x-s.x,z-s.z)<s.r+r+24)));
    spots.push({x,z,r});OBSTACLES.push({x,z,r});
    const isle=makeIsland(r,i===0);
    isle.position.set(x,0,z);isle.rotation.y=decoRnd()*6.28;worldRoot.add(isle);
  }
  // 散落暗礁：小型不可通行障碍，让航行有绕行感
  for(let i=0;i<13;i++){
    let x,z,r,t=0;
    do{const a=decoRnd()*6.28,rad=28+decoRnd()*115;
       x=Math.cos(a)*rad;z=Math.sin(a)*rad;r=2.5+decoRnd()*2.8;t++;}
    while(t<40&&(!inArena(x,z,r+5)||hypot(x,z)<24||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+r+9)));
    OBSTACLES.push({x,z,r});
    const rg=new THREE.Group();
    const rm=deform(new THREE.SphereGeometry(r,16,9),v=>{v.y*=.5;});
    const rmMesh=new THREE.Mesh(rm,basic(0xc9ad82,{flatShading:true}));rmMesh.position.y=-.72;rg.add(rmMesh);
    rg.add(modelGroup(rockCluster(4,r*.6,.15),[],{rough:.95,flat:true}));
    const rf=new THREE.Mesh(new THREE.RingGeometry(r+.4,r+1.4,28),
      new THREE.MeshBasicMaterial({color:0xfff4de,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));
    rf.rotation.x=-Math.PI/2;rf.position.y=.06;rg.add(rf);
    rg.position.set(x,0,z);worldRoot.add(rg);
  }
}
export function buildThornMesh(r){
  const D=0x35283f,p=[],gl=[];
  for(let k=0;k<4;k++){const a0=k/4*6.28;
    p.push(P(tubeGeo([[Math.cos(a0)*r*.7,-2.35,Math.sin(a0)*r*.7],
      [Math.cos(a0+.8)*r*.9,-2.12,Math.sin(a0+.8)*r*.9],
      [Math.cos(a0+1.7)*r*.6,-1.95,Math.sin(a0+1.7)*r*.6]],.13,7),shade(D,k%2?1.25:.85)));}
  p.push(P(deform(new THREE.SphereGeometry(1,12,8),v=>{v.y*=.35;}),shade(D,.72),
    [0,-2.30,0],[0,0,0],[r*.9,1,r*.9]));
  for(let k=0;k<8;k++){
    const a=k/8*6.28+decoRnd()*.3,h=1.8+decoRnd()*2.2,rr=decoRnd()*r*.65;
    const bx=Math.cos(a)*rr,bz=Math.sin(a)*rr,tx=bx+Math.cos(a)*.5,tz=bz+Math.sin(a)*.5;
    p.push(P(tubeGeo([[bx,-2.2,bz],[bx+Math.cos(a)*.35,-2.2+h*.45,bz+Math.sin(a)*.35],
      [tx*.85+bx*.15,-2.2+h*.8,tz*.85+bz*.15],[tx,-2.2+h,tz]],.105,7),shade(D,1.05)));
    p.push(P(new THREE.ConeGeometry(.115,.52,6),shade(D,1.4),
      [tx,-2.2+h+.18,tz],[Math.cos(a)*.25,0,-Math.sin(a)*.25]));
    gl.push(P(new THREE.SphereGeometry(.055,6,5),0xff4d6d,[tx,-2.2+h+.42,tz]));
  }
  gl.push(P(new THREE.SphereGeometry(.26,10,8),0xd83a5e,[0,-1.95,0]));
  const g=modelGroup(p,gl,{rough:.78,side:THREE.DoubleSide,outline:0x1d1226,ow:.02});
  const ring=new THREE.Mesh(new THREE.RingGeometry(r+.15,r+.42,28),
    new THREE.MeshBasicMaterial({color:0xff5a72,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=-2.35;g.add(ring);
  return g;
}

// 珊瑚 / 海草 / 荆棘 / 鱼群 / 浮标
export const grassData=[],fishData=[];
export function coralParts(kind,col){
  const p=[],gl=[];
  if(kind===0){ // 鹿角珊瑚：递归分叉的管状枝
    const grow=(base,dir,len,r,depth)=>{
      const end=[base[0]+dir[0]*len,base[1]+dir[1]*len,base[2]+dir[2]*len];
      const mid=[(base[0]+end[0])/2+(decoRnd()-.5)*.16,(base[1]+end[1])/2,
                 (base[2]+end[2])/2+(decoRnd()-.5)*.16];
      p.push(P(tubeGeo([base,mid,end],r,6),depth>1?shade(col,.86):col));
      p.push(P(new THREE.SphereGeometry(r*1.2,7,5),shade(col,1.18),end));
      if(depth>0)for(let i=0;i<2+(decoRnd()>.6?1:0);i++){
        const a=decoRnd()*6.28,sp=.45+decoRnd()*.5;
        grow(end,[Math.cos(a)*sp,.72+decoRnd()*.4,Math.sin(a)*sp],
          len*(.60+decoRnd()*.16),r*.68,depth-1);
      }
    };
    for(let i=0;i<3;i++){const a=i/3*6.28;
      grow([Math.cos(a)*.28,-2.15,Math.sin(a)*.28],[Math.cos(a)*.42,1,Math.sin(a)*.42],
        .82+decoRnd()*.32,.14,1);}
    p.push(P(new THREE.SphereGeometry(.62,10,7),shade(col,.62),[0,-2.24,0],[0,0,0],[1,.4,1]));
  }else if(kind===1){ // 脑珊瑚：沟回表面
    p.push(P(deform(new THREE.SphereGeometry(1,20,14),v=>{
      const k=1+.085*Math.sin(v.x*7+v.z*5)*Math.cos(v.y*6);v.multiplyScalar(k);v.y*=.66;
    }),col,[0,-1.85,0],[0,0,0],[1.05,1,1.05]));
    for(let i=0;i<12;i++){const a=i/12*6.28;
      p.push(P(tubeGeo([[Math.cos(a)*.12,-1.18,Math.sin(a)*.12],
        [Math.cos(a)*.52,-1.52,Math.sin(a)*.52],
        [Math.cos(a)*.86,-1.94,Math.sin(a)*.86]],.032,5),shade(col,.70)));}
    gl.push(P(new THREE.SphereGeometry(.10,8,6),shade(col,1.4),[0,-1.15,0]));
  }else{ // 管状海绵 + 海葵触手
    for(let i=0;i<5;i++){
      const a=i/5*6.28,rr=.20+decoRnd()*.45,h=.9+decoRnd()*1.3;
      const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      p.push(P(latheGeo([[.15,0],[.20,h*.35],[.17,h*.8],[.22,h],[.20,h+.06],[.11,h+.02]],12),col,[x,-2.2,z]));
      gl.push(P(new THREE.TorusGeometry(.17,.028,5,12),shade(col,1.4),[x,-2.2+h,z],[Math.PI/2,0,0]));
    }
    for(let i=0;i<14;i++){const a=i/14*6.28;
      p.push(P(tubeGeo([[Math.cos(a)*.25,-2.15,Math.sin(a)*.25],
        [Math.cos(a)*.48,-1.75,Math.sin(a)*.48],
        [Math.cos(a)*.66,-1.48,Math.sin(a)*.66]],.028,5),shade(col,.9)));}
    p.push(P(new THREE.SphereGeometry(.55,10,7),shade(col,.65),[0,-2.25,0],[0,0,0],[1,.35,1]));
  }
  return {parts:p,glow:gl};
}
export function biomeDecor(bi){
  const p=[],gl=[];
  if(bi==='wreck'){
    p.push(P(roundedBox(3.6,.55,1.6,.16,2),0x6b4a32,[0,-1.65,0],[0,.35,.10]));
    p.push(P(new THREE.CylinderGeometry(.09,.13,3.4,7),0x5b3f2b,[.7,-.15,.4],[0,0,.62]));
    p.push(P(roundedBox(2.4,.20,1.1,.06,2),0x8a6440,[-.8,-1.25,.9],[0,-.4,.3]));
    p.push(P(new THREE.TorusGeometry(.7,.08,6,14),0x7a6a58,[1.5,-1.2,-.5],[0,Math.PI/2,0]));
    gl.push(P(new THREE.SphereGeometry(.16,8,6),0x8fe3d0,[.2,-1.3,.8]));
  }else if(bi==='vent'){
    p.push(P(latheGeo([[.9,0],[.7,.5],[.45,1.1],[.55,1.5],[.3,1.65]],12),0x6b4038,[0,-2.2,0]));
    p.push(P(new THREE.TorusGeometry(.35,.09,6,12),0x9a5a42,[0,-.55,0],[Math.PI/2,0,0]));
    gl.push(P(new THREE.SphereGeometry(.22,8,6),0xff9a5a,[0,-.6,0]));
    for(let i=0;i<5;i++){const a=i/5*6.28;
      gl.push(P(new THREE.SphereGeometry(.08,6,5),0xffc08a,[Math.cos(a)*.4,-.1+i*.28,Math.sin(a)*.4]));}
  }else if(bi==='trench'){
    const g=new THREE.Group();
    const dark=new THREE.Mesh(new THREE.CircleGeometry(7,28),
      new THREE.MeshBasicMaterial({color:0x0c2434,transparent:true,opacity:.55,depthWrite:false}));
    dark.rotation.x=-Math.PI/2;dark.position.y=-2.45;g.add(dark);
    g.add(modelGroup(rockCluster(4,4,-1.9),[],{rough:.95,flat:true}));
    return g;
  }else if(bi==='kelp'){
    for(let i=0;i<5;i++){const a=i/5*6.28,rr=1+decoRnd()*2.4;
      p.push(P(tubeGeo([[Math.cos(a)*rr,-2.3,Math.sin(a)*rr],
        [Math.cos(a)*rr+.4,-.8,Math.sin(a)*rr+.2],
        [Math.cos(a)*rr+.7,.6,Math.sin(a)*rr+.5]],.09,6),i%2?0x3f8f6a:0x57b184));}
  }else if(bi==='coral'||bi==='shoal'){
    const cols=bi==='coral'?[0xff8f8f,0xffb06b,0xd783c8,0xff7f9e]:[0x8fd7c6,0xffd277,0x9fe3d8];
    const cp=coralParts(bi==='coral'?Math.floor(decoRnd()*2):2,cols[Math.floor(decoRnd()*cols.length)]);
    const g=modelGroup(cp.parts,cp.glow,{rough:.72,side:THREE.DoubleSide});
    g.scale.setScalar(.8+decoRnd()*.6);return g;
  }else if(bi==='thorn'){
    const g=buildThornMesh(1.2+decoRnd()*.7);g.scale.setScalar(.8);return g;
  }else{
    p.push(P(roundedBox(2.2,.5,1.4,.16,2),0xd9b987,[0,-2.05,0]));
    p.push(P(new THREE.SphereGeometry(.8,10,8),0x63a367,[.5,-1.7,.3],[0,0,0],[1,.5,1]));
    for(let i=0;i<3;i++)p.push(P(new THREE.SphereGeometry(.12,6,5),0xffd08a,
      [(decoRnd()-.5)*1.6,-1.6,(decoRnd()-.5)*1.2]));
  }
  return modelGroup(p,gl,{rough:.8,side:THREE.DoubleSide});
}
export function buildCellDecor(){
  for(let ci=0;ci<GRID*GRID;ci++){
    const c=cellCenter(ci),bi=WORLD.cells[ci].biome;
    const n=bi==='kelp'||bi==='coral'?3:2;
    for(let k=0;k<n;k++){
      const x=c.x+(decoRnd()-.5)*CELL*.86,z=c.z+(decoRnd()-.5)*CELL*.86;
      if(!inArena(x,z,5)||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+5))continue;
      const g=biomeDecor(bi);g.position.set(x,0,z);g.rotation.y=decoRnd()*6.28;
      worldRoot.add(g);
    }
  }
}
export function buildThorns(){
  for(let i=0;i<30;i++){
    let x,z,r,t=0;
    do{const a=decoRnd()*6.28,rad=26+decoRnd()*116;
       x=Math.cos(a)*rad;z=Math.sin(a)*rad;r=1.6+decoRnd()*1.3;t++;}
    while(t<45&&(!inArena(x,z,r+6)||hypot(x,z)<25||OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+r+5)));
    THORNS.push({x,z,r});
    const g=buildThornMesh(r);g.position.set(x,0,z);worldRoot.add(g);
  }
}
export function buildGrass(){
  const bladeGeo=gridGeo(7,2,(t,u)=>{const s=u*2-1;
    return [s*(.115*Math.sin(Math.PI*t)+.012),t*2.5,.09*Math.sin(t*3)*t];});
  const gm=new THREE.InstancedMesh(bladeGeo,
    new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.9}),560);
  for(let i=0;i<560;i++){
    let x,z,t=0;
    do{const a=decoRnd()*6.28,rad=Math.sqrt(decoRnd())*(ARENA-6);
       x=Math.cos(a)*rad;z=Math.sin(a)*rad;t++;}
    while(t<14&&OBSTACLES.some(o=>hypot(x-o.x,z-o.z)<o.r+2));
    const ci=cellOf(x,z),bi=ci>=0?WORLD.cells[ci].biome:'shoal';
    grassData.push({x,z,s:bi==='kelp'?1.1+decoRnd()*1.2:.5+decoRnd()*.9,
      rot:decoRnd()*6.28,ph:decoRnd()*6.28});
    gm.setColorAt(i,new THREE.Color().setHSL(.32+decoRnd()*.11,.42,.30+decoRnd()*.22));
  }
  gm.instanceColor.needsUpdate=true;
  gm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);worldRoot.add(gm);window.__grass=gm;
}
export function buildFish(){
  const fp=[];
  fp.push(P(deform(new THREE.SphereGeometry(1,14,10),v=>{v.x*=.155;v.y*=.125;v.z*=.42;}),0xffffff));
  fp.push(P(gridGeo(3,2,(t,u)=>{const s=u*2-1;return [s*.018,s*.19*(.45+t),-.36-t*.34];}),0xffeccd));
  fp.push(P(gridGeo(3,2,(t,u)=>{const s=u*2-1;return [s*.012,.11+t*.17,-.14-s*.20];}),0xffdfa8));
  for(const s of [-1,1])fp.push(P(gridGeo(2,2,(t,u)=>{const q=u*2-1;
    return [s*(.11+t*.13),-.03-q*.05,-.02-q*.15-t*.10];}),0xffdca0));
  for(const s of [-1,1])fp.push(P(new THREE.SphereGeometry(.030,7,5),0x2b2320,[s*.115,.045,.25]));
  const fishGeo=mergeParts(fp);
  for(let s=0;s<6;s++){
    const a=decoRnd()*6.28,rad=25+decoRnd()*108,cx=Math.cos(a)*rad,cz=Math.sin(a)*rad;
    for(let i=0;i<22;i++)fishData.push({cx,cz,a:decoRnd()*6.28,r:2+decoRnd()*6,
      sp:(s%2?1:-1)*(.45+decoRnd()*.3),y:-.9-decoRnd()*.9,ph:decoRnd()*6.28,s:.7+decoRnd()*.6});
  }
  const fm=new THREE.InstancedMesh(fishGeo,
    new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.55,metalness:.12}),fishData.length);
  const cols=[0xffd98a,0x9fe3d8,0xffa9a0,0xc7b3ff,0xffe0a0,0x8fd7c6];
  for(let i=0;i<fishData.length;i++)fm.setColorAt(i,new THREE.Color(cols[Math.floor(i/22)]));
  fm.instanceColor.needsUpdate=true;
  fm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);worldRoot.add(fm);window.__fish=fm;
}
export function buildBuoys(){
  const bp=[
    P(latheGeo([[.34,0],[.42,.18],[.38,.52],[.20,.62],[.10,.66]],10),0xf4e3c2,[0,-.30,0]),
    P(new THREE.CylinderGeometry(.045,.045,.9,6),0x6b4c34,[0,.45,0]),
    P(new THREE.SphereGeometry(.20,9,7),0xffd08a,[0,.95,0]),
    P(new THREE.TorusGeometry(.36,.05,6,12),0xff8f6b,[0,-.02,0],[Math.PI/2,0,0])
  ];
  const bm=new THREE.InstancedMesh(mergeParts(bp),
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide}),72);
  const d0=new THREE.Object3D();
  for(let i=0;i<72;i++){const a=i/72*6.28;
    d0.position.set(Math.cos(a)*ARENA,.18,Math.sin(a)*ARENA);
    d0.rotation.set(0,a,0);d0.scale.setScalar(.9+decoRnd()*.35);d0.updateMatrix();bm.setMatrixAt(i,d0.matrix);}
  bm.instanceMatrix.needsUpdate=true;worldRoot.add(bm);
}
export function disposeWorld(){
  for(const o of worldRoot.children)o.traverse(n=>{
    if(n.geometry&&n.geometry.dispose)n.geometry.dispose();
    if(n.material){const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms)if(m.dispose)m.dispose();}
  });
  worldRoot.clear();
}
export function buildWorld(seed){
  disposeWorld();
  WORLD.seed=seed;decoRnd=mulberry32(seed);
  THORNS.length=0;grassData.length=0;fishData.length=0;
  WORLD.cells=[];
  for(let i=0;i<GRID*GRID;i++)
    WORLD.cells.push({biome:BIOME_KEYS[Math.floor(decoRnd()*BIOME_KEYS.length)],danger:decoRnd()});
  const spawn=cellOf(0,0);if(spawn>=0)WORLD.cells[spawn].biome='shoal';
  buildIslands();buildThorns();buildCellDecor();buildGrass();buildFish();buildBuoys();
}
buildWorld(20261107);
export const dummy=new THREE.Object3D();

