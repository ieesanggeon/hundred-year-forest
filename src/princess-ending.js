import * as THREE from 'three';

export function createPrincessEnding({camera,getPrincess,onStart,onReturn,onCancel}){
  const root=document.querySelector('#princess-ending');
  const button=document.querySelector('#princess-return');
  const position=new THREE.Vector3();
  const lines=[
    '당신은 100년 동안 잠들어 있었군요.',
    '저는 100년 동안 이 성에 갇혀 있었어요.',
    '구하러 와 줘서 고마워요.'
  ];
  let active=false,returning=false,line=0;
  function showLine(){
    document.querySelector('#princess-ending-text').textContent=lines[line];
    document.querySelector('#princess-action-label').textContent=line===lines.length-1?'홈 화면으로 돌아가기':'계속';
  }
  function tryStart(player,allowed){
    if(!allowed||active)return false;
    const princess=getPrincess();
    if(!princess)return false;
    princess.getWorldPosition(position);
    if(Math.hypot(player.x-position.x,player.z-position.z)>4||Math.abs(player.y-position.y)>3.5)return false;
    active=true;returning=false;line=0;showLine();
    camera.position.set(position.x+3.4,position.y+3.2,position.z+6.8);
    camera.lookAt(position.x,position.y+2.3,position.z);
    princess.rotation.y=Math.atan2(camera.position.x-position.x,camera.position.z-position.z);
    root.classList.remove('hidden');onStart();button.focus();return true;
  }
  function returnToTitle(){
    if(!active||returning||line!==lines.length-1)return;
    returning=true;onReturn();
  }
  function advance(){
    if(!active||returning)return;
    if(line<lines.length-1){line++;showLine()}
    else returnToTitle();
  }
  function cancel(){
    if(!active)return;
    active=false;returning=false;root.classList.add('hidden');onCancel();
  }
  button.onclick=advance;
  return {tryStart,advance,returnToTitle,cancel,get active(){return active},get returning(){return returning}};
}
