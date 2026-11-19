import * as THREE from 'three';
import {createCombatFeedback} from './combat-feedback.js';
import { buildForestSword } from './forest-swords.js';
import {createDarkCastle,updateDarkCastle} from './cutscene-castle.js';
import {createSnowfield,createSnowMonster,snowMonsterStats} from './snowfield.js';
import {buildSnowSword,SNOW_SWORDS} from './snow-swords.js';
import {createMesa,createDesertMonster,desertMonsterStats} from './mesa.js';
import {buildDesertSword,DESERT_SWORDS} from './desert-swords.js';
import {createSnowPanorama} from './snow-panorama.js';
import {createDesertPanorama} from './desert-panorama.js';
import {createSniperVisual} from './castle-sniper.js';
import {createCastleStage} from './castle-stage.js';
import {createCastleBoss,CASTLE_BOSS_NAME} from './castle-boss.js';
import {createCastleBossIntro} from './castle-boss-intro.js';
import {createCastleBossCombat} from './castle-boss-combat.js';
import {createPlayerShield} from './player-shield.js';
import {createPrincessEnding} from './princess-ending.js';
const $=s=>document.querySelector(s), canvas=$('#game');
try {
  localStorage.removeItem('hundred-year-forest-3d-v2');
} catch {
  // The game can start even when browser storage is unavailable.
}
const minimap=$('#minimap'),mini=minimap.getContext('2d');
const stageMusic={1:$('#stage-one-music'),2:$('#stage-two-music'),3:$('#stage-three-music'),4:$('#stage-four-music'),5:$('#stage-five-music')};
const bossBattleMusic=$('#boss-battle-music');
const allStageMusic=[...Object.values(stageMusic),bossBattleMusic];
for(const music of allStageMusic)music.volume=.35;
const levelUpSound=$('#level-up-sound');
levelUpSound.volume=.65;
const deathSound=$('#death-sound');
deathSound.volume=.7;
const portalOpenSound=$('#portal-open-sound');
portalOpenSound.volume=.7;
const bossRoarSound=$('#boss-roar-sound');
bossRoarSound.volume=.8;
const bossDefeatSound=$('#boss-defeat-sound');
bossDefeatSound.volume=.75;
let deathScreenTimer;
const guardShotVoices=Array.from({length:4},(_,i)=>i?$('#guard-shot-sound').cloneNode(true):$('#guard-shot-sound'));
let guardShotIndex=0;
function playGuardShot(distance){
  const voice=guardShotVoices[guardShotIndex++%guardShotVoices.length];
  voice.volume=Math.max(.12,.7*(1-distance/100));
  voice.currentTime=0;
  voice.play().catch(()=>{});
}
function syncStageMusic(restart=false){
  const bossBattle=p.region===5&&castleState.bossStarted&&!castleState.bossDefeated;
  const currentMusic=bossBattle?bossBattleMusic:stageMusic[p.region];
  for(const music of allStageMusic){
    if(music!==currentMusic){
      music.pause();
      music.currentTime=0;
    }
  }
  if(!currentMusic)return;
  if(!game.running||game.paused||p.dead){
    currentMusic.pause();
    return;
  }
  if(restart)currentMusic.currentTime=0;
  currentMusic.play().catch(()=>{});
}
const input={keys:new Set(),pressed:new Set(),mouse:false,drag:false,lastX:0};
const game={running:false,paused:false,skillPause:false,levelChoice:false,debugOpen:false,castlePromptOpen:false,castlePendingSkills:false,shieldTutorial:false,modal:true,cutscene:false,time:0,toast:0,levelFx:0,respawns:[],yaw:0,pitch:0,firstPerson:true};
const p={x:0,y:0,z:5,vy:0,grounded:true,facing:Math.PI,hp:100,maxHp:100,level:1,exp:0,expNeed:160,skillPoints:0,skills:{attack:0,exp:0,defense:0,health:0,maxHealth:0},hasSword:false,lastSwingAt:-Infinity,attackAnim:0,inv:0,dead:false};

// Three.js 화면과 조명
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9ed9ee);scene.fog=new THREE.Fog(0xa8d8c5,35,82);
const combatFeedback=createCombatFeedback(scene);
document.addEventListener('pointerdown',combatFeedback.unlockAudio,{passive:true});
const camera=new THREE.PerspectiveCamera(55,1,.1,140);
const ambientLight=new THREE.HemisphereLight(0xe4f7ff,0x36552c,2.2);
scene.add(ambientLight);
const sun=new THREE.DirectionalLight(0xfff0c5,3.2);sun.position.set(-20,35,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:38,bottom:-38});scene.add(sun);
scene.add(sun.target);
const M=(c,r=.82)=>new THREE.MeshStandardMaterial({color:c,roughness:r}), box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
function ball(r,m,sy=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);o.scale.y=sy;return o}
function shadows(o){o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true}});return o}

