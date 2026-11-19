import * as THREE from 'three';
import {CASTLE_BOSS_NAME} from './castle-boss.js';

export function createCastleBossIntro({camera,sound,onStart,onFinish,isPaused}){
  const root=document.querySelector('#boss-introduction');
  const dialogue=document.querySelector('#boss-intro-dialogue');
  const nameplate=document.querySelector('#boss-intro-nameplate');
  const lines=[
    '백 년의 잠에서 깨어난 기사가… 마침내 내 왕좌까지 왔구나.',
    '공주를 원하느냐? 그렇다면 이 왕관 앞에 무릎 꿇어라!'
  ];
  let phase='idle',line=0,time=0,enemy=null;
  const position=new THREE.Vector3(),target=new THREE.Vector3();
  function frame(){
    position.set(enemy.x+13,enemy.y+5.8,enemy.z+16);
    target.set(enemy.x,enemy.y+4.9,enemy.z);
  }
  function showLine(){document.querySelector('#boss-intro-text').textContent=lines[line]}
  function start(boss){
    enemy=boss;phase='dialogue';line=0;time=0;
    root.classList.remove('hidden','boss-reveal');dialogue.classList.remove('hidden');nameplate.classList.add('hidden');
    document.querySelector('#boss-intro-speaker').textContent=CASTLE_BOSS_NAME;
    document.querySelector('#boss-intro-name').textContent=CASTLE_BOSS_NAME;
    showLine();frame();enemy.animateVisual(0,0,false,0,0,0);onStart();
  }
  function advance(){
    if(phase!=='dialogue'||isPaused())return;
    if(++line<lines.length){time=0;showLine();return}
    phase='reveal';time=0;frame();camera.position.copy(position);camera.lookAt(target);
    enemy.animateVisual(1,0,false,0,0,1);
    dialogue.classList.add('hidden');nameplate.classList.remove('hidden');root.classList.add('boss-reveal');
    sound.currentTime=0;sound.play().catch(()=>{});
  }
  function finish(resume){
    if(phase==='idle')return;
    phase='idle';time=0;root.classList.add('hidden');root.classList.remove('boss-reveal');
    sound.pause();sound.currentTime=0;
    enemy?.animateVisual(0);enemy=null;onFinish(resume);
  }
  function update(dt){
    if(phase==='idle'||isPaused())return;
    time+=dt;
    if(phase==='dialogue'){
      frame();camera.position.lerp(position,1-Math.pow(.015,dt));camera.lookAt(target);
      enemy.animateVisual(time,0,false,0,0,0);
      if(time>=4.5)advance();
    }else if(time>=Math.max(3.4,Number.isFinite(sound.duration)?sound.duration:0))finish(true);
  }
  document.querySelector('#boss-intro-next').onclick=advance;
  function setPaused(paused){
    if(phase!=='reveal')return;
    if(paused)sound.pause();
    else if(!sound.ended)sound.play().catch(()=>{});
  }
  return {start,advance,update,setPaused,cancel:()=>finish(false),get active(){return phase!=='idle'},get phase(){return phase}};
}
