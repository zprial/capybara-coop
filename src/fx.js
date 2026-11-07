/* fx.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { THREE } from './three.js';
import { scene, spriteGlow } from './scene.js';
import { WEAPONS, POI_INFO, EVENT_INFO } from './config.js';
import { NET } from './net.js';
import { showEventBanner } from './hud.js';

export const particles=[],flashes=[];
export const partGeo=new THREE.SphereGeometry(.14,6,4);
export function spawnParticles(x,z,color,n,spd=4,y=.5){
  for(let i=0;i<n;i++){
    let m=particles.find(p=>!p.alive);
    if(!m){if(particles.length>260)break;
      m={mesh:new THREE.Mesh(partGeo,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false})),alive:false};
      scene.add(m.mesh);particles.push(m);}
    const a=Math.random()*6.28,s=spd*(.35+Math.random());
    m.alive=true;m.life=.35+Math.random()*.5;m.max=m.life;
    m.vx=Math.cos(a)*s;m.vz=Math.sin(a)*s;m.vy=1.5+Math.random()*3.2;
    m.mesh.position.set(x,y,z);m.mesh.material.color.setHex(color);m.mesh.material.opacity=1;
    m.mesh.scale.setScalar(.6+Math.random()*.9);m.mesh.visible=true;
  }
}
export function spawnFlash(x,z,color,size=2){
  const s=spriteGlow(color,size,.95);s.position.set(x,1.0,z);scene.add(s);
  flashes.push({s,life:.16,max:.16,size});
}
export let shake=0;
export function handleEvents(events){
  for(const e of events){
    switch(e.t){
      case 'shot': {
        if(NET.role==='client'&&e.id===NET.clientId)break; // 本地预测已放过特效
        const wp=WEAPONS[e.w]||WEAPONS.pistol;
        spawnFlash(e.x+e.dx*1.7,e.z+e.dz*1.7,wp.color,1.4+wp.recoil*.1);
        spawnParticles(e.x-e.dx*1.4,e.z-e.dz*1.4,0xdffaf4,3,3,.2);
        sfx(e.w==='cannon'?'boom':e.w==='shotgun'?'shot2':'shot');
        break;}
      case 'hit': spawnParticles(e.x,e.z,e.color||0xffd08a,4,3.5,.5);break;
      case 'kill': spawnParticles(e.x,e.z,0xffd277,14,6,.5);spawnFlash(e.x,e.z,0xffd277,2.6);sfx('kill');break;
      case 'hurt': spawnParticles(e.x,e.z,0xff5d6b,12,5,.8);shake=Math.max(shake,.5);sfx('hurt');
        toast(teamName(e.id)+'受伤！','hot');break;
      case 'down': spawnParticles(e.x,e.z,0xff4d5e,22,7,1);toast('⚠ '+teamName(e.id)+'倒地！快去救！','hot');sfx('down');break;
      case 'revive': spawnParticles(e.x,e.z,0x8ce8b0,20,6,1);toast('💛 队友已救起！','hot');sfx('buy');break;
      case 'buy': toast('🛒 '+teamName(e.id)+'买到了「'+e.name+'」','hot');sfx('buy');break;
      case 'buyFail': {
        const mine=NET.role==='client'?NET.clientId:0;
        if(e.id===mine){toast('🛒 '+e.msg,'hot');sfx('hurt');}
        break;
      }
      case 'merchant': toast('⛵ '+(e.name?e.name+' · ':'')+'商船靠港！看小地图找位置','hot');sfx('buy');break;
      case 'merchantLeave': toast('⛵ 商船离港');break;
      case 'ring': spawnParticles(e.x,e.z,0xff7a9a,16,8,1);break;
      case 'slam': spawnFlash(e.x,e.z,0xff5a72,11);shake=.9;sfx('boom');break;
      case 'boom': spawnFlash(e.x,e.z,0xff9a5a,4);spawnParticles(e.x,e.z,0xffb36b,12,7,.5);sfx('boom');break;
      case 'victory': spawnParticles(e.x,e.z,0xffd277,60,14,2);shake=1.4;sfx('buy');break;
      case 'defeat': sfx('down');break;
      /* --- 探索 / 隐藏点 / 随机事件 --- */
      case 'discover':
        toast('🧭 发现「'+e.name+'」· 探索度提升 +4 ¢','hot');sfx('kill');break;
      case 'loot': {
        const mine=NET.role==='client'?NET.clientId:0;
        if(e.id===mine){toast('✦ '+e.text,'hot');sfx('buy');}
        break;
      }
      case 'rune':
        spawnParticles(e.x,e.z,0xb98cff,26,8,1.2);spawnFlash(e.x,e.z,0xb98cff,4);
        toast('◆ 深渊符文 '+e.n+'/3 · '+(e.n>=3?'首领被提前唤醒！':'继续寻找其余符文'),'hot');
        sfx('boss');break;
      case 'poiGone': spawnParticles(e.x,e.z,POI_INFO[e.kind]?POI_INFO[e.kind].color:0xffd277,16,6,.6);break;
      case 'warp':
        spawnFlash(e.x,e.z,0x7fd8e8,7);spawnParticles(e.tx,e.tz,0x7fd8e8,22,8,.6);
        toast('🌀 漩涡把你送到了一片陌生海域','hot');sfx('buy');break;
      case 'shield': spawnParticles(e.x,e.z,0x7fd8e8,12,5,.8);break;
      case 'eventStart':
        showEventBanner(e.name,e.desc,EVENT_INFO[e.type].color);
        toast('⚡ 随机事件 · '+e.name+'：'+e.desc,'hot');sfx('boss');break;
      case 'eventEnd': hideEventBanner();break;
      case 'strike':
        spawnFlash(e.x,e.z,e.type==='meteor'?0xff9a5a:0x9fd8ff,e.r*1.6);
        spawnParticles(e.x,e.z,0xffe6a2,14,7,.5);shake=Math.max(shake,.55);sfx('boom');break;
      case 'boss':
        toast(e.early?'◆ 三枚符文集齐！深渊巨兽被提前唤醒，全队强化！':'🌑 深渊巨兽从海沟中升起！','hot');
        shake=1.5;sfx('boss');break;
    }
  }
}
export let actx=null;
export function sfx(kind){
  try{
    if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended')actx.resume();
    const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.connect(g);g.connect(actx.destination);
    let f=440,f2=180,dur=.1,type='square',vol=.05;
    if(kind==='shot'){f=620;f2=180;dur=.08;}
    else if(kind==='shot2'){f=330;f2=90;dur=.16;type='sawtooth';vol=.07;}
    else if(kind==='boom'){f=150;f2=40;dur=.32;type='sawtooth';vol=.09;}
    else if(kind==='kill'){f=520;f2=980;dur=.16;type='triangle';vol=.05;}
    else if(kind==='hurt'){f=190;f2=70;dur=.22;type='sawtooth';vol=.07;}
    else if(kind==='down'){f=260;f2=55;dur=.5;type='sawtooth';vol=.08;}
    else if(kind==='buy'){f=660;f2=1180;dur=.28;type='sine';vol=.07;}
    else if(kind==='boss'){f=90;f2=38;dur=1.1;type='sawtooth';vol=.11;}
    o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.start(t);o.stop(t+dur+.02);
  }catch(_){}
}
export function toast(msg,cls=''){
  const d=document.createElement('div');d.className='toast '+cls;d.textContent=msg;
  $('toasts').appendChild(d);setTimeout(()=>{d.style.opacity='0';d.style.transition='opacity .4s';
    setTimeout(()=>d.remove(),420);},2200);
}

