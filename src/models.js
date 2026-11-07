/* models.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { scene, spriteGlow, basic } from './scene.js';
import { MON, PCOLOR, POI_INFO } from './config.js';
import { P, modelGroup, gridGeo, roundedBox, tubeGeo, latheGeo, deform, leafGeo, shade, SHADOW_TEX } from './pipeline.js';

export function shadow(r,layers){
  const g=new THREE.Group(),n=layers||2;
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),
      new THREE.MeshBasicMaterial({map:SHADOW_TEX,transparent:true,opacity:i===0?.62:.26,
        depthWrite:false,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;m.position.y=.018+i*.008;m.scale.setScalar(1+i*.42);g.add(m);
  }
  return g;
}
/* 参数化船壳：外板 / 内板 / 船舷厚度 / 龙骨 / 翘起的船首 / 甲板木条 / 铆钉 */
export function hullParts(L,W,H,c){
  const p=[],keel=-H*.55,zOf=t=>-.5*L+t*L;
  const width=t=>W*(.82+.18*Math.sin(Math.PI*t))*(1-Math.pow(t,6))+.02*W;
  const top=t=>H*(1+.52*Math.pow(t,5));
  p.push(P(gridGeo(18,10,(t,u)=>{const s=u*2-1;
    return [s*width(t),keel+(top(t)-keel)*Math.pow(Math.abs(s),.60),zOf(t)];}),c.outer));
  p.push(P(gridGeo(18,10,(t,u)=>{const s=u*2-1;
    return [s*width(t)*.86,keel+.15+(top(t)-.12-(keel+.15))*Math.pow(Math.abs(s),.68),zOf(t)];}),c.inner));
  p.push(P(gridGeo(1,6,(t,u)=>{const s=u*2-1;
    return [s*width(0),keel+(top(0)-keel)*t,zOf(0)];}),c.stern));
  for(const side of [-1,1]){
    p.push(P(gridGeo(18,1,(t,u)=>{
      const o=[side*width(t),top(t),zOf(t)],i=[side*width(t)*.86,top(t)-.12,zOf(t)];
      return [lerp(o[0],i[0],u),lerp(o[1],i[1],u),o[2]];}),c.rim));
    const rim=[],wl=[];
    for(let i=0;i<=14;i++){const t=i/14;
      rim.push([side*width(t),top(t),zOf(t)]);
      wl.push([side*width(t)*.95,keel+(top(t)-keel)*.33,zOf(t)]);}
    p.push(P(tubeGeo(rim,.052,7),c.rim));
    p.push(P(tubeGeo(wl,.032,6),c.waterline));
    for(let i=1;i<14;i+=2){const t=i/14;
      p.push(P(new THREE.SphereGeometry(.043,6,5),c.nail,[side*width(t)*.95,top(t)-.03,zOf(t)]));}
  }
  const deckY=H*.16;
  for(let i=0;i<10;i++){
    const t=.055+i*.098;
    p.push(P(roundedBox(width(t)*1.60,.07,L*.085,.018,2),i%2?c.deckA:c.deckB,[0,deckY,zOf(t)]));
  }
  for(const t of [.28,.68])p.push(P(roundedBox(width(t)*1.32,.12,.30,.035,3),c.bench,[0,deckY+.10,zOf(t)]));
  p.push(P(new THREE.SphereGeometry(.14,10,8),c.rim,[0,top(.98)+.03,zOf(.99)]));
  p.push(P(new THREE.TorusGeometry(.13,.035,6,12),c.nail,[0,top(.86),zOf(.88)],[0,0,0]));
  p.push(P(tubeGeo([[0,keel-.03,zOf(.05)],[0,keel-.05,zOf(.5)],[0,keel-.02,zOf(.95)]],.075,7),c.keel));
  return p;
}
export function wakeGeo(){
  const p=[],idx=[];
  for(const s of [-1,1]){
    const b=p.length/3;
    p.push(s*.22,0,-1.0, s*1.05,0,-4.9, s*.64,0,-4.9);
    p.push(s*.22,0,-1.0, s*.64,0,-4.9, s*.38,0,-1.0);
    idx.push(b,b+1,b+2,b+3,b+4,b+5);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);
  g.computeVertexNormals();return g;
}
/* 水豚：钝方脸 / 鼻吻门牙 / 眼睑耳廓 / 胡须 / 四肢爪 / 毛斑 / 围巾 / 头顶橘子 */
export function capybaraParts(col){
  const p=[],gl=[];
  const FUR=0xa9703f,FUR2=0xbd8752,FUR3=0x8d5b32,LIGHT=0xd9a877;
  p.push(P(deform(new THREE.SphereGeometry(1,22,15),v=>{
    const t=(v.z+1)/2;v.x*=.60;v.y*=.46;v.z*=.82;v.y+=.06*Math.sin(t*Math.PI);
  }),FUR,[0,1.06,-.16]));
  p.push(P(deform(new THREE.SphereGeometry(1,16,12),v=>{v.x*=.52;v.y*=.30;v.z*=.72;}),LIGHT,[0,.89,-.14]));
  for(let i=0;i<4;i++){const a=i/4*6.28;
    p.push(P(new THREE.SphereGeometry(.16,8,6),FUR3,
      [Math.cos(a)*.34,1.42+Math.sin(i)*.04,-.18+Math.sin(a)*.42],[0,0,0],[1.3,.32,1]));}
  // 俯视辨识：背部深色鞍斑 + 额头浅色斑
  p.push(P(deform(new THREE.SphereGeometry(1,14,10),v=>{v.x*=.44;v.y*=.09;v.z*=.56;}),
    shade(FUR,.76),[0,1.49,-.22]));
  p.push(P(deform(new THREE.SphereGeometry(1,12,8),v=>{v.x*=.26;v.y*=.06;v.z*=.23;}),
    0xd9a877,[0,1.66,.66]));
  p.push(P(roundedBox(.76,.58,.64,.17,4),FUR2,[0,1.36,.56]));
  for(const s of [-1,1])p.push(P(new THREE.SphereGeometry(.25,10,8),FUR2,[s*.32,1.25,.72],[0,0,0],[1,.8,.9]));
  p.push(P(roundedBox(.50,.32,.34,.12,3),0xc08b58,[0,1.19,.96]));
  p.push(P(deform(new THREE.SphereGeometry(1,10,8),v=>{v.x*=.20;v.y*=.11;v.z*=.10;}),0x51372a,[0,1.29,1.13]));
  for(const s of [-1,1])p.push(P(new THREE.SphereGeometry(.032,6,5),0x2c1d18,[s*.085,1.31,1.20]));
  for(const s of [-1,1])p.push(P(roundedBox(.10,.13,.07,.025,2),0xfff3dc,[s*.075,1.06,1.12]));
  p.push(P(tubeGeo([[-.16,1.10,1.11],[0,1.075,1.14],[.16,1.10,1.11]],.018,5),0x5a3b2b));
  for(const s of [-1,1]){
    p.push(P(new THREE.SphereGeometry(.115,10,8),0x2a1b16,[s*.265,1.46,.82],[0,0,0],[1,1.05,.7]));
    gl.push(P(new THREE.SphereGeometry(.046,8,6),0xfff6e2,[s*.265+.035,1.50,.88]));
    p.push(P(tubeGeo([[s*.16,1.55,.86],[s*.265,1.58,.85],[s*.37,1.53,.84]],.028,5),0x8d5b32));
    p.push(P(deform(new THREE.SphereGeometry(1,10,8),v=>{v.x*=.15;v.y*=.17;v.z*=.09;}),FUR3,
      [s*.33,1.69,.38],[0,0,s*.28]));
    p.push(P(deform(new THREE.SphereGeometry(1,8,6),v=>{v.x*=.085;v.y*=.10;v.z*=.045;}),0x8a4a44,
      [s*.36,1.70,.45]));
    for(let k=0;k<3;k++){
      const yy=1.20-k*.055;
      p.push(P(tubeGeo([[s*.22,yy,1.06],[s*.42,yy+.02*(k-1),1.14],
        [s*.62,yy+.06*(k-1),1.20]],.010,4),0xe8d3b0));
    }
  }
  for(const s of [-1,1]){
    p.push(P(new THREE.CylinderGeometry(.115,.14,.44,8),FUR2,[s*.40,.80,.42],[.25,0,s*.10]));
    for(let k=0;k<3;k++)p.push(P(new THREE.ConeGeometry(.035,.10,5),0x6b452c,
      [s*.40+(k-1)*.065,.60,.55],[Math.PI/2,0,0]));
    p.push(P(new THREE.CylinderGeometry(.155,.17,.36,9),FUR,[s*.42,.79,-.52]));
  }
  p.push(P(new THREE.SphereGeometry(.10,8,6),FUR3,[0,.95,-.95]));
  p.push(P(new THREE.SphereGeometry(.15,10,8),0xff9a3c,[0,1.80,.52]));
  p.push(P(leafGeo(.24,.13,.05,4),0x4fa86b,[0,1.93,.52],[-.3,.6,0]));
  p.push(P(new THREE.TorusGeometry(.38,.075,8,20),col,[0,1.10,.42],[Math.PI/2,0,0]));
  p.push(P(tubeGeo([[.20,1.06,.60],[.30,.88,.72],[.38,.72,.66]],.055,6),col));
  p.push(P(leafGeo(.30,.16,.10,4),col,[.30,.86,.70],[1.2,.4,.3]));
  return {parts:p,glow:gl};
}
export function gunParts(col){
  const p=[],MET=0x3a444e,DARK=0x222a32,WOOD=0x7a5436;
  p.push(P(roundedBox(.24,.26,.62,.06,3),MET,[0,0,.12]));
  p.push(P(roundedBox(.28,.14,.40,.05,3),WOOD,[0,-.02,-.34],[.18,0,0]));
  p.push(P(roundedBox(.16,.30,.20,.05,3),DARK,[0,-.22,.10],[.25,0,0]));
  p.push(P(roundedBox(.14,.22,.16,.04,2),MET,[0,-.16,.36]));
  p.push(P(new THREE.CylinderGeometry(.075,.085,1.0,10),DARK,[0,.06,.72],[Math.PI/2,0,0]));
  p.push(P(latheGeo([[.075,0],[.085,.04],[.125,.10],[.125,.17],[.090,.20]],12),MET,[0,.06,1.22],[Math.PI/2,0,0]));
  for(let i=0;i<3;i++)p.push(P(new THREE.CylinderGeometry(.025,.025,.16,6),0x121820,
    [0,.06,.52+i*.16],[0,0,Math.PI/2]));
  p.push(P(roundedBox(.10,.10,.12,.02,2),DARK,[0,.22,.30]));
  p.push(P(new THREE.CylinderGeometry(.025,.025,.12,6),MET,[0,.30,.30]));
  p.push(P(new THREE.TorusGeometry(.10,.018,5,12,Math.PI),DARK,[0,-.18,.14],[0,Math.PI/2,0]));
  p.push(P(roundedBox(.26,.06,.20,.02,2),col,[0,.16,.05]));
  return p;
}
export function makePlayerMesh(id){
  const col=PCOLOR[id],g=new THREE.Group();
  g.add(shadow(2.15,2));
  g.add(modelGroup(hullParts(3.5,1.02,.66,{outer:0x6b4630,inner:0x4c3222,stern:0x5b3a27,
    rim:0x8a5c39,waterline:0x3c2a20,nail:0xd8b47a,deckA:0xc49a63,deckB:0xb98b55,
    bench:0x7d5738,keel:0x40291c}),[],{side:THREE.DoubleSide,rough:.86}));
  // 以颈部为支点把水豚略微仰起：俯视镜头下五官更清楚
  const pivot=new THREE.Group();pivot.position.set(0,1.20,.30);pivot.rotation.x=-.26;
  const cp=capybaraParts(col);
  const capModel=modelGroup(cp.parts,cp.glow,{rough:.88,outline:0x3b2718,ow:.026});
  capModel.position.set(0,-1.20,-.30);pivot.add(capModel);
  const gun=new THREE.Group();gun.position.set(.44,-.02,.30);
  gun.add(modelGroup(gunParts(col),[],{rough:.52,metal:.38,outline:0x171e26,ow:.03}));
  const flash=spriteGlow(0xffd18a,1.8,0);flash.position.set(0,.06,1.44);gun.add(flash);
  pivot.add(gun);g.add(pivot);g.userData.flash=flash;g.userData.gun=gun;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.78,.05,6,44),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.85}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.09;g.add(ring);g.userData.ring=ring;
  const flag=gridGeo(6,3,(t,u)=>[t*.72,(u-.5)*.38,.10*Math.sin(t*7)*u]);
  g.add(modelGroup([
    P(new THREE.CylinderGeometry(.032,.04,1.6,6),0x4a3a2e,[-.62,.85,-.98]),
    P(new THREE.SphereGeometry(.07,7,5),0xffd08a,[-.62,1.68,-.98]),
    P(flag,col,[-.60,1.52,-.98])
  ],[],{side:THREE.DoubleSide,rough:.8}));
  const wake=new THREE.Mesh(wakeGeo(),new THREE.MeshBasicMaterial({color:0xdffaf4,
    transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  wake.position.y=.07;g.add(wake);g.userData.wake=wake;
  const dn=spriteGlow(0xff4d5e,3.4,0);dn.position.y=2.4;g.add(dn);g.userData.downGlow=dn;
  g.scale.setScalar(1.18);
  return g;
}
export const playerMeshes=[];
export function ensurePlayerMeshes(n){
  while(playerMeshes.length<n){
    const i=playerMeshes.length,g=makePlayerMesh(i);scene.add(g);playerMeshes.push(g);
  }
  for(let i=0;i<playerMeshes.length;i++)playerMeshes[i].visible=i<n;
}
ensurePlayerMeshes(2);

// 怪物
export function makeMonsterMesh(type){
  const d=MON[type],g=new THREE.Group(),r=d.r,C=d.color,p=[],gl=[];
  g.add(shadow(r*1.45,1));
  if(type==='reef'){ // 礁甲兽：分层背甲、双颚獠牙、四足与尾鳍
    p.push(P(deform(new THREE.SphereGeometry(1,16,12),v=>{
      v.x*=r*.95;v.y*=r*.58;v.z*=r*1.15;v.z+=r*.12*Math.cos(v.x*3);
    }),C,[0,.20,0]));
    for(let i=0;i<3;i++){const z=-r*.6+i*r*.55;
      p.push(P(gridGeo(6,8,(t,u)=>{const s=u*2-1;
        return [s*r*.82*(1-.25*Math.abs(s)),.22+r*.52*Math.sin(Math.PI*t)*.75,z+(t-.5)*r*.5];}),shade(C,1.20)));}
    p.push(P(roundedBox(r*1.1,r*.5,r*.7,r*.18,3),shade(C,1.28),[0,.24,r*.95]));
    for(const s of [-1,1]){
      p.push(P(new THREE.ConeGeometry(r*.17,r*.55,6),shade(C,.80),[s*r*.34,.15,r*1.42],[Math.PI/2,0,s*.2]));
      for(let k=0;k<3;k++)p.push(P(new THREE.ConeGeometry(r*.045,r*.16,4),0xf3e6c8,
        [s*r*(.26+k*.06),.02,r*1.58],[Math.PI/2,0,0]));
    }
    for(let i=0;i<5;i++)p.push(P(new THREE.ConeGeometry(r*.13,r*.5,5),shade(C,.62),
      [(i-2)*r*.28,r*.62,-r*.7],[0,0,(i-2)*.12]));
    for(const s of [-1,1])for(let i=0;i<2;i++){
      const z=(-.45+i*.9)*r;
      p.push(P(tubeGeo([[s*r*.7,.22,z],[s*r*1.15,.05,z+.12*r],[s*r*1.28,-.18,z+.28*r]],r*.085,6),shade(C,.78)));
      p.push(P(new THREE.ConeGeometry(r*.09,r*.26,5),shade(C,.6),
        [s*r*1.28,-.26,z+.28*r],[Math.PI/2,0,0]));
    }
    p.push(P(new THREE.ConeGeometry(r*.25,r*.9,7),shade(C,.85),[0,.16,-r*1.35],[-Math.PI/2,0,0]));
    const tf=leafGeo(r*1.0,r*.9,r*.18,5);tf.rotateX(-1.0);
    p.push(P(tf,shade(C,1.12),[0,.16,-r*1.72]));
    for(const s of [-1,1]){
      p.push(P(new THREE.TorusGeometry(r*.15,r*.045,6,12),shade(C,.5),[s*r*.36,.42,r*1.18]));
      gl.push(P(new THREE.SphereGeometry(r*.105,9,7),d.eye,[s*r*.36,.43,r*1.22]));
    }
  }else if(type==='spitter'){ // 刺水母：伞盖沟纹、发光核、九条弯曲触手
    p.push(P(deform(latheGeo([[0,.55],[.35,.52],[.72,.40],[.95,.18],[1.0,0],[.92,-.08]],18),
      v=>{v.x*=r;v.z*=r;v.y*=r*1.1;}),C,[0,.42,0]));
    p.push(P(new THREE.TorusGeometry(r*.96,r*.075,8,24),shade(C,1.28),[0,.36,0],[Math.PI/2,0,0]));
    for(let i=0;i<8;i++){const a=i/8*6.28;
      p.push(P(tubeGeo([[Math.cos(a)*r*.15,.42+r*.58,Math.sin(a)*r*.15],
        [Math.cos(a)*r*.55,.42+r*.44,Math.sin(a)*r*.55],
        [Math.cos(a)*r*.93,.36,Math.sin(a)*r*.93]],.022,5),shade(C,1.34)));}
    for(let i=0;i<9;i++){const a=i/9*6.28;
      p.push(P(tubeGeo([[Math.cos(a)*r*.85,.34,Math.sin(a)*r*.85],
        [Math.cos(a)*r*1.15,-.15,Math.sin(a)*r*1.15],
        [Math.cos(a+.3)*r*1.05,-.62,Math.sin(a+.3)*r*1.05],
        [Math.cos(a+.5)*r*.85,-1.0,Math.sin(a+.5)*r*.85]],.045,6),shade(C,.92)));}
    for(let i=0;i<4;i++){const a=i/4*6.28;
      p.push(P(new THREE.ConeGeometry(r*.14,r*.5,5),shade(C,1.22),
        [Math.cos(a)*r*.22,.05,Math.sin(a)*r*.22],[Math.PI,0,0]));}
    gl.push(P(new THREE.SphereGeometry(r*.30,12,9),d.eye,[0,.42,0]));
    for(let i=0;i<8;i++){const a=i/8*6.28;
      gl.push(P(new THREE.SphereGeometry(r*.065,7,5),d.eye,[Math.cos(a)*r*.93,.40,Math.sin(a)*r*.93]));}
  }else{ // 重甲巨蟹：宽甲缘、双钳、六足、四眼
    p.push(P(deform(new THREE.SphereGeometry(1,20,14),v=>{
      v.x*=r*1.05;v.y*=r*.52;v.z*=r*.92;v.y+=.06*r*Math.sin(v.x*4)*Math.cos(v.z*4);
    }),C,[0,.30,0]));
    for(let i=0;i<10;i++){const a=i/10*6.28;
      p.push(P(roundedBox(r*.30,r*.16,r*.38,r*.06,2),shade(C,1.22),
        [Math.cos(a)*r*.92,.34,Math.sin(a)*r*.84],[0,-a,0]));}
    for(let i=0;i<6;i++){const a=i/6*6.28;
      p.push(P(new THREE.SphereGeometry(r*.16,8,6),shade(C,.75),
        [Math.cos(a)*r*.5,.30+r*.48,Math.sin(a)*r*.42]));}
    for(const s of [-1,1]){
      p.push(P(new THREE.CylinderGeometry(r*.15,r*.20,r*.72,8),shade(C,.85),
        [s*r*1.05,.28,r*.55],[0,0,s*.7]));
      p.push(P(deform(new THREE.SphereGeometry(1,12,9),v=>{v.x*=r*.34;v.y*=r*.26;v.z*=r*.42;}),
        shade(C,1.16),[s*r*1.38,.36,r*1.05]));
      for(let k=0;k<2;k++)p.push(P(new THREE.ConeGeometry(r*.10,r*.52,6),shade(C,.80),
        [s*r*(1.32+k*.13),.36+(k?.12:-.10)*r,r*1.48],[Math.PI/2,0,s*.15]));
    }
    for(const s of [-1,1])for(let i=0;i<3;i++){
      const z=(-.6+i*.55)*r;
      p.push(P(tubeGeo([[s*r*.85,.25,z],[s*r*1.35,.02,z-.10*r],[s*r*1.48,-.28,z-.28*r]],r*.10,6),shade(C,.78)));
      p.push(P(new THREE.ConeGeometry(r*.10,r*.28,5),shade(C,.6),
        [s*r*1.48,-.36,z-.28*r],[Math.PI/2,0,0]));
    }
    for(const s of [-1,1])for(let k=0;k<2;k++){
      p.push(P(new THREE.TorusGeometry(r*.10,r*.032,5,10),shade(C,.5),
        [s*r*(.30+k*.26),.48,r*.86]));
      gl.push(P(new THREE.SphereGeometry(r*.072,8,6),d.eye,[s*r*(.30+k*.26),.49,r*.90]));
    }
    for(let i=0;i<3;i++){const tf=leafGeo(r*.9,r*.6,r*.15,4);tf.rotateX(-1.1);tf.rotateY((i-1)*.4);
      p.push(P(tf,shade(C,.92),[0,.30,-r*1.0]));}
  }
  g.add(modelGroup(p,gl,{rough:.68,metal:.14,side:THREE.DoubleSide,outline:0x141a20,ow:.032}));
  const aura=spriteGlow(d.eye,r*2.0,.32);aura.position.set(0,.5,r*.7);g.add(aura);
  const bar=new THREE.Group();bar.position.y=d.r*2+1.0;
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.16),new THREE.MeshBasicMaterial({color:0x102028,depthTest:false}));
  const fg=new THREE.Mesh(new THREE.PlaneGeometry(1.56,.12),new THREE.MeshBasicMaterial({color:0xff6b6b,depthTest:false}));
  fg.position.z=.01;bar.add(bg,fg);g.add(bar);g.userData.bar=bar;g.userData.barFill=fg;
  return g;
}
export const monsterMeshes=new Map();
/* 兴趣点 / 掉落物的可视模型 */
export const poiMeshes=new Map(),pickupMeshes=new Map();
export function makePOIMesh(q){
  const g=new THREE.Group(),p=[],gl=[],c=POI_INFO[q.type].color;
  if(q.type==='cache'){
    p.push(P(roundedBox(1.5,1.0,1.2,.14,3),0x9a6d42,[0,.4,0]));
    p.push(P(roundedBox(1.6,.12,1.3,.04,2),0x5f4128,[0,.95,0]));
    p.push(P(new THREE.TorusGeometry(.42,.07,6,16),0xd9ab5e,[0,.4,.62]));
    gl.push(P(new THREE.SphereGeometry(.14,8,6),0xffe6a2,[0,1.05,0]));
  }else if(q.type==='rune'){
    p.push(P(new THREE.OctahedronGeometry(.62,0),0x6a4c9c,[0,1.05,0]));
    p.push(P(new THREE.TorusGeometry(.95,.07,6,24),0x8c6ad0,[0,1.05,0],[Math.PI/2,0,0]));
    gl.push(P(new THREE.OctahedronGeometry(.28,0),0xd9b8ff,[0,1.05,0]));
  }else if(q.type==='whirlpool'){
    p.push(P(new THREE.CircleGeometry(2.5,32),0x123c52,[0,.05,0],[-Math.PI/2,0,0]));
    for(let i=0;i<3;i++)p.push(P(new THREE.TorusGeometry(1.1+i*.62,.09,6,28),
      i%2?0x7fd8e8:0x4aa8c4,[0,.08+i*.16,0],[Math.PI/2,0,0]));
    gl.push(P(new THREE.SphereGeometry(.3,10,8),0xa8f0ff,[0,.5,0]));
  }else if(q.type==='shrine'){
    for(const s of [-1,1])p.push(P(new THREE.ConeGeometry(.42,2.3,6),0xc98aa8,[s*1.0,.9,0],[0,0,s*-.2]));
    p.push(P(roundedBox(2.2,.4,.9,.16,3),0xd9a8bd,[0,1.95,0]));
    gl.push(P(new THREE.SphereGeometry(.52,12,9),0xffb8de,[0,1.35,0]));
    p.push(P(new THREE.TorusGeometry(.78,.09,6,20),0xffe0ee,[0,1.35,0]));
  }else{ // wreck
    p.push(P(roundedBox(3.2,.55,1.5,.16,2),0x6b4a32,[0,-.3,0],[0,.3,.12]));
    p.push(P(new THREE.CylinderGeometry(.1,.14,3.0,7),0x5b3f2b,[.6,.9,.3],[0,0,.7]));
    p.push(P(new THREE.TorusGeometry(.6,.08,6,14),0x8a7a60,[1.3,-.1,-.4],[0,Math.PI/2,0]));
    gl.push(P(new THREE.SphereGeometry(.2,8,6),0xffd08a,[.2,.1,.8]));
  }
  g.add(modelGroup(p,gl,{rough:.7,side:THREE.DoubleSide,outline:0x241a22,ow:.02}));
  const halo=spriteGlow(c,3.2,.55);halo.position.y=1.3;g.add(halo);
  g.userData.halo=halo;return g;
}
export function makePickupMesh(k){
  const c={coin:0xffd277,heart:0xff7b7b,shield:0x7fd8e8,boost:0xff9a5a,speed:0x8ce8b0}[k.type]||0xffffff;
  const g=new THREE.Group();
  const core=k.type==='heart'
    ?P(new THREE.SphereGeometry(.28,10,8),c,[0,.4,0],[0,0,0],[1,.9,.5])
    :P(new THREE.OctahedronGeometry(.30,0),c,[0,.4,0]);
  const p=[core,P(new THREE.TorusGeometry(.46,.045,5,16),c,[0,.4,0],[Math.PI/2,0,0])];
  g.add(modelGroup(p,[],{rough:.45,metal:.25,side:THREE.DoubleSide}));
  const s=spriteGlow(c,1.5,.7);s.position.y=.4;g.add(s);return g;
}
// 子弹
export const bulletMeshes=new Map();
export const bulletGeo=new THREE.SphereGeometry(.17,8,6);
export function makeBulletMesh(b){
  const c=b.team==='p'?0xffe2a0:0xff5d7a;
  const g=new THREE.Group();
  g.add(new THREE.Mesh(bulletGeo,new THREE.MeshBasicMaterial({color:c})));
  const s=spriteGlow(c,1.05,.7);g.add(s);
  if(b.aoe){const s2=spriteGlow(0xff8c5a,2.2,.6);g.add(s2);}
  g.position.y=.55;scene.add(g);return g;
}
// 流浪商船：多层船壳 / 船尾楼 / 栏杆 / 鼓帆 / 索具 / 桶箱货物 / 舷窗 / 灯笼
export function makeMerchant(){
  const g=new THREE.Group(),p=[],gl=[];
  g.add(shadow(5.0,2));
  p.push(...hullParts(8.2,2.7,1.4,{outer:0x5c3b28,inner:0x40291c,stern:0x4a3020,
    rim:0x8a5c39,waterline:0x33231a,nail:0xd8b47a,deckA:0xb98b57,deckB:0xa87b49,
    bench:0x6d4a30,keel:0x332116}));
  const WOOD=0x7a5436,DARK=0x3d2a1e,GOLD=0xd9ab5e;
  p.push(P(roundedBox(3.0,1.05,1.7,.16,3),0x8a6039,[0,1.35,-2.75]));
  p.push(P(roundedBox(3.2,.14,1.9,.05,2),WOOD,[0,1.92,-2.75]));
  for(let i=0;i<4;i++)p.push(P(new THREE.CylinderGeometry(.07,.07,.5,6),GOLD,[-1.1+i*.73,2.15,-2.75]));
  for(const s of [-1,1])for(let i=0;i<9;i++)
    p.push(P(new THREE.CylinderGeometry(.045,.045,.62,5),WOOD,[s*2.05,.95,-3.3+i*.8]));
  for(const s of [-1,1])
    p.push(P(tubeGeo([[s*2.05,1.24,-3.3],[s*2.05,1.24,0],[s*2.05,1.24,3.1]],.045,6),DARK));
  for(const s of [-1,1])for(let i=0;i<4;i++){
    p.push(P(new THREE.TorusGeometry(.20,.055,6,14),GOLD,[s*2.42,.55,-1.7+i*1.1],[0,Math.PI/2,0]));
    gl.push(P(new THREE.CylinderGeometry(.15,.15,.05,12),0x7fd8d0,
      [s*2.44,.55,-1.7+i*1.1],[0,0,Math.PI/2]));
  }
  for(const [mz,mh] of [[.6,7.4],[-1.9,5.0]]){
    p.push(P(new THREE.CylinderGeometry(.13,.19,mh,10),WOOD,[0,mh/2+.5,mz]));
    p.push(P(new THREE.CylinderGeometry(.06,.06,4.2,7),DARK,[0,mh*.78,mz],[0,0,Math.PI/2]));
    p.push(P(new THREE.SphereGeometry(.18,8,6),GOLD,[0,mh+.5,mz]));
  }
  const sail=(w,h,y,z)=>gridGeo(8,6,(t,u)=>{const s=u*2-1;
    return [s*w*.5,y+(t-.5)*h,z+.55*Math.sin(Math.PI*t)*Math.cos(s*Math.PI/2)];});
  p.push(P(sail(4.0,3.5,5.3,.62),0xfff0d2));
  p.push(P(sail(2.8,2.3,3.9,-1.86),0xf6e2bd));
  for(const [w,h,y,z] of [[4.0,.55,4.4,.72],[2.8,.40,3.3,-1.80]])
    p.push(P(gridGeo(2,6,(t,u)=>{const s=u*2-1;
      return [s*w*.5,y+(t-.5)*h,z+.54*Math.cos(s*Math.PI/2)];}),0xd9614e));
  for(const s of [-1,1]){
    p.push(P(tubeGeo([[0,7.8,.6],[s*1.1,4.2,.6],[s*2.0,1.2,.6]],.028,5),0x6b5238));
    p.push(P(tubeGeo([[0,5.3,-1.9],[s*.9,3.4,-1.9],[s*1.9,1.2,-1.9]],.024,5),0x6b5238));
    p.push(P(tubeGeo([[0,7.7,.6],[s*.5,5.4,-1.9],[0,4.9,-1.9]],.022,5),0x6b5238));
  }
  for(const [x,z] of [[-1.0,1.5],[1.1,1.7],[.2,2.2]]){
    p.push(P(latheGeo([[.32,0],[.40,.22],[.42,.52],[.40,.82],[.32,1.0]],12),0x9a6d42,[x,.50,z]));
    p.push(P(new THREE.TorusGeometry(.40,.035,5,12),0x4a3526,[x,.72,z],[Math.PI/2,0,0]));
    p.push(P(new THREE.TorusGeometry(.40,.035,5,12),0x4a3526,[x,.95,z],[Math.PI/2,0,0]));
  }
  for(const [x,z] of [[-1.3,-.7],[1.4,-.5]]){
    p.push(P(roundedBox(.85,.75,.85,.07,3),0x8c6440,[x,.95,z]));
    p.push(P(roundedBox(.90,.07,.90,.02,2),0x5f4128,[x,1.35,z]));
  }
  for(const [x,z] of [[-.5,.2],[.9,.1]])
    p.push(P(deform(new THREE.SphereGeometry(1,10,8),v=>{v.x*=.42;v.y*=.36;v.z*=.42;}),
      0xc9b48a,[x,.86,z]));
  p.push(P(new THREE.TorusGeometry(.30,.075,6,12),0x565f66,[2.55,.35,1.1],[0,Math.PI/2,0]));
  p.push(P(new THREE.CylinderGeometry(.06,.06,1.0,6),0x565f66,[2.55,.85,1.1]));
  p.push(P(gridGeo(6,3,(t,u)=>[t*1.1,(u-.5)*.52,.14*Math.sin(t*7)*u]),0xffd277,[0,7.9,.6]));
  gl.push(P(new THREE.SphereGeometry(.26,10,8),0xffd18a,[0,1.85,3.2]));
  gl.push(P(new THREE.SphereGeometry(.18,8,6),0xffd18a,[-1.7,1.6,-2.6]));
  gl.push(P(new THREE.SphereGeometry(.18,8,6),0xffd18a,[1.7,1.6,-2.6]));
  g.add(modelGroup(p,gl,{rough:.78,side:THREE.DoubleSide}));
  const lamp=spriteGlow(0xffc06a,5.0,.9);lamp.position.set(0,1.9,3.2);g.add(lamp);
  const light=new THREE.PointLight(0xffb45e,2.2,24);light.position.copy(lamp.position);g.add(light);
  const ring=new THREE.Mesh(new THREE.RingGeometry(9.4,10.0,48),
    new THREE.MeshBasicMaterial({color:0xffd277,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);
  g.visible=false;scene.add(g);return g;
}
export const merchantMesh=makeMerchant();
// 首领：甲壳头颅 / 獠牙口器 / 眼窝 / 背刺 / 胸口核心 / 八条带吸盘的分节触手
export function makeBoss(){
  const g=new THREE.Group(),p=[],gl=[];
  g.add(shadow(7.2,2));
  const SK=0x5b3566,SK2=shade(SK,.66),SK3=0x95639a;
  p.push(P(deform(new THREE.IcosahedronGeometry(4.0,3),v=>{
    v.y*=.78;v.z*=1.12;const k=1+.05*Math.sin(v.x*1.7)*Math.cos(v.z*1.4);v.multiplyScalar(k);
  }),SK,[0,.85,0]));
  for(let i=0;i<9;i++){
    const a=i/9*6.28;
    const plate=gridGeo(5,6,(t,u)=>{const s=u*2-1;
      return [s*1.15*(1-.25*Math.abs(s)),2.05+1.15*Math.sin(Math.PI*t),1.2+t*2.6];});
    plate.rotateY(a);p.push(P(plate,i%2?SK3:0x7c4c84));
    const vein=gridGeo(5,1,(t,u)=>[u*.10,2.10+1.12*Math.sin(Math.PI*t),1.35+t*2.4]);
    vein.rotateY(a);gl.push(P(vein,0xff6a9a));
  }
  p.push(P(new THREE.TorusGeometry(2.55,.13,7,30),SK3,[0,2.35,0],[Math.PI/2,0,0]));
  for(const s of [-1,1])p.push(P(roundedBox(1.9,.55,1.1,.22,3),SK2,[s*1.65,2.05,3.0],[0,0,s*-.18]));
  for(const s of [-1,1]){
    p.push(P(new THREE.TorusGeometry(.78,.20,8,20),SK2,[s*1.55,1.65,3.45]));
    gl.push(P(new THREE.SphereGeometry(.60,14,10),0xff5a4e,[s*1.55,1.66,3.55]));
    gl.push(P(new THREE.SphereGeometry(.19,9,7),0xffd0a0,[s*1.42,1.80,3.98]));
  }
  p.push(P(new THREE.SphereGeometry(1.55,14,10),0x140b16,[0,.42,3.35],[0,0,0],[1,.8,.6]));
  p.push(P(new THREE.TorusGeometry(1.62,.34,8,26),SK2,[0,.48,3.55]));
  for(let i=0;i<14;i++){const a=i/14*6.28;
    p.push(P(new THREE.ConeGeometry(.16,.70,6),0xf1e2c4,
      [Math.cos(a)*1.45,.48+Math.sin(a)*1.05,3.70],[0,0,a+Math.PI/2]));}
  for(let i=0;i<8;i++){const a=i/8*6.28;
    p.push(P(new THREE.ConeGeometry(.48,2.5,7),SK2,
      [Math.cos(a)*2.9,2.9,Math.sin(a)*2.4],[Math.sin(a)*.35,0,-Math.cos(a)*.35]));
    gl.push(P(new THREE.SphereGeometry(.14,7,5),0xff5a7a,[Math.cos(a)*3.25,4.05,Math.sin(a)*2.7]));}
  p.push(P(new THREE.TorusGeometry(1.15,.22,8,24),SK3,[0,3.45,-.5],[Math.PI/2,0,0]));
  gl.push(P(new THREE.SphereGeometry(.78,14,10),0xff6a55,[0,3.55,-.5]));
  for(const s of [-1,1]){
    const fin=leafGeo(4.2,2.3,.9,8);fin.rotateZ(s*Math.PI/2);fin.rotateY(s*.5);
    p.push(P(fin,SK3,[s*3.4,.5,-.6]));
  }
  g.add(modelGroup(p,gl,{rough:.70,metal:.10,side:THREE.DoubleSide,outline:0x2b1730,ow:.022}));
  const tents=[];
  for(let i=0;i<8;i++){
    const a=i/8*6.28,tg=new THREE.Group();
    tg.position.set(Math.cos(a)*3.3,.25,Math.sin(a)*3.3);tg.rotation.y=-a;
    let parent=tg;const piv=[];
    for(let k=0;k<3;k++){
      const pivot=new THREE.Group();pivot.position.y=k===0?0:1.75;
      pivot.userData.base=k===0?.88:.30;
      const sp=[],r0=.56-k*.13,r1=.46-k*.11;
      sp.push(P(new THREE.CylinderGeometry(r1,r0,1.85,10),k%2?SK:shade(SK,1.2),[0,.92,0]));
      for(let q=0;q<3;q++)sp.push(P(new THREE.TorusGeometry(r0-q*.03,.045,5,12),SK3,
        [0,.35+q*.55,0],[Math.PI/2,0,0]));
      for(let q=0;q<4;q++)sp.push(P(new THREE.SphereGeometry(.115,7,5),0xd88aae,
        [0,.30+q*.42,-r0*.92],[0,0,0],[1,1,.45]));
      sp.push(P(new THREE.ConeGeometry(r1,.4,8),SK2,[0,1.95,0]));
      pivot.add(modelGroup(sp,[],{rough:.72,outline:0x2b1730,ow:.030}));
      parent.add(pivot);parent=pivot;piv.push(pivot);
    }
    tg.userData.pivots=piv;g.add(tg);tents.push(tg);
  }
  g.userData.tents=tents;
  const aura=spriteGlow(0xff4d6d,15,.35);aura.position.y=1.2;g.add(aura);
  g.visible=false;scene.add(g);return g;
}
export const bossMesh=makeBoss();

// 准星
{
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.035,5,36),new THREE.MeshBasicMaterial({color:0xfff0d0,transparent:true,opacity:.9,depthTest:false}));
  ring.rotation.x=-Math.PI/2;g.add(ring);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshBasicMaterial({color:0xffb15c,depthTest:false}));g.add(dot);
  for(let i=0;i<4;i++){
    const t=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.24),new THREE.MeshBasicMaterial({color:0xfff0d0,depthTest:false}));
    const a=i/4*6.28;t.position.set(Math.sin(a)*.82,.0,Math.cos(a)*.82);t.rotation.y=a;g.add(t);
  }
  g.position.y=.3;g.renderOrder=20;scene.add(g);window.__cross=g;
}

