/* config.js —— 由 tools/split.mjs 生成后可自由编辑 */
export const WEAPONS={
  pistol :{name:'水豚手铳',rate:5.2,dmg:18,speed:36,spread:.025,pellets:1,recoil:3.1,life:1.5,aoe:0,color:0xffd98a},
  shotgun:{name:'双管霰弹',rate:1.8,dmg:13,speed:32,spread:.30,pellets:5,recoil:7.2,life:.85,aoe:0,color:0xffb36b},
  smg    :{name:'连发水枪',rate:10.5,dmg:10,speed:42,spread:.11,pellets:1,recoil:1.75,life:1.2,aoe:0,color:0x9fe8ff},
  cannon :{name:'深水重炮',rate:1.25,dmg:72,speed:28,spread:.02,pellets:1,recoil:10.5,life:1.6,aoe:2.6,color:0xff8c5a}
};
export const SHOP=[
  {id:'shotgun',name:'双管霰弹',ic:'▸▸',desc:'5 发扇形弹丸 · 巨大后坐推力',cost:70,kind:'weapon',val:'shotgun'},
  {id:'smg',name:'连发水枪',ic:'≋',desc:'10.5 发/秒 · 轻快连续推进',cost:150,kind:'weapon',val:'smg'},
  {id:'cannon',name:'深水重炮',ic:'◉',desc:'范围爆炸 · 一炮把船轰出去',cost:280,kind:'weapon',val:'cannon'},
  {id:'dmg',name:'淬毒弹头',ic:'✦',desc:'子弹伤害 +25%（可叠加）',cost:90,kind:'stat'},
  {id:'recoil',name:'反冲引擎',ic:'↯',desc:'后坐推力 +22%（船更快）',cost:85,kind:'stat'},
  {id:'pierce',name:'穿甲弹芯',ic:'➶',desc:'子弹额外穿透 1 个目标',cost:120,kind:'stat'},
  {id:'hull',name:'加固船板',ic:'♥',desc:'心上限 +1 并立即回复 2 心',cost:65,kind:'stat'}
];
export const MON={
  reef   :{hp:34,speed:2.7,r:.95,dmg:1,coin:7,color:0x2e6d72,eye:0xffcf72},
  spitter:{hp:52,speed:1.7,r:1.05,dmg:1,coin:13,color:0x7b4b8c,eye:0xff7bd0},
  brute  :{hp:150,speed:1.35,r:1.7,dmg:2,coin:26,color:0x8c4040,eye:0xff9a6a}
};
export const MAX_SEATS=6, MAX_ROOM=12;      // 同场最多 6 条船，房间最多 12 个连接（其余观战）
export const PCOLOR=[0xffb15c,0x6fd6ff,0x8ce8b0,0xd9b8ff,0xff8f8f,0xffd277];
export const PHEX=['#ffb15c','#6fd6ff','#8ce8b0','#d9b8ff','#ff8f8f','#ffd277'];
export const PNAME=['橙队','蓝队','绿队','紫队','红队','金队'];
export function teamName(i){return PNAME[i]||(i+1)+'队';}
export const OBSTACLES=[],THORNS=[],WORLD={seed:0,cells:[],ports:[],landmarks:[]};

/* 分区地貌 / 未知点 / 随机事件 */
export const BIOME_INFO={
  shoal :{name:'银鳞浅滩',color:'#3f9e96',tint:0x63c6b4},
  kelp  :{name:'摇曳藻林',color:'#3b8f6a',tint:0x4fa87c},
  coral :{name:'七彩珊瑚园',color:'#c9768f',tint:0xff9f9f},
  thorn :{name:'荆棘迷宫',color:'#6b4a6b',tint:0x7a4a68},
  wreck :{name:'沉船墓地',color:'#7b7566',tint:0x9a8a70},
  vent  :{name:'沸泉热流',color:'#b56b4f',tint:0xff9a5a},
  trench:{name:'幽暗海沟',color:'#334a68',tint:0x3a5a80},
  isle  :{name:'夕照列岛',color:'#c9ab74',tint:0xefd6a2}
};
export const BIOME_KEYS=Object.keys(BIOME_INFO);
export const POI_INFO={
  cache    :{name:'漂流补给箱',ic:'▣',color:0xffd277},
  wreck    :{name:'沉船遗骸',  ic:'⚓',color:0xb9a07a},
  whirlpool:{name:'传送漩涡',  ic:'◉',color:0x7fd8e8},
  shrine   :{name:'珊瑚神龛',  ic:'✧',color:0xff9ad0},
  rune     :{name:'深渊符文',  ic:'◆',color:0xb98cff}
};
export const EVENT_INFO={
  treasure:{name:'宝箱潮',  desc:'海面浮起一批补给箱，抢！',          color:'#ffd277'},
  swarm   :{name:'怪潮来袭',desc:'兽群聚集，击杀奖励翻倍',            color:'#ff8f7a'},
  storm   :{name:'落雷风暴',desc:'躲开落雷，雷后会留下贝壳币',        color:'#9fd8ff'},
  current :{name:'奇异洋流',desc:'水流推着船走，操作手感变了！',      color:'#7fe3c0'},
  ghost   :{name:'幽灵商船',desc:'限时补给站在海面浮现',              color:'#ffb15c'},
  bloom   :{name:'荆棘开花',desc:'荆棘暂时无害，靠近还能回血',        color:'#8ce8b0'},
  reveal  :{name:'海雾散去',desc:'全图线索短暂显现，记住位置！',      color:'#d9b8ff'},
  meteor  :{name:'陨石雨',  desc:'躲开落点，捡走陨晶',                color:'#ff9a5a'}
};
export const EVENT_KEYS=Object.keys(EVENT_INFO);
export const PORT_NAMES=['锚湾','落日礁','鲸骨港','雾灯渡','碎帆湾','珊瑚堤','远星泊','潮声渡'];
