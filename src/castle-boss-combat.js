import * as THREE from 'three';

export const BOSS_SKILLS={
  cleave:{name:'왕의 내려베기',windup:1.05,range:6,hint:'내려베기 · 범위 밖으로 피하거나 정면 방어'},
  nova:{name:'독기 폭발',windup:1.45,range:13,hint:'독기 폭발 · 점프하거나 범위 밖으로 회피'},
  combo:{name:'왕관 삼연참',windup:1.1,range:7.2,hint:'왕관 삼연참 · 세 번 연속! 뒤로 돌아가거나 방어'},
  judgment:{name:'분홍빛 심판',windup:1.65,range:3.1,hint:'분홍빛 심판 · 바닥 원에서 이동! 방패로 방어 불가'},
  meteor:{name:'왕관의 유성',windup:1.35,hint:'왕관의 유성 · 옆으로 피하거나 날아오는 탄을 방어'}
};
const order=['cleave','combo','nova','judgment','meteor'];
const floor=170.08,up=new THREE.Vector3(0,1,0);
const isMelee=id=>id==='cleave'||id==='combo';
const inMeleeRange=distance=>distance<=BOSS_SKILLS.combo.range+1e-6;
function meleeSkill(enemy,distance){
  return distance>BOSS_SKILLS.cleave.range+1e-6||enemy.attacks%2?'combo':'cleave';
}