// ---------- 실시간 Three.js 시작 파노라마 ----------
const panorama=new THREE.Scene();panorama.background=new THREE.Color(0x64b9f2);panorama.fog=new THREE.Fog(0xb9e2cf,55,145);
const panoCamera=new THREE.PerspectiveCamera(44,1,.1,220);panoCamera.position.set(0,7.1,29);
panorama.add(new THREE.HemisphereLight(0xeaf9ff,0x42622c,3));const panoSun=new THREE.DirectionalLight(0xfff0bd,4.8);panoSun.position.set(-28,42,24);panoSun.castShadow=true;panoSun.shadow.mapSize.set(2048,2048);Object.assign(panoSun.shadow.camera,{left:-45,right:45,top:38,bottom:-30});panorama.add(panoSun);
// 먼 산과 구름이 계곡 뒤를 채워 빈 하늘처럼 보이지 않게 한다.
const mountainMat=M(0x638a91,1);for(let i=0;i<9;i++){const mt=new THREE.Mesh(new THREE.ConeGeometry(14+i%3*4,24+i%2*5,5),mountainMat);mt.position.set(-55+i*14,5,-85-Math.abs(4-i)*2);mt.rotation.y=i*.47;panorama.add(mt)}
for(let i=0;i<9;i++){const cloud=new THREE.Group();for(let j=0;j<5;j++){const puff=ball(2.3+Math.random()*1.5,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthWrite:false}),.65);puff.position.set(j*2.3,Math.sin(j)*.7,0);cloud.add(puff)}cloud.position.set(-42+i*11,24+Math.random()*9,-70-Math.random()*20);panorama.add(cloud)}
const panoGround=new THREE.Mesh(new THREE.PlaneGeometry(150,120,30,30),M(0x67a84f,1));panoGround.rotation.x=-Math.PI/2;panoGround.position.set(0,-.3,-25);panoGround.receiveShadow=true;panorama.add(panoGround);
const waterUniforms={time:{value:0},deep:{value:new THREE.Color(0x147fa7)},shallow:{value:new THREE.Color(0x7bdde1)}};
const waterMat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,uniforms:waterUniforms,vertexShader:`varying vec2 vUv;uniform float time;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.7+time*1.8)*.12+cos(p.y*.9-time*1.3)*.08;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 deep;uniform vec3 shallow;void main(){float a=sin(vUv.x*42.0+time*2.2+sin(vUv.y*18.0));float b=sin(vUv.y*78.0-time*4.2);float ripple=smoothstep(.45,1.0,a*.55+b*.25);vec3 c=mix(deep,shallow,.28+vUv.x*.24)+ripple*vec3(.35,.5,.52);gl_FragColor=vec4(c,.89);}`});
// 넓은 S자 계곡물: 전경은 넓고 폭포 쪽으로 갈수록 좁아진다.
const riverShape=new THREE.Shape();riverShape.moveTo(-19,34);riverShape.bezierCurveTo(-14,20,-7,9,-5,-5);riverShape.bezierCurveTo(-3,-16,1,-28,5,-42);riverShape.lineTo(18,-42);riverShape.bezierCurveTo(11,-28,8,-16,10,-5);riverShape.bezierCurveTo(12,10,14,22,15,34);riverShape.closePath();const river=new THREE.Mesh(new THREE.ShapeGeometry(riverShape,32),waterMat);river.rotation.x=-Math.PI/2;river.position.set(1,.02,0);panorama.add(river);
const fallUniforms={time:{value:0}};const fallMat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,uniforms:fallUniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv;uniform float time;void main(){float s=sin(vUv.x*85.0+sin(vUv.y*15.0)*3.0-time);float f=sin(vUv.y*110.0+time*10.0+vUv.x*12.0);float foam=smoothstep(.15,1.0,s*.45+f*.3+.3);float edge=smoothstep(0.0,.08,vUv.x)*smoothstep(1.0,.92,vUv.x);gl_FragColor=vec4(mix(vec3(.22,.67,.88),vec3(.95,1.0,1.0),.35+foam*.65),.84*edge);}`});
// 폭포 양쪽에만 암벽을 쌓아 중앙 낙수 통로가 바위에 가려지지 않게 한다.
const cliffMat=[M(0x718579,1),M(0x87998a,1),M(0x5f746a,1)];
function cliffRock(x,y,z,sx,sy,shade=0){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(4.7,1),cliffMat[shade%3]);rock.scale.set(sx,sy,1.25);rock.position.set(x,y,z);rock.rotation.set((Math.random()-.5)*.22,Math.random()*3,(Math.random()-.5)*.16);panorama.add(shadows(rock));return rock}
for(let i=0;i<7;i++){cliffRock(-14+i*3.3,6+Math.random()*3,-43-Math.random()*2,1.35+Math.random()*.45,1.4+Math.random()*.75,i);cliffRock(25+i*3.4,6+Math.random()*3,-43-Math.random()*2,1.3+Math.random()*.5,1.35+Math.random()*.8,i+1)}
// 폭포 뒤의 어두운 홈이 흰 물줄기의 윤곽을 또렷하게 만든다.
const fallGorge=box(19,15,2.5,M(0x425d55,1));fallGorge.position.set(14,7.2,-43.6);panorama.add(fallGorge);
cliffRock(5.2,12.7,-43,1.05,.8,1);cliffRock(22.8,12.9,-43,1.1,.85,2);
const waterfallGroup=new THREE.Group();waterfallGroup.position.set(14,7.4,-41.8);panorama.add(waterfallGroup);
const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(17.5,14.8,32,44),fallMat);waterfallGroup.add(waterfall);
// 서로 다른 투명도의 물막을 겹쳐 폭포가 평평한 한 장처럼 보이지 않게 한다.
[-6.2,-2.4,2.2,6.1].forEach((x,i)=>{const ribbon=new THREE.Mesh(new THREE.PlaneGeometry(3.7-i%2*.5,14.5,8,36),fallMat.clone());ribbon.material.opacity=.38;ribbon.position.set(x,.1,.18+i*.025);waterfallGroup.add(ribbon)});
const upperWater=new THREE.Mesh(new THREE.PlaneGeometry(18,12,18,16),waterMat);upperWater.rotation.x=-Math.PI/2;upperWater.position.set(14,14.85,-47.5);panorama.add(upperWater);
const lipFoam=box(17.8,.34,.5,new THREE.MeshBasicMaterial({color:0xeaffff,transparent:true,opacity:.88,depthWrite:false}));lipFoam.position.set(14,14.6,-41.35);panorama.add(lipFoam);
const fallsPool=ball(10.5,new THREE.MeshBasicMaterial({color:0xe8ffff,transparent:true,opacity:.42,depthWrite:false}),.075);fallsPool.position.set(14,.45,-31.5);panorama.add(fallsPool);
for(let i=0;i<9;i++){const foam=ball(1.2+Math.random()*1.7,new THREE.MeshBasicMaterial({color:0xf4ffff,transparent:true,opacity:.3+Math.random()*.25,depthWrite:false}),.12);foam.position.set(7+Math.random()*14,.45,-34+Math.random()*5);panorama.add(foam)}
const mistGeo=new THREE.BufferGeometry(),mistPos=[];for(let i=0;i<360;i++)mistPos.push(3+Math.random()*22,.25+Math.random()*6,-36+Math.random()*9);mistGeo.setAttribute('position',new THREE.Float32BufferAttribute(mistPos,3));const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0xf4ffff,size:.82,transparent:true,opacity:.44,depthWrite:false}));panorama.add(mist);
const panoTrees=[];function panoPine(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.3,.48,4.6,9),M(0x64412a));trunk.position.y=2.2;g.add(trunk);for(let i=0;i<4;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry(2.65-i*.35,3.5,12),M([0x246c3d,0x2f8145,0x3f9650,0x55a85b][i]));crown.position.y=4+i*1.45;g.add(crown)}panorama.add(shadows(g));panoTrees.push(g)}
function panoOak(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.52,.85,6,10),M(0x765037));trunk.position.y=3;g.add(trunk);for(let i=0;i<9;i++){const crown=ball(2.25+Math.random()*.65,M([0x3a8b44,0x55a74e,0x70bb55][i%3]),.75);crown.position.set((i%3-1)*1.8,6+Math.floor(i/3)*1.25,(i%2-.5)*1.5);g.add(crown)}panorama.add(shadows(g));panoTrees.push(g)}
for(let i=0;i<38;i++){const side=i%2?-1:1;panoPine(side*(17+Math.random()*35),-45+Math.random()*76,.7+Math.random()*1.1)}for(let i=0;i<16;i++){const side=i%2?-1:1;panoOak(side*(19+Math.random()*28),-22+Math.random()*55,.7+Math.random()*.9)}panoOak(-22,-5,2.25);panoOak(27,-12,1.55);
const grassGeo=new THREE.PlaneGeometry(.16,1.55),grassMat=new THREE.MeshBasicMaterial({color:0x6fb957,side:THREE.DoubleSide});const grassField=new THREE.InstancedMesh(grassGeo,grassMat,1100),dummy=new THREE.Object3D();for(let i=0;i<1100;i++){let x=(Math.random()-.5)*96,z=-35+Math.random()*72;if(Math.abs(x-(z*.15+2))<12) x+=x<2?-14:14;dummy.position.set(x,.62,z);dummy.rotation.y=Math.random()*Math.PI;const sc=.5+Math.random()*1.1;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();grassField.setMatrixAt(i,dummy.matrix)}panorama.add(grassField);
for(let i=0;i<75;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*1.3,0),M([0x71817a,0x86928a,0x5d7069][i%3],1));rock.scale.set(1.4,.55,1);rock.position.set((Math.random()-.5)*65,.3,-30+Math.random()*65);panorama.add(shadows(rock))}
// 꽃과 버섯을 전경에 모아 참고 이미지처럼 생기 있는 테두리를 만든다.
for(let i=0;i<120;i++){const flower=new THREE.Group(),stem=box(.035,.5,.035,M(0x3a8b3c));stem.position.y=.25;flower.add(stem);const bloom=ball(.12,M([0xf7e37f,0xf2a6c5,0xbca8f5,0xffffff][i%4]),.55);bloom.position.y=.53;flower.add(bloom);flower.position.set((i%2?-1:1)*(12+Math.random()*30),0,2+Math.random()*30);panorama.add(flower)}
for(let i=0;i<14;i++){const mush=new THREE.Group(),stem=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.55,8),M(0xf2dfbd));stem.position.y=.27;mush.add(stem);const cap=ball(.48,M(i%3?0xc83e36:0xf08a35),.32);cap.position.y=.62;mush.add(cap);mush.position.set(-14-Math.random()*25,0,-5+Math.random()*35);mush.scale.setScalar(.65+Math.random());panorama.add(mush)}
// 말은 왼쪽 물가에서 목을 완전히 숙인 채 물을 마신다.
const horse=new THREE.Group(),horseBrown=M(0xa55d35,.7),horseLight=M(0xd49a70,.75),horseDark=M(0x34231e,.9);horse.position.set(-9.5,0,-2);horse.rotation.y=-.08;const horseBody=ball(1.35,horseBrown,.72);horseBody.scale.x=1.75;horseBody.position.y=2.1;horse.add(horseBody);[-1.35,-.72,.73,1.35].forEach((x,i)=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(.15,.11,1.85,9),i<2?horseDark:horseBrown);leg.position.set(x,.9,(i%2?.42:-.42));horse.add(leg)});const neck=new THREE.Group();neck.position.set(1.55,2.35,0);const neckMesh=new THREE.Mesh(new THREE.CylinderGeometry(.34,.57,2.35,12),horseBrown);neckMesh.position.y=1.05;neck.add(neckMesh);const horseHead=ball(.52,horseBrown,.72);horseHead.scale.x=1.35;horseHead.position.set(.15,2.18,0);neck.add(horseHead);const muzzle=ball(.32,horseLight,.62);muzzle.position.set(.55,2.05,0);neck.add(muzzle);[-.18,.18].forEach(z=>{const ear=new THREE.Mesh(new THREE.ConeGeometry(.12,.42,8),horseDark);ear.position.set(-.1,2.72,z);neck.add(ear)});horse.add(neck);const mane=box(.17,2,.75,horseDark);mane.position.set(1.1,3.05,0);mane.rotation.z=-.35;horse.add(mane);const tail=new THREE.Mesh(new THREE.CylinderGeometry(.14,.035,2.1,9),horseDark);tail.position.set(-2.2,1.75,0);tail.rotation.z=-.72;horse.add(tail);panorama.add(shadows(horse));horse.userData={neck,tail};
let panoTime=0;function updatePanorama(dt){panoTime+=dt;waterUniforms.time.value=panoTime;fallUniforms.time.value=panoTime;mist.position.y=.18*Math.sin(panoTime*.65);mist.rotation.y=.02*Math.sin(panoTime*.25);horse.userData.neck.rotation.z=-2.12+Math.sin(panoTime*.75)*.045;horse.userData.tail.rotation.z=-.72+Math.sin(panoTime*1.55)*.18;grassField.rotation.z=Math.sin(panoTime*.75)*.004;panoTrees.forEach((t,i)=>t.rotation.z=Math.sin(panoTime*.5+i)*.004);panoCamera.position.x=Math.sin(panoTime*.09)*2.2;panoCamera.position.y=7.1+Math.sin(panoTime*.12)*.22;panoCamera.lookAt(1.5,4,-19)}
const snowPanorama=createSnowPanorama(),desertPanorama=createDesertPanorama(),panoramaTransition=$('#panorama-transition');
let panoramaStartedAt=performance.now();
function renderStartPanorama(elapsed,dt){
  const index=Math.floor(elapsed/30)%3,phase=elapsed%30;
  $('#start-screen').classList.toggle('winter-panorama',index===1);
  $('#start-screen').classList.toggle('desert-panorama',index===2);
  const edge=Math.min(phase,30-phase);
  panoramaTransition.style.opacity=elapsed<.65?'0':String(1-THREE.MathUtils.smoothstep(edge,0,.65));
  if(index===0){updatePanorama(dt);renderer.render(panorama,panoCamera)}
  else if(index===1){snowPanorama.update(elapsed);renderer.render(snowPanorama.scene,snowPanorama.camera)}
  else{desertPanorama.update(elapsed);renderer.render(desertPanorama.scene,desertPanorama.camera)}
  return index;
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,70),M(0x72b957,1));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const path=new THREE.Mesh(new THREE.PlaneGeometry(6,28),new THREE.MeshStandardMaterial({color:0xb7a070,roughness:1,transparent:true,opacity:.55}));path.rotation.x=-Math.PI/2;path.position.set(0,.015,-16);scene.add(path);

// 평화로운 초원과 외곽 나무 장벽
let seed=92821;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296), deco=new THREE.Group();scene.add(deco);
const leaf=[M(0x2e7438),M(0x3d8a43),M(0x4b984b)];
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);const t=box(.75,3.6,.75,M(0x765032));t.position.y=1.8;g.add(t);[[0,4,1.8],[-.9,3.55,1.35],[.9,3.55,1.35],[0,4.8,1.35]].forEach((a,i)=>{const c=ball(a[2],leaf[i%3],.82);c.position.set(a[0],a[1],0);g.add(c)});deco.add(shadows(g))}
// 외곽을 세 겹으로 두른 나무 장벽. 플레이 공간 밖이 비어 보이지 않게 한다.
for(let ring=0;ring<3;ring++){
  for(let x=-49;x<=49;x+=2.15){tree(x+(rnd()-.5)*1.5,-31.5-ring*3-rnd()*1.5,.8+rnd()*.65);tree(x+(rnd()-.5)*1.5,31.5+ring*3+rnd()*1.5,.8+rnd()*.65)}
  for(let z=-30;z<=30;z+=2.15){tree(-46-ring*3-rnd()*1.5,z+(rnd()-.5)*1.5,.8+rnd()*.65);tree(46+ring*3+rnd()*1.5,z+(rnd()-.5)*1.5,.8+rnd()*.65)}
}
function rock(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rnd()*6.28;for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry((.7+rnd()*.55)*s,0),M(i?0x687069:0x788078,1));r.scale.set(1+rnd()*.6,.65+rnd()*.35,.8+rnd()*.45);r.position.set((i-1)*.75*s,.45*s+rnd()*.2,(-.3+rnd()*.6)*s);g.add(r)}deco.add(shadows(g))}
for(let x=-44;x<=44;x+=5.5){rock(x+(rnd()-.5)*2,-30.2,.8+rnd()*.8);rock(x+(rnd()-.5)*2,30.2,.8+rnd()*.8)}
for(let z=-25;z<=25;z+=5.5){rock(-44.2,z+(rnd()-.5)*2,.8+rnd()*.8);rock(44.2,z+(rnd()-.5)*2,.8+rnd()*.8)}
for(let i=0;i<130;i++){const g=new THREE.Group();g.position.set(-42+rnd()*84,0,-27+rnd()*54);const st=box(.035,.28,.035,M(0x3c8738));st.position.y=.14;g.add(st);const f=ball(.11,M([0xffe783,0xf4a7c0,0xc8d7ff][i%3]),.5);f.position.y=.31;g.add(f);deco.add(g)}

function heroModel(){const g=new THREE.Group(),body=box(1.05,1.5,.68,M(0x294f88));body.position.y=1.45;g.add(body);const cape=box(.9,1.25,.12,M(0x8e2f35));cape.position.set(0,1.48,.42);g.add(cape);const head=ball(.48,M(0xe7be91),1.08);head.position.y=2.58;g.add(head);const hair=ball(.5,M(0x3b2b20),.62);hair.position.set(0,2.82,.03);g.add(hair);[-.3,.3].forEach(x=>{const leg=box(.27,.72,.3,M(0x292d32));leg.position.set(x,.38,0);g.add(leg)});const arm=new THREE.Group();arm.position.set(.68,1.88,0);const hand=box(.25,.75,.25,M(0xe7be91));hand.position.y=-.25;arm.add(hand);g.add(arm);const sw=new THREE.Group();sw.position.set(0,-.5,0);const grip=box(.12,.65,.12,M(0x77502c));grip.position.y=-.05;sw.add(grip);const guard=box(.65,.1,.14,M(0xd2b968));guard.position.y=.3;sw.add(guard);const blade=box(.2,1.45,.1,M(0xd5d7ce,.35));blade.position.y=1.05;sw.add(blade);arm.add(sw);g.userData={arm,sword:sw};return shadows(g)}
const hero=heroModel();scene.add(hero);scene.add(camera);
// 1인칭 전용 검: 카메라 아래에서 위로 올라오며 휘두른다.
function viewSwordModel(){const g=new THREE.Group(),hand=ball(.18,M(0xe7be91),1.3);hand.position.y=-.22;g.add(hand);const grip=box(.1,.55,.1,M(0x77502c));grip.position.y=.12;g.add(grip);const guard=box(.58,.09,.13,M(0xd2b968));guard.position.y=.4;g.add(guard);const blade=box(.17,1.3,.08,M(0xe4e3d8,.25));blade.position.y=1.08;g.add(blade);g.position.set(.72,-.82,-1.35);g.rotation.set(-.2,0,-.65);return g}
const viewSword=viewSwordModel();camera.add(viewSword);
const SWORD_NAMES=[
  '금 간 나뭇가지','묶어 만든 목검','닳은 수련검','소나무 목도','단단한 참나무검','녹슨 짧은검','이 빠진 철검','수습 기사의 검','보강된 철검','초원 수호검',
  '청동 바람검','정련 강철검','용병의 장검','은빛 사냥검','숲지기의 칼날','고블린 추적검','슬라임 절단검','달빛 철검','왕국 병사의 검','기사단 장검',
  '청람의 검','서리꽃 칼날','뇌광 철검','정령의 장검','에메랄드 엣지','푸른 맹세','별빛 파쇄검','왕실 근위검','황금 사자의 검','영웅의 성검',
  '붉은 혜성','폭풍의 심판','태양불꽃 검','달그림자 검','용아검','천둥군주의 칼날','불사조의 검','심연 절단자','별을 가르는 검','고대왕의 성검',
  '운명 파괴자','시간의 칼날','공허를 베는 자','세계수의 검','천공의 지배자','신룡의 송곳니','창세의 빛','종말의 심판검','공주를 위한 맹세','백년의 성검·에버그린'
];
const forestSwordPrefixes=['독이 밴','녹슨 맹독','가시덩굴','역병의','심록의','부패한 왕의','흑림의','독안개의','심연의','숲을 정화하는'];
const forestSwordKinds=['단검','장검','쌍날검','가시검','룬검'];
for(const prefix of forestSwordPrefixes)for(const kind of forestSwordKinds)SWORD_NAMES.push(`${prefix} ${kind}`);
SWORD_NAMES.splice(49,SNOW_SWORDS.length,...SNOW_SWORDS.map(sword=>sword.name));
SWORD_NAMES.push(...DESERT_SWORDS.map(sword=>sword.name));
function swordPalette(level){if(level<=5)return{blade:0x8b6237,edge:0xb0824d,guard:0x5c3e24,grip:0x4a321f};if(level<=10)return{blade:0x8f7862,edge:0xc39a72,guard:0x76502f,grip:0x3c2922};if(level<=20)return{blade:0xbcc4c8,edge:0xf1f4ef,guard:0x9b7942,grip:0x49332d};if(level<=30)return{blade:0x78bfe0,edge:0xd9f5ff,guard:0xd0ad4d,grip:0x21445d};if(level<=40)return{blade:0xe8b24c,edge:0xffed9e,guard:0xb94637,grip:0x61241e};if(level<50)return{blade:0x6047a8,edge:0xd9b8ff,guard:0x171628,grip:0x342255};return{blade:0xeaffff,edge:0x6effda,guard:0xffd75f,grip:0x174c43}}
function applySwordDesign(group,level,firstPerson=false){
  group.clear();
  if(level>=101){
    buildDesertSword(group,level,firstPerson);
    return;
  }
  if(level>=50&&level<=75){
    buildSnowSword(group,level,firstPerson);
    return;
  }
  if(level>50){
    buildForestSword(group,level,firstPerson);
    return;
  }
  const s=firstPerson?.78:1,pal=swordPalette(level),tier=Math.floor((level-1)/10),length=(1.05+level*.021)*s,width=(.12+level*.0032)*s;
  if(firstPerson){const hand=ball(.18*s,M(0xe7be91),1.3);hand.position.y=-.22*s;group.add(hand)}
  const grip=box((.1+level*.0008)*s,.52*s,(.1+level*.0008)*s,M(pal.grip));grip.position.y=.08*s;group.add(grip);
  for(let i=0;i<Math.min(5,tier+1);i++){const wrap=box(.13*s,.035*s,.13*s,M(i%2?pal.guard:pal.grip));wrap.position.y=(-.12+i*.095)*s;group.add(wrap)}
  const guard=box((.48+level*.012)*s,(.075+tier*.012)*s,.13*s,M(pal.guard,.5));guard.position.y=.38*s;group.add(guard);
  const blade=box(width,length,.075*s,M(pal.blade,level<6?1:.28));blade.position.y=(.43+length/2)*s;blade.rotation.z=level<6?(6-level)*.012:0;group.add(blade);
  const edge=box(Math.max(.025,width*.17),length*.96,.082*s,new THREE.MeshBasicMaterial({color:pal.edge,toneMapped:false}));edge.position.set(-width*.42,(.45+length/2)*s,0);group.add(edge);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(width*.72,.32*s,4),M(pal.edge,.25));tip.position.y=(.43+length+.16*s);tip.rotation.y=Math.PI/4;group.add(tip);
  if(level>=11){const ridge=box(.025*s,length*.82,.087*s,new THREE.MeshBasicMaterial({color:pal.edge,toneMapped:false}));ridge.position.y=(.5+length*.48)*s;group.add(ridge)}
  if(level>=16){const gem=ball((.08+level*.0015)*s,new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL((level*.073)%1,.95,.62),toneMapped:false}),.7);gem.position.set(0,.39*s,-.11*s);group.add(gem)}
  if(level>=26)[-1,1].forEach(side=>{const wing=new THREE.Mesh(new THREE.ConeGeometry(.09*s,(.24+(level-26)*.008)*s,4),M(pal.guard,.35));wing.position.set(side*(.34+level*.006)*s,.42*s,0);wing.rotation.z=side*Math.PI/2;group.add(wing)});
  if(level>=36)[-1,1].forEach(side=>{const fang=new THREE.Mesh(new THREE.ConeGeometry(.065*s,.3*s,5),M(pal.edge,.25));fang.position.set(side*width*.72,(.72+length*.44)*s,0);fang.rotation.z=side*.18;group.add(fang)});
  if(level>=46){const halo=new THREE.Mesh(new THREE.TorusGeometry(.18*s,.025*s,6,16),new THREE.MeshBasicMaterial({color:pal.edge,toneMapped:false}));halo.position.y=(.58+length*.55)*s;halo.rotation.x=Math.PI/2;group.add(halo)}
  if(level===50){[-1,1].forEach(side=>{const crown=box(.08*s,.7*s,.07*s,new THREE.MeshBasicMaterial({color:0x6effda,toneMapped:false}));crown.position.set(side*width*.9,(.7+length*.55)*s,0);crown.rotation.z=side*.28;group.add(crown)})}
}
function updateSwordDesign(){
  const level=p.skills.attack+1;
  applySwordDesign(hero.userData.sword,level,false);
  applySwordDesign(viewSword,level,true);
  hero.userData.sword.position.set(0,-.5,0);
}
function swordModel(){const g=new THREE.Group(),b=box(.18,1.6,.1,M(0xd1c9a9,.3));b.position.y=1;g.add(b);const gd=box(.65,.12,.14,M(0xc4a858));gd.position.y=.2;g.add(gd);const h=box(.12,.6,.12,M(0x754a2b));h.position.y=-.15;g.add(h);g.rotation.z=-.65;return shadows(g)}
const pickup=swordModel();pickup.position.set(4,.5,4);scene.add(pickup);const pickupLight=new THREE.PointLight(0xffda74,2.5,7);pickupLight.position.set(4,1.2,4);scene.add(pickupLight);
applySwordDesign(pickup,1,false);pickup.rotation.z=-.65;

const enemies=[];
const monsterNames={
  slime:'슬라임',
  goblin:'고블린',
  burgerSlime:'햄버거 슬라임',
  taintedKnight:'독기에 오염된 기사',
  taintedBear:'독기에 오염된 곰',
  albinoBear:'알비노 알래스카 베어',
  polarBear:snowMonsterStats.polarBear.name,
  snowMummy:snowMonsterStats.snowMummy.name,
  thawedMammoth:snowMonsterStats.thawedMammoth.name,
  cobra:desertMonsterStats.cobra.name,
  desertScorpion:desertMonsterStats.desertScorpion.name,
  castleLord:CASTLE_BOSS_NAME,
  castleGuard:'검은 성의 오염된 수비병'
};
const swordDamage=()=>Math.round(18*1.12**p.skills.attack);
const swordDamageSpread=.1;
function experienceMultiplier(){
  const rank=p.skills.exp;
  return 1+15*rank*(rank+1)/200;
}
function rollMonsterHealth(){
  const maxHit=Math.round(swordDamage()*(1+swordDamageSpread));
  const minHealth=3*maxHit,maxHealth=5*maxHit;
  return minHealth+Math.floor(Math.random()*(maxHealth-minHealth+1));
}
function rollBossHealth(){
  const maxHit=Math.round(swordDamage()*(1+swordDamageSpread));
  return maxHit*20+Math.floor(Math.random()*(maxHit*5+1));
}
function makeHealthBar(y){const root=new THREE.Group();root.position.y=y;const edge=new THREE.Mesh(new THREE.PlaneGeometry(2.35,.32),new THREE.MeshBasicMaterial({color:0xfff6c7,depthTest:false,depthWrite:false,toneMapped:false}));root.add(edge);const bg=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.22),new THREE.MeshBasicMaterial({color:0x101a13,depthTest:false,depthWrite:false,toneMapped:false}));bg.position.z=.01;root.add(bg);const fill=new THREE.Mesh(new THREE.PlaneGeometry(2.05,.14),new THREE.MeshBasicMaterial({color:0x35ff5b,depthTest:false,depthWrite:false,toneMapped:false}));fill.position.z=.02;root.add(fill);root.userData.fill=fill;root.visible=false;root.renderOrder=100;return root}
function createHealthNumber(root){
  const surface=document.createElement('canvas');
  surface.width=768;
  surface.height=192;
  const context=surface.getContext('2d');
  const texture=new THREE.CanvasTexture(surface);
  texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(3.9,.975),new THREE.MeshBasicMaterial({
    map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false
  }));
  label.position.set(0,.65,.03);
  label.renderOrder=101;
  root.add(label);
  return {label,context,texture,text:''};
}
function updateHealthBar(e){
  const root=e.hpBar;
  const showGuardHealth=!e.castlePost||
    (Math.abs(e.y-(p.floorY??0))<4&&Math.hypot(e.x-p.x,e.z-p.z)<24);
  root.visible=!!p.skills.health&&!e.dead&&!e.boss&&showGuardHealth;
  if(!root.visible)return;
  const ratio=THREE.MathUtils.clamp(e.hp/e.maxHp,0,1);
  const fill=root.userData.fill;
  fill.scale.x=ratio;
  fill.position.x=-(1-ratio)*1.025;
  fill.material.color.setHex(ratio>.55?0x35ff5b:(ratio>.25?0xffe63d:0xff3c32));
  root.quaternion.copy(e.mesh.quaternion).invert().multiply(camera.quaternion);
  const number=root.userData.number??=createHealthNumber(root);
  if(e.castlePost)number.label.material.depthTest=true;
  const text=`${Math.ceil(e.hp)} / ${e.maxHp}`;
  if(number.text===text)return;
  const ctx=number.context;
  ctx.clearRect(0,0,768,192);
  ctx.font='bold 60px "Malgun Gothic", sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.lineWidth=11;
  ctx.lineJoin='round';
  ctx.strokeStyle='#111711';
  const name=monsterNames[e.type];
  ctx.strokeText(name,384,51,730);
  ctx.fillStyle=e.type==='albinoBear'?'#c4edff':'#ffffff';
  ctx.fillText(name,384,51,730);
  ctx.strokeText(text,384,142,730);
  ctx.fillStyle='#fff9dd';
  ctx.fillText(text,384,142,730);
  number.text=text;
  number.texture.needsUpdate=true;
}
function removeEnemyMesh(enemy){
  if(enemy.sniper){
    scene.remove(enemy.sniper.visual.laser);
    enemy.sniper.visual.laser.traverse(object=>{
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
  const number=enemy.hpBar.userData.number;
  if(number){
    number.texture.dispose();
    number.label.material.dispose();
    number.label.geometry.dispose();
  }
  scene.remove(enemy.mesh);
  if(enemy.boss||enemy.castlePost){
    const geometries=new Set(),materials=new Set();
    enemy.mesh.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])materials.add(mat)}});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  }
}
function spawn(type,x,z){
  const burger=type==='slime'&&rnd()<.01;if(burger)type='burgerSlime';const gob=type==='goblin',g=new THREE.Group();
  if(gob){
    const b=box(1.15,1.15,.75,M(0x617f3e));b.position.y=.95;g.add(b);const h=ball(.58,M(0x7ca650),1.05);h.position.y=1.75;g.add(h);
    [-1,1].forEach(s=>{const ear=new THREE.Mesh(new THREE.ConeGeometry(.24,.65,3),M(0x6f9848));ear.rotation.z=s*Math.PI/2;ear.position.set(s*.7,1.82,0);g.add(ear)});
    [-.22,.22].forEach(ex=>{const white=ball(.115,M(0xf4e7bd),1.15);white.position.set(ex,1.82,-.53);g.add(white);const pupil=ball(.052,M(0x151a12));pupil.position.set(ex,1.82,-.635);g.add(pupil)});
    const club=box(.18,1.4,.18,M(0x67452d));club.rotation.z=-.35;club.position.set(.82,1.05,0);g.add(club);
  }else if(burger){
    const puddle=ball(1.05,M(0xb74c25),.12);puddle.position.y=.09;g.add(puddle);const body=new THREE.Group();g.add(body);
    const bottom=ball(.83,M(0xd9953e),.34);bottom.position.y=.42;body.add(bottom);const patty=box(1.42,.3,1.08,M(0x512c1f));patty.position.y=.72;body.add(patty);
    const cheese=box(1.25,.08,1.25,M(0xffd84c));cheese.position.y=.92;cheese.rotation.y=Math.PI/4;body.add(cheese);const lettuce=ball(.8,M(0x56a83e),.13);lettuce.position.y=1.02;body.add(lettuce);
    const top=ball(.86,M(0xe8a34a),.48);top.position.y=1.34;body.add(top);for(let i=0;i<8;i++){const sesame=ball(.035,M(0xffe7b0),.45);sesame.position.set((rnd()-.5)*.9,1.67+rnd()*.08,-.35-rnd()*.3);body.add(sesame)}
    [-.28,.28].forEach(ex=>{const white=ball(.13,M(0xfff2d5),1.1);white.position.set(ex,1.38,-.76);body.add(white);const pupil=ball(.06,M(0x25140e));pupil.position.set(ex,1.38,-.875);body.add(pupil)});
    const drips=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,d=ball(.22+rnd()*.1,M(i%2?0xffc83d:0xb84d25),.5);d.position.set(Math.sin(a)*.72,.2,Math.cos(a)*.62);g.add(d);drips.push(d)}g.userData.slime={body,puddle,drips,phase:rnd()*6.28,baseY:1,basePos:0};
  }else{
    const puddle=ball(.92,M(0x58ad46),.18);puddle.position.y=.14;g.add(puddle);const body=ball(.82,M(0x66c94f),.6);body.position.y=.58;g.add(body);
    const drips=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,d=ball(.27+rnd()*.12,M(0x60bd4b),.45);d.position.set(Math.sin(a)*.62,.22,Math.cos(a)*.55);g.add(d);drips.push(d)}
    [-.27,.27].forEach(ex=>{const white=ball(.115,M(0xe9f3d5),1.15);white.position.set(ex,.72,-.63);g.add(white);const pupil=ball(.052,M(0x16251b));pupil.position.set(ex,.72,-.74);g.add(pupil)});g.userData.slime={body,puddle,drips,phase:rnd()*6.28,baseY:.6,basePos:.51};
  }
  const hpMax=rollMonsterHealth(),damage=burger?90:(gob?14:9),hpBar=makeHealthBar(burger?2.35:(gob?2.75:1.7));g.add(hpBar);
  const cd=rnd(),wander=rnd()*Math.PI*2;
  g.position.set(x,0,z);
  g.rotation.y=wander+Math.PI;
  scene.add(shadows(g));
  enemies.push({type,x,z,mesh:g,hp:hpMax,maxHp:hpMax,hpBar,speed:gob?3.3:(burger?2.1:2.5),damage,exp:burger?240:(gob?38:24),cd,hit:0,dead:false,wander});
}
function spawnFarFromPlayer(){
  if(p.region===5)return;
  let sx=0,sz=0,best=-1;
  for(let i=0;i<50;i++){
    const x=-40+rnd()*80,z=-25+rnd()*50,distance=Math.hypot(x-p.x,z-p.z);
    if(distance>best){best=distance;sx=x;sz=z}
    if(distance>=24){sx=x;sz=z;break}
  }
  if(p.region===4){spawnDesertMonster(rnd()<.5?'cobra':'desertScorpion',sx,sz);return}
  if(p.region===3){spawnSnowMonster(rnd()<.5?'polarBear':'snowMummy',sx,sz);return}
  if(p.region===2){spawnTainted(rnd()<.5?'taintedKnight':'taintedBear',sx,sz);return}
  spawn(rnd()<.38?'goblin':'slime',sx,sz);
}
function spawnMeadowEnemies(){
  [[-13,-5],[16,-4],[-17,12],[20,14],[7,20]].forEach(v=>spawn('slime',...v));
  [[-25,4],[14,19],[27,-12],[-8,-18]].forEach(v=>spawn('goblin',...v));
}
spawnMeadowEnemies();
const gate=new THREE.Group();gate.position.set(0,0,-28.5);[-3.2,3.2].forEach(x=>{const q=box(1,5.5,1,M(0x59645a));q.position.set(x,2.75,0);gate.add(q);const c=ball(.72,M(0x778076));c.position.set(x,5.6,0);gate.add(c)});const barrier=new THREE.Mesh(new THREE.PlaneGeometry(5.3,4),new THREE.MeshBasicMaterial({color:0xc8edbb,transparent:true,opacity:.3,side:THREE.DoubleSide,wireframe:true}));barrier.position.y=2.4;gate.add(barrier);gate.userData.barrier=barrier;scene.add(shadows(gate));

p.region=1;
const regionLevelCaps={1:25,2:50,3:75,4:100,5:100};
const levelCap=()=>regionLevelCaps[p.region];
const swordCap=()=>p.region>=4?125:p.region>=2?100:50;
const xpNeeded=level=>Math.round(160*1.25**(Math.min(level,25)-1)*1.09**Math.max(0,level-25));
const venom=0xa4f346;
const portalTime={value:0};
const portal=new THREE.Mesh(new THREE.PlaneGeometry(5.35,4.7),new THREE.ShaderMaterial({
  side:THREE.DoubleSide, uniforms:{t:portalTime},
  vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 v;uniform float t;void main(){vec2 p=v-.5;float a=atan(p.y,p.x);float r=length(p);float f=sin(26.*r-4.*a+t*3.+2.*sin(12.*p.y-t));float g=sin(48.*p.x+18.*p.y+f*2.-t*4.);gl_FragColor=vec4(mix(vec3(.12,.015,.28),vec3(.94,.35,1.),pow(.5+.5*f*g,2.)),1.);}`
}));
portal.position.set(0,2.4,-28.45);scene.add(portal);
let unlockShot=0;
function configureStageGate(){
  gate.visible=p.region<4;
  portal.visible=gate.visible&&p.level>=levelCap();
  barrier.visible=!portal.visible;
  portal.scale.setScalar(1);
}
function spawnSnowMonster(type,x,z){
  if(rnd()<.01)type='thawedMammoth';
  const stats=snowMonsterStats[type];
  const {mesh,animate}=createSnowMonster(type);
  const hpBar=makeHealthBar(stats.height);
  mesh.add(hpBar);
  mesh.position.set(x,0,z);
  scene.add(mesh);
  const hp=rollMonsterHealth();
  const cd=rnd(),wander=rnd()*Math.PI*2;
  mesh.rotation.y=wander+Math.PI;
  enemies.push({
    type,x,z,mesh,hpBar,hp,maxHp:hp,speed:stats.speed,
    damage:stats.damage,exp:stats.exp,reach:stats.reach,
    cd,hit:0,dead:false,wander,animateVisual:animate
  });
}
function spawnDesertMonster(type,x,z){
  const stats=desertMonsterStats[type];
  const {mesh,animate}=createDesertMonster(type);
  const hpBar=makeHealthBar(stats.height);
  mesh.add(hpBar);
  mesh.position.set(x,0,z);
  const hp=rollMonsterHealth();
  const cd=rnd(),wander=rnd()*Math.PI*2;
  mesh.rotation.y=wander+Math.PI;
  scene.add(mesh);
  enemies.push({
    type,x,z,mesh,hpBar,hp,maxHp:hp,speed:stats.speed,
    damage:stats.damage,exp:stats.exp,reach:stats.reach,
    cd,hit:0,dead:false,wander,animateVisual:animate
  });
}
function spawnTainted(type,x,z,castlePost=null){
  if(!castlePost&&rnd()<.01)type='albinoBear';
  const knight=type==='taintedKnight'||type==='castleGuard',albino=type==='albinoBear',mesh=new THREE.Group();
  mesh.name=type;
  const armor=M(castlePost?0x60536d:0x31313a),fur=M(albino?0xffffff:0x382e28);
  const glow=new THREE.MeshBasicMaterial({color:castlePost?0xca88ff:venom});
  function part(rx,ry,rz,px,py,pz,mat){
    const obj=ball(1,mat);obj.scale.set(rx,ry,rz);obj.position.set(px,py,pz);mesh.add(obj);return obj;
  }
  const shield=box(.85,1.2,.22,M(castlePost?0x514069:0x506148,.4));
  if(knight){
    part(.64,.83,.38,0,1.45,0,armor);part(.42,.47,.41,0,2.45,-.04,armor);
    part(.26,.055,.08,0,2.49,-.42,glow);
    for(const side of [-1,1]){
      part(.24,.63,.25,side*.36,.64,0,armor);
      const arm=part(.32,.58,.26,side*.71,1.52,castlePost?-.45:0,armor);
      if(castlePost)arm.rotation.x=-.8;
    }
    if(!castlePost){
      const sword=box(.17,1.45,.12,glow);sword.position.set(-.84,1.15,-.29);mesh.add(sword,shield);
    }
  }else{
    part(.92,.96,1.38,0,1.24,0,fur);part(.69,.69,.63,0,1.5,-1.13,fur);
    part(.45,.31,.37,0,1.26,-1.59,M(albino?0xf3dddd:0x574638));
    const eyes=albino?new THREE.MeshBasicMaterial({color:0xf8909b}):glow;
    for(const side of [-1,1]){
      part(.22,.25,.2,side*.43,1.99,-1.08,fur);part(.095,.085,.07,side*.26,1.66,-1.66,eyes);
      for(const z of [-.72,.78])part(.29,.58,.34,side*.56,.56,z,fur);
      if(!albino)part(.13,.27,.36,side*.79,1.52,.15,glow);
    }
  }
  const hpBar=makeHealthBar(knight?3.15:2.65);mesh.add(hpBar);
  if(castlePost){
    hpBar.scale.setScalar(.72);
    for(const part of hpBar.children)part.material.depthTest=true;
  }
  const y=castlePost?.y??0;
  mesh.position.set(x,y,z);scene.add(shadows(mesh));
  const hp=rollMonsterHealth();
  const wander=rnd()*Math.PI*2;
  mesh.rotation.y=wander+Math.PI;
  const enemy={
    type,x,y,z,mesh,hpBar,hp,maxHp:hp,speed:knight?3.4:4.1,
    damage:castlePost?70:knight?27:albino?54:36,exp:knight?3400:albino?9000:4500,reach:castlePost?2.4:1.4,
    cd:1,hit:0,dead:false,wander,shield:knight&&!castlePost?shield:null,guardClock:rnd()*5,blocking:false,castlePost
  };
  if(castlePost){
    const visual=createSniperVisual();
    mesh.add(visual.rifle);
    scene.add(visual.laser);
    enemy.sniper={visual,phase:'idle',remaining:0,scan:0,flash:0,aimPoint:new THREE.Vector3(),targeted:false};
  }
  enemies.push(enemy);
}
function resetStageEncounter(region){
  princessEnding.cancel();
  bossDefeatSound.pause();bossDefeatSound.currentTime=0;
  playerShield.closeTutorial(false);playerShield.cancel();bossCombat.clear();
  bossIntro.cancel();
  for(const voice of guardShotVoices){voice.pause();voice.currentTime=0}
  combatFeedback.clear();
  p.region=region;
  $('#game-shell').classList.toggle('castle-region',region===5);
  $('#game-shell').classList.remove('castle-boss-active');
  if(castleStage){castleStage.root.visible=false;castleStage.telegraph.visible=false}
  $('#boss-hud').classList.add('hidden');
  snowfield.root.visible=false;
  mesa.root.visible=false;
  ground.visible=true;
  path.visible=true;
  ambientLight.color.setHex(0xe4f7ff);
  ambientLight.groundColor.setHex(0x36552c);
  ambientLight.intensity=2.2;
  p.x=0;p.y=0;p.floorY=0;p.z=5;p.vy=0;p.hp=p.maxHp;p.inv=2;
  p.grounded=true;p.attackAnim=0;p.lastSwingAt=-Infinity;
  input.keys.clear();input.pressed.clear();
  game.yaw=Math.PI;game.pitch=0;
  camera.position.set(0,2.55,5);
  camera.far=140;camera.updateProjectionMatrix();
  sun.position.set(-20,35,15);sun.target.position.set(0,0,0);
  Object.assign(sun.shadow.camera,{left:-48,right:48,top:38,bottom:-38,near:.5,far:500});sun.shadow.camera.updateProjectionMatrix();
  camera.lookAt(0,2.55,-7);
  for(const enemy of enemies)removeEnemyMesh(enemy);
  enemies.length=0;game.respawns.length=0;
}
const taintedScenery=new THREE.Group();
taintedScenery.visible=false;
scene.add(taintedScenery);
const snowfield=createSnowfield();
scene.add(snowfield.root);
const mesa=createMesa();
scene.add(mesa.root);
let castleStage=null;
const castleState={checkpoint:0,progress:0,bossStarted:false,bossDefeated:false};
const bossIntro=createCastleBossIntro({camera,sound:bossRoarSound,isPaused:()=>game.paused,
  onStart(){
    playerShield.cancel();bossCombat.clear();
    game.modal=true;input.keys.clear();input.pressed.clear();p.attackAnim=0;
    combatFeedback.clear();viewSword.visible=false;hero.visible=false;
    $('#game-shell').classList.add('boss-introducing');
    syncStageMusic(true);
    document.exitPointerLock?.();
  },
  onFinish(resume){
    game.modal=game.paused;input.keys.clear();input.pressed.clear();
    $('#game-shell').classList.remove('boss-introducing');
    camera.position.set(p.x,p.y+2.55,p.z);
    if(resume){
      game.yaw=Math.PI;game.pitch=.06;p.inv=Math.max(p.inv,1.5);
      camera.lookAt(p.x,p.y+2.55+Math.sin(game.pitch)*12,p.z-Math.cos(game.pitch)*12);
      lockMouse();
    }
  }
});
const playerShield=createPlayerShield({camera,hero,getFacing:()=>game.firstPerson?game.yaw:p.facing,
  onTutorial(){
    game.shieldTutorial=true;game.modal=true;input.keys.clear();input.pressed.clear();
    viewSword.visible=false;document.exitPointerLock?.();
  },
  onClose(restore){
    game.shieldTutorial=false;game.modal=game.paused||bossIntro.active||game.skillPause||game.debugOpen||game.castlePromptOpen;
    input.keys.clear();input.pressed.clear();
    if(restore&&!game.modal){p.inv=Math.max(p.inv,.8);lockMouse()}
  },
  onExpire(){floatText('방어 시간 종료 · 우클릭을 놓으세요','#ffc9aa')}
});
const bossCombat=createCastleBossCombat({scene,player:p,hurt,feedback:combatFeedback,getCastle:()=>castleStage});
const princessEnding=createPrincessEnding({camera,getPrincess:()=>castleStage?.princess,
  onStart(){
    game.modal=true;input.keys.clear();input.pressed.clear();p.attackAnim=0;
    playerShield.cancel();bossCombat.clear();combatFeedback.clear();
    viewSword.visible=false;hero.visible=false;
    $('#game-shell').classList.add('princess-ending-active');
    document.exitPointerLock?.();
  },
  onReturn(){
    game.running=false;game.modal=true;input.keys.clear();input.pressed.clear();
    for(const music of allStageMusic)music.pause();
    for(const voice of guardShotVoices)voice.pause();
    bossDefeatSound.pause();bossRoarSound.pause();
    document.exitPointerLock?.();
    location.reload();
  },
  onCancel(){
    $('#game-shell').classList.remove('princess-ending-active');
    game.modal=game.paused||game.skillPause||game.debugOpen||game.castlePromptOpen||bossIntro.active;
  }
});
function enterMeadow(){
  resetStageEncounter(1);
  taintedScenery.visible=false;
  deco.visible=true;
  configureStageGate();
  ground.material.color.setHex(0x72b957);path.material.color.setHex(0xb7a070);
  scene.background.setHex(0x9ed9ee);scene.fog.color.setHex(0xa8d8c5);scene.fog.near=35;scene.fog.far=82;
  sun.color.setHex(0xfff0c5);sun.intensity=3.2;
  spawnMeadowEnemies();
  syncStageMusic(true);
  hud();toast('1스테이지 · 초원의 숲');
}
function enterTaintedForest(){
  resetStageEncounter(2);
  syncStageMusic(true);
  taintedScenery.visible=true;
  deco.visible=false;
  configureStageGate();
  ground.material.color.setHex(0x323b26);path.material.color.setHex(0x454033);
  scene.background.setHex(0x394744);scene.fog.color.setHex(0x53644b);scene.fog.near=9;scene.fog.far=52;
  sun.color.setHex(0xc2d48a);sun.intensity=1.6;
  if(!taintedScenery.children.length)buildTaintedScenery();
  [[-15,-8],[17,-10],[-21,12],[23,15],[-9,-22],[10,-24]].forEach(([x,z],i)=>spawnTainted(i%2?'taintedBear':'taintedKnight',x,z));
  hud();if(game.running)toast('독기의 오염된 숲 · 성장 한도가 확장되었습니다');
}
function enterSnowfield(){
  resetStageEncounter(3);
  syncStageMusic(true);
  snowfield.root.visible=true;
  taintedScenery.visible=false;
  deco.visible=false;
  path.visible=false;
  configureStageGate();
  ground.material.color.setHex(0xe3f0f6);
  scene.background.setHex(0xaecfe3);
  scene.fog.color.setHex(0xd2e9f3);
  scene.fog.near=30;scene.fog.far=105;
  sun.color.setHex(0xd9efff);sun.intensity=2.5;
  ambientLight.color.setHex(0xf1faff);
  ambientLight.groundColor.setHex(0x8ca9ba);
  [[-15,-9],[17,-10],[-23,11],[23,16],[-7,-21],[10,-22],[-30,-17],[31,0]].forEach(([x,z],i)=>spawnSnowMonster(i%2?'snowMummy':'polarBear',x,z));
  hud();toast('3스테이지 · 만년설 분지');
}
function enterMesa(){
  resetStageEncounter(4);
  syncStageMusic();
  mesa.root.visible=true;
  taintedScenery.visible=false;
  deco.visible=false;
  path.visible=false;
  configureStageGate();
  ground.material.color.setHex(0xe2b87d);
  scene.background.setHex(0xe7c399);
  scene.fog.color.setHex(0xe5c49c);
  scene.fog.near=34;scene.fog.far=115;
  sun.color.setHex(0xffdda0);sun.intensity=2.8;
  ambientLight.color.setHex(0xffefd4);
  ambientLight.groundColor.setHex(0xa56d49);
  [[-14,-10],[15,-12],[-23,10],[24,13],[-7,-23],[10,-22],[-30,-16],[30,-1]].forEach(([x,z],i)=>spawnDesertMonster(i%2?'desertScorpion':'cobra',x,z));
  hud();toast('4스테이지 · 붉은 메사 협곡');
}
function ensureCastleStage(){
  if(!castleStage){castleStage=createCastleStage();scene.add(castleStage.root)}
  return castleStage;
}
function spawnCastleBoss(){
  const {mesh,animate}=createCastleBoss(),hpBar=makeHealthBar(10.5),hp=rollBossHealth();
  mesh.add(hpBar);mesh.position.set(0,170,-91);mesh.visible=false;scene.add(mesh);
  enemies.push({type:'castleLord',boss:true,x:0,y:170,z:-91,mesh,hpBar,hp,maxHp:hp,damage:140,speed:3.8,cd:2.2,hit:0,dead:false,phase:'idle',windup:0,attacks:0,nova:false,animateVisual:animate});
}
function spawnCastleGuards(castle){
  for(let i=1;i<castle.segments.length-1;i++){
    const segment=castle.segments[i];
    const point=castle.routePointAt(segment.start+segment.length/2);
    const side=i%2?1:-1;
    const post={x:point.x-point.tz*side*2,y:point.y,z:point.z+point.tx*side*2};
    spawnTainted('castleGuard',post.x,post.z,post);
  }
}
function enterCastle(skipToHall=false){
  const castle=ensureCastleStage();
  resetStageEncounter(5);
  castle.root.visible=true;ground.visible=false;path.visible=false;deco.visible=false;taintedScenery.visible=false;
  castleState.checkpoint=skipToHall?castle.checkpoints.length-1:0;
  castleState.progress=skipToHall?castle.checkpoints.at(-1).progress:0;
  castleState.bossStarted=false;castleState.bossDefeated=false;
  const start=skipToHall?castle.checkpoints.at(-1):castle.spawn;
  p.hasSword=true;pickup.visible=false;pickupLight.visible=false;
  p.x=start.x;p.y=start.y;p.floorY=start.y;p.z=start.z;
  game.yaw=Math.PI;game.pitch=.09;p.facing=Math.PI;
  camera.position.set(p.x,p.y+2.55,p.z);camera.far=1400;camera.updateProjectionMatrix();
  scene.background.setHex(0x30273b);scene.fog.color.setHex(0x685a76);scene.fog.near=240;scene.fog.far=1550;
  ambientLight.color.setHex(0xd0bddf);ambientLight.groundColor.setHex(0x5d4e69);ambientLight.intensity=3.1;
  sun.color.setHex(0xd1b9ef);sun.intensity=3;sun.position.set(-150,420,300);sun.target.position.set(0,170,-75);
  Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:900});sun.shadow.camera.updateProjectionMatrix();
  configureStageGate();
  spawnCastleBoss();
  spawnCastleGuards(castle);
  castle.update(game.time,false,castleState.progress,false);
  castle.root.updateMatrixWorld(true);
  syncStageMusic(true);
  hud();toast(skipToHall?'검은 성 · 본관 입구':'검은 성 · 침식된 다리에서 여정을 시작합니다');
}
function updateCastleBoss(enemy,dt){
  if(game.modal||p.dead)return;
  if(!castleState.bossStarted){
    if(!castleStage.inArena(p.x,p.y,p.z))return;
    castleState.bossStarted=true;enemy.mesh.visible=true;
    enemy.hp=enemy.maxHp=rollBossHealth();
    const dx=p.x-enemy.x,dz=p.z-enemy.z;
    enemy.mesh.rotation.y=Math.atan2(dx,dz)+Math.PI;
    $('#game-shell').classList.add('castle-boss-active');
    castleState.checkpoint=castleStage.checkpoints.length-1;
    quest();
    bossIntro.start(enemy);
    return;
  }
  if(game.modal||p.dead)return;
  bossCombat.update(enemy,dt,game.time);
  updateHealthBar(enemy);$('#boss-hud').classList.remove('hidden');
  $('#boss-hp-fill').style.width=`${Math.max(0,enemy.hp/enemy.maxHp)*100}%`;
  $('#boss-hp-label').textContent=`${Math.max(0,Math.ceil(enemy.hp))} / ${enemy.maxHp}`;
  $('#boss-action').textContent=bossCombat.action(enemy);
}
function buildTaintedScenery(){
  const bark=M(0x342b29),rot=new THREE.MeshStandardMaterial({color:0x63762d,emissive:0x617d16,emissiveIntensity:.6});
  for(let i=0;i<144;i++){
    const tree=new THREE.Group(),h=4+rnd()*6;
    const border=i<112;
    const x=border?(i<68?-49+(i%34)*2.95:(i%2?-45:45)):(rnd()-.5)*84;
    const z=border?(i<68?(i<34?-30:30):-29+Math.floor((i-68)/2)*2.7):(rnd()-.5)*52;
    if(z<-27&&Math.abs(x)<5.5)continue;
    if(!border&&Math.abs(x)<5&&Math.abs(z-5)<6)continue;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.62,h,7),bark);
    trunk.position.y=h/2;trunk.rotation.z=(rnd()-.5)*.23;tree.add(trunk);
    for(let j=0;j<4;j++){
      const branch=new THREE.Mesh(new THREE.CylinderGeometry(.025,.19,2.5,6),bark);
      branch.position.set((j%2?-1:1)*.75,h*(.55+j*.11),0);
      branch.rotation.set((rnd()-.5),0,(j%2?-1:1)*-.9);tree.add(branch);
    }
    for(let j=0;j<3;j++){
      const patch=ball(.29,rot,1.8);patch.position.set((rnd()-.5)*.5,1+rnd()*h*.65,.35);tree.add(patch);
    }
    tree.position.set(x,0,z);tree.rotation.y=rnd()*6.28;taintedScenery.add(tree);
  }
  for(let i=0;i<26;i++){
    const pool=ball(1+rnd()*2,rot,.025);pool.position.set((rnd()-.5)*86,.02,(rnd()-.5)*55);taintedScenery.add(pool);
  }
}
updateSwordDesign();hero.userData.sword.visible=p.hasSword;pickup.visible=!p.hasSword;pickupLight.visible=!p.hasSword;
portal.visible=false;
const dialogs=[['???','깨어나십시오… 오랜 잠에서 깨어날 시간입니다.'],['의문의 목소리','당신은 100년 동안 잠들어 있었습니다.'],['의문의 목소리','왕국은 어둠에 잠겼고, 공주는 검은 성에 갇혀 있습니다.'],['의문의 목소리','공주를 구하러 가야 합니다. 우선 이 숲에서 잃어버린 힘을 되찾으십시오.']];let di=0;
function showDialog(){const d=dialogs[di];$('#speaker').textContent=d[0];$('#dialog-text').textContent=d[1];$('#dialog').classList.remove('hidden');game.modal=true}
function nextDialog(){if(di<dialogs.length-1){di++;showDialog();return}$('#dialog').classList.add('hidden');game.modal=false;toast(p.hasSword?'몬스터를 처치하세요':'빛나는 목도를 찾아 E키로 주우세요');quest();lockMouse()}
const darkCastle=createDarkCastle();scene.add(darkCastle);
function setDarkCastleCutscene(active){
  darkCastle.visible=active;
  deco.visible=!active;
  gate.visible=!active;
  hero.visible=!active;
  pickup.visible=!active&&!p.hasSword;
  pickupLight.visible=!active&&!p.hasSword;
  for(const enemy of enemies)enemy.mesh.visible=!active;
  ground.material.color.setHex(active?0x11131c:0x72b957);
  path.material.color.setHex(active?0x292436:0xb7a070);
  scene.background.setHex(active?0x080a16:0x9ed9ee);
  scene.fog.color.setHex(active?0x121526:0xa8d8c5);
  scene.fog.near=active?28:35;
  scene.fog.far=active?75:82;
  sun.color.setHex(active?0x8291d5:0xfff0c5);
  sun.intensity=active?.85:3.2;
}
const cutsceneScenes=[
  {kicker:'어둠 속의 목소리',title:'눈을 뜨십시오',text:'깨어나십시오, 기사여.\n당신의 긴 잠은 이제 끝났습니다.',camera:[0,2.55,8,0,1.5,4],waking:true},
  {kicker:'잊힌 시간',title:'100년의 잠',text:'당신은 이 숲에서 100년 동안 잠들어 있었습니다.\n당신이 알던 왕국은 긴 세월 속에서 무너졌습니다.',camera:[-15,11,19,0,1,-8]},
  {kicker:'무너진 왕국',title:'사라진 빛',text:'어둠이 왕국을 집어삼켰고,\n마지막 희망인 공주는 검은 성에 붙잡혀 있습니다.',camera:[11,10,-10,0,7,-29]},
  {kicker:'당신의 사명',title:'공주를 구하라',text:'공주를 구하러 가야 합니다.\n하지만 먼저 잃어버린 힘과 검을 되찾아야 합니다.',camera:[-6,4.5,12,1,1.5,3]},
  {kicker:'첫 번째 목표',title:'초원의 목도',text:'숲 어딘가에 떨어진 목도를 찾으십시오.\n그 검이 당신의 첫걸음이 될 것입니다.',camera:[8,3.4,10,4,.8,4]}
];let cutsceneIndex=0,cutsceneCameraTarget=null;
function showCutsceneScene(){const d=cutsceneScenes[cutsceneIndex],root=$('#opening-cutscene'),copy=root.querySelector('.cutscene-copy');setDarkCastleCutscene(cutsceneIndex===2);$('#cutscene-kicker').textContent=d.kicker;$('#cutscene-title').textContent=d.title;$('#cutscene-text').textContent=d.text;root.classList.toggle('waking',!!d.waking);copy.classList.remove('changing');void copy.offsetWidth;copy.classList.add('changing');cutsceneCameraTarget=d.camera;$('#cutscene-next').innerHTML=cutsceneIndex===cutsceneScenes.length-1?'여정을 시작한다':'계속 <kbd>Enter</kbd>'}
function beginCutscene(){panoramaTransition.hidden=true;$('#start-screen').classList.add('hidden');$('#hud').classList.add('menu-hidden');$('#opening-cutscene').classList.remove('hidden');game.running=true;game.cutscene=true;game.modal=true;cutsceneIndex=0;syncStageMusic(true);document.exitPointerLock?.();showCutsceneScene()}
function finishCutscene(){setDarkCastleCutscene(false);$('#opening-cutscene').classList.add('hidden');$('#opening-cutscene').classList.remove('waking');$('#hud').classList.remove('menu-hidden');game.cutscene=false;game.modal=false;toast(p.hasSword?'몬스터를 처치하세요':'빛나는 목도를 찾아 F키로 주우세요');quest();camera.position.set(p.x,p.y+2.55,p.z);lockMouse()}
function nextCutscene(){if(!game.cutscene)return;if(cutsceneIndex<cutsceneScenes.length-1){cutsceneIndex++;showCutsceneScene()}else finishCutscene()}
function updateCutsceneCamera(dt){if(!cutsceneCameraTarget)return;const [x,y,z,lx,ly,lz]=cutsceneCameraTarget,blend=1-Math.pow(.015,dt);camera.position.lerp(new THREE.Vector3(x,y,z),blend);camera.lookAt(lx,ly,lz)}
const attackRechargeMs=1000;
const rapidSwingMs=120;
const attackGauge=$('#attack-charge');
function attackCharge(now){
  const elapsed=now-p.lastSwingAt;
  return THREE.MathUtils.clamp((elapsed-rapidSwingMs)/(attackRechargeMs-rapidSwingMs),0,1);
}
function updateAttackGauge(now){
  const targeted=game.running&&!game.paused&&!game.modal&&!p.dead&&enemies.some(e=>!e.dead&&e.sniper?.targeted);
  $('#sniper-warning').classList.toggle('hidden',!targeted);
  $('#game-shell').classList.toggle('sniper-targeted',targeted);
  attackGauge.hidden=!game.running||!p.hasSword||p.dead||game.modal||game.paused||game.cutscene||playerShield.state.active;
  if(attackGauge.hidden)return;
  const charge=attackCharge(now);
  attackGauge.style.setProperty('--attack-charge',charge);
  attackGauge.classList.toggle('charged',charge>=1);
}
function attack(){
  if(bossIntro.active||playerShield.state.active||game.shieldTutorial||princessEnding.active)return;
  if(!p.hasSword){toast('먼저 목도를 주워야 합니다');return}
  if(p.dead)return;
  const now=performance.now();
  const charge=attackCharge(now);
  p.lastSwingAt=now;
  p.attackAnim=.32;
  const plunging=!p.grounded&&p.y>(p.floorY??0)&&p.vy<0;
  p.plungingAttack=plunging;
  const power=swordDamage();
  const facing=game.firstPerson?game.yaw:p.facing;
  const fx=Math.sin(facing),fz=Math.cos(facing);
  combatFeedback.swing(p.x,p.y,p.z,facing,plunging);
  let reaction=null,cameraDirection=0;
  for(const enemy of enemies){
    if(enemy.dead||(enemy.boss&&!castleState.bossStarted)||Math.abs((enemy.y??0)-p.y)>5)continue;
    const dx=enemy.x-p.x,dz=enemy.z-p.z,distance=Math.hypot(dx,dz);
    if(distance>4.2||dx*fx+dz*fz<0)continue;
    const hitHeight=(enemy.y??0)+enemy.hpBar.position.y*.56;
    if(enemy.blocking){
      floatText('방패 방어','#c9ffac');
      combatFeedback.impact(enemy.x,hitHeight,enemy.z,'block');
      recoilEnemy(enemy,dx,dz,distance,.12,2.2);
      if(!reaction){
        reaction='block';
        cameraDirection=(dx*fz-dz*fx)/(distance||1);
      }
      continue;
    }
    const critical=plunging||Math.random()<.12;
    const multiplier=plunging?2.2:critical?1.7:1;
    const variation=1-swordDamageSpread+Math.random()*2*swordDamageSpread;
    const damage=Math.max(1,Math.round(power*multiplier*variation*charge));
    enemy.hp-=damage;
    enemy.mesh.scale.setScalar(1.18);
    if(charge>0)recoilEnemy(enemy,dx,dz,distance,(critical?.34:.24)*charge,(critical?10:6)*charge);
    combatFeedback.impact(enemy.x,hitHeight,enemy.z,critical?'critical':'hit');
    if(reaction!=='critical'){
      reaction=critical?'critical':'hit';
      cameraDirection=(dx*fz-dz*fx)/(distance||1);
    }
    floatText(plunging?`내려찍기 ${damage}!`:critical?damage+'!':String(damage),critical?'#ffad80':'#fff');
    if(enemy.hp<=0){
      enemy.dead=true;
      if(enemy.sniper){enemy.sniper.targeted=false;enemy.sniper.visual.laser.visible=false;enemy.sniper.visual.flash.visible=false}
      if(enemy.boss){
        bossDefeatSound.currentTime=0;bossDefeatSound.play().catch(()=>{});
        castleState.bossDefeated=true;castleStage.telegraph.visible=false;
        bossCombat.clear();
        syncStageMusic(true);
        $('#game-shell').classList.remove('castle-boss-active');
        $('#boss-hud').classList.add('hidden');
        toast('성주를 쓰러뜨렸습니다. 봉인이 풀린 공주에게 다가가세요!');game.toast=8;
        castleStage.update(game.time,true);quest();
      }else{
        if(!enemy.castlePost)game.respawns.push(1.25);
        gain(enemy.exp);
        if(enemy.castlePost)playerShield.unlock();
      }
    }
  }
  if(reaction)combatFeedback.react(reaction,cameraDirection,charge);
}
function recoilEnemy(enemy,dx,dz,distance,duration,speed){
  enemy.hit=duration;
  if(enemy.boss)return;
  enemy.recoilDuration=duration;
  enemy.recoilX=dx/(distance||1)*speed;
  enemy.recoilZ=dz/(distance||1)*speed;
}
function updateEnemyRecoil(enemy,dt){
  if(enemy.hit<=0)return false;
  const elapsed=Math.min(dt,enemy.hit);
  const strength=(enemy.hit-elapsed*.5)/enemy.recoilDuration;
  moveEnemy(enemy,enemy.recoilX*elapsed*strength,enemy.recoilZ*elapsed*strength);
  const yaw=enemy.mesh.rotation.y;
  enemy.mesh.rotation.x=(enemy.recoilZ*Math.cos(yaw)+enemy.recoilX*Math.sin(yaw))*strength*.044;
  enemy.mesh.rotation.z=(enemy.recoilZ*Math.sin(yaw)-enemy.recoilX*Math.cos(yaw))*strength*.044;
  enemy.hit=Math.max(0,enemy.hit-dt);
  if(!enemy.hit){enemy.mesh.rotation.x=0;enemy.mesh.rotation.z=0}
  return true;
}
function moveEnemy(enemy,dx,dz){
  if(!enemy.castlePost){
    enemy.x=THREE.MathUtils.clamp(enemy.x+dx,-43,43);
    enemy.z=THREE.MathUtils.clamp(enemy.z+dz,-28,28);
    return;
  }
  const next=castleStage.move(enemy.x,enemy.z,enemy.y,dx,dz);
  if(!next||Math.hypot(next.x-enemy.castlePost.x,next.z-enemy.castlePost.z)>16)return;
  enemy.x=next.x;enemy.y=next.height;enemy.z=next.z;
}
const sniperRay=new THREE.Raycaster();
const sniperOrigin=new THREE.Vector3(),sniperDirection=new THREE.Vector3();
const sniperClosest=new THREE.Vector3(),sniperBodyPoint=new THREE.Vector3();
function sniperTrace(enemy){
  enemy.mesh.updateMatrixWorld(true);
  enemy.sniper.visual.muzzle.getWorldPosition(sniperOrigin);
  sniperDirection.copy(enemy.sniper.aimPoint).sub(sniperOrigin).normalize();
  sniperRay.set(sniperOrigin,sniperDirection);
  sniperRay.near=.05;
  sniperRay.far=75;
  const cover=sniperRay.intersectObject(castleStage.root,true).find(hit=>hit.object.isMesh&&!hit.object.material.transparent);
  const limit=cover?cover.distance:75;
  const low=new THREE.Vector3(p.x,p.y+.45,p.z),high=new THREE.Vector3(p.x,p.y+2.1,p.z);
  const distanceSquared=sniperRay.ray.distanceSqToSegment(low,high,sniperClosest,sniperBodyPoint);
  const along=sniperClosest.clone().sub(sniperOrigin).dot(sniperDirection);
  const hitPlayer=distanceSquared<=.5*.5&&along>=0&&along<limit;
  const endpoint=hitPlayer?sniperClosest.clone():sniperOrigin.clone().addScaledVector(sniperDirection,limit);
  enemy.sniper.visual.setLaser(sniperOrigin,endpoint,game.time);
  return hitPlayer;
}
function updateCastleSniper(enemy,dt){
  const sniper=enemy.sniper,visual=sniper.visual;
  sniper.flash=Math.max(0,sniper.flash-dt);
  visual.flash.visible=sniper.flash>0;
  const recoiling=updateEnemyRecoil(enemy,dt);
  enemy.mesh.position.set(enemy.x,enemy.y,enemy.z);
  enemy.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*10);
  if(game.modal||p.dead||recoiling){
    sniper.phase='idle';sniper.remaining=1;sniper.targeted=false;visual.laser.visible=false;
    updateHealthBar(enemy);
    return;
  }
  const dx=p.x-enemy.x,dz=p.z-enemy.z,distance=Math.hypot(dx,dz);
  const eligible=distance<65&&Math.abs(enemy.y-(p.floorY??0))<4;
  sniper.remaining-=dt;
  sniper.scan-=dt;
  if(sniper.phase==='aim'){
    if(!eligible){sniper.phase='idle';sniper.remaining=1;visual.laser.visible=false;sniper.targeted=false;return}
    if(sniper.remaining>.55)sniper.aimPoint.set(p.x,p.y+1.45,p.z);
    const targetX=sniper.aimPoint.x-enemy.x,targetZ=sniper.aimPoint.z-enemy.z;
    enemy.mesh.rotation.y=Math.atan2(targetX,targetZ)+Math.PI;
    visual.rifle.rotation.x=Math.atan2(sniper.aimPoint.y-enemy.y-1.9,Math.hypot(targetX,targetZ));
    if(sniper.scan<=0){
      sniper.targeted=sniperTrace(enemy);
      sniper.scan=.15;
    }
    visual.laser.visible=true;
    if(sniper.remaining<=0){
      const hit=sniperTrace(enemy);
      playGuardShot(distance);
      sniper.flash=.09;visual.flash.visible=true;
      if(hit)hurt(enemy.damage,Math.atan2(dx,dz));
      sniper.phase='idle';sniper.remaining=2.6;sniper.targeted=false;visual.laser.visible=false;
    }
  }else if(eligible&&sniper.remaining<=0&&sniper.scan<=0){
    enemy.mesh.rotation.y=Math.atan2(dx,dz)+Math.PI;
    sniper.aimPoint.set(p.x,p.y+1.45,p.z);
    visual.rifle.rotation.x=Math.atan2(sniper.aimPoint.y-enemy.y-1.9,distance);
    sniper.scan=.4;
    if(sniperTrace(enemy)){
      sniper.phase='aim';sniper.remaining=1.8;sniper.targeted=true;visual.laser.visible=true;
    }
  }
  updateHealthBar(enemy);
}
function raisePlayerLevel(target){
  const levelsGained=target-p.level;
  p.level=target;
  for(let i=0;i<levelsGained;i++)p.skillPoints+=1+Math.floor(Math.random()*4);
  p.expNeed=xpNeeded(p.level);
  p.maxHp+=8*levelsGained;
  p.hp=p.maxHp;
}
function finishLevelUp(){
  levelUpSound.currentTime=0;
  levelUpSound.play().catch(()=>{});
  if(p.region===4&&p.level>=100){
    game.castlePendingSkills=p.skillPoints>0;
    showCastlePrompt();
    return;
  }
  if(p.region<4&&p.level>=levelCap()&&!portal.visible){
    unlockShot=3.5;game.modal=true;
    input.keys.clear();input.pressed.clear();
    $('#level-up').classList.add('hidden');
    toast('새로운 지역이 해금되었습니다.');game.toast=4.5;
    return;
  }
  game.levelFx=2.5;$('#new-level').textContent=p.level;$('#level-up').classList.remove('hidden');
  skills(true,true);
}
function gain(base){
  const amount=Math.round(base*experienceMultiplier());
  p.exp+=amount;floatText(`+${amount} EXP`,'#f5d56b');
  let leveled=false;
  while(p.exp>=p.expNeed&&p.level<levelCap()){
    p.exp-=p.expNeed;
    raisePlayerLevel(p.level+1);
    leveled=true;
  }
  if(p.level>=levelCap())p.exp=0;
  hud();
  if(leveled)finishLevelUp();
}
function hurt(raw,a,{blockable=true,invulnerability=.75}={}){
  if(bossIntro.active||game.shieldTutorial||princessEnding.active)return;
  if(p.inv>0||p.dead)return;
  if(playerShield.tryBlock(a,blockable)){
    floatText('방패 방어!','#bcefff');
    combatFeedback.react('block',Math.sin(a-game.yaw));
    const facing=game.firstPerson?game.yaw:p.facing;
    combatFeedback.impact(p.x+Math.sin(facing)*.9,p.y+1.7,p.z+Math.cos(facing)*.9,'block');
    return 'blocked';
  }
  const damage=Math.max(1,Math.round(raw*(1-Math.min(.72,p.skills.defense*.08))));
  p.hp-=damage;
  combatFeedback.react('hurt',Math.sin(a-game.yaw));
  p.inv=invulnerability;
  if(p.region===5){
    const pushed=castleStage.move(p.x,p.z,p.floorY,Math.sin(a)*1.1,Math.cos(a)*1.1);
    if(pushed){p.x=pushed.x;p.z=pushed.z;p.floorY=pushed.height;if(p.grounded)p.y=p.floorY}
  }else{p.x+=Math.sin(a)*1.1;p.z+=Math.cos(a)*1.1}
  floatText(`-${damage}`,'#ff6c63');
  if(p.hp<=0){
    p.hp=0;
    p.dead=true;
    playerShield.cancel();bossCombat.clear();
    syncStageMusic();
    game.modal=true;
    input.keys.clear();
    input.pressed.clear();
    p.attackAnim=0;
    combatFeedback.clear();
    viewSword.visible=false;
    $('#crosshair').classList.add('hidden');
    attackGauge.hidden=true;
    document.exitPointerLock?.();
    deathSound.currentTime=0;
    deathSound.play().catch(()=>{});
    deathScreenTimer=setTimeout(()=>$('#death').classList.remove('hidden'),400);
  }
  hud();
  return 'damaged';
}
function interact(){
  if(!p.hasSword&&Math.hypot(p.x-4,p.z-4)<2.5){
    p.hasSword=true;hero.userData.sword.visible=true;pickup.visible=false;pickupLight.visible=false;
    toast(`${SWORD_NAMES[0]}을 획득했습니다`);hud();return;
  }
  if(gate.visible&&Math.hypot(p.x,p.z+28.5)<4.5){
    toast(portal.visible?'포탈 안으로 걸어 들어가세요':`${levelCap()}레벨이 되어야 봉인을 풀 수 있습니다`);
  }
}
function revive(){
  if(!p.dead)return;
  clearTimeout(deathScreenTimer);
  deathSound.pause();
  deathSound.currentTime=0;
  playerShield.cancel();bossCombat.clear();
  p.dead=false;
  p.hp=p.maxHp;
  p.x=0;p.y=0;p.z=5;p.vy=0;
  p.floorY=0;
  if(p.region===5){
    const checkpoint=castleStage.checkpoints[castleState.checkpoint];
    p.x=checkpoint.x;p.y=checkpoint.y;p.floorY=checkpoint.y;p.z=checkpoint.z;
    castleState.progress=checkpoint.progress;
    castleStage.update(game.time,castleState.bossDefeated,castleState.progress,castleState.bossStarted);
    const boss=enemies.find(enemy=>enemy.boss&&!enemy.dead);
    if(boss){boss.hp=boss.maxHp;boss.x=0;boss.z=-91;boss.cd=2.2;boss.phase='idle';boss.windup=0;boss.attacks=0;boss.hit=0}
    castleStage.telegraph.visible=false;
  }
  p.grounded=true;
  p.inv=2;
  input.keys.clear();
  input.pressed.clear();
  game.modal=false;
  $('#death').classList.add('hidden');
  syncStageMusic();
  hud();
  lockMouse();
}

