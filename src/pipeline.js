/* pipeline.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { scene, timeU, basic, spriteGlow } from './scene.js';
import { decoRnd } from './core.js';

/* ========== 程序化建模管线 ==========
   每个部件带独立颜色 / 变换，合并为一份带顶点色的 BufferGeometry，
   因此几十个零件也只占 1~2 个 draw call，可以放心堆细节。 */
export const _M=new THREE.Matrix4(),_Q=new THREE.Quaternion(),_E=new THREE.Euler(),
      _V=new THREE.Vector3(),_S=new THREE.Vector3(),_C=new THREE.Color();
export function P(geo,color,pos,rot,scale){return{geo,color,pos:pos||[0,0,0],rot:rot||[0,0,0],scale:scale||[1,1,1]};}
export function mergeParts(parts){
  const vp=[],vn=[],vc=[];
  for(const q of parts){
    const g=q.geo.index?q.geo.toNonIndexed():q.geo.clone();
    _E.set(q.rot[0],q.rot[1],q.rot[2]);_Q.setFromEuler(_E);
    _M.compose(_V.set(q.pos[0],q.pos[1],q.pos[2]),_Q,_S.set(q.scale[0],q.scale[1],q.scale[2]));
    g.applyMatrix4(_M);
    const pa=g.getAttribute('position'),na=g.getAttribute('normal');_C.set(q.color);
    for(let i=0;i<pa.count;i++){
      vp.push(pa.getX(i),pa.getY(i),pa.getZ(i));
      vn.push(na.getX(i),na.getY(i),na.getZ(i));
      vc.push(_C.r,_C.g,_C.b);
    }
    g.dispose();
  }
  const o=new THREE.BufferGeometry();
  o.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));
  o.setAttribute('normal',new THREE.Float32BufferAttribute(vn,3));
  o.setAttribute('color',new THREE.Float32BufferAttribute(vc,3));
  o.computeBoundingSphere();return o;
}
export function modelGroup(parts,glowParts,opt){
  opt=opt||{};const g=new THREE.Group();
  if(parts&&parts.length){
    const geo=mergeParts(parts);
    g.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,
      roughness:opt.rough??.80,metalness:opt.metal??.05,
      side:opt.side||THREE.FrontSide,flatShading:!!opt.flat})));
    if(opt.outline){
      const o=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:opt.outline,side:THREE.BackSide}));
      o.scale.setScalar(1+(opt.ow||.028));g.add(o);
    }
  }
  if(glowParts&&glowParts.length)
    g.add(new THREE.Mesh(mergeParts(glowParts),
      new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
  return g;
}
export function gridGeo(nu,nv,fn,flip){
  const p=[],idx=[];
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const a=fn(i/nu,j/nv);p.push(a[0],a[1],a[2]);}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
    const a=i*(nv+1)+j,b=a+1,c=a+nv+1,d=c+1;
    if(!flip)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);
  g.computeVertexNormals();return g;
}
export function roundedBox(w,h,d,r,seg){
  const g=new THREE.BoxGeometry(w,h,d,seg||4,seg||4,seg||4);
  const p=g.attributes.position,ix=w/2-r,iy=h/2-r,iz=d/2-r,v=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.set(p.getX(i),p.getY(i),p.getZ(i));
    c.set(clamp(v.x,-ix,ix),clamp(v.y,-iy,iy),clamp(v.z,-iz,iz));
    v.sub(c);const l=v.length()||1;v.multiplyScalar(r/l).add(c);
    p.setXYZ(i,v.x,v.y,v.z);
  }
  g.computeVertexNormals();return g;
}
export function tubeGeo(pts,r,rad){
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(a[0],a[1],a[2]))),
    Math.max(6,pts.length*3),r,rad||6,false);
}
export function latheGeo(profile,seg){return new THREE.LatheGeometry(profile.map(a=>new THREE.Vector2(a[0],a[1])),seg||18);}
export function deform(geo,fn){
  const p=geo.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i));fn(v,i);p.setXYZ(i,v.x,v.y,v.z);}
  geo.computeVertexNormals();return geo;
}
export function leafGeo(len,wid,bend,seg){
  return gridGeo(seg||7,4,(t,u)=>{const s=u*2-1;
    return [s*(wid*.5*Math.sin(Math.PI*Math.pow(t,.75))+.002),-bend*t*t,t*len];});
}
export function shade(hex,k){const c=new THREE.Color(hex);c.multiplyScalar(k);return c.getHex();}
export function softShadowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,3,64,64,64);
  g.addColorStop(0,'rgba(7,30,38,.68)');g.addColorStop(.5,'rgba(7,30,38,.34)');g.addColorStop(1,'rgba(7,30,38,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
export const SHADOW_TEX=softShadowTex();
scene.add(new THREE.AmbientLight(0xffe9d0,.30));

// 天空 / 夕阳
{
  const sky=new THREE.Mesh(new THREE.SphereGeometry(360,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vP;
      void main(){float h=normalize(vP).y;
        vec3 top=vec3(.16,.20,.38), mid=vec3(.85,.43,.36), hor=vec3(1.0,.69,.40);
        vec3 c=mix(hor,mid,smoothstep(-.05,.30,h));c=mix(c,top,smoothstep(.25,.85,h));
        gl_FragColor=vec4(c,1.0);
        // 风格化着色器直接输出颜色
      }`
  }));
  scene.add(sky);
  const sun=spriteGlow(0xffd39a,74,.95);sun.position.set(-190,42,-230);scene.add(sun);
  const sun2=spriteGlow(0xff8f55,130,.5);sun2.position.set(-190,42,-230);scene.add(sun2);
  // 远处岛影
  const dm=new THREE.MeshBasicMaterial({color:0x6b4b58,fog:false});
  for(let i=0;i<7;i++){
    const h=6+decoRnd()*13;
    const m=new THREE.Mesh(new THREE.ConeGeometry(9+decoRnd()*14,h,5),dm);
    m.position.set(-190+i*62,-h/2+2,-235+decoRnd()*16);m.rotation.y=decoRnd();scene.add(m);
  }
}
scene.add(new THREE.HemisphereLight(0xffd9a8,0x245e68,1.05));
{
  const dl=new THREE.DirectionalLight(0xffa066,1.5);dl.position.set(-70,32,-90);scene.add(dl);
  const fl=new THREE.DirectionalLight(0x8fd8e0,.55);fl.position.set(60,50,40);scene.add(fl);
}

// 海床
{
  const g=new THREE.PlaneGeometry(1000,1000,1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.ShaderMaterial({
    uniforms:{uTime:timeU},
    vertexShader:'varying vec3 vW; void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform float uTime;varying vec3 vW;
      void main(){
        float c=sin(vW.x*.85+uTime*.45)*sin(vW.z*.78-uTime*.38);
        float c2=sin(vW.x*.32-vW.z*.27+uTime*.2);
        vec3 a=vec3(.58,.72,.62),b=vec3(.86,.80,.60);
        vec3 col=mix(a,b,.5+.32*c+.12*c2);
        float r=length(vW.xz);col*=1.0-smoothstep(160.0,420.0,r)*.35;
        gl_FragColor=vec4(col,1.0);
        // 风格化着色器直接输出颜色
      }`
  });
  const mesh=new THREE.Mesh(g,m);mesh.position.y=-2.6;scene.add(mesh);
}
// 水面
{
  const g=new THREE.PlaneGeometry(1000,1000,140,140);g.rotateX(-Math.PI/2);
  const m=new THREE.ShaderMaterial({
    uniforms:{uTime:timeU,uSun:{value:new THREE.Vector3(-.62,.42,-.66).normalize()}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`uniform float uTime;varying vec3 vW;varying vec3 vN;
      float wv(vec2 p,float t){return sin(p.x*.24+t*.9)*.10+sin(p.y*.31-t*1.1)*.08+sin((p.x+p.y)*.13+t*.6)*.07;}
      void main(){vec4 w=modelMatrix*vec4(position,1.0);
        float h=wv(w.xz,uTime);w.y+=h;
        float e=.4;
        float hx=wv(w.xz+vec2(e,0.),uTime)-wv(w.xz-vec2(e,0.),uTime);
        float hz=wv(w.xz+vec2(0.,e),uTime)-wv(w.xz-vec2(0.,e),uTime);
        vN=normalize(vec3(-hx/(2.*e),1.,-hz/(2.*e)));vW=w.xyz;
        gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float uTime;uniform vec3 uSun;varying vec3 vW;varying vec3 vN;
      void main(){
        vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=normalize(uSun),H=normalize(L+V);
        float fres=pow(1.0-max(dot(N,V),0.0),2.0);
        float pat=sin(vW.x*.17+uTime*.32)*sin(vW.z*.20-uTime*.27);
        vec3 deep=vec3(.055,.36,.40),shal=vec3(.28,.73,.66);
        vec3 col=mix(deep,shal,clamp(.46+.30*pat+fres*.30,0.,1.));
        float spec=pow(max(dot(N,H),0.0),95.0);
        float glint=pow(max(dot(N,H),0.0),17.0)*.20;
        float streak=exp(-pow(vW.x+vW.z*.55+34.0,2.0)/900.0);
        col+=vec3(1.0,.55,.28)*(spec*2.4+glint)*(.35+streak);
        float foam=smoothstep(.93,.995,sin(vW.x*.55+sin(vW.z*.22+uTime*.7))*.5+.5)*.10;
        col+=vec3(foam);
        gl_FragColor=vec4(col,.60+fres*.22);
        // 风格化着色器直接输出颜色
      }`
  });
  const mesh=new THREE.Mesh(g,m);mesh.position.y=0;mesh.renderOrder=4;scene.add(mesh);
}

// 岛屿：弯曲椰树 / 分层沙丘 / 带灯室栏杆的灯塔 / 起伏礁岩
export function palm(x,z,s){
  const parts=[],H=3.9*s,lean=(decoRnd()-.5)*.9;
  const at=t=>[Math.sin(t*1.5)*lean*s,t*H,Math.cos(t*1.5)*lean*.35*s];
  for(let i=0;i<6;i++){
    const t=i/6,t2=(i+1)/6,r0=Math.max(.055,(.21-t*.06)*s);
    const a0=at(t),a1=at(t2),am=[(a0[0]+a1[0])/2,(a0[1]+a1[1])/2,(a0[2]+a1[2])/2];
    parts.push(P(tubeGeo([a0,am,a1],r0,8),i%2?0x8b5c39:0xa06e43));
    parts.push(P(new THREE.TorusGeometry(r0*1.03,.022*s,5,10),0x6d452f,a1,[Math.PI/2,0,0]));
  }
  const top=at(1);
  for(let i=0;i<3;i++){const a=i/3*6.28;
    parts.push(P(new THREE.SphereGeometry(.16*s,8,6),0x7c5230,
      [top[0]+Math.cos(a)*.22*s,top[1]-.20*s,top[2]+Math.sin(a)*.22*s]));}
  for(let i=0;i<9;i++){
    const a=i/9*6.28+decoRnd()*.18;
    const lf=leafGeo(2.9*s,.78*s,1.45*s,8);lf.rotateX(-.28);lf.rotateY(a);
    parts.push(P(lf,i%3?0x4aa46a:0x3d8c59,top));
  }
  const g=modelGroup(parts,[],{side:THREE.DoubleSide,rough:.9});
  g.position.set(x,0,z);return g;
}
export function lighthouse(){
  const p=[],gl=[];
  for(let i=0;i<5;i++)p.push(P(new THREE.CylinderGeometry(.86-i*.02,1.02-i*.02,1.0,14),
    i%2?0xfff1dc:0xe2684f,[0,i+0.5,0]));
  p.push(P(roundedBox(.55,.9,.10,.07,3),0x5b3b2c,[0,.48,1.0]));
  for(let i=0;i<3;i++){const a=i/3*6.28;
    p.push(P(new THREE.CylinderGeometry(.17,.17,.08,10),0x7fd8d0,
      [Math.cos(a)*.9,1.8+i*1.25,Math.sin(a)*.9],[Math.PI/2,0,-a]));}
  p.push(P(new THREE.CylinderGeometry(1.25,1.25,.16,16),0x5b4438,[0,5.1,0]));
  for(let i=0;i<12;i++){const a=i/12*6.28;
    p.push(P(new THREE.CylinderGeometry(.035,.035,.55,5),0x4a3730,[Math.cos(a)*1.15,5.45,Math.sin(a)*1.15]));}
  p.push(P(new THREE.TorusGeometry(1.15,.045,6,20),0x4a3730,[0,5.72,0],[Math.PI/2,0,0]));
  p.push(P(new THREE.CylinderGeometry(.72,.72,1.0,12),0xffe6ae,[0,5.95,0]));
  for(let i=0;i<8;i++){const a=i/8*6.28;
    p.push(P(new THREE.CylinderGeometry(.045,.045,1.0,5),0x5b4438,[Math.cos(a)*.73,5.95,Math.sin(a)*.73]));}
  p.push(P(new THREE.ConeGeometry(.95,.85,12),0x4d3b3b,[0,6.9,0]));
  gl.push(P(new THREE.SphereGeometry(.34,10,8),0xffd07a,[0,5.95,0]));
  const g=modelGroup(p,gl,{rough:.75});
  const lamp=spriteGlow(0xffd08a,4.2,.8);lamp.position.set(0,5.95,0);g.add(lamp);
  return g;
}
export function rockCluster(count,spread,base){
  const p=[];
  for(let i=0;i<count;i++){
    const a=decoRnd()*6.28,r=decoRnd()*spread,sz=.45+decoRnd()*.95;
    const g=deform(new THREE.DodecahedronGeometry(sz,1),v=>{
      const k=1+.16*Math.sin(v.x*4+v.z*3)+.10*Math.cos(v.y*5-v.x*2);v.multiplyScalar(k);v.y*=.7;
    });
    p.push(P(g,i%2?0x8c7a72:0xa08b7b,[Math.cos(a)*r,base+decoRnd()*.4,Math.sin(a)*r],
      [decoRnd()*.5,decoRnd()*6.28,decoRnd()*.4]));
    if(i%3===0)p.push(P(new THREE.SphereGeometry(sz*.42,8,6),0x5f9a6a,
      [Math.cos(a)*r,base+sz*.5,Math.sin(a)*r],[0,0,0],[1,.28,1]));
  }
  return p;
}