export function createCastleBossCombat({scene,player,hurt,feedback,getCastle}){
  const root=new THREE.Group();root.name='castle-boss-combat-effects';scene.add(root);
  const effects=[],projectiles=[],tells=[];
  const sparkGeometry=new THREE.OctahedronGeometry(.09);
  const orbGeometry=new THREE.IcosahedronGeometry(.38,1);
  const ringGeometry=new THREE.TorusGeometry(.51,.035,6,28);
  const trailGeometry=new THREE.ConeGeometry(.28,2.1,10);
  const ray=new THREE.Ray(),closest=new THREE.Vector3(),bodyClosest=new THREE.Vector3();
  const low=new THREE.Vector3(),high=new THREE.Vector3();
  function material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,blending:THREE.NormalBlending})}
  function remove(object){
    root.remove(object);
    const materials=new Set();
    object.traverse(child=>{
      if(child.material)materials.add(child.material);
      if(child.userData.ownedGeometry)child.geometry.dispose();
    });
    for(const m of materials)m.dispose();
  }
  function mesh(geometry,mat,parent=root,owned=false){
    const object=new THREE.Mesh(geometry,mat);object.userData.ownedGeometry=owned;parent.add(object);return object;
  }
  function clearTells(){for(const tell of tells)remove(tell);tells.length=0}
  function clear(){
    for(const child of [...root.children])remove(child);
    effects.length=0;projectiles.length=0;tells.length=0;
    if(getCastle())getCastle().telegraph.visible=false;
  }
  function zone(x,z,r,color,arc=Math.PI*2,yaw=0){
    const group=new THREE.Group();group.name='boss-danger-zone';group.position.set(x,floor,z);group.rotation.y=yaw-Math.PI/2;root.add(group);
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
      uniforms:{color:{value:new THREE.Color(color)},progress:{value:0},radius:{value:r}},
      vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 p;uniform vec3 color;uniform float progress;uniform float radius;void main(){float r=length(p)/radius;float wave=1.-smoothstep(.01,.075,abs(r-progress));float edge=smoothstep(.91,1.,r);gl_FragColor=vec4(color,.08+progress*.13+wave*.42+edge*.3);}'
    });
    const disk=mesh(new THREE.RingGeometry(.08,r,72,1,-arc/2,arc),mat,group,true);disk.rotation.x=-Math.PI/2;
    const outline=mesh(new THREE.RingGeometry(r-.1,r,72,1,-arc/2,arc),material(color,.85),group,true);outline.rotation.x=-Math.PI/2;outline.position.y=.025;
    group.userData.progress=mat.uniforms.progress;
    tells.push(group);return group;
  }
  function burst(x,y,z,color,radius=3){
    const group=new THREE.Group();group.position.set(x,y,z);root.add(group);
    const mat=material(color,.9),velocities=[];
    for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2,spark=mesh(sparkGeometry,mat,group);
      spark.scale.set(1,2.2,1);velocities.push(new THREE.Vector3(Math.cos(a)*(radius+2),2+(i%5)*.8,Math.sin(a)*(radius+2)));
    }
    effects.push({object:group,time:.48,duration:.48,update(dt,remaining){
      mat.opacity=remaining/.48;
      group.children.forEach((spark,i)=>{velocities[i].y-=11*dt;spark.position.addScaledVector(velocities[i],dt)});
    }});
    const ring=mesh(new THREE.RingGeometry(.83,1,64),material(color,.9),root,true);ring.rotation.x=-Math.PI/2;ring.position.set(x,floor+.02,z);
    effects.push({object:ring,time:.5,duration:.5,update(dt,remaining){ring.scale.setScalar(.5+(1-remaining/.5)*radius);ring.material.opacity=remaining/.5*.85}});
  }
  function slash(enemy){
    const arc=enemy.skill==='combo'?Math.PI*.76:Math.PI*.95;
    const slash=mesh(new THREE.RingGeometry(4.8,7.3,64,1,-arc/2,arc),material(0xffd995,.92),root,true);
    slash.rotation.set(-Math.PI/2,0,enemy.lockedYaw-Math.PI/2,'YXZ');slash.position.set(enemy.x,172.0,enemy.z);
    effects.push({object:slash,time:.23,duration:.23,update(dt,left){slash.material.opacity=left/.23*.9;slash.position.y-=dt*3;slash.scale.setScalar(1+(1-left/.23)*.15)}});
    burst(enemy.x+Math.sin(enemy.lockedYaw)*4,171.3,enemy.z+Math.cos(enemy.lockedYaw)*4,0xffd893,3);
    feedback.cue('bossSlash');
  }
  function pillar(x,z){
    const beamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
      uniforms:{envelope:{value:1},time:{value:0}},
      vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 v;uniform float envelope;uniform float time;void main(){float streak=pow(.5+.5*sin(v.x*62.83-v.y*10.+time*8.),7.);float edge=sin(v.y*3.14159);vec3 color=mix(vec3(1.,.29,.61),vec3(1.,.85,.62),streak*.7);gl_FragColor=vec4(color,(.12+streak*.32)*edge*envelope);}'
    });
    const beam=mesh(new THREE.CylinderGeometry(.75,2.6,13,32,1,true),beamMaterial,root,true);beam.position.set(x,floor+.65,z);beam.scale.y=.1;
    const core=mesh(new THREE.CylinderGeometry(.18,.55,13,16,1,true),material(0xffd2e8,.5),beam,true);
    for(const y of [-6.1,-3.5]){
      const halo=mesh(new THREE.TorusGeometry(y<-5?2.45:1.9,.045,6,48),material(0xffd59c,.8),beam,true);halo.rotation.x=Math.PI/2;halo.position.y=y;
    }
    effects.push({object:beam,time:.65,duration:.65,update(dt,left){
      const t=left/.65,growth=Math.min(1,(.65-left)/.1),height=Math.max(.02,growth*(.8+t*.2));
      beamMaterial.uniforms.envelope.value=t;beamMaterial.uniforms.time.value+=dt;core.material.opacity=t*.5;
      beam.scale.set(1+(1-t)*.18,height,1+(1-t)*.18);beam.position.y=floor+6.5*height;
    }});
    burst(x,floor+.3,z,0xff9bc7,4.1);
  }
  function judgmentZones(enemy){
    const point=enemy.aimPoint,sideX=Math.cos(enemy.lockedYaw),sideZ=-Math.sin(enemy.lockedYaw);
    const forward=enemy.step===0?0:5.7;
    enemy.targets=[-6.8,0,6.8].map(offset=>({
      x:THREE.MathUtils.clamp(point.x+sideX*offset+Math.sin(enemy.lockedYaw)*forward,-23,23),
      z:THREE.MathUtils.clamp(point.z+sideZ*offset+Math.cos(enemy.lockedYaw)*forward,-112,-54)
    }));
    for(const point of enemy.targets)zone(point.x,point.z,3.1,0xff6fb5);
  }
  function prepare(enemy){
    clearTells();
    const skill=BOSS_SKILLS[enemy.skill];
    if(enemy.skill==='judgment')judgmentZones(enemy);
    else if(enemy.skill==='meteor'){
      const charge=new THREE.Group();charge.name='boss-meteor-charge';charge.position.set(enemy.x+Math.sin(enemy.lockedYaw)*2,174.5,enemy.z+Math.cos(enemy.lockedYaw)*2);root.add(charge);tells.push(charge);
      mesh(orbGeometry,material(0xffb7d9),charge).scale.setScalar(2);
      for(let i=0;i<2;i++){const ring=mesh(ringGeometry,material(0xffdf9a,.9),charge);ring.scale.setScalar(2);ring.rotation.set(i*.8,.3,i*1.5)}
      enemy.charge=charge;
      const lineGeometry=new THREE.BufferGeometry().setFromPoints([charge.position,enemy.aimPoint]);
      const line=new THREE.Line(lineGeometry,material(0xffc882,.6));line.userData.ownedGeometry=true;line.frustumCulled=false;line.name='boss-meteor-aim';root.add(line);tells.push(line);enemy.aimLine=line;
      enemy.aimMarker=zone(enemy.aimPoint.x,enemy.aimPoint.z,1,0xffcc83);
    }else{
      const arc=enemy.skill==='combo'?Math.PI*.76:Math.PI*2;
      zone(enemy.x,enemy.z,skill.range,enemy.skill==='combo'?0xffc466:0xc786ff,arc,enemy.lockedYaw);
    }
  }
  function start(enemy,id){
    if(!BOSS_SKILLS[id]||enemy.dead)return;
    const distance=Math.hypot(player.x-enemy.x,player.z-enemy.z);
    if(inMeleeRange(distance)&&!isMelee(id))id=meleeSkill(enemy,distance);
    enemy.skill=id;enemy.nova=id==='nova';enemy.step=0;enemy.phase='windup';
    enemy.windup=enemy.windupTotal=BOSS_SKILLS[id].windup;
    enemy.lockedYaw=Math.atan2(player.x-enemy.x,player.z-enemy.z);
    enemy.aimPoint=new THREE.Vector3(player.x,player.y+1.4,player.z);enemy.swing=0;
    prepare(enemy);
  }
  function recover(enemy){enemy.phase='recover';enemy.windup=.85;enemy.cd=enemy.hp<enemy.maxHp*.5?1.7:2.6;clearTells();getCastle().telegraph.visible=false}
  function fire(enemy){
    const origin=new THREE.Vector3(enemy.x+Math.sin(enemy.lockedYaw)*2,174.5,enemy.z+Math.cos(enemy.lockedYaw)*2);
    for(const offset of [-2.7,0,2.7]){
      const target=enemy.aimPoint.clone();target.x+=Math.cos(enemy.lockedYaw)*offset;target.z-=Math.sin(enemy.lockedYaw)*offset;
      const velocity=target.sub(origin).normalize().multiplyScalar(19);
      const object=new THREE.Group();object.name='boss-crown-meteor';object.position.copy(origin);object.quaternion.setFromUnitVectors(up,velocity.clone().normalize());root.add(object);
      mesh(orbGeometry,material(0xffecdc),object);
      const ring=mesh(ringGeometry,material(0xffa8d0),object);ring.rotation.x=Math.PI/2;
      const trail=mesh(trailGeometry,material(0xffb156,.48),object);trail.position.y=-1.1;
      projectiles.push({object,velocity,time:3.8,damage:165});
    }
    feedback.cue('bossShot');
  }
  function resolve(enemy){
    const dx=player.x-enemy.x,dz=player.z-enemy.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    if(enemy.skill==='combo'){
      const inCone=distance<.1||(dx*Math.sin(enemy.lockedYaw)+dz*Math.cos(enemy.lockedYaw))/(distance||1)>=Math.cos(Math.PI*.38);
      if(distance<=7.45&&inCone)hurt([95,115,155][enemy.step],angle,{invulnerability:.3});
      if(player.dead)return;
      enemy.swing=.23;slash(enemy);
      if(enemy.step<2){
        enemy.step++;enemy.windup=enemy.windupTotal=enemy.step===1?.55:.72;prepare(enemy);return;
      }
    }else if(enemy.skill==='judgment'){
      let hits=false;
      for(const point of enemy.targets){pillar(point.x,point.z);if(Math.hypot(player.x-point.x,player.z-point.z)<=3.45)hits=true}
      if(hits)hurt(enemy.step===0?180:205,angle,{blockable:false});
      if(player.dead)return;
      feedback.cue('bossJudgment');
      if(enemy.step===0){enemy.step=1;enemy.windup=enemy.windupTotal=1.0;prepare(enemy);return}
    }else if(enemy.skill==='meteor')fire(enemy);
    else if(enemy.skill==='nova'){
      if(distance<=13&&player.y<=(player.floorY??170)+1)hurt(220,angle,{blockable:false});
      if(player.dead)return;
      burst(enemy.x,floor+.2,enemy.z,0xd38fff,14);feedback.cue('bossJudgment');
    }else{
      if(distance<=6)hurt(enemy.damage,angle);
      if(player.dead)return;
      enemy.swing=.23;slash(enemy);
    }
    recover(enemy);
  }
  function updateProjectiles(dt){
    for(let i=projectiles.length-1;i>=0;i--){
      const shot=projectiles[i],start=shot.object.position.clone(),length=shot.velocity.length()*dt;
      shot.time-=dt;shot.object.position.addScaledVector(shot.velocity,dt);shot.object.rotateY(dt*9);
      ray.set(start,shot.velocity.clone().normalize());low.set(player.x,player.y+.3,player.z);high.set(player.x,player.y+2.15,player.z);
      const distance=ray.distanceSqToSegment(low,high,closest,bodyClosest),along=closest.clone().sub(start).dot(ray.direction);
      const hit=distance<=.85**2&&along<=length+.1;
      const at=shot.object.position,outside=Math.abs(at.x)>27||at.z<-116||at.z>-49||at.y<170;
      if(hit){
        const result=hurt(shot.damage,Math.atan2(shot.velocity.x,shot.velocity.z));
        if(player.dead)return;
        burst(closest.x,closest.y,closest.z,result==='blocked'?0xa7edff:0xffbaab,1.4);
      }
      if(hit||outside||shot.time<=0){remove(shot.object);projectiles.splice(i,1)}
    }
  }
  function update(enemy,dt,time){
    enemy.cd-=dt;enemy.hit=Math.max(0,enemy.hit-dt);enemy.swing=Math.max(0,(enemy.swing||0)-dt);
    for(let i=effects.length-1;i>=0;i--){const effect=effects[i];effect.time-=dt;if(effect.time<=0){remove(effect.object);effects.splice(i,1)}else effect.update(dt,effect.time)}
    updateProjectiles(dt);
    if(player.dead)return;
    const dx=player.x-enemy.x,dz=player.z-enemy.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    if(enemy.phase==='windup'&&inMeleeRange(distance)&&!isMelee(enemy.skill))start(enemy,meleeSkill(enemy,distance));
    if(enemy.phase==='windup'){
      enemy.mesh.rotation.y=enemy.lockedYaw+Math.PI;
      enemy.windup-=dt;
      if(enemy.skill==='meteor'&&enemy.windup>.65){
        enemy.aimPoint.set(player.x,player.y+1.4,player.z);
        enemy.aimLine.geometry.attributes.position.setXYZ(1,enemy.aimPoint.x,enemy.aimPoint.y,enemy.aimPoint.z);
        enemy.aimLine.geometry.attributes.position.needsUpdate=true;
        enemy.aimMarker.position.x=enemy.aimPoint.x;enemy.aimMarker.position.z=enemy.aimPoint.z;
      }
      const progress=1-enemy.windup/enemy.windupTotal;
      for(const tell of tells)if(tell.userData.progress)tell.userData.progress.value=THREE.MathUtils.clamp(progress,0,1);
      if(enemy.skill==='meteor'){enemy.charge.rotation.y+=dt*3;enemy.charge.scale.setScalar(.55+progress*.6)}
      if(enemy.windup<=0){resolve(enemy);if(player.dead)return}
    }else if(enemy.phase==='recover'){
      enemy.windup-=dt;if(enemy.windup<=0)enemy.phase='idle';
    }else{
      enemy.mesh.rotation.y=angle+Math.PI;
      if(enemy.cd<=0&&distance<52){
        let id=inMeleeRange(distance)?meleeSkill(enemy,distance):order[enemy.attacks%order.length];
        enemy.attacks++;
        if(!inMeleeRange(distance)&&isMelee(id))id='meteor';
        start(enemy,id);
      }else if(distance>3.8){
        enemy.x=THREE.MathUtils.clamp(enemy.x+dx/(distance||1)*enemy.speed*dt,-24,24);
        enemy.z=THREE.MathUtils.clamp(enemy.z+dz/(distance||1)*enemy.speed*dt,-112,-55);
      }
    }
    enemy.mesh.position.set(enemy.x,170,enemy.z);enemy.mesh.scale.lerp(new THREE.Vector3(1,1,1),dt*10);
    const progress=enemy.phase==='windup'?1-enemy.windup/enemy.windupTotal:0;
    enemy.animateVisual(time,progress,enemy.nova,enemy.hit,distance>3.8&&enemy.phase==='idle'?1:0,0,{skill:enemy.skill,step:enemy.step,progress,release:enemy.swing>0?1-enemy.swing/.23:null});
    const tell=getCastle().telegraph;
    tell.visible=enemy.phase==='windup'&&(enemy.skill==='cleave'||enemy.skill==='nova');
    tell.position.set(enemy.x,floor,enemy.z);tell.scale.setScalar(enemy.nova?13:6);tell.material.opacity=.35+Math.sin(time*13)**2*.35;
  }
  function action(enemy){
    const prefix=enemy.hp<enemy.maxHp*.5?'폭주 · ':'';
    if(enemy.phase==='windup')return prefix+BOSS_SKILLS[enemy.skill].hint+(enemy.skill==='combo'?` (${enemy.step+1}/3)`:enemy.skill==='judgment'?` (${enemy.step+1}/2)`:'');
    if(projectiles.length)return '왕관의 유성 · 날아오는 탄을 회피하거나 방어';
    return enemy.phase==='recover'?'공격 후 빈틈 · 지금 반격하세요':prefix+'공격의 빈틈을 노리세요';
  }
  return {root,projectiles,effects,start,update,clear,action};
}