function update(dt){
if(bossIntro.active||game.shieldTutorial||princessEnding.active)return;
game.time+=dt;p.attackAnim=Math.max(0,p.attackAnim-dt);p.inv-=dt;
if(game.levelFx>0&&(game.levelFx-=dt)<=0)$('#level-up').classList.add('hidden');
if(game.toast>0&&(game.toast-=dt)<=0)$('#toast').classList.add('hidden');
if(!game.modal&&!p.dead){
  let ix=(input.keys.has('KeyA')?1:0)-(input.keys.has('KeyD')?1:0),iz=(input.keys.has('KeyW')?1:0)-(input.keys.has('KeyS')?1:0);
  if(ix||iz){
    const l=Math.hypot(ix,iz);ix/=l;iz/=l;
    const c=Math.cos(game.yaw),s=Math.sin(game.yaw),dx=ix*c+iz*s,dz=iz*c-ix*s;
    const speed=((input.keys.has('ShiftLeft')||input.keys.has('ShiftRight'))?11.5:7)*(playerShield.state.active?.5:1);
    if(p.region===5){
      const moved=castleStage.move(p.x,p.z,p.floorY,dx*speed*dt,dz*speed*dt);
      if(moved){p.x=moved.x;p.z=moved.z;p.floorY=moved.height;if(p.grounded)p.y=p.floorY;castleState.progress=moved.progress}
    }else{p.x+=dx*speed*dt;p.z+=dz*speed*dt}
    p.facing=Math.atan2(dx,dz);
  }
  if(input.pressed.has('Space')&&p.grounded){p.vy=8.5;p.grounded=false}
  if(p.region!==5){p.x=THREE.MathUtils.clamp(p.x,-43,43);p.z=THREE.MathUtils.clamp(p.z,-28,28)}
  if(input.pressed.has('KeyF'))interact();
}
if(!game.modal&&!p.dead&&p.region<4&&portal.visible&&Math.abs(p.x)<2.55&&p.z<=-27.8){
  if(p.region===1)enterTaintedForest();
  else if(p.region===2)enterSnowfield();
  else enterMesa();
  return;
}
if(p.region===3)snowfield.update(dt);
if(p.region===4)mesa.update(dt);
if(p.region===5){
  castleStage.update(game.time,castleState.bossDefeated,castleState.progress,castleState.bossStarted);
  const checkpoint=castleStage.checkpoints.findLastIndex(point=>castleState.progress>=point.progress-2);
  if(checkpoint>castleState.checkpoint){castleState.checkpoint=checkpoint;toast('성의 관문에 도달했습니다 · 부활 지점 갱신')}
  quest();
  if(princessEnding.tryStart(p,game.running&&!game.modal&&!game.paused&&!p.dead&&castleState.bossDefeated))return;
}
for(const enemy of enemies){
  if(!enemy.shield||enemy.dead)continue;
  enemy.guardClock+=dt;
  enemy.blocking=enemy.guardClock%5>3.55&&Math.hypot(p.x-enemy.x,p.z-enemy.z)<8&&Math.abs((enemy.y??0)-(p.floorY??0))<4;
  enemy.shield.position.set(enemy.blocking?0:.83,enemy.blocking?1.55:.93,-.55);
  enemy.shield.rotation.y=enemy.blocking?0:.4;
}
const floor=p.region===5?(p.floorY??0):0;
p.vy-=22*dt;p.y+=p.vy*dt;if(p.y<=floor){p.y=floor;p.vy=0;p.grounded=true}hero.position.set(p.x,p.y,p.z);hero.rotation.y=p.facing;hero.userData.arm.rotation.x=p.attackAnim>0?-1.7*Math.sin((1-p.attackAnim/.32)*Math.PI):0;hero.visible=!(p.inv>0&&Math.floor(game.time*14)%2===0);const swing=p.attackAnim>0?1-p.attackAnim/.32:0;const plungeSwing=p.plungingAttack&&p.attackAnim>0;
if(plungeSwing){
  const chop=Math.sin(swing*Math.PI);
  viewSword.position.set(.72,-.82+chop*(.62-swing),-1.35-chop*.23);
  viewSword.rotation.set(-.2-chop*.9,0,-.85+chop*.54);
}else{
  viewSword.position.set(.72,-.82+Math.sin(swing*Math.PI)*.58,-1.35);
  viewSword.rotation.set(-.2-swing*.35,0,-.85+swing*1.8);
}if(playerShield.state.active){viewSword.position.y-=.75;viewSword.rotation.z-=.35}viewSword.visible=game.firstPerson&&p.hasSword&&!game.modal&&!game.paused;$('#crosshair').classList.toggle('hidden',!game.firstPerson||game.modal||game.paused);
for(let i=enemies.length-1;i>=0;i--){
  const e=enemies[i];
  if(e.dead){
    e.hpBar.visible=false;
    e.mesh.rotation.y+=dt*5;
    e.mesh.scale.multiplyScalar(Math.max(.01,1-dt*5));
    if(e.mesh.scale.x<.05){removeEnemyMesh(e);enemies.splice(i,1)}
    continue;
  }
  if(e.boss){updateCastleBoss(e,dt);if(bossIntro.active){input.pressed.clear();return}continue}
  if(e.sniper){updateCastleSniper(e,dt);continue}
  e.cd-=dt;
  const recoiling=updateEnemyRecoil(e,dt);
  e.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*10);
  const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),a=Math.atan2(dx,dz);
  const onSameLevel=!e.castlePost||Math.abs(e.y-(p.floorY??0))<4;
  const aggro=!game.modal&&!p.dead&&d<12&&onSameLevel;
  const reach=e.reach??1.4;
  let moving=false;
  if(!recoiling&&aggro){
    e.mesh.rotation.y=a+Math.PI;
    if(!e.blocking){
      if(d>reach){
        moveEnemy(e,dx/d*e.speed*dt,dz/d*e.speed*dt);
        moving=true;
      }else if(e.cd<=0){
        e.cd=e.type==='thawedMammoth'?2.2:e.type==='goblin'?1.25:1.55;
        hurt(e.damage,a);
      }
    }
  }else if(!recoiling&&e.castlePost){
    const homeX=e.castlePost.x-e.x,homeZ=e.castlePost.z-e.z,distance=Math.hypot(homeX,homeZ);
    if(distance>.15){
      const step=Math.min(distance,e.speed*.55*dt);
      e.mesh.rotation.y=Math.atan2(homeX,homeZ)+Math.PI;
      moveEnemy(e,homeX/distance*step,homeZ/distance*step);
    }
  }else if(!recoiling){
    e.wander+=dt*.45;
    const targetYaw=e.wander+Math.PI;
    const turn=Math.atan2(Math.sin(targetYaw-e.mesh.rotation.y),Math.cos(targetYaw-e.mesh.rotation.y));
    e.mesh.rotation.y+=turn*(1-Math.exp(-5*dt));
    moveEnemy(e,Math.sin(e.wander)*e.speed*.12*dt,Math.cos(e.wander)*e.speed*.12*dt);
    moving=true;
  }
  if(e.type==='slime'||e.type==='burgerSlime'){
    const s=e.mesh.userData.slime,wave=Math.sin(game.time*4+s.phase),squash=.06*wave,spread=-squash*.8;
    s.body.scale.set(1+spread,s.baseY+squash,1+spread);s.body.position.y=s.basePos+squash*.5;
    s.puddle.scale.set(1.02-spread*.5,.18,1.02-spread*.5);
    s.drips.forEach((drop,j)=>{drop.scale.y=.75+Math.sin(game.time*3+s.phase+j)*.16;drop.position.y=.18+Math.max(0,-wave)*.035});
  }
  e.mesh.position.set(e.x,e.y??0,e.z);
  e.animateVisual?.(game.time,moving&&!recoiling);
  updateHealthBar(e);
}
for(let i=game.respawns.length-1;i>=0;i--){game.respawns[i]-=dt;if(game.respawns[i]<=0){spawnFarFromPlayer();game.respawns.splice(i,1)}}pickup.rotation.y+=dt*.8;pickup.position.y=.55+Math.sin(game.time*2)*.15;pickupLight.intensity=2.2+Math.sin(game.time*3)*.5;const target=new THREE.Vector3(p.x,p.y+1.4,p.z),cp=Math.cos(game.pitch),sp=Math.sin(game.pitch);if(game.cutscene)updateCutsceneCamera(dt);else if(game.firstPerson){const eye=new THREE.Vector3(p.x,p.y+2.55,p.z);const look=new THREE.Vector3(p.x+Math.sin(game.yaw)*cp*12,p.y+2.55+sp*12,p.z+Math.cos(game.yaw)*cp*12);camera.position.lerp(eye,1-Math.pow(.00001,dt));camera.lookAt(look)}else{const horizontal=10*Math.max(.15,cp),height=Math.max(1.5,5.5+sp*6),behind=new THREE.Vector3(-Math.sin(game.yaw)*horizontal,height,-Math.cos(game.yaw)*horizontal);camera.position.lerp(target.clone().add(behind),1-Math.pow(.001,dt));camera.lookAt(target)}hero.visible=game.cutscene||(!game.firstPerson&&!(p.inv>0&&Math.floor(game.time*14)%2===0));prompt();drawMinimap();input.pressed.clear()}

