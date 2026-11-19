import * as THREE from 'three';

export function createPlayerShield({camera,hero,getFacing,onTutorial,onClose,onExpire}){
  const state={unlocked:false,active:false,held:false,exhausted:false,remaining:3,hit:0,tutorial:false};
  const root=new THREE.Group();root.name='player-first-person-shield';camera.add(root);
  const outline=new THREE.Shape();
  [[-.69,.82],[.69,.82],[.73,.1],[.47,-.61],[0,-1.02],[-.47,-.61],[-.73,.1]].forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));outline.closePath();
  const metal=new THREE.MeshStandardMaterial({color:0x657485,metalness:.8,roughness:.34});
  const gold=new THREE.MeshStandardMaterial({color:0xd7b268,metalness:.75,roughness:.3});
  const enamel=new THREE.MeshStandardMaterial({color:0xe1e7ec,metalness:.35,roughness:.42});
  const shield=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.1,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.025}),gold);root.add(shield);
  const face=new THREE.Mesh(shield.geometry,enamel);face.scale.set(.9,.9,.9);face.position.z=.065;root.add(face);
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.13,1.46,.12),metal);spine.position.set(0,-.02,.23);root.add(spine);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1.12,.13,.12),metal);bar.position.set(0,.22,.23);root.add(bar);
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshStandardMaterial({color:0xb5eaff,emissive:0x438db0,emissiveIntensity:.55,metalness:.4,roughness:.2}));gem.position.set(0,.22,.36);root.add(gem);
  for(const x of [-.48,.48])for(const y of [.57,-.2]){
    const rivet=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),gold);rivet.position.set(x,y,.22);root.add(rivet);
  }
  root.scale.setScalar(.62);root.visible=false;
  root.traverse(object=>{if(object.isMesh){object.renderOrder=3;object.frustumCulled=false}});
  const thirdPerson=root.clone();thirdPerson.name='player-held-shield';thirdPerson.position.set(-.72,1.4,-.35);thirdPerson.scale.setScalar(.55);hero.add(thirdPerson);thirdPerson.visible=false;
  const hud=document.querySelector('#shield-status'),fill=document.querySelector('#shield-time-fill');
  const shell=document.querySelector('#game-shell'),tutorial=document.querySelector('#shield-tutorial');
  function cancel(){state.active=false;state.held=false;state.exhausted=false;state.remaining=3;state.hit=0;render(false)}
  function render(firstPerson){
    root.visible=state.active&&firstPerson;thirdPerson.visible=state.active&&!firstPerson;
    const recoil=Math.sin(state.hit/.22*Math.PI)*.1;
    root.position.set(-.49+recoil*.4,-.34-recoil*.45,-1.12+recoil);
    root.rotation.set(.05-recoil,.15,-.09+recoil*.4);
    shell.classList.toggle('shield-blocking',state.active);
    shell.classList.toggle('shield-impact',state.hit>0);
    hud.classList.toggle('hidden',!state.active&&!state.exhausted);
    document.querySelector('#shield-status-text').textContent=state.exhausted?'방어 해제 · 우클릭을 놓으세요':'방어 중 · 최대 3초';
    fill.style.width=`${state.remaining/3*100}%`;
    hud.classList.toggle('exhausted',state.exhausted);
  }
  function begin(){
    if(!state.unlocked||state.held||state.exhausted||state.tutorial)return false;
    state.held=true;state.active=true;state.remaining=3;return true;
  }
  function release(){cancel()}
  function update(dt,allowed,firstPerson){
    if(!allowed){cancel();return}
    state.hit=Math.max(0,state.hit-dt);
    if(state.active){
      state.remaining=Math.max(0,state.remaining-dt);
      if(state.remaining<=.00001){state.remaining=0;state.active=false;state.exhausted=true;onExpire()}
    }
    render(firstPerson);
  }
  function tryBlock(incomingAngle,blockable=true){
    if(!state.active||!blockable||Math.cos(incomingAngle+Math.PI-getFacing())<0)return false;
    state.hit=.22;return true;
  }
  function unlock(){
    if(state.unlocked)return false;
    state.unlocked=true;state.tutorial=true;cancel();tutorial.classList.remove('hidden');onTutorial();document.querySelector('#shield-tutorial-close').focus();return true;
  }
  function closeTutorial(restore=true){
    if(!state.tutorial)return;
    state.tutorial=false;tutorial.classList.add('hidden');onClose(restore);
  }
  document.querySelector('#shield-tutorial-close').onclick=()=>closeTutorial();
  return {state,root,thirdPerson,begin,release,cancel,update,tryBlock,unlock,closeTutorial};
}
