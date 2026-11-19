import * as THREE from 'three';

const sounds={
  swing:[.15,1250,.12,[115,66],.035],
  block:[.23,3100,.17,[760,485],.12],
  hurt:[.19,540,.13,[173,78],.16],
  bossSlash:[.28,1700,.13,[260,65],.1],
  bossJudgment:[.55,750,.17,[145,42],.14],
  bossShot:[.24,3200,.1,[900,210],.1]
};

export function createCombatFeedback(scene){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const hitSound=document.querySelector('#monster-hit-sound');
  const hitVoices=Array.from({length:4},(_,index)=>index===0?hitSound:hitSound.cloneNode(true));
  for(const voice of hitVoices)voice.volume=.7;
  let hitVoiceIndex=0;
  let audio,noise,shake=0,shakeDuration=0,shakeStrength=0,shakeDirection=0,stop=0;
  const effects=[];
  const slashGeometry=new THREE.RingGeometry(1.3,3.4,40,1,-Math.PI*.43,Math.PI*.86);
  const sparkGeometry=new THREE.OctahedronGeometry(.075);
  const cross=new THREE.Shape();
  const crossOutline=[[-.17,-.04],[-.04,-.04],[-.04,-.17],[.04,-.17],[.04,-.04],[.17,-.04],[.17,.04],[.04,.04],[.04,.17],[-.04,.17],[-.04,.04],[-.17,.04]];
  crossOutline.forEach(([x,y],i)=>i?cross.lineTo(x,y):cross.moveTo(x,y));
  cross.closePath();
  const criticalSparkGeometry=new THREE.ShapeGeometry(cross).rotateZ(Math.PI/4);
  const shockwaveGeometry=new THREE.RingGeometry(.78,1,28);
  const cameraRotation=new THREE.Quaternion();
  const cameraPosition=new THREE.Vector3();
  function unlockAudio(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!audio){
      audio=new Audio();
      noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.25),audio.sampleRate);
      const samples=noise.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    }
    if(audio.state==='suspended')audio.resume().catch(()=>{});
  }
  function sound(kind){
    if(kind==='hit'||kind==='critical'){
      const voice=hitVoices[hitVoiceIndex];
      hitVoiceIndex=(hitVoiceIndex+1)%hitVoices.length;
      voice.currentTime=0;
      voice.play().catch(()=>{});
      return;
    }
    if(audio?.state!=='running')return;
    const [duration,frequency,noiseVolume,[start,end],toneVolume]=sounds[kind];
    const time=audio.currentTime;
    const burst=audio.createBufferSource(),filter=audio.createBiquadFilter();
    const tone=audio.createOscillator();
    burst.buffer=noise;
    filter.type=kind==='swing'||kind==='block'?'bandpass':'lowpass';
    filter.frequency.setValueAtTime(frequency,time);
    filter.frequency.exponentialRampToValueAtTime(frequency*.42,time+duration);
    tone.type=kind==='block'?'triangle':'sine';
    tone.frequency.setValueAtTime(start,time);
    tone.frequency.exponentialRampToValueAtTime(end,time+duration);
    function play(source,output,volume){
      const envelope=audio.createGain();
      envelope.gain.setValueAtTime(.001,time);
      envelope.gain.linearRampToValueAtTime(volume,time+.009);
      envelope.gain.exponentialRampToValueAtTime(.001,time+duration);
      output.connect(envelope).connect(audio.destination);
      source.start(time);
      source.stop(time+duration+.01);
    }
    burst.connect(filter);
    play(burst,filter,noiseVolume);
    play(tone,tone,toneVolume);
  }
  function swing(x,y,z,facing,plunging=false){
    sound('swing');
    const material=new THREE.MeshBasicMaterial({color:0xaefbff,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const arc=new THREE.Mesh(slashGeometry,material);
    arc.rotation.set(-Math.PI/2,0,facing-Math.PI/2,'YXZ');
    if(plunging)arc.rotateY(-.65);
    arc.position.set(x,y+1.12,z);
    scene.add(arc);
    effects.push({object:arc,material,time:.13,duration:.13});
  }
  function impact(x,y,z,kind){
    const critical=kind==='critical';
    const color=kind==='block'?0xa5eaff:critical?0xffad80:0xffe7a3;
    const material=new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,
      blending:critical?THREE.NormalBlending:THREE.AdditiveBlending,toneMapped:!critical});
    const group=new THREE.Group();
    group.position.set(x,y,z);
    const velocities=[];
    for(let i=0;i<(critical?18:10);i++){
      const spark=new THREE.Mesh(critical?criticalSparkGeometry:sparkGeometry,material);
      const velocity=new THREE.Vector3(Math.random()-.5,.2+Math.random()*.6,Math.random()-.5).multiplyScalar(4+Math.random()*5);
      if(critical)spark.scale.setScalar(.45+Math.random()*.65);
      else{
        spark.scale.set(.75,2.8,.75);
        spark.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());
      }
      velocities.push(velocity);
      group.add(spark);
    }
    scene.add(group);
    const duration=critical?.34:.24;
    effects.push({object:group,material,velocities,critical,time:duration,duration});
    const ringMaterial=material.clone();
    ringMaterial.side=THREE.DoubleSide;
    const ring=new THREE.Mesh(shockwaveGeometry,ringMaterial);
    ring.position.copy(group.position);
    ring.scale.setScalar(.22);
    scene.add(ring);
    effects.push({object:ring,material:ringMaterial,ring:true,time:.16,duration:.16});
  }
  function react(kind,direction=1,strength=1){
    sound(kind);
    if(!reducedMotion.matches){
      shakeDuration=kind==='critical'?.16:.11;
      shakeStrength=(kind==='critical'?1.5:kind==='block'?.65:1)*strength;
      shakeDirection=THREE.MathUtils.clamp(direction,-1,1);
      shake=shakeDuration;
    }
    if(kind!=='hurt')stop=Math.max(stop,(kind==='critical'?.065:kind==='block'?.042:.035)*strength);
  }
  function clear(){
    for(const voice of hitVoices){
      voice.pause();
      voice.currentTime=0;
    }
    for(const effect of effects){scene.remove(effect.object);effect.material.dispose()}
    effects.length=0;stop=0;shake=0;
  }
  function update(dt){
    stop=Math.max(0,stop-dt);
    shake=Math.max(0,shake-dt);
    for(let i=effects.length-1;i>=0;i--){
      const effect=effects[i];
      effect.time-=dt;
      if(effect.time<=0){
        scene.remove(effect.object);effect.material.dispose();effects.splice(i,1);
        continue;
      }
      effect.material.opacity=.85*effect.time/effect.duration;
      if(effect.ring)effect.object.scale.setScalar(.22+1.1*(1-effect.time/effect.duration));
      effect.velocities?.forEach((velocity,j)=>{
        velocity.y-=9*dt;
        effect.object.children[j].position.addScaledVector(velocity,dt);
      });
    }
  }
  function render(renderer,camera,allowShake){
    for(const effect of effects){
      if(effect.ring)effect.object.quaternion.copy(camera.quaternion);
      if(effect.critical)for(const spark of effect.object.children)spark.quaternion.copy(camera.quaternion);
    }
    if(!allowShake||shake<=0){renderer.render(scene,camera);return}
    const strength=(shake/shakeDuration)**2*shakeStrength;
    cameraPosition.copy(camera.position);
    cameraRotation.copy(camera.quaternion);
    camera.translateX(strength*(shakeDirection*.11+.045*Math.sin(performance.now()*.13)));
    camera.translateY(strength*.035*Math.cos(performance.now()*.1));
    camera.translateZ(strength*.17);
    camera.rotateZ(-shakeDirection*strength*.019);
    renderer.render(scene,camera);
    camera.position.copy(cameraPosition);
    camera.quaternion.copy(cameraRotation);
  }
  return {unlockAudio,swing,impact,react,update,clear,render,cue:sound,get frozen(){return stop>0}};
}