function floatText(t,c){const e=document.createElement('div');e.textContent=t;e.style.cssText=`position:absolute;left:50%;top:45%;z-index:12;color:${c};font:bold 18px sans-serif;text-shadow:0 2px 4px #000;pointer-events:none;transition:.8s`;$('#game-shell').append(e);requestAnimationFrame(()=>{e.style.transform='translateY(-70px)';e.style.opacity=0});setTimeout(()=>e.remove(),850)}
function toast(t){$('#toast').textContent=t;$('#toast').classList.remove('hidden');game.toast=2.5}
function prompt(){
  let text='';
  if(!p.hasSword&&Math.hypot(p.x-4,p.z-4)<2.5)text='[ F ] 낡은 목도 줍기';
  else if(gate.visible&&Math.hypot(p.x,p.z+28.5)<4.5){
    text=portal.visible?'포탈 안으로 들어가기':`[ F ] 봉인된 돌문 · ${levelCap()}레벨 해금`;
  }
  $('#prompt').textContent=text;
  $('#prompt').classList.toggle('hidden',!text||game.modal);
}
function quest(){
  const names={1:'초원의 숲',2:'독기의 오염된 숲',3:'만년설 분지',4:'붉은 메사 협곡',5:'독기에 잠식된 검은 성'};
  $('.minimap-frame small').textContent=names[p.region];
  $('#revive').textContent=p.region===5?'마지막 성 관문에서 다시 일어나기':p.region===4?'사막의 쉼터에서 다시 일어나기':p.region===3?'설원의 쉼터에서 다시 일어나기':'숲의 제단에서 다시 일어나기';
  $('#skill-panel .hint').textContent='레벨이 오를 때마다 스킬 포인트를 무작위로 1~4개 얻습니다.';
  if(p.region===5){
    $('#quest-title').textContent=castleState.bossDefeated?'공주를 구했습니다':castleState.bossStarted?'독기의 성주를 쓰러뜨려라':'정상 본관으로 올라가라';
    $('#quest-detail').textContent=castleState.bossDefeated?'공주에게 가까이 다가가 마지막 이야기를 들으세요':castleState.bossStarted?'보라색 공격 예고를 피하며 성주를 공격하세요':`금빛 흔적을 따라 이동 · 본관까지 약 ${Math.ceil(Math.max(0,castleStage.routeLength-castleState.progress))}m`;
    return;
  }
  if(!p.hasSword){
    $('#quest-title').textContent='초원의 목도를 찾아라';
    $('#quest-detail').textContent='빛나는 무기를 찾아 F키로 줍자';
    return;
  }
  if(p.region===4){
    $('#quest-title').textContent='붉은 메사 협곡 탐험';
    $('#quest-detail').textContent=p.level<levelCap()?`사막 몬스터를 처치해 ${levelCap()}레벨 달성 (${p.level}/${levelCap()})`:'Enter · 공주 구출 출정 안내 열기';
  }else if(p.level<levelCap()){
    $('#quest-title').textContent=p.region===1?'잃어버린 힘을 되찾아라':names[p.region];
    $('#quest-detail').textContent=`몬스터를 처치해 ${levelCap()}레벨 달성 (${p.level}/${levelCap()})`;
  }else{
    $('#quest-title').textContent='북쪽 돌문으로 향하라';
    $('#quest-detail').textContent=`포탈을 통과해 ${names[p.region+1]}으로 이동`;
  }
}
function drawMinimap(){
  const w=minimap.width,h=minimap.height;
  const mx=x=>p.region===5?7+(x+180)/360*(w-14):7+(x+43)/86*(w-14),mz=z=>p.region===5?7+(z+180)/610*(h-14):7+(z+28)/56*(h-14);
  const colors=p.region===5?['#35293f','#17121f','#89709e']:p.region===4?['#edc994','#d59b65','#a95e40']:p.region===3?['#d9edf4','#b9d9eb','#77b8d8']:p.region===2?['#454b31','#283b2e','#819b40']:['#315f3a','#244d30','#94b469'];
  mini.clearRect(0,0,w,h);
  const grad=mini.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,colors[0]);grad.addColorStop(1,colors[1]);
  mini.fillStyle=grad;mini.fillRect(0,0,w,h);
  mini.strokeStyle=colors[2];mini.lineWidth=7;mini.strokeRect(3.5,3.5,w-7,h-7);
  if(p.region===5){
    mini.strokeStyle='#c7afd9';mini.lineWidth=2;mini.beginPath();
    castleStage.route.forEach((point,i)=>i?mini.lineTo(mx(point.x),mz(point.z)):mini.moveTo(mx(point.x),mz(point.z)));mini.stroke();
    const checkpoint=castleStage.checkpoints[castleState.checkpoint];
    mini.fillStyle='#9ae6d2';mini.beginPath();mini.arc(mx(checkpoint.x),mz(checkpoint.z),3,0,Math.PI*2);mini.fill();
  }
  if(gate.visible){
    mini.strokeStyle=portal.visible?'#b89bff':'#c9ad63';mini.lineWidth=2;
    mini.beginPath();mini.moveTo(mx(-3),mz(-28));mini.lineTo(mx(3),mz(-28));mini.stroke();
  }
  for(const enemy of enemies){
    if(enemy.dead)continue;
    const rare=['burgerSlime','albinoBear','thawedMammoth'].includes(enemy.type);
    mini.beginPath();
    mini.fillStyle=enemy.boss?'#e983ff':enemy.castlePost?'#ff927e':rare?'#efb33f':p.region===4?'#8d2d29':p.region===3?'#355b8c':enemy.type==='goblin'||enemy.type==='taintedKnight'?'#ff765d':'#9dff69';
    mini.arc(mx(enemy.x),mz(enemy.z),rare?4:2.7,0,Math.PI*2);mini.fill();
    if(rare){mini.strokeStyle='#fff2ad';mini.lineWidth=1;mini.stroke()}
  }
  const angle=game.firstPerson?game.yaw:p.facing;
  mini.save();mini.translate(mx(p.x),mz(p.z));mini.rotate(Math.PI-angle);
  mini.fillStyle=p.region===3?'#ef5063':'#70d9ff';mini.strokeStyle='#ffffff';mini.lineWidth=1.2;
  mini.beginPath();mini.moveTo(0,-6);mini.lineTo(4.5,5);mini.lineTo(0,3);mini.lineTo(-4.5,5);mini.closePath();
  mini.fill();mini.stroke();mini.restore();
}
function hud(){const swordLevel=p.skills.attack+1,maxSword=swordLevel>=swordCap();$('#level').textContent=p.level;$('#hp-fill').style.width=`${p.hp/p.maxHp*100}%`;$('#hp-label').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('#exp-fill').style.width=`${p.exp/p.expNeed*100}%`;$('#exp-label').textContent=p.level>=levelCap()?'MAX LEVEL':`EXP ${p.exp} / ${p.expNeed}`;$('#attack-stat').textContent=swordDamage();$('#defense-stat').textContent=`${Math.round(Math.min(.72,p.skills.defense*.08)*100)}%`;$('#skill-points').textContent=p.skillPoints;$('#panel-points').textContent=p.skillPoints;$('#attack-level').textContent=`Lv.${swordLevel}`;$('#exp-level').textContent=p.skills.exp;$('#defense-level').textContent=p.skills.defense;$('#health-level').textContent=p.skills.health?'습득':'미습득';
  $('#max-health-level').textContent=p.skills.maxHealth;
  $('#max-health-description').textContent=`다음 강화 최대 체력 +${(p.skills.maxHealth+1)*10}`;
  $('#exp-description').textContent=`현재 ${experienceMultiplier().toFixed(2)}배 · 다음 보너스 +${15*(p.skills.exp+1)}%`;
  $('#weapon-level').textContent=p.hasSword?`검 Lv.${swordLevel} / ${Math.max(swordCap(),swordLevel)}`:'무기 없음';$('#weapon-name').textContent=p.hasSword?SWORD_NAMES[swordLevel-1]:'목도를 찾아야 합니다';$('#weapon-card').classList.toggle('unarmed',!p.hasSword);$('#attack-description').textContent=maxSword?'최고 단계 · 더 이상 강화할 수 없습니다':`다음: ${SWORD_NAMES[swordLevel]} · 공격력 증가`;const healthSkill=document.querySelector('[data-skill="health"]');healthSkill.classList.toggle('learned-hidden',!!p.skills.health);document.querySelectorAll('.skill').forEach(b=>b.disabled=!canSpendSkillPoint(b.dataset.skill));$('#defer-skills').textContent=p.skillPoints>0?'다음에 정하기':'완료';quest();drawMinimap()}
