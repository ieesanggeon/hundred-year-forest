const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');

const nodes=new Map();
const timers=new Map();
const eventListeners=new Map();
let timerId=0;
function element(){
  const classes=new Set(['hidden']);
  return {
    style:{setProperty(){}},
    classList:{add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key),toggle(key,on){
      const visible=on??!classes.has(key);
      if(visible)classes.add(key);else classes.delete(key);
    }},
    querySelector:element,
    getContext:()=>new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(object,key)=>object[key]||(()=>{})}),
    addEventListener(){},focus(){document.activeElement=this},blur(){if(document.activeElement===this)document.activeElement=null},plays:0,paused:true,currentTime:0,
    play(){this.plays++;this.paused=false;return Promise.resolve()},
    pause(){this.paused=true},cloneNode:element
  };
}
const document={
  querySelector(key){if(!nodes.has(key))nodes.set(key,element());return nodes.get(key)},
  querySelectorAll:()=>[],createElement:element,addEventListener(){},exitPointerLock(){}
};
const context={
  reloadCount:0,location:{reload(){context.reloadCount++}},
  document,assert,Set,Buffer,console,ThreeTest:require('three'),hash:buffer=>createHash('sha256').update(buffer).digest('hex'),
  devicePixelRatio:1,innerWidth:1280,innerHeight:720,performance,
  addEventListener(type,callback){if(!eventListeners.has(type))eventListeners.set(type,[]);eventListeners.get(type).push(callback)},
  pressKey(code,repeat=false){
    let stopped=false;
    const event={code,repeat,preventDefault(){},stopImmediatePropagation(){stopped=true}};
    for(const callback of eventListeners.get('keydown')||[]){callback(event);if(stopped)break}
  },
  requestAnimationFrame(){},matchMedia:()=>({matches:false}),
  setTimeout(callback){const id=++timerId;timers.set(id,callback);return id},
  clearTimeout(id){timers.delete(id)},localStorage:{removeItem(){}}
};
const bundle=fs.readFileSync(path.join(__dirname,'../dist/game.bundle.js'),'utf8');
const closureEnd=bundle.lastIndexOf('})();');
assert.ok(closureEnd>0);
const runtime=bundle.slice(0,closureEnd).replace(
  'new WebGLRenderer({ canvas, antialias: true })',
  '{shadowMap:{},setSize(){},setPixelRatio(){},render(){}}'
);

