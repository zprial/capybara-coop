/* net.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { $ } from './core.js';
import { toast } from './fx.js';

export const NET={
  role:'solo',uid:Math.random().toString(36).slice(2,10),room:'capy-1',wsUrl:'',
  transport:null,clientId:1,clientTick:0,connected:false,spectator:false,
  members:[],hostUid:null,roomPhase:'lobby',inRoom:false,
  prevSnap:null,lastSnap:null,snapAt:0,snapCount:0,snapRate:0,rateAt:0,
  pred:null,predErr:0,inputHistory:new Map(),lastInput:null,
  rtt:0,pingAt:0,latency:30,seen:new Set(),worldSeed:null
};
export function makeTransport(room,wsUrl){
  const cbs=[]; let bc=null,ws=null,queue=[];
  const deliver=m=>{
    if(!m||m.from===NET.uid||m.room!==room)return;
    if(m.n){ if(NET.seen.has(m.n))return; NET.seen.add(m.n); if(NET.seen.size>400)NET.seen.clear(); }
    cbs.forEach(f=>f(m));
  };
  if(wsUrl){
    let warned=false;
    const warn=t=>{if(!warned){warned=true;toast('⚠ '+t+' · 请确认 wss:// 地址与反代 Upgrade 配置','hot');}};
    // 把房间名放进握手 URL，服务端在连接建立时即登记，避免首条消息丢失
    let target=wsUrl;
    try{const u=new URL(wsUrl,location.href);u.searchParams.set('room',room);target=u.toString();}catch(_){}
    try{ ws=new WebSocket(target);
      ws.onmessage=e=>{try{deliver(JSON.parse(e.data));}catch(_){}};
      ws.onopen=()=>{warned=false;queue.forEach(m=>ws.send(m));queue=[];};
      ws.onerror=()=>warn('中继连接失败');
      ws.onclose=()=>warn('中继已断开');
    }catch(e){ warn('中继地址无效'); }
  }else{
    try{ if('BroadcastChannel' in window){ bc=new BroadcastChannel('capy_'+room);
      bc.onmessage=e=>deliver(e.data); } }catch(_){}
    window.addEventListener('storage',e=>{
      if(!e.newValue||e.key!=='capy_msg_'+room)return;
      try{deliver(JSON.parse(e.newValue));}catch(_){}
    });
  }
  return {
    send(m){
      const msg=Object.assign({},m,{room,from:NET.uid,n:Math.random().toString(36).slice(2)});
      const raw=JSON.stringify(msg);
      if(bc){try{bc.postMessage(msg);}catch(_){}}
      if(ws){ if(ws.readyState===1)ws.send(raw); else queue.push(raw); }
      if(!wsUrl){ try{localStorage.setItem('capy_msg_'+room,raw);}catch(_){} }
    },
    onMessage(f){cbs.push(f);},
    close(){ try{bc&&bc.close();}catch(_){} try{ws&&ws.close();}catch(_){} }
  };
}
export function netSend(m){ if(NET.transport)NET.transport.send(m); }