function lockMouse(){
  if(!game.running||p.dead||game.modal||game.paused||document.pointerLockElement===canvas)return;
  try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}
}
function showCastlePrompt(){
  if(!game.running||p.dead||p.region!==4||p.level<100||game.paused||game.cutscene||game.debugOpen||game.castlePromptOpen)return;
  game.castlePromptOpen=true;
  game.modal=true;
  game.skillPause=false;game.levelChoice=false;
  $('#skill-panel').classList.add('hidden');
  $('#skill-panel').classList.remove('levelup-choice');
  $('#level-up').classList.add('hidden');game.levelFx=0;
  $('#castle-departure-status').textContent='다리에서 시작해 성벽 길을 따라 정상 본관으로 올라갑니다.';
  $('#castle-departure').classList.remove('hidden');
  input.keys.clear();input.pressed.clear();
  p.attackAnim=0;
  combatFeedback.clear();
  viewSword.visible=false;
  $('#crosshair').classList.add('hidden');
  attackGauge.hidden=true;
  $('#prompt').classList.add('hidden');
  document.exitPointerLock?.();
  $('#castle-enter').focus();
}
function deferCastleJourney(){
  if(!game.castlePromptOpen)return;
  game.castlePromptOpen=false;
  $('#castle-departure').classList.add('hidden');
  $('#castle-defer').blur();$('#castle-enter').blur();
  game.modal=false;
  input.keys.clear();input.pressed.clear();
  const showSkills=game.castlePendingSkills&&p.skillPoints>0;
  game.castlePendingSkills=false;
  if(showSkills)skills(true,true);
  else lockMouse();
  hud();
}
function requestCastleEntry(){
  if(!game.castlePromptOpen)return;
  const showSkills=game.castlePendingSkills&&p.skillPoints>0;
  game.castlePromptOpen=false;game.castlePendingSkills=false;game.modal=false;
  $('#castle-departure').classList.add('hidden');$('#castle-enter').blur();$('#castle-defer').blur();
  enterCastle();
  if(showSkills)skills(true,true);else lockMouse();
}
function skills(open,centered=false){if(game.castlePromptOpen)return;const panel=$('#skill-panel'),yes=open??panel.classList.contains('hidden');panel.classList.toggle('hidden',!yes);panel.classList.toggle('levelup-choice',yes&&centered);game.levelChoice=yes&&centered;game.skillPause=yes;game.modal=yes;$('#skill-kicker').textContent=centered?'LEVEL UP':'성장의 기억';$('#skill-title').textContent=centered?'새로운 힘을 선택하세요':'스킬 강화';if(yes)document.exitPointerLock?.();else{game.levelChoice=false;game.skillPause=false;game.modal=false;lockMouse()}}
function toggleDebug(open,restoreMouse=true){
  const yes=open??!game.debugOpen;
  if(game.levelChoice||game.castlePromptOpen)return;
  game.debugOpen=yes;
  game.modal=yes;
  $('#debug-console').classList.toggle('hidden',!yes);
  if(yes){
    const playerLevel=$('#debug-player-level');
    playerLevel.min=p.level;
    playerLevel.max=Math.max(p.level,levelCap());
    playerLevel.value=p.level;
    $('#debug-sword').value=p.skills.attack+1;
    $('#debug-sword').max=Math.max(swordCap(),p.skills.attack+1);
    $('#debug-defense').value=p.skills.defense;
    $('#debug-exp').value=p.skills.exp;
    document.exitPointerLock?.();
  }else if(restoreMouse)lockMouse();
}
function applyDebugSettings(){
  if(!game.debugOpen)return;
  const enteredLevel=Number($('#debug-player-level').value);
  const target=THREE.MathUtils.clamp(Math.round(enteredLevel||p.level),p.level,Math.max(p.level,levelCap()));
  p.skills.attack=THREE.MathUtils.clamp(Math.round(Number($('#debug-sword').value)||1),1,Math.max(swordCap(),p.skills.attack+1))-1;
  p.skills.defense=THREE.MathUtils.clamp(Math.round(Number($('#debug-defense').value)||0),0,50);
  p.skills.exp=THREE.MathUtils.clamp(Math.round(Number($('#debug-exp').value)||0),0,50);
  updateSwordDesign();
  if(target>p.level){
    toggleDebug(false,false);
    p.exp=0;
    raisePlayerLevel(target);
    hud();
    finishLevelUp();
    return;
  }
  $('#debug-player-level').value=p.level;
  hud();
  toast('테스트 수치를 적용했습니다');
}
function pauseGame(paused=true){
  if(!game.running||p.dead||game.castlePromptOpen)return;
  game.paused=paused;game.skillPause=false;game.levelChoice=false;game.debugOpen=false;
  playerShield.cancel();
  game.modal=paused||bossIntro.active;
  $('#skill-panel').classList.add('hidden');$('#skill-panel').classList.remove('levelup-choice');
  $('#debug-console').classList.add('hidden');$('#pause-screen').classList.toggle('hidden',!paused);
  $('#crosshair').classList.toggle('hidden',paused||bossIntro.active||!game.firstPerson);
  viewSword.visible=!paused&&!bossIntro.active&&game.firstPerson&&p.hasSword;
  input.keys.clear();syncStageMusic();bossIntro.setPaused(paused);
  if(paused)document.exitPointerLock?.();else if(!bossIntro.active)lockMouse();
}
document.addEventListener('pointerlockchange',()=>{
  if(p.dead||game.modal){
    if(document.pointerLockElement===canvas)document.exitPointerLock?.();
    return;
  }
  if(game.running&&!game.paused&&!game.modal&&document.pointerLockElement!==canvas)pauseGame(true);
});
function debugTeleport(region){
  if(!game.debugOpen||p.dead)return;
  toggleDebug(false,false);
  if(region===1)enterMeadow();
  else if(region===2)enterTaintedForest();
  else if(region===3)enterSnowfield();
  else if(region===4)enterMesa();
  else enterCastle();
  lockMouse();
}
$('#debug-stage-one').onclick=()=>debugTeleport(1);
$('#debug-stage-two').onclick=()=>debugTeleport(2);
$('#debug-stage-three').onclick=()=>debugTeleport(3);
$('#debug-stage-four').onclick=()=>debugTeleport(4);
$('#debug-stage-five').onclick=()=>debugTeleport(5);
$('#debug-castle-hall').onclick=()=>{if(!game.debugOpen||p.dead)return;toggleDebug(false,false);enterCastle(true);lockMouse()};
function resize(){renderer.setSize(innerWidth,innerHeight,false);for(const viewCamera of [camera,panoCamera,snowPanorama.camera,desertPanorama.camera]){viewCamera.aspect=innerWidth/innerHeight;viewCamera.updateProjectionMatrix()}}addEventListener('resize',resize);resize();
addEventListener('keydown',e=>{
  if(princessEnding.active){
    e.preventDefault();e.stopImmediatePropagation();
    if(!e.repeat&&(e.code==='Enter'||e.code==='NumpadEnter'))princessEnding.advance();
    return;
  }
  if(playerShield.state.tutorial){
    e.preventDefault();e.stopImmediatePropagation();
    if(!e.repeat&&(e.code==='Enter'||e.code==='Escape'))playerShield.closeTutorial();
    return;
  }
  if(bossIntro.active){
    e.preventDefault();e.stopImmediatePropagation();
    if(!e.repeat&&e.code==='Escape')pauseGame(!game.paused);
    else if(!e.repeat&&e.code==='Enter'&&!game.paused)bossIntro.advance();
    return;
  }
  if(unlockShot){e.preventDefault();e.stopImmediatePropagation();return}if(!game.cutscene)return;if((e.code==='Enter'||e.code==='Escape')&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();e.code==='Enter'?nextCutscene():finishCutscene()}
},true);
addEventListener('keydown',e=>{
  if(!game.running||game.cutscene||p.dead)return;
  if(game.castlePromptOpen){
    if(e.code==='Tab'){
      e.preventDefault();
      const enter=$('#castle-enter'),defer=$('#castle-defer');
      (document.activeElement===enter?defer:enter).focus();
      return;
    }
    e.preventDefault();
    if(!e.repeat){
      if(e.code==='Escape')deferCastleJourney();
      else if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space'){
        if(document.activeElement===$('#castle-defer'))deferCastleJourney();
        else requestCastleEntry();
      }
    }
    return;
  }
  if(game.debugOpen&&(e.code==='KeyE'||e.code==='Enter'||e.code==='NumpadEnter')){
    e.preventDefault();
    if(!e.repeat){
      applyDebugSettings();
      if(e.code==='KeyE'&&game.debugOpen)toggleDebug(false);
    }
    return;
  }
  if((e.code==='Enter'||e.code==='NumpadEnter')&&p.region===4&&p.level>=100&&!game.modal&&!game.paused){
    e.preventDefault();
    if(!e.repeat)showCastlePrompt();
    return;
  }
  if(e.code==='KeyE'&&!game.paused&&!e.repeat&&$('#dialog').classList.contains('hidden')){
    e.preventDefault();
    if(!$('#skill-panel').classList.contains('hidden'))skills(false);
    toggleDebug(true);
    return;
  }
  if(e.code==='KeyK'&&game.running&&!e.repeat&&!$('#skill-panel').classList.contains('hidden')){skills(false);return}if(e.code==='Escape'&&game.running&&!$('#dialog').classList.contains('hidden')){e.preventDefault();if(game.debugOpen){toggleDebug(false);return}pauseGame(!game.paused);return}if(game.paused||game.debugOpen||game.skillPause)return;if(!input.keys.has(e.code))input.pressed.add(e.code);input.keys.add(e.code);if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Enter'&&!$('#dialog').classList.contains('hidden'))nextDialog();if(e.code==='KeyK'&&game.running&&!p.dead&&$('#dialog').classList.contains('hidden'))skills();if(e.code==='KeyC'&&game.running&&!e.repeat){game.firstPerson=!game.firstPerson;toast(game.firstPerson?'1인칭 시점':'3인칭 시점')}});
addEventListener('keyup',e=>input.keys.delete(e.code));
canvas.addEventListener('mousedown',e=>{
  if(!$('#skill-panel').classList.contains('hidden')){skills(false);return}
  if(!game.running||game.modal||game.paused||game.debugOpen)return;
  if(document.pointerLockElement!==canvas){lockMouse();return}
  if(e.button===0)attack();
  else if(e.button===2){e.preventDefault();if(!playerShield.begin()&&!playerShield.state.unlocked)toast('성의 수비병을 처치하면 방패를 획득합니다')}
});
addEventListener('mouseup',e=>{if(e.button===2)playerShield.release()});
addEventListener('blur',()=>{
  playerShield.cancel();input.keys.clear();input.pressed.clear();
  if(game.running&&!game.modal&&!p.dead)pauseGame(true);
});
addEventListener('mousemove',e=>{
  if(game.running&&!game.modal&&document.pointerLockElement===canvas){
    game.yaw-=e.movementX*.0025;game.pitch=THREE.MathUtils.clamp(game.pitch-e.movementY*.0022,-Math.PI*.49,Math.PI*.49);
  }
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#start-button').onclick=beginCutscene;$('#cutscene-next').onclick=nextCutscene;$('#cutscene-skip').onclick=finishCutscene;$('#dialog-next').onclick=nextDialog;$('#close-skills').onclick=()=>skills(false);$('#defer-skills').onclick=()=>skills(false);$('#revive').onclick=revive;$('#resume-button').onclick=()=>pauseGame(false);$('#apply-debug').onclick=applyDebugSettings;
$('#castle-enter').onclick=requestCastleEntry;
$('#castle-defer').onclick=deferCastleJourney;
function canSpendSkillPoint(key){
  if(p.skillPoints<=0)return false;
  if(key==='attack')return p.skills.attack<swordCap()-1;
  if(key==='health')return !p.skills.health;
  return true;
}
function spendSkillPoint(key){
  if(!canSpendSkillPoint(key))return;
  p.skillPoints--;
  p.skills[key]++;
  if(key==='attack')updateSwordDesign();
  if(key==='maxHealth'){
    const healthGain=p.skills.maxHealth*10;
    p.maxHp+=healthGain;
    p.hp=Math.min(p.maxHp,p.hp+healthGain);
  }
  hud();
  const name=document.querySelector(`[data-skill="${key}"] b`).textContent;
  toast(key==='attack'?`검 진화: ${SWORD_NAMES[p.skills.attack]}`:`${name} · 1포인트 사용`);
  if(game.levelChoice&&p.skillPoints===0)skills(false);
}
document.querySelectorAll('.skill').forEach(button=>button.onclick=()=>spendSkillPoint(button.dataset.skill));
let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  playerShield.update(dt,game.running&&!game.paused&&!game.modal&&!game.cutscene&&!game.debugOpen&&!game.skillPause&&!game.castlePromptOpen&&!p.dead,game.firstPerson);
  updateAttackGauge(now);
  portalTime.value+=dt;
  if(!game.running)renderStartPanorama(Math.max(0,(now-panoramaStartedAt)/1000),dt);
  else{
    if(unlockShot){
      unlockShot=Math.max(0,unlockShot-dt);
      camera.position.lerp(new THREE.Vector3(7,4.5,-18),1-Math.pow(.012,dt));
      camera.lookAt(0,2.4,-28.5);
      viewSword.visible=false;
      $('#crosshair').classList.add('hidden');
      if(unlockShot<2.5){
        if(!portal.visible){
          portalOpenSound.currentTime=0;
          portalOpenSound.play().catch(()=>{});
        }
        portal.visible=true;
        barrier.visible=false;
        portal.scale.setScalar(Math.min(1,(2.5-unlockShot)*1.3+.01));
      }
      if(!unlockShot){
        portal.scale.setScalar(1);
        camera.position.set(p.x,p.y+2.55,p.z);
        skills(true,true);
      }
    }else if(bossIntro.active){
      if(!game.paused)bossIntro.update(dt);
    }else if(game.cutscene){
      viewSword.visible=false;
      updateDarkCastle(darkCastle,dt);
      updateCutsceneCamera(dt);
    }
    else if(!game.paused&&!game.skillPause&&!game.debugOpen&&!game.castlePromptOpen&&!game.shieldTutorial&&!princessEnding.active&&!combatFeedback.frozen)update(dt);
    combatFeedback.render(renderer,camera,!game.modal);
    combatFeedback.update(dt);
  }
  requestAnimationFrame(loop);
}
hud();requestAnimationFrame(loop);