const checks=String.raw`
floatText=()=>{};
function assertSpawnHealth(enemiesToCheck=enemies){
  const maxHit=Math.round(Number($('#attack-stat').textContent)*1.1);
  for(const enemy of enemiesToCheck){
    const min=enemy.boss?20:3,max=enemy.boss?25:5;
    assert.ok(Number.isInteger(enemy.maxHp)&&enemy.maxHp>=min*maxHit&&enemy.maxHp<=max*maxHit,enemy.type);
    assert.equal(enemy.hp,enemy.maxHp);
  }
}
assertSpawnHealth();
assert.equal(playerShield.begin(),false,'A shield cannot be used before the first castle guard kill');
assert.equal(game.running,false);
assert.equal(renderStartPanorama(0,0),0);assert.equal(Number(panoramaTransition.style.opacity),0);
assert.equal(renderStartPanorama(29,.016),0);
assert.equal(renderStartPanorama(29.99,.016),0);assert.ok(Number(panoramaTransition.style.opacity)>.99);
assert.equal(renderStartPanorama(30,.016),1);assert.equal(Number(panoramaTransition.style.opacity),1);
assert.equal(renderStartPanorama(31,.016),1);assert.equal(Number(panoramaTransition.style.opacity),0);
assert.equal(renderStartPanorama(59,.016),1);
assert.equal(renderStartPanorama(60,.016),2);assert.equal(Number(panoramaTransition.style.opacity),1);
assert.equal(renderStartPanorama(61,.016),2);assert.equal(Number(panoramaTransition.style.opacity),0);
assert.equal($('#start-screen').classList.contains('desert-panorama'),true);
assert.equal($('#start-screen').classList.contains('winter-panorama'),false);
assert.equal(renderStartPanorama(89,.016),2);
assert.equal(renderStartPanorama(90,.016),0);
assert.equal($('#start-screen').classList.contains('desert-panorama'),false);
assert.equal(renderStartPanorama(120,.016),1);
assert.equal(renderStartPanorama(150,.016),2);
const snowPanoramaObjects=snowPanorama.scene.children.length;
assert.ok(snowPanorama.scene.getObjectByName('panorama-glacier'));
assert.ok(snowPanorama.scene.getObjectByName('flowing-snow-river'));
assert.ok(snowPanorama.scene.getObjectByName('panorama-snowfall'));
snowPanorama.scene.traverse(object=>{
  if(object.geometry?.attributes.position)assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
  if(object.isInstancedMesh)assert.ok(object.instanceMatrix.array.every(Number.isFinite));
});
const mammothHead=snowPanorama.scene.getObjectByName('drinking-mammoth-head');
snowPanorama.update(0);const headAtStart=mammothHead.rotation.z;
snowPanorama.update(2);assert.notEqual(mammothHead.rotation.z,headAtStart);
snowPanorama.update(8);assert.ok(Math.abs(mammothHead.rotation.z-headAtStart)<1e-10);
renderStartPanorama(180,.016);assert.equal(snowPanorama.scene.children.length,snowPanoramaObjects);
const desertPanoramaObjects=desertPanorama.scene.children.length;
for(const name of ['oasis-pyramids','shimmering-oasis','oasis-palms','oasis-ancient-ruins','drinking-camel','oasis-sand-drift'])assert.ok(desertPanorama.scene.getObjectByName(name));
desertPanorama.scene.traverse(object=>{
  if(object.geometry?.attributes.position)assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
  if(object.isInstancedMesh)assert.ok(object.instanceMatrix.array.every(Number.isFinite));
});
const camelNeck=desertPanorama.scene.getObjectByName('drinking-camel-neck');
desertPanorama.update(0);const camelAtStart=camelNeck.rotation.z;
desertPanorama.update(2);assert.notEqual(camelNeck.rotation.z,camelAtStart);
desertPanorama.update(8);assert.ok(Math.abs(camelNeck.rotation.z-camelAtStart)<1e-10);
assert.equal(desertPanorama.scene.children.length,desertPanoramaObjects);
const originalRender=renderer.render;
let renderedPanorama;
renderer.render=scene=>{renderedPanorama=scene};
loop(panoramaStartedAt+31000);assert.equal(renderedPanorama,snowPanorama.scene);
loop(panoramaStartedAt+61000);assert.equal(renderedPanorama,desertPanorama.scene);
loop(panoramaStartedAt+91000);assert.equal(renderedPanorama,panorama);
loop(panoramaStartedAt+151000);assert.equal(renderedPanorama,desertPanorama.scene);
renderer.render=originalRender;
$('#start-button').onclick();assert.equal(game.cutscene,true);assert.equal(panoramaTransition.hidden,true);
$('#cutscene-skip').onclick();assert.equal(game.cutscene,false);assert.equal(p.region,1);
game.running=true;game.modal=false;p.hasSword=true;
{
  const saved={level:p.level,region:p.region,skillPoints:p.skillPoints,expNeed:p.expNeed,maxHp:p.maxHp,hp:p.hp};
  const originalRandom=Math.random;
  try{
    for(const region of [1,2,3,4]){
      p.region=region;p.level=1;p.skillPoints=7;
      let rolls=0;
      Math.random=()=>[0,.25,.5,1-Number.EPSILON][rolls++];
      for(let target=2;target<=5;target++){
        const before=p.skillPoints;
        raisePlayerLevel(target);
        assert.equal(p.skillPoints-before,target-1);
      }
      assert.equal(rolls,4);
      rolls=0;
      const before=p.skillPoints;
      raisePlayerLevel(9);
      assert.equal(p.skillPoints-before,10);
      assert.equal(rolls,4);
      raisePlayerLevel(9);
      assert.equal(p.skillPoints-before,10);assert.equal(rolls,4);
    }
  }finally{
    Math.random=originalRandom;
    Object.assign(p,saved);
  }
}
function assertSpawnFacings(){
  const headings=new Set();
  for(const enemy of enemies){
    assert.ok(Math.abs(enemy.mesh.rotation.y-enemy.wander-Math.PI)<1e-10);
    headings.add(enemy.mesh.rotation.y.toFixed(4));
  }
  assert.ok(headings.size>1);
}
assertSpawnFacings();
function completeUnlock(){
  const before=portalOpenSound.plays;
  for(let i=0;i<30;i++)loop(last+33);
  assert.equal(portalOpenSound.plays,before);
  loop(last+33);
  assert.equal(portalOpenSound.plays,before+1);
  for(let i=0;i<90;i++)loop(last+33);
  assert.equal(unlockShot,0);
  assert.equal(portalOpenSound.plays,before+1);
  skills(false);
}
function walkThroughPortal(){p.x=0;p.z=-28;update(.016)}
p.level=24;p.exp=0;p.expNeed=xpNeeded(24);
gain(p.expNeed);
assert.equal(p.level,25);assert.ok(unlockShot>0);
completeUnlock();walkThroughPortal();
assert.equal(p.region,2);assert.equal(levelCap(),50);
assertSpawnHealth();
assertSpawnFacings();
assert.equal(gate.visible,true);assert.equal(portal.visible,false);
assert.equal(stageMusic[1].paused,true);assert.equal(stageMusic[2].paused,false);
p.level=49;p.exp=0;p.expNeed=xpNeeded(49);
gain(p.expNeed);assert.equal(p.level,50);assert.ok(unlockShot>0);
completeUnlock();walkThroughPortal();
assert.equal(p.region,3);assert.equal(levelCap(),75);assert.equal(swordCap(),100);
assert.equal($('#quest-detail').textContent,'몬스터를 처치해 75레벨 달성 (50/75)');
toggleDebug(true);assert.equal($('#debug-player-level').max,75);toggleDebug(false,false);
assert.equal(snowfield.root.visible,true);assert.equal(taintedScenery.visible,false);
assert.equal(gate.visible,true);assert.equal(portal.visible,false);assert.equal(stageMusic[2].paused,true);
assert.equal(stageMusic[3].paused,false);
stageMusic[3].currentTime=42;
pauseGame(true);assert.equal(stageMusic[3].paused,true);
pauseGame(false);assert.equal(stageMusic[3].paused,false);assert.equal(stageMusic[3].currentTime,42);
assert.equal(enemies.length,8);
assertSpawnHealth();
assertSpawnFacings();
const idleEnemy=enemies[0];
idleEnemy.x=-20;idleEnemy.z=-20;idleEnemy.wander=0;idleEnemy.mesh.rotation.y=-Math.PI+.02;
const beforeTurn=idleEnemy.mesh.rotation.y;
update(.1);
assert.ok(idleEnemy.mesh.rotation.y>beforeTurn);
assert.ok(idleEnemy.mesh.rotation.y-beforeTurn<.1);
assert.ok(idleEnemy.z>-20);
idleEnemy.x=p.x+3;idleEnemy.z=p.z+4;
update(.016);
assert.ok(Math.abs(idleEnemy.mesh.rotation.y-(Math.atan2(-3,-4)+Math.PI))<1e-10);
assert.ok(enemies.every(enemy=>['polarBear','snowMummy','thawedMammoth'].includes(enemy.type)));
assert.equal(snowfield.root.children.filter(child=>child.name.startsWith('sloped-ice-layer')).length,5);
for(const layer of snowfield.root.children.filter(child=>child.name.startsWith('sloped-ice-layer'))){
  assert.ok(layer.geometry.attributes.position.array.every(Number.isFinite));
}
const names=new Set(),profiles=new Set();
for(let level=50;level<=75;level++){
  names.add(SWORD_NAMES[level-1]);
  for(const firstPerson of [false,true]){
    const sword=new hero.userData.sword.constructor();
    applySwordDesign(sword,level,firstPerson);
    assert.equal(sword.children[0].name,SWORD_NAMES[level-1]);
    const vertices=sword.children[0].children[0].geometry.attributes.position.array;
    assert.ok(vertices.every(Number.isFinite));
    if(!firstPerson)profiles.add(hash(Buffer.from(vertices.buffer)));
  }
}
assert.equal(names.size,26);assert.equal(profiles.size,26);
assert.equal(new Set(SWORD_NAMES).size,125);
for(seed=0;((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296>=.01;seed++){}
spawnSnowMonster('polarBear',-20,-20);
assert.equal(enemies.at(-1).type,'thawedMammoth');
p.skills.health=1;
updateHealthBar(enemies.at(-1));
assert.equal(enemies.at(-1).hpBar.visible,true);
assert.equal(monsterNames.thawedMammoth,'해동된 메머드');
seed=1;spawnSnowMonster('polarBear',20,-20);assert.equal(enemies.at(-1).type,'polarBear');
seed=1;spawnSnowMonster('snowMummy',-20,20);assert.equal(enemies.at(-1).type,'snowMummy');
const existingSnowHealth=enemies.map(enemy=>enemy.maxHp);
p.skills.attack=49;updateSwordDesign();hud();
assert.deepEqual(enemies.map(enemy=>enemy.maxHp),existingSnowHealth);
p.x=42;p.z=27;spawnFarFromPlayer();
assert.ok(Math.hypot(enemies.at(-1).x-p.x,enemies.at(-1).z-p.z)>=24);
assert.ok(snowMonsterStats[enemies.at(-1).type]);
assertSpawnHealth([enemies.at(-1)]);
const count=snowfield.root.children.length;
toggleDebug(true);$('#debug-stage-one').onclick();
assert.equal(p.region,1);assert.equal(snowfield.root.visible,false);assert.equal(gate.visible,true);
assert.equal(stageMusic[3].paused,true);assert.equal(stageMusic[3].currentTime,0);
toggleDebug(true);$('#apply-debug').onclick();assert.equal(p.level,50);
toggleDebug(true);$('#debug-stage-two').onclick();
assert.equal(p.region,2);assert.equal(portal.visible,true);assert.equal(taintedScenery.visible,true);
toggleDebug(true);$('#debug-stage-three').onclick();
assert.equal(p.region,3);assert.equal(snowfield.root.children.length,count);
const skillPoints=p.skillPoints;
let required=0;for(let level=50;level<74;level++)required+=xpNeeded(level);
{
  const originalRandom=Math.random;
  let rolls=0;
  Math.random=()=>[0,.25,.5,.75][rolls++%4];
  try{
    gain(required);
    assert.equal(p.level,74);assert.equal(p.skillPoints,skillPoints+60);assert.equal(rolls,24);
  }finally{Math.random=originalRandom}
}
assert.equal(unlockShot,0);
assert.equal(portal.visible,false);
skills(false);p.inv=0;hurt(10000,0);
assert.equal(p.dead,true);assert.ok(Object.values(stageMusic).every(music=>music.paused));
$('#revive').onclick();assert.equal(p.dead,false);assert.equal(p.region,3);
assert.equal(stageMusic[3].paused,false);assert.equal(stageMusic[1].paused,true);assert.equal(stageMusic[2].paused,true);
update(.016);assert.ok(enemies.every(enemy=>enemy.mesh.position.toArray().every(Number.isFinite)));
gain(p.expNeed);
assert.equal(p.level,75);assert.ok(unlockShot>0);
assert.equal(portal.visible,false);
completeUnlock();assert.equal(portal.visible,true);
const pointsAtSnowCap=p.skillPoints,portalSoundsAtSnowCap=portalOpenSound.plays;
gain(p.expNeed*2);
assert.equal(p.level,75);assert.equal(p.exp,0);assert.equal(p.skillPoints,pointsAtSnowCap);
assert.equal(unlockShot,0);assert.equal(portalOpenSound.plays,portalSoundsAtSnowCap);
walkThroughPortal();
assert.equal(p.region,4);assert.equal(levelCap(),100);assert.equal(swordCap(),125);
assert.equal(p.level,75);assert.equal(p.expNeed,xpNeeded(75));
assert.equal($('#quest-detail').textContent,'사막 몬스터를 처치해 100레벨 달성 (75/100)');
pressKey('Enter');assert.equal(game.castlePromptOpen,false);
toggleDebug(true);assert.equal($('#debug-player-level').max,100);toggleDebug(false,false);
assert.equal(mesa.root.visible,true);assert.equal(snowfield.root.visible,false);
assert.equal(taintedScenery.visible,false);assert.equal(gate.visible,false);
assert.equal(enemies.length,8);assertSpawnFacings();
assert.ok(enemies.every(enemy=>['cobra','desertScorpion'].includes(enemy.type)));
assert.equal(monsterNames.cobra,'코브라');assert.equal(monsterNames.desertScorpion,'사막전갈');
assertSpawnHealth();
assert.equal(stageMusic[4].paused,false);assert.equal(stageMusic[4].volume,.35);
assert.ok([1,2,3].every(region=>stageMusic[region].paused));
stageMusic[4].currentTime=37;
pauseGame(true);assert.equal(stageMusic[4].paused,true);
pauseGame(false);assert.equal(stageMusic[4].paused,false);assert.equal(stageMusic[4].currentTime,37);
const layers=mesa.root.children.filter(child=>child.name.startsWith('sloped-sandstone-layer'));
assert.equal(layers.length,9);
assert.equal(new Set(layers.map(layer=>Array.from(layer.geometry.attributes.color.array.slice(0,3)).join(','))).size,9);
for(const layer of layers){
  const points=layer.geometry.attributes.position;
  assert.ok(points.array.every(Number.isFinite));
  assert.ok(Math.hypot(points.getX(0)-points.getX(2),points.getZ(0)-points.getZ(2))>1);
}
const desertProfiles=new Set();
for(let level=101;level<=125;level++){
  for(const firstPerson of [false,true]){
    const sword=new hero.userData.sword.constructor();applySwordDesign(sword,level,firstPerson);
    assert.equal(sword.children[0].name,SWORD_NAMES[level-1]);
    const vertices=sword.children[0].children[0].geometry.attributes.position.array;
    assert.ok(vertices.every(Number.isFinite));
    if(!firstPerson)desertProfiles.add(hash(Buffer.from(vertices.buffer)));
  }
}
assert.equal(desertProfiles.size,25);
p.skills.attack=100;updateSwordDesign();
const beforeUpgrades=p.skillPoints;
for(let i=0;i<24;i++)spendSkillPoint('attack');
assert.equal(p.skills.attack,124);assert.equal(p.skillPoints,beforeUpgrades-24);
spendSkillPoint('attack');assert.equal(p.skillPoints,beforeUpgrades-24);
toggleDebug(true);$('#debug-sword').value='999';$('#apply-debug').onclick();
assert.equal(p.skills.attack,124);
toggleDebug(false,false);
p.x=42;p.z=27;spawnFarFromPlayer();
assert.ok(desertMonsterStats[enemies.at(-1).type]);
assert.ok(Math.hypot(enemies.at(-1).x-p.x,enemies.at(-1).z-p.z)>=24);
const mesaCount=mesa.root.children.length;
toggleDebug(true);$('#debug-stage-three').onclick();
assert.equal(p.region,3);assert.equal(portal.visible,true);assert.equal(mesa.root.visible,false);
assert.equal(stageMusic[4].paused,true);assert.equal(stageMusic[4].currentTime,0);
assert.equal(stageMusic[3].paused,false);
toggleDebug(true);$('#debug-stage-four').onclick();
assert.equal(p.region,4);assert.equal(mesa.root.children.length,mesaCount);
assert.equal(stageMusic[3].paused,true);assert.equal(stageMusic[4].paused,false);
stageMusic[4].currentTime=23;
p.inv=0;hurt(10000,0);assert.equal(p.dead,true);
assert.ok(Object.values(stageMusic).every(music=>music.paused));
$('#revive').onclick();assert.equal(p.dead,false);assert.equal(p.region,4);
assert.equal(stageMusic[4].paused,false);assert.equal(stageMusic[4].currentTime,23);
assert.ok([1,2,3].every(region=>stageMusic[region].paused));
let toCap=0;for(let level=p.level;level<100;level++)toCap+=xpNeeded(level);
gain(toCap);assert.equal(p.level,100);assert.equal(unlockShot,0);
assert.equal($('#exp-label').textContent,'MAX LEVEL');
assert.equal($('#quest-detail').textContent,'Enter · 공주 구출 출정 안내 열기');
assert.equal(game.castlePromptOpen,true);assert.equal(game.modal,true);
assert.equal($('#castle-departure').classList.contains('hidden'),false);
assert.equal($('#skill-panel').classList.contains('hidden'),true);
assert.equal(document.activeElement,$('#castle-enter'));
assert.equal(viewSword.visible,false);assert.equal(attackGauge.hidden,true);
const pausedTime=game.time,departurePosition=[p.x,p.y,p.z],departurePoints=p.skillPoints;
pressKey('KeyW');pressKey('KeyK');pressKey('KeyE');
loop(last+33);
assert.equal(game.time,pausedTime);assert.deepEqual([p.x,p.y,p.z],departurePosition);
assert.equal(game.debugOpen,false);assert.equal(game.skillPause,false);assert.equal(input.keys.size,0);
pressKey('Tab');assert.equal(document.activeElement,$('#castle-defer'));
pressKey('Enter');
assert.equal(game.castlePromptOpen,false);assert.equal(p.skillPoints,departurePoints);
assert.equal(game.levelChoice,true);assert.equal(game.skillPause,true);
skills(false);
pressKey('Enter',true);assert.equal(game.castlePromptOpen,false);
pressKey('Enter');assert.equal(game.castlePromptOpen,true);
assert.equal(game.castlePendingSkills,false);
$('#castle-enter').onclick();assert.equal(p.region,5);assert.equal(game.castlePromptOpen,false);
assert.equal(castleStage.root.visible,true);assert.equal(p.z,castleStage.spawn.z);assert.equal(game.modal,false);
toggleDebug(true);$('#debug-stage-four').onclick();assert.equal(p.region,4);assert.equal(castleStage.root.visible,false);
pressKey('NumpadEnter');assert.equal(game.castlePromptOpen,true);
$('#castle-defer').onclick();assert.equal(game.modal,false);
const pointsAtMesaCap=p.skillPoints;
gain(p.expNeed*2);
assert.equal(p.level,100);assert.equal(p.exp,0);assert.equal(p.skillPoints,pointsAtMesaCap);
skills(false);
toggleDebug(true);$('#debug-player-level').value='999';$('#apply-debug').onclick();
assert.equal(p.level,100);assert.equal(p.skillPoints,pointsAtMesaCap);
toggleDebug(false,false);
skills(false);update(.016);
assert.ok(enemies.every(enemy=>enemy.mesh.position.toArray().every(Number.isFinite)));
const hpBefore=p.maxHp;
p.hp=p.maxHp-40;p.skillPoints=3;
skills(true,true);
for(let rank=1;rank<=3;rank++){
  spendSkillPoint('maxHealth');
  const bonus=5*rank*(rank+1);
  assert.equal(p.skills.maxHealth,rank);
  assert.equal(p.maxHp,hpBefore+bonus);
  assert.equal(p.hp,hpBefore-40+bonus);
  assert.equal(p.skillPoints,3-rank);
  assert.equal(game.levelChoice,rank<3);
  assert.equal($('#max-health-description').textContent,'다음 강화 최대 체력 +'+(rank+1)*10);
}
spendSkillPoint('maxHealth');assert.equal(p.maxHp,hpBefore+60);
const enhancedHp=p.maxHp;
enterMeadow();assert.equal(p.maxHp,enhancedHp);assert.equal(p.hp,enhancedHp);
enterMesa();assert.equal(p.maxHp,enhancedHp);
p.inv=0;hurt(100000,0);assert.equal(p.dead,true);
$('#revive').onclick();assert.equal(p.maxHp,enhancedHp);assert.equal(p.hp,enhancedHp);
pressKey('Enter');assert.equal(game.castlePromptOpen,true);
$('#castle-defer').onclick();
p.level=99;p.exp=0;p.expNeed=xpNeeded(99);
toggleDebug(true);$('#debug-player-level').value='100';pressKey('Enter');
assert.equal(p.level,100);assert.equal(game.debugOpen,false);assert.equal(game.castlePromptOpen,true);
assert.equal($('#castle-departure-status').textContent,'다리에서 시작해 성벽 길을 따라 정상 본관으로 올라갑니다.');
$('#castle-defer').onclick();assert.equal(game.levelChoice,true);skills(false);
enterCastle();
assert.equal(p.region,5);assert.equal(levelCap(),100);assert.equal(swordCap(),125);
assert.equal(p.x,0);assert.equal(p.z,410);assert.equal(p.y,0);
assert.equal(castleState.bossStarted,false);
const sentries=enemies.filter(enemy=>enemy.castlePost);
assert.equal(sentries.length,14);
assertSpawnHealth();
for(const enemy of sentries)assert.ok(castleStage.surfaceAt(enemy.x,enemy.z,enemy.y));
const guard=sentries[0],post=guard.castlePost;
assert.ok(sentries.every(enemy=>enemy.sniper&&!enemy.shield));
assert.ok(guard.mesh.getObjectByName('guard-sniper-rifle'));
const sniperSpot=castleStage.routePointAt(castleStage.segments[1].start+castleStage.segments[1].length/2-20);
function resetSniper(){
  Object.assign(p,{x:sniperSpot.x,y:sniperSpot.y,z:sniperSpot.z,floorY:sniperSpot.y,inv:0,hp:p.maxHp,grounded:true,vy:0});
  Object.assign(guard.sniper,{phase:'idle',remaining:0,scan:0,targeted:false});
  guard.hit=0;
}
const totalShots=()=>guardShotVoices.reduce((sum,voice)=>sum+voice.plays,0);
resetSniper();
let shotsBefore=totalShots();
updateCastleSniper(guard,.03);
assert.equal(guard.sniper.phase,'aim');assert.equal(guard.sniper.visual.laser.visible,true);
assert.equal(p.hp,p.maxHp);assert.equal(totalShots(),shotsBefore);
updateAttackGauge(performance.now());assert.equal($('#sniper-warning').classList.contains('hidden'),false);
pauseGame(true);const pausedAim=guard.sniper.remaining;loop(last+33);
assert.equal(guard.sniper.remaining,pausedAim);pauseGame(false);
for(let i=0;i<61;i++)updateCastleSniper(guard,.03);
assert.ok(p.hp<p.maxHp,'Aimed sniper shot must damage a stationary player at range');
assert.equal(totalShots(),shotsBefore+1);assert.equal(guard.sniper.visual.flash.visible,true);
assert.equal(guard.sniper.phase,'idle');assert.equal(guard.sniper.visual.laser.visible,false);
resetSniper();shotsBefore=totalShots();updateCastleSniper(guard,.03);
while(guard.sniper.remaining>.5)updateCastleSniper(guard,.03);
const lockedAim=guard.sniper.aimPoint.clone();
const sniperSegment=castleStage.segments[1];
p.x-=3*(sniperSegment.b.z-sniperSegment.a.z)/sniperSegment.length;
p.z+=3*(sniperSegment.b.x-sniperSegment.a.x)/sniperSegment.length;
assert.ok(castleStage.surfaceAt(p.x,p.z,p.floorY));
while(guard.sniper.phase==='aim')updateCastleSniper(guard,.03);
assert.ok(guard.sniper.aimPoint.equals(lockedAim));
assert.equal(p.hp,p.maxHp,'Moving away from a locked red laser must avoid the shot');
assert.equal(totalShots(),shotsBefore+1,'A missed shot still plays the supplied gun sound');
resetSniper();updateCastleSniper(guard,.03);
const coverTest=new ThreeTest.Mesh(new ThreeTest.BoxGeometry(4,5,4),new ThreeTest.MeshBasicMaterial());
coverTest.position.set((p.x+guard.x)/2,(p.y+guard.y)/2+1.5,(p.z+guard.z)/2);
castleStage.root.add(coverTest);castleStage.root.updateMatrixWorld(true);
assert.equal(sniperTrace(guard),false,'Opaque castle geometry must block sniper bullets');
shotsBefore=totalShots();
for(let i=0;i<61;i++)updateCastleSniper(guard,.03);
assert.equal(p.hp,p.maxHp);assert.equal(totalShots(),shotsBefore+1);
castleStage.root.remove(coverTest);coverTest.geometry.dispose();coverTest.material.dispose();
resetSniper();updateCastleSniper(guard,.03);game.modal=true;updateCastleSniper(guard,.03);
assert.equal(guard.sniper.phase,'idle');assert.equal(guard.sniper.visual.laser.visible,false);game.modal=false;
resetSniper();p.y+=10;p.floorY=p.y;updateCastleSniper(guard,.03);
assert.equal(guard.sniper.phase,'idle','Guards cannot snipe through different floors');
p.x=post.x;p.z=post.z+4;p.y=post.y+10;p.floorY=p.y;
update(.03);
assert.equal(guard.x,post.x);assert.equal(guard.z,post.z);
assert.equal(guard.hpBar.visible,false);
p.y=post.y;p.floorY=p.y;p.lastSwingAt=-Infinity;game.yaw=Math.PI;
guard.blocking=false;
const guardHp=guard.hp;
attack();assert.ok(guard.hp<guardHp);
const startZ=guard.z;
update(.03);
assert.ok(guard.z<startZ&&guard.z>28,'Castle recoil stays on the elevated road');
assert.equal(guard.hpBar.visible,true);
guard.hp=1;p.x=guard.x;p.z=guard.z+3;p.lastSwingAt=-Infinity;attack();
assert.equal(guard.dead,true);assert.equal(game.respawns.length,0);
assert.equal(bossDefeatSound.plays,0,'A guard kill must not trigger the final-boss victory sound');
assert.equal(playerShield.state.unlocked,true);assert.equal(playerShield.state.tutorial,true);
assert.equal(game.shieldTutorial,true);assert.equal(game.modal,true);
assert.equal($('#shield-tutorial').classList.contains('hidden'),false);
const tutorialPosition={x:p.x,z:p.z,hp:p.hp};update(1);hurt(9999,0);
assert.equal(p.x,tutorialPosition.x);assert.equal(p.z,tutorialPosition.z);assert.equal(p.hp,tutorialPosition.hp);
skills(true,true); // A level-up choice can be waiting behind the unlock explanation.
pressKey('Enter');assert.equal(playerShield.state.tutorial,false);assert.equal(game.modal,true);
assert.equal(game.skillPause,true);assert.equal($('#skill-panel').classList.contains('hidden'),false);
skills(false);assert.equal(game.modal,false);
assert.equal($('#shield-tutorial').classList.contains('hidden'),true);
assert.equal(playerShield.unlock(),false,'Shield tutorial must appear only on the first guard kill');
assert.equal(guard.sniper.visual.laser.visible,false);
const oldLaser=guard.sniper.visual.laser;
enterCastle();
assert.equal(oldLaser.parent,null,'Leaving an encounter must remove its separate laser objects');
assert.equal(stageMusic[5].paused,false);assert.ok([1,2,3,4].every(region=>stageMusic[region].paused));
assert.ok(castleStage.routeLength>2500);assert.ok(castleStage.minimumTravelSeconds>180);
castleStage.root.traverse(object=>{
  if(object.geometry?.attributes.position)assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
  if(object.isInstancedMesh)assert.ok(object.instanceMatrix.array.every(Number.isFinite));
});
const castleObjects=castleStage.root.children.length;
castleStage.root.updateMatrixWorld(true);
const roadBlockers=[];
for(const segment of castleStage.segments){
  for(const side of [-5.5,0,5.5]){
    const nx=-(segment.b.z-segment.a.z)/segment.length,nz=(segment.b.x-segment.a.x)/segment.length;
    const start=new ThreeTest.Vector3(segment.a.x+nx*side,segment.a.y+1.4,segment.a.z+nz*side);
    const end=new ThreeTest.Vector3(segment.b.x+nx*side,segment.b.y+1.4,segment.b.z+nz*side),direction=end.clone().sub(start);
    const ray=new ThreeTest.Raycaster(start,direction.clone().normalize(),.1,direction.length()-.1);
    const hits=ray.intersectObject(castleStage.root,true).filter(hit=>!hit.object.material.transparent);
    if(hits.length)roadBlockers.push({segment:segment.index,side,object:hits[0].object.name,distance:Math.round(hits[0].distance)});
  }
}
assert.deepEqual(roadBlockers,[],'Stone geometry must not obstruct the climbing road');
const boundaryMesh=castleStage.root.getObjectByName('closed-road-boundary'),missingBoundaries=[];
assert.ok(boundaryMesh);
for(const segment of castleStage.segments)for(const t of [.08,.25,.5,.75,.92])for(const side of [-1,1]){
  const x=segment.a.x+(segment.b.x-segment.a.x)*t,z=segment.a.z+(segment.b.z-segment.a.z)*t,y=segment.a.y+(segment.b.y-segment.a.y)*t;
  const nx=-(segment.b.z-segment.a.z)/segment.length*side,nz=(segment.b.x-segment.a.x)/segment.length*side;
  if(castleStage.surfaceAt(x+nx*10,z+nz*10,y))continue;
  const ray=new ThreeTest.Raycaster(new ThreeTest.Vector3(x,y+1.2,z),new ThreeTest.Vector3(nx,0,nz),0,12);
  if(!ray.intersectObject(boundaryMesh,false).length)missingBoundaries.push({segment:segment.index,t,side});
}
assert.deepEqual(missingBoundaries,[],'Every non-route side opening needs a visible solid boundary');
for(const [index,point] of castleStage.route.slice(0,-1).entries())for(let i=0;i<12;i++){
  const angle=(i+.5)/12*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle);
  if(castleStage.surfaceAt(point.x+dx*10,point.z+dz*10,point.y))continue;
  const ray=new ThreeTest.Raycaster(new ThreeTest.Vector3(point.x,point.y+1.2,point.z),new ThreeTest.Vector3(dx,0,dz),0,13);
  assert.ok(ray.intersectObject(boundaryMesh,false).length,'Exposed corner '+index+' direction '+i+' must have a closed landing parapet');
}
assert.equal(castleStage.surfaceAt(0,415,0),null);
assert.ok(castleStage.surfaceAt(0,411,0));
const backRay=new ThreeTest.Raycaster(new ThreeTest.Vector3(0,1.2,410),new ThreeTest.Vector3(0,0,1),0,8);
assert.ok(backRay.intersectObject(boundaryMesh,false).length);
const particles=castleStage.root.getObjectByName('golden-route-particles');
for(const progress of [0,castleStage.segments[1].start-10,castleStage.segments[7].start+60]){
  castleStage.update(3,false,progress,false);assert.equal(castleStage.guidance.visible,true);
  const positions=particles.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const surface=castleStage.surfaceAt(positions.getX(i),positions.getZ(i),positions.getY(i)-.6);
    assert.ok(surface,'Guiding particles must remain over a connected road');
    assert.ok(surface.progress>=progress-10&&surface.progress<=progress+130);
    assert.ok(positions.getY(i)>surface.height&&positions.getY(i)<surface.height+2);
  }
}
const goldBefore=particles.geometry.attributes.position.array.slice();castleStage.update(4,false,0,false);
assert.notDeepEqual(particles.geometry.attributes.position.array,goldBefore);
castleStage.update(4,false,0,true);assert.equal(castleStage.guidance.visible,false);
castleStage.update(4,true,0,false);assert.equal(castleStage.guidance.visible,false);
castleState.checkpoint=1;castleState.progress=castleStage.checkpoints[1].progress+70;
p.inv=0;hurt(1000000000,0);$('#revive').onclick();
assert.equal(castleState.progress,castleStage.checkpoints[1].progress);
assert.equal(castleStage.guidance.visible,true);
const unreachable=enemies[0],unreachableHp=unreachable.hp;
p.x=unreachable.x;p.z=unreachable.z;p.y=0;p.floorY=0;p.lastSwingAt=-Infinity;attack();
assert.equal(unreachable.hp,unreachableHp);
enterCastle();
input.keys.add('KeyA');
for(let i=0;i<60;i++)update(1/30);
assert.ok(Math.abs(p.x)<=castleStage.roadHalfWidth);assert.equal(p.z,410);
enterCastle();p.inv=100000;input.keys.add('KeyW');input.keys.add('ShiftLeft');
let journeySeconds=0,hallArrivalSeconds=0;
castleJourney:for(const point of castleStage.route.slice(1)){
  let guard=0;
  while(Math.hypot(p.x-point.x,p.z-point.z)>.35){
    assert.ok(++guard<3000,'Castle road must remain connected at every landing');
    game.yaw=Math.atan2(point.x-p.x,point.z-p.z);
    update(1/30);journeySeconds+=1/30;
    if(castleState.bossStarted&&!hallArrivalSeconds)hallArrivalSeconds=journeySeconds;
    if(bossIntro.active)break castleJourney;
    assert.ok(Number.isFinite(p.y));assert.ok(p.y>=p.floorY);
  }
}
input.keys.clear();
assert.ok(journeySeconds>180);assert.ok(journeySeconds<400);
assert.ok(hallArrivalSeconds>180);
assert.ok(p.y>=169.9);assert.equal(castleState.bossStarted,true);
assert.equal($('#game-shell').classList.contains('castle-boss-active'),true);
assert.equal(castleState.checkpoint,castleStage.checkpoints.length-1);
let lord=enemies.find(enemy=>enemy.boss);
assert.equal(bossIntro.phase,'dialogue');assert.equal(game.modal,true);
assert.equal(bossBattleMusic.paused,false);assert.equal(bossBattleMusic.volume,.35);
assert.equal(stageMusic[5].paused,true);assert.equal(stageMusic[5].currentTime,0);
assert.equal($('#game-shell').classList.contains('boss-introducing'),true);
assert.equal(viewSword.visible,false);assert.equal(lord.phase,'idle');
assert.ok(lord.mesh.getObjectByName('quadruped-beast-body'));
assert.ok(lord.mesh.getObjectByName('humanoid-upper-body'));
assert.ok(lord.mesh.getObjectByName('crowned-lion-head'));
let legCount=0;lord.mesh.traverse(o=>{if(o.name.endsWith('beast-leg'))legCount++});assert.equal(legCount,4);
assertSpawnHealth([lord]);
const introPlayer={x:p.x,y:p.y,z:p.z,hp:p.hp},introHp=lord.hp,introTime=game.time;
input.keys.add('KeyW');update(1);attack();hurt(999999999,0);
assert.equal(p.x,introPlayer.x);assert.equal(p.z,introPlayer.z);assert.equal(p.hp,introPlayer.hp);
assert.equal(lord.hp,introHp);assert.equal(game.time,introTime);
const firstBossLine=$('#boss-intro-text').textContent;
bossBattleMusic.currentTime=12;
pauseGame(true);const pausedIntroPosition=camera.position.clone();loop(last+33);
assert.equal(bossBattleMusic.paused,true);
assert.ok(camera.position.equals(pausedIntroPosition));assert.equal(bossIntro.phase,'dialogue');
pauseGame(false);assert.equal(game.modal,true);assert.equal(viewSword.visible,false);
assert.equal(bossBattleMusic.paused,false);assert.equal(bossBattleMusic.currentTime,12);
pressKey('KeyE');pressKey('KeyK');assert.equal(game.debugOpen,false);assert.equal(game.skillPause,false);
pressKey('Enter');assert.notEqual($('#boss-intro-text').textContent,firstBossLine);
const roarsBefore=bossRoarSound.plays;pressKey('Enter');
assert.equal(bossIntro.phase,'reveal');assert.equal(bossRoarSound.plays,roarsBefore+1);
assert.equal($('#boss-intro-nameplate').classList.contains('hidden'),false);
assert.equal($('#boss-intro-name').textContent,CASTLE_BOSS_NAME);
pauseGame(true);assert.equal(bossRoarSound.paused,true);bossIntro.update(10);
assert.equal(bossIntro.phase,'reveal');pauseGame(false);assert.equal(bossRoarSound.paused,false);
const frozenCamera=camera.position.clone(),frozenBoss=lord.mesh.quaternion.clone();
bossIntro.update(1);update(.1);assert.ok(camera.position.equals(frozenCamera));assert.ok(lord.mesh.quaternion.equals(frozenBoss));
pressKey('Enter');assert.equal(bossIntro.phase,'reveal','Enter cannot skip the roar freeze');
bossIntro.update(2.5);assert.equal(bossIntro.active,false);assert.equal(game.modal,false);
assert.equal($('#boss-introduction').classList.contains('hidden'),true);assert.equal(bossRoarSound.paused,true);
assert.equal($('#game-shell').classList.contains('boss-introducing'),false);assert.equal(input.keys.size,0);
lord.x=0;lord.z=-91;lord.cd=0;lord.phase='idle';p.x=0;p.z=-87;p.y=170;p.floorY=170;p.inv=0;
update(.016);assert.equal(lord.phase,'windup');assert.equal(castleStage.telegraph.visible,true);
assert.equal($('#boss-hud').classList.contains('hidden'),false);
const heldWindup=lord.windup;
pauseGame(true);loop(last+33);assert.equal(lord.windup,heldWindup);pauseGame(false);
const hpBeforeCleave=p.hp;
for(let i=0;i<40;i++)update(1/30);
assert.ok(p.hp<hpBeforeCleave);
lord.phase='idle';lord.attacks=2;lord.cd=0;p.x=9;p.z=-91;p.inv=0;
update(.016);assert.equal(lord.nova,true);assert.equal(lord.phase,'windup');
lord.windup=.01;p.y=171.5;p.grounded=false;p.vy=0;
const hpBeforeNova=p.hp;update(.02);assert.equal(p.hp,hpBeforeNova);
p.y=170;p.floorY=170;p.grounded=true;p.inv=0;hurt(1000000000,0);
assert.equal(p.dead,true);assert.ok(Object.values(stageMusic).every(music=>music.paused));
assert.equal(bossBattleMusic.paused,true);
$('#revive').onclick();assert.equal(p.region,5);assert.equal(p.y,170);assert.equal(p.z,-38);
assert.equal(lord.hp,lord.maxHp);assert.equal(stageMusic[5].paused,true);
assert.equal(bossBattleMusic.paused,false);assert.equal(bossBattleMusic.currentTime,12);
assert.equal(bossIntro.active,false,'Checkpoint revival does not repeat the introduction');
assert.equal(castleStage.telegraph.visible,false);
p.x=lord.x;p.z=lord.z+3;p.y=170;p.floorY=170;game.yaw=Math.PI;p.lastSwingAt=-Infinity;
const victoriesBefore=bossDefeatSound.plays;
const lordHpBefore=lord.hp,lordZ=lord.z;attack();assert.ok(lord.hp<lordHpBefore);assert.equal(lord.z,lordZ);
assert.equal(bossDefeatSound.plays,victoriesBefore,'A nonlethal boss hit must not play the victory sound');
lord.hp=1;p.lastSwingAt=-Infinity;attack();
assert.equal(castleState.bossDefeated,true);assert.equal(lord.dead,true);assert.equal(game.respawns.length,0);
assert.equal(bossDefeatSound.plays,victoriesBefore+1);assert.equal(bossDefeatSound.volume,.75);
attack();assert.equal(bossDefeatSound.plays,victoriesBefore+1,'The same dead boss must not play the victory sound twice');
assert.equal(bossBattleMusic.paused,true);assert.equal(bossBattleMusic.currentTime,0);
assert.equal(stageMusic[5].paused,false);
assert.equal($('#game-shell').classList.contains('castle-boss-active'),false);
assert.equal(castleStage.root.getObjectByName('princess-seal').visible,false);
assert.equal($('#quest-title').textContent,'공주를 구했습니다');
toggleDebug(true);$('#debug-stage-one').onclick();assert.equal(p.region,1);assert.equal(ground.visible,true);
assert.equal(bossDefeatSound.paused,true);assert.equal(bossDefeatSound.currentTime,0);
assert.equal(castleStage.root.visible,false);assert.equal(stageMusic[5].paused,true);assert.equal(camera.far,140);
toggleDebug(true);$('#debug-castle-hall').onclick();assert.equal(p.region,5);assert.equal(p.z,-38);
assert.equal(castleStage.root.children.length,castleObjects);assert.equal(castleState.bossDefeated,false);
assert.equal(castleState.bossStarted,false);

// At the arena threshold, health uses the weapon currently equipped rather than the bridge-entry weapon.
p.skills.attack=100;updateSwordDesign();hud();p.z=-52;p.inv=0;update(.016);
assert.equal(bossIntro.phase,'dialogue');assertSpawnHealth([enemies.find(enemy=>enemy.boss)]);
bossIntro.update(4.5);assert.equal(bossIntro.phase,'dialogue');
bossIntro.update(4.5);assert.equal(bossIntro.phase,'reveal');
enterMesa();assert.equal(bossIntro.active,false);assert.equal(bossRoarSound.paused,true);
assert.equal(bossBattleMusic.paused,true);assert.equal(stageMusic[4].paused,false);
assert.equal($('#boss-introduction').classList.contains('hidden'),true);assert.equal(game.modal,false);
toggleDebug(true);$('#debug-stage-four').onclick();

// Exercise each added boss pattern separately with the other guards removed from the encounter.
function skillEncounter(skill,distance=3.5){
  enterCastle(true);p.z=-52;update(.016);bossIntro.advance();bossIntro.advance();bossIntro.update(10);
  playerShield.release();
  for(const enemy of enemies)if(!enemy.boss){enemy.dead=true;enemy.sniper.visual.laser.visible=false}
  const boss=enemies.find(enemy=>enemy.boss);
  Object.assign(p,{x:0,y:170,z:-91+distance,floorY:170,grounded:true,vy:0,inv:0,hp:10000,maxHp:10000});
  p.skills.defense=0;game.yaw=Math.PI;game.pitch=0;game.paused=false;game.modal=false;
  Object.assign(boss,{x:0,z:-91,phase:'idle',cd:999,hp:boss.maxHp,attacks:0});
  bossCombat.start(boss,skill);return boss;
}
function simulateCombat(seconds,inspect=()=>{}){
  const steps=Math.ceil(seconds*120),dt=seconds/steps;
  for(let i=0;i<steps;i++){playerShield.update(dt,true,true);update(dt);inspect()}
}

let patternBoss=skillEncounter('combo');
const comboHeading=patternBoss.lockedYaw;
simulateCombat(1.12);assert.equal(p.hp,9905);assert.equal(patternBoss.step,1);
simulateCombat(.56);assert.equal(p.hp,9790);assert.equal(patternBoss.step,2);
simulateCombat(.73);assert.equal(p.hp,9635);assert.equal(patternBoss.phase,'recover');
assert.equal(patternBoss.lockedYaw,comboHeading);
patternBoss=skillEncounter('combo');p.z=patternBoss.z-5;
simulateCombat(2.42);assert.equal(p.hp,10000,'Running behind a locked three-hit sweep avoids every slash');
patternBoss=skillEncounter('combo');playerShield.begin();
const blockedBossHp=patternBoss.hp;attack();assert.equal(patternBoss.hp,blockedBossHp,'Sword attacks cannot bypass an active guard');
simulateCombat(2.42);assert.equal(p.hp,10000);assert.equal(playerShield.state.active,true);
assert.ok(playerShield.root.visible);
console.log('Boss melee: three distinct strikes, fixed-facing dodge and shield defense passed');
patternBoss=skillEncounter('cleave');
for(const distance of [0,3.5,6,6.01,7.2])for(const turn of [0,1,2,3,4]){
  bossCombat.clear();
  Object.assign(patternBoss,{x:0,z:-91,phase:'idle',cd:0,attacks:turn,hp:patternBoss.maxHp});
  Object.assign(p,{x:0,z:-91+distance,y:170,floorY:170,inv:999});
  update(.001);
  assert.ok(['cleave','combo'].includes(patternBoss.skill),'Every pattern slot must select melee within '+distance+'m');
  if(distance>6)assert.equal(patternBoss.skill,'combo','Use the longer melee attack beyond the cleave reach');
}
for(const skill of ['nova','judgment','meteor']){
  patternBoss=skillEncounter(skill,13);
  assert.equal(patternBoss.skill,skill);simulateCombat(.1);
  Object.assign(p,{x:0,z:patternBoss.z+5,inv:999});update(.001);
  assert.ok(['cleave','combo'].includes(patternBoss.skill),'Approaching must cancel the '+skill+' windup');
  assert.ok(patternBoss.windup>1,'The replacement melee attack keeps its warning time');
  assert.equal(bossCombat.projectiles.length,0);
  assert.equal(bossCombat.root.children.filter(o=>o.name==='boss-danger-zone').length,1);
}
for(const [turn,skill] of [[2,'nova'],[3,'judgment'],[4,'meteor']]){
  patternBoss=skillEncounter('cleave',7.21);
  Object.assign(patternBoss,{phase:'idle',cd:0,attacks:turn});update(.001);
  assert.equal(patternBoss.skill,skill,'Area and ranged attacks remain available outside melee reach');
}
patternBoss=skillEncounter('combo');
const closeWindup=patternBoss.windup;simulateCombat(.2);
assert.ok(patternBoss.windup<closeWindup,'Staying close must not restart an existing melee windup');
patternBoss.phase='recover';patternBoss.windup=.6;patternBoss.cd=2;
update(.1);assert.equal(patternBoss.phase,'recover');assert.ok(patternBoss.cd>1.8);
console.log('Boss melee priority: all five slots at 0–7.2m, range edge, approach interrupts, stable melee warning and recovery passed');
patternBoss=skillEncounter('combo');p.hp=1;simulateCombat(1.12);
assert.equal(p.dead,true);assert.equal(bossCombat.root.children.length,0);revive();

patternBoss=skillEncounter('judgment',13);playerShield.begin();
const firstJudgment=patternBoss.targets.map(point=>({...point}));
simulateCombat(1.67);assert.equal(p.hp,9820,'Ground pillars cannot be stopped by a frontal shield');
assert.equal(patternBoss.step,1);assert.notDeepEqual(patternBoss.targets,firstJudgment);
p.x=patternBoss.targets[1].x;p.z=patternBoss.targets[1].z;
simulateCombat(1.02);assert.equal(p.hp,9615);assert.equal(patternBoss.phase,'recover');
patternBoss=skillEncounter('judgment',13);p.x=22;p.z=-108;
simulateCombat(2.68);assert.equal(p.hp,10000,'Both locked pillar waves can be avoided by leaving their circles');
patternBoss=skillEncounter('judgment',13);patternBoss.windup=.01;p.y=171.5;p.vy=0;p.grounded=false;
simulateCombat(.02);assert.equal(p.hp,9820,'Jumping alone does not avoid a vertical pillar');
console.log('Boss area: two marked waves, damage, movement dodge and unblockable vertical pillars passed');
patternBoss=skillEncounter('judgment',13);p.hp=1;simulateCombat(1.67);
assert.equal(p.dead,true);assert.equal(bossCombat.root.children.length,0);revive();

patternBoss=skillEncounter('meteor',20);
simulateCombat(1.37);assert.equal(bossCombat.projectiles.length,3);assert.equal(p.hp,10000,'Ranged damage starts on projectile contact rather than the cast');
simulateCombat(1.25);assert.equal(p.hp,9835);assert.ok(bossCombat.projectiles.length<3);
patternBoss=skillEncounter('meteor',20);simulateCombat(1.37);p.x=7;
simulateCombat(1.4);assert.equal(p.hp,10000,'A fired meteor volley can be sidestepped');
patternBoss=skillEncounter('meteor',20);simulateCombat(1.37);playerShield.begin();
let meteorBlocked=false;simulateCombat(1.25,()=>{if(playerShield.state.hit>0)meteorBlocked=true});
assert.equal(p.hp,10000);assert.equal(meteorBlocked,true);
patternBoss=skillEncounter('meteor',20);simulateCombat(1.37);
bossCombat.update(patternBoss,1,game.time+1);assert.equal(p.hp,9835,'Swept projectile collision prevents tunnelling over a long frame');
console.log('Boss ranged: three visible projectiles, delayed contact, sidestep, shield block and swept collision passed');
patternBoss=skillEncounter('meteor',20);p.hp=1;
assert.doesNotThrow(()=>simulateCombat(2.65));assert.equal(p.dead,true);
assert.equal(bossCombat.projectiles.length,0);assert.equal(bossCombat.root.children.length,0);revive();

patternBoss=skillEncounter('cleave');playerShield.begin();p.inv=0;
assert.equal(hurt(100,0),'blocked');assert.equal(p.hp,10000);
assert.equal(hurt(100,Math.PI),'damaged');assert.equal(p.hp,9900,'A shield protects the front rather than the back');
playerShield.release();playerShield.begin();
playerShield.update(2.99,true,true);assert.equal(playerShield.state.active,true);
playerShield.update(.02,true,true);assert.equal(playerShield.state.active,false);assert.equal(playerShield.state.exhausted,true);
assert.equal(playerShield.root.visible,false);assert.equal(playerShield.begin(),false);
playerShield.update(10,true,true);assert.equal(playerShield.begin(),false,'Holding after three seconds cannot automatically restart defense');
playerShield.release();assert.equal(playerShield.begin(),true);
playerShield.update(0,true,false);assert.equal(playerShield.thirdPerson.visible,true);assert.equal(playerShield.root.visible,false);
pauseGame(true);assert.equal(playerShield.state.active,false);pauseGame(false);
playerShield.begin();p.inv=0;hurt(99999,0,{blockable:false});assert.equal(p.dead,true);assert.equal(playerShield.state.active,false);
assert.equal(bossCombat.projectiles.length,0);assert.equal(bossCombat.root.children.length,0);
revive();assert.equal(playerShield.state.unlocked,true);assert.equal(playerShield.state.active,false);
playerShield.begin();enterMesa();assert.equal(playerShield.state.active,false);assert.equal(playerShield.state.unlocked,true);
assert.equal(bossCombat.root.children.length,0);assert.equal(bossCombat.projectiles.length,0);
console.log('Player shield: first-kill tutorial, frontal protection, three-second forced release, re-press, third-person, pause/death/stage cleanup passed');

p.level=80;p.exp=0;p.expNeed=xpNeeded(80);p.skills.exp=0;p.skillPoints=4;hud();skills(true,true);
assert.equal($('#exp-description').textContent,'현재 1.00배 · 다음 보너스 +15%');
for(const [index,expected] of [115,145,190,250].entries()){
  spendSkillPoint('exp');const before=p.exp;gain(100);
  assert.equal(p.exp-before,expected,'Each successive experience investment adds a larger bonus');
  assert.equal(p.skills.exp,index+1);assert.equal(p.skillPoints,3-index);
  assert.equal(game.levelChoice,index<3,'Accumulated points remain available for continuous clicking');
  assert.equal($('#exp-description').textContent,'현재 '+(expected/100).toFixed(2)+'배 · 다음 보너스 +'+(15*(index+2))+'%');
}
toggleDebug(true);$('#debug-exp').value='50';applyDebugSettings();toggleDebug(false);
const expBeforeHighRank=p.exp;gain(100);assert.equal(p.exp-expBeforeHighRank,19225);
assert.equal($('#exp-description').textContent,'현재 192.25배 · 다음 보너스 +765%');
console.log('Experience growth: successive +15/+30/+45/+60 percent bonuses, actual earned XP, next-upgrade label, continuous allocation and debug rank 50 passed');

const finalBoss=skillEncounter('cleave');
const princess=castleStage.princess;
Object.assign(p,{x:princess.position.x,y:170,z:princess.position.z+3,floorY:170,inv:999});
update(.01);assert.equal(princessEnding.active,false,'The princess dialogue requires defeating the final boss');
castleState.bossDefeated=true;finalBoss.dead=true;bossCombat.clear();
p.x=6;p.z=princess.position.z;update(.01);assert.equal(princessEnding.active,false,'The dialogue requires approaching the princess');
p.x=0;p.y=166;p.floorY=166;update(.01);assert.equal(princessEnding.active,false,'A different castle floor cannot start the ending');
p.y=170;p.floorY=170;p.dead=true;update(.01);assert.equal(princessEnding.active,false);p.dead=false;
pauseGame(true);update(.01);assert.equal(princessEnding.active,false);pauseGame(false);
skills(true);update(.01);assert.equal(princessEnding.active,false);skills(false);
p.z=princess.position.z+5;game.yaw=Math.PI;input.keys.add('KeyW');update(.2);
assert.equal(princessEnding.active,true);assert.equal(game.modal,true);assert.equal(input.keys.size,0);
assert.equal($('#princess-ending').classList.contains('hidden'),false);
assert.equal(viewSword.visible,false);assert.equal(playerShield.state.active,false);
const endingText=$('#princess-ending-text').textContent;
assert.equal(endingText,'당신은 100년 동안 잠들어 있었군요.');
assert.equal($('#princess-action-label').textContent,'계속');
princessEnding.returnToTitle();assert.equal(reloadCount,0,'The home screen cannot be opened before the last sentence');
const endingPosition={x:p.x,z:p.z,hp:p.hp,time:game.time},endingCamera=camera.position.clone();
input.keys.add('KeyW');update(60);hurt(999999999,0);attack();
assert.equal(p.x,endingPosition.x);assert.equal(p.z,endingPosition.z);assert.equal(p.hp,endingPosition.hp);
assert.equal(game.time,endingPosition.time);assert.ok(camera.position.equals(endingCamera));
for(const key of ['Escape','KeyK','KeyE','Space','KeyC'])pressKey(key);
assert.equal(princessEnding.active,true);assert.equal($('#princess-ending-text').textContent,endingText);
assert.equal(game.paused,false);assert.equal(game.debugOpen,false);assert.equal(game.skillPause,false);
pressKey('Enter',true);assert.equal(reloadCount,0,'An already-held Enter key must not dismiss the conversation');
assert.equal($('#princess-ending-text').textContent,endingText);
pressKey('Enter');assert.equal(reloadCount,0);assert.equal(game.running,true);
assert.equal($('#princess-ending-text').textContent,'저는 100년 동안 이 성에 갇혀 있었어요.');
pressKey('Enter',true);assert.equal($('#princess-ending-text').textContent,'저는 100년 동안 이 성에 갇혀 있었어요.');
pressKey('NumpadEnter');assert.equal(reloadCount,0);assert.equal(game.running,true);
assert.equal($('#princess-ending-text').textContent,'구하러 와 줘서 고마워요.');
assert.equal($('#princess-action-label').textContent,'홈 화면으로 돌아가기');
update(60);pressKey('Escape');assert.equal(reloadCount,0);assert.equal(princessEnding.active,true);
pressKey('Enter');assert.equal(reloadCount,1);assert.equal(game.running,false);assert.equal(princessEnding.returning,true);
assert.ok(allStageMusic.every(m=>m.paused));assert.equal(bossDefeatSound.paused,true);
pressKey('NumpadEnter');assert.equal(reloadCount,1,'Returning to the title must only reload once');
console.log('Princess ending: victory/proximity/floor gates, walking trigger, three separate Enter-driven sentences, held-key protection and home return only after the last line passed');
console.log('Castle route '+Math.round(castleStage.routeLength)+'m, conservative sprint minimum '+Math.round(castleStage.minimumTravelSeconds)+'s, measured hall arrival '+hallArrivalSeconds.toFixed(1)+'s; bridge, climb, checkpoints, boss and rescue passed');
`;
vm.runInNewContext(runtime+checks+';})();',context);
console.log('Five-stage progression, three panoramas, 125 weapons, monster behavior, music and revive passed');
