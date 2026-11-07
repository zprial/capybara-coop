/* msg.js —— 由 tools/split.mjs 生成后可自由编辑 */
import { MAX_SEATS, MAX_ROOM } from './config.js';
import { S } from './state.js';
import { NET, netSend } from './net.js';
import { buildWorld } from './world.js';
import { buy } from './sim.js';
import { startGame, resetGame, backToLobby, leaveRoom, renderWait } from './main.js';

export function broadcastRoom(){
  netSend({type:'room',members:NET.members,host:NET.uid,
    phase:NET.role==='host'?S.phase:NET.roomPhase});
}
export function onNetMessage(m){
  if(m.room!==NET.room)return;
  if(NET.role==='host'){
    if(m.type==='hello'){
      let mem=NET.members.find(x=>x.uid===m.from);
      if(!mem){
        const taken=NET.members.filter(x=>!x.spectator&&x.seat>=0).map(x=>x.seat);
        let seat=-1;
        for(let i=0;i<MAX_SEATS;i++)if(!taken.includes(i)){seat=i;break;}
        const spectator=S.phase!=='lobby'||seat<0||NET.members.length>=MAX_ROOM;
        mem={uid:m.from,name:String(m.name||'玩家').slice(0,16),
          seat:spectator?-1:seat,spectator};
        NET.members.push(mem);
        toast(mem.name+' 加入房间'+(spectator?' · 观战':''),'hot');
      }
      S.members=NET.members;
      netSend({type:'welcome',to:m.from,id:mem.seat,spectator:mem.spectator,
        host:NET.uid,members:NET.members,phase:S.phase,tick:S.tick,
        worldSeed:S.worldSeed,seats:S.seats,n:S.players.length});
      broadcastRoom();renderWait();
      // 开局后加入的人直接进观战
      if(S.phase==='playing')netSend({type:'start',worldSeed:S.worldSeed,
        seats:S.seats,n:S.players.length,members:S.members,phase:'playing'});
    }else if(m.type==='bye'){
      NET.members=NET.members.filter(x=>x.uid!==m.from);
      S.members=NET.members;broadcastRoom();renderWait();
    }else if(m.type==='input'){
      const seat=S.seats.indexOf(m.from);
      if(seat>0&&(!m.tick||m.tick>=(S.remoteInputs[seat]?.tick||0)))
        S.remoteInputs[seat]={tick:m.tick,inp:m.inp,at:performance.now()};
    }else if(m.type==='cmd'){
      const seat=S.seats.indexOf(m.from);
      if(m.cmd==='buy'&&seat>=0)buy(seat,m.item);
      else if(m.cmd==='reset'&&(m.from===NET.uid||seat>=0))resetGame();
      else if(m.cmd==='lobby'&&(m.from===NET.uid||seat>=0))backToLobby();
      else if(m.cmd==='fast')S.gameTime=Math.min(BOSS_TIME-.1,S.gameTime+m.val);
    }else if(m.type==='pong'){NET.rtt=Math.round(performance.now()-m.t);}
  }else if(NET.role==='client'){
    if(m.type==='welcome'){
      if(m.to&&m.to!==NET.uid)return;
      NET.clientId=m.id??-1;NET.spectator=!!m.spectator;
      NET.connected=true;NET.hostUid=m.host;NET.members=m.members||[];
      NET.roomPhase=m.phase||'lobby';
      if(m.worldSeed!=null&&m.worldSeed!==NET.worldSeed){
        NET.worldSeed=m.worldSeed;buildWorld(m.worldSeed);
      }
      NET.clientTick=(m.tick||0)+6;
      NET.pred=NET.spectator?null:{x:6,z:8,vx:0,vz:0,aim:0,fireCd:0,weapon:'pistol',
        recoilMul:1,pierce:0,downed:false,invuln:0,thrust:1,curX:0,curZ:0,warpCd:0};
      $('btnJoin').textContent='加入房间 · 另一台设备';
      renderWait();
      toast(NET.spectator?'👀 已加入房间 · 观战席位':'已加入房间 · '+(NET.clientId+1)+'P','hot');
    }else if(m.type==='room'){
      NET.members=m.members||[];NET.hostUid=m.host||NET.hostUid;
      NET.roomPhase=m.phase||'lobby';renderWait();
    }else if(m.type==='start'||m.type==='reset'){
      startGame(m);
    }else if(m.type==='lobby'){
      NET.members=m.members||[];NET.hostUid=m.host||NET.hostUid;
      NET.roomPhase='lobby';S=makeState();
      $('end').classList.add('hidden');$('wait').classList.remove('hidden');
      renderWait();toast('已返回候船厅','hot');
    }else if(m.type==='bye'){
      if(m.from===NET.hostUid){
        toast('房主已离开房间','hot');leaveRoom();
      }else{
        NET.members=NET.members.filter(x=>x.uid!==m.from);renderWait();
      }
    }else if(m.type==='snap'){
      delayed(()=>applySnapshot(m),NET.latency/2);
    }else if(m.type==='ping'){netSend({type:'pong',t:m.t});}
  }
}

