import * as THREE from 'three';

export const CASTLE_BOSS_NAME='백금의 폭군 아우렐리온';

export function createCastleBoss(){
  const mesh=new THREE.Group();mesh.name='poisoned-castle-lord';
  const gold=new THREE.MeshStandardMaterial({color:0xe8b951,metalness:.72,roughness:.3});
  const ivory=new THREE.MeshStandardMaterial({color:0xfff5eb,roughness:.73});
  const pink=new THREE.MeshStandardMaterial({color:0xed8fba,roughness:.67});
  const palePink=new THREE.MeshStandardMaterial({color:0xffc4da,roughness:.72});
  const dark=new THREE.MeshStandardMaterial({color:0x4c293e,roughness:.8});
  const glow=new THREE.MeshStandardMaterial({color:0xff86bc,emissive:0xdf377f,emissiveIntensity:.7});
  function part(geometry,material,x,y,z,parent=mesh){
    const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);parent.add(object);return object;
  }
  function ellipsoid(material,x,y,z,sx,sy,sz,parent=mesh){
    const object=part(new THREE.SphereGeometry(1,20,14),material,x,y,z,parent);object.scale.set(sx,sy,sz);return object;
  }
  const beast=new THREE.Group();beast.name='quadruped-beast-body';mesh.add(beast);
  ellipsoid(ivory,0,2.65,1.15,1.45,1.15,2.85,beast);
  ellipsoid(ivory,0,2.9,-.95,1.55,1.35,1.35,beast);
  const legs=[];
  for(const side of [-1,1])for(const rear of [false,true]){
    const leg=new THREE.Group();leg.name=rear?'hind-beast-leg':'front-beast-leg';
    leg.position.set(side*1.12,2.55,rear?3.05:-.8);beast.add(leg);legs.push(leg);
    ellipsoid(ivory,0,-.45,0,.47,.95,.56,leg);
    const shin=part(new THREE.CylinderGeometry(.29,.24,1.15,12),ivory,0,-1.45,.12,leg);shin.rotation.x=rear?-.2:.12;
    part(new THREE.CylinderGeometry(.37,.4,.38,10),gold,0,-1.92,.16,leg);
    ellipsoid(dark,0,-2.25,-.02,.46,.25,.63,leg);
    for(let i=0;i<3;i++){
      const claw=part(new THREE.ConeGeometry(.1,.4,8),gold,(i-1)*.23,-2.22,-.53,leg);claw.rotation.x=-Math.PI/2;
    }
    ellipsoid(gold,side*.09,-.35,-.37,.5,.55,.18,leg);
  }
  for(let i=0;i<6;i++){
    const plate=part(new THREE.BoxGeometry(2.2,.16,.42),gold,0,3.65,.05+i*.48,beast);
    plate.rotation.x=-.05;
  }
  const tail=new THREE.Group();tail.position.set(0,2.95,3.62);beast.add(tail);
  const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(0,.3,.9),new THREE.Vector3(.3,.9,1.7),new THREE.Vector3(.5,1.4,1.8)]);
  part(new THREE.TubeGeometry(tailCurve,18,.13,8,false),ivory,0,0,0,tail);
  ellipsoid(pink,.5,1.4,1.8,.4,.65,.38,tail);

  const torso=new THREE.Group();torso.name='humanoid-upper-body';torso.position.set(0,3.65,-1.3);mesh.add(torso);
  ellipsoid(ivory,0,1.4,0,1.28,1.7,.77,torso);
  for(const side of [-1,1]){
    ellipsoid(ivory,side*.62,1.94,-.56,.72,.48,.24,torso);
    ellipsoid(gold,side*.73,2.28,-.67,.66,.19,.19,torso);
    for(let i=0;i<3;i++)ellipsoid(palePink,side*.33,1.18-i*.38,-.71,.3,.2,.1,torso);
  }
  part(new THREE.CylinderGeometry(1.05,1.05,.45,16),gold,0,.1,0,torso);
  const beltGem=part(new THREE.OctahedronGeometry(.4),glow,0,.12,-1.05,torso);beltGem.scale.y=1.3;
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*1.4,2.3,0);torso.add(arm);arms.push(arm);
    ellipsoid(ivory,side*.2,-.65,0,.49,.95,.51,arm);
    ellipsoid(ivory,side*.25,-1.72,-.13,.34,.7,.39,arm);
    part(new THREE.CylinderGeometry(.43,.44,.6,12),gold,side*.24,-1.65,-.11,arm);
    ellipsoid(ivory,side*.24,-2.22,-.15,.39,.42,.35,arm);
    ellipsoid(gold,side*.05,.05,0,.8,.5,.78,arm);
    for(let i=0;i<3;i++){
      const spike=part(new THREE.ConeGeometry(.16,.75,8),ivory,side*(.35+i*.23),.49-i*.08,0,arm);spike.rotation.z=-side*.3;
    }
  }
  const sword=new THREE.Group();sword.name='aurelion-royal-greatsword';sword.position.set(-.24,-2.38,-.16);arms[0].add(sword);
  part(new THREE.CylinderGeometry(.14,.14,.7,10),dark,0,-.1,0,sword);
  part(new THREE.BoxGeometry(1.7,.22,.38),gold,0,-.55,0,sword);
  part(new THREE.BoxGeometry(.64,3.1,.22),ivory,0,-2.2,0,sword);
  part(new THREE.BoxGeometry(.1,3.1,.26),glow,0,-2.2,-.02,sword);
  for(const side of [-1,1])part(new THREE.BoxGeometry(.08,3.1,.28),gold,side*.34,-2.2,0,sword);
  const tip=part(new THREE.ConeGeometry(.48,.75,4),gold,0,-4.1,0,sword);tip.rotation.z=Math.PI;
  arms[0].rotation.z=-.32;

  const head=new THREE.Group();head.name='crowned-lion-head';head.position.set(0,3.6,-.1);torso.add(head);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2;
    const tuft=ellipsoid(i%3?pink:palePink,Math.cos(a)*.96,Math.sin(a)*1.04,.19,.4,.7,.45,head);tuft.rotation.z=a-Math.PI/2;
    const point=part(new THREE.ConeGeometry(.27,.9,7),pink,Math.cos(a)*1.38,Math.sin(a)*1.4,.2,head);
    point.rotation.z=a-Math.PI/2;
  }
  ellipsoid(ivory,0,0,-.12,.84,.95,.8,head);
  for(const side of [-1,1]){
    ellipsoid(ivory,side*.69,.62,.03,.33,.4,.2,head);
    ellipsoid(pink,side*.7,.63,-.16,.16,.23,.08,head);
    ellipsoid(gold,side*.36,.16,-.8,.4,.13,.14,head).rotation.z=side*.3;
    ellipsoid(dark,side*.35,.05,-.88,.16,.09,.04,head);
    ellipsoid(glow,side*.35,.06,-.93,.07,.065,.03,head);
    ellipsoid(ivory,side*.27,-.28,-.87,.36,.25,.32,head);
    const horn=part(new THREE.ConeGeometry(.24,1.5,12),gold,side*.88,1.12,.15,head);horn.rotation.z=-side*.55;
  }
  ellipsoid(dark,0,-.2,-1.07,.2,.14,.12,head);
  const mouth=ellipsoid(dark,0,-.55,-.89,.43,.35,.15,head);
  const jaw=new THREE.Group();jaw.name='roaring-lion-jaw';jaw.position.set(0,-.34,-.38);head.add(jaw);
  ellipsoid(dark,0,-.03,-.4,.48,.17,.35,jaw);
  ellipsoid(ivory,0,-.22,-.4,.5,.2,.38,jaw);
  for(const side of [-1,1]){
    const fang=part(new THREE.ConeGeometry(.11,.56,8),ivory,side*.32,-.46,-1.04,head);fang.rotation.z=Math.PI;
  }
  part(new THREE.CylinderGeometry(.72,.72,.27,16),gold,0,.9,0,head);
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2;part(new THREE.ConeGeometry(.17,.65,8),gold,Math.sin(a)*.64,1.28,Math.cos(a)*.5,head);
  }
  part(new THREE.OctahedronGeometry(.21),glow,0,1.2,-.63,head);
  mesh.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true}});
  function animate(time,windup=0,nova=false,hit=0,moving=0,roar=0,pose={}){
    legs.forEach((leg,i)=>leg.rotation.x=Math.sin(time*7+(i===0||i===3?0:Math.PI))*.35*moving);
    torso.position.y=3.65+Math.sin(time*2)*.035+Math.abs(Math.sin(time*7))*.07*moving;
    arms[0].rotation.x=windup>0?-2.5*windup:-.12+Math.sin(time*1.4)*.04-roar*.65;
    arms[1].rotation.x=windup*.6-roar*.8;
    arms[1].rotation.z=roar*.4;
    arms[0].rotation.z=nova?-.65:-.32;
    arms[0].rotation.y=0;
    if(pose.skill==='combo'){
      const direction=pose.step===1?-1:1;
      arms[0].rotation.z=-.32-direction*Math.sin(windup*Math.PI)*.9;
      if(pose.release!==null&&pose.release!==undefined){arms[0].rotation.y=direction*(-1.1+pose.release*2.2);arms[0].rotation.x=-1.2+pose.release*1.5}
    }else if(pose.skill==='judgment'&&windup>0){
      arms[0].rotation.x=-1.9*windup;arms[1].rotation.x=-1.9*windup;
    }else if(pose.skill==='meteor'&&windup>0){
      arms[1].rotation.x=-1.55;arms[1].rotation.z=.35;
    }
    head.rotation.x=-roar*.12;
    mouth.scale.y=.08+roar*.35;
    jaw.position.y=-.34-roar*.38;
    jaw.rotation.x=roar*.8;
    tail.rotation.y=Math.sin(time*1.5)*.3;
    mesh.rotation.z=hit>0?Math.sin(time*35)*.035:0;
  }
  return {mesh,animate};
}
