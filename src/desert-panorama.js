import * as THREE from 'three';

export function createDesertPanorama(){
  const scene=new THREE.Scene();scene.name='desert-oasis-panorama';
  scene.background=new THREE.Color(0x6bbcf1);scene.fog=new THREE.Fog(0xf2d4a1,100,235);
  const camera=new THREE.PerspectiveCamera(48,1,.1,290);
  scene.add(new THREE.HemisphereLight(0xecf8ff,0xb68145,2.65));
  const sun=new THREE.DirectionalLight(0xffe6b2,3.4);sun.position.set(-35,55,30);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0003;
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:38,bottom:-38,near:1,far:170});scene.add(sun);
  const mat=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
  const sand=mat(0xeac086),sandstone=mat(0xc99f6b),lightStone=mat(0xe7c697),darkStone=mat(0xb38656);
  const camelFur=mat(0xbe925c),camelLight=mat(0xd5b17c),camelDark=mat(0x87603e),hoof=mat(0x654d38);
  const time={value:0};
  let seed=35761;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const oasisX=2,oasisZ=-5,waterRX=16.5,waterRZ=14;
  function groundHeight(x,z){
    const radius=Math.hypot((x-oasisX)/waterRX,(z-oasisZ)/waterRZ);
    if(radius<1)return -.35;
    const shore=THREE.MathUtils.smoothstep(radius,1,1.5);
    const distance=Math.max(0,-z-15);
    const dunes=1.1+Math.sin(x*.055+z*.075)*1.5+Math.sin(x*.09-z*.028+1.1)*1.1;
    return .16+shore*(.3+Math.max(0,dunes)*Math.min(4,distance*.12));
  }
  function oval(parent,x,y,z,rx,ry,rz,material,geometry){
    const mesh=new THREE.Mesh(geometry||new THREE.SphereGeometry(1,16,12),material);
    mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);parent.add(mesh);return mesh;
  }
  function block(parent,x,y,z,w,h,d,material){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  const terrainGeometry=new THREE.PlaneGeometry(240,220,100,90);terrainGeometry.rotateX(-Math.PI/2);terrainGeometry.translate(0,0,-45);
  const terrainPoints=terrainGeometry.attributes.position;
  for(let i=0;i<terrainPoints.count;i++)terrainPoints.setY(i,groundHeight(terrainPoints.getX(i),terrainPoints.getZ(i)));
  terrainGeometry.computeVertexNormals();
  sand.onBeforeCompile=shader=>{
    shader.uniforms.panoramaTime=time;
    shader.vertexShader='varying vec3 sandPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsandPoint=position;');
    shader.fragmentShader='varying vec3 sandPoint;uniform float panoramaTime;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat ripple=sin(sandPoint.z*8.5+sandPoint.x*.45+sin(sandPoint.x*.2)*2.-panoramaTime*.07);diffuseColor.rgb*=.95+.05*ripple;');
  };
  const terrain=new THREE.Mesh(terrainGeometry,sand);terrain.name='wind-rippled-desert';terrain.receiveShadow=true;scene.add(terrain);

  // Two square pyramids, with individually colored courses of exposed stone.
  const pyramidBlocks=new THREE.Group();pyramidBlocks.name='oasis-pyramids';scene.add(pyramidBlocks);
  function pyramid(x,z,size,height){
    const core=new THREE.Mesh(new THREE.ConeGeometry(size/Math.SQRT2,height,4),sandstone);
    core.rotation.y=Math.PI/4;core.position.set(x,height/2,z);pyramidBlocks.add(core);
    const stones=[];
    for(let row=0;row<Math.floor(height/.8)-2;row++){
      const y=.4+row*.8,half=size*.5*(1-y/height),count=Math.max(1,Math.floor(half*2/1.55)),step=half*2/count;
      for(let side=0;side<4;side++)for(let j=0;j<count;j++){
        const along=-half+(j+.5)*step;
        stones.push({x:x+(side===0?along:side===1?half:side===2?-along:-half),y,z:z+(side===0?half:side===1?-along:side===2?-half:along),side,width:step});
      }
    }
    const bricks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(0xffffff),stones.length),transform=new THREE.Object3D();
    stones.forEach((stone,i)=>{
      transform.position.set(stone.x,stone.y+(random()-.5)*.025,stone.z);
      transform.rotation.set(0,stone.side*Math.PI/2,0);transform.scale.set(stone.width*.96,.76,1.05);
      transform.updateMatrix();bricks.setMatrixAt(i,transform.matrix);
      bricks.setColorAt(i,new THREE.Color([0xe3bc86,0xd8ab73,0xcf9c62,0xe9c895][i%4]));
    });
    bricks.receiveShadow=true;pyramidBlocks.add(bricks);
    const capHeight=height*.1,capSize=size*.1;
    const cap=new THREE.Mesh(new THREE.ConeGeometry(capSize/Math.SQRT2,capHeight,4),lightStone);
    cap.rotation.y=Math.PI/4;cap.position.set(x,height-capHeight/2+.05,z);pyramidBlocks.add(cap);
  }
  pyramid(19,-67,43,32);pyramid(-25,-88,30,23);

  // Blue lake: moving sky highlights, curved shore foam and gentle wavelets.
  const waterGeometry=new THREE.CircleGeometry(1,112);waterGeometry.rotateX(-Math.PI/2);
  waterGeometry.scale(waterRX,1,waterRZ);waterGeometry.translate(oasisX,.13,oasisZ);
  const waterMaterial=new THREE.ShaderMaterial({uniforms:{time},side:THREE.DoubleSide,
    vertexShader:`uniform float time;varying vec3 lakePoint;void main(){vec3 p=position;p.y+=sin(p.x*1.3-time)*.025+cos(p.z*2.+time*.7)*.02;lakePoint=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float time;varying vec3 lakePoint;void main(){
      float r=length(vec2((lakePoint.x-2.)/16.5,(lakePoint.z+5.)/14.));
      float a=sin(lakePoint.z*5.4-time*2.+sin(lakePoint.x*.7)*.7);
      float b=sin(lakePoint.x*.95+sin(lakePoint.z*.45-time*.3));
      float shine=pow(max(0.,a*.77+b*.23),10.);
      float sky=.5+.5*sin(lakePoint.z*.44+sin(lakePoint.x*.27)+time*.2);
      vec3 c=mix(vec3(.015,.18,.23),vec3(.055,.43,.56),sky*.6+.2);
      c=mix(c,vec3(.22,.64,.59),smoothstep(.6,1.,r)*.7);c+=shine*vec3(.38,.52,.55);
      float shore=smoothstep(.97,1.,r);c=mix(c,vec3(.75,.88,.75),shore*.42);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const lake=new THREE.Mesh(waterGeometry,waterMaterial);lake.name='shimmering-oasis';scene.add(lake);

  // Palm leaves are actual curved fronds with separate narrow leaflets.
  const palmCount=20,frondsPerTree=10,palmGroup=new THREE.Group();palmGroup.name='oasis-palms';scene.add(palmGroup);
  const trunkGeometry=new THREE.CylinderGeometry(.29,.52,8,10,18);trunkGeometry.translate(0,4,0);
  const trunkPoints=trunkGeometry.attributes.position,trunkColors=[];
  for(let i=0;i<trunkPoints.count;i++){
    const y=trunkPoints.getY(i);trunkPoints.setX(i,trunkPoints.getX(i)+.65*(y/8)**2);
    const color=new THREE.Color(Math.round(y/8*18)%2?0x815635:0xa87b47);trunkColors.push(color.r,color.g,color.b);
  }
  trunkGeometry.setAttribute('color',new THREE.Float32BufferAttribute(trunkColors,3));trunkGeometry.computeVertexNormals();
  const trunks=new THREE.InstancedMesh(trunkGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),palmCount);
  const leafPositions=[],leafColors=[];
  const darkLeaf=new THREE.Color(0x577b37),sunLeaf=new THREE.Color(0x9eb446);
  function frondPoint(t){return new THREE.Vector3(t*6,Math.sin(t*Math.PI)*1.4-t*.8,0)}
  function leafTriangle(a,b,c,color){for(const v of [a,b,c]){leafPositions.push(v.x,v.y,v.z);leafColors.push(color.r,color.g,color.b)}}
  for(let i=0;i<25;i++){
    const t=.1+i*.034,p=frondPoint(t),leafLength=Math.sin(t*Math.PI)*1.25+.12;
    const color=darkLeaf.clone().lerp(sunLeaf,t*.65);
    for(const side of [-1,1]){
      const ridge=p.clone().add(new THREE.Vector3(-.02,-.04,side*leafLength*.5));
      const tip=p.clone().add(new THREE.Vector3(-.5,-.4,side*leafLength));
      const back=p.clone().add(new THREE.Vector3(-.2,-.16,side*leafLength*.5));
      leafTriangle(p,ridge,tip,color);leafTriangle(p,tip,back,color);
    }
    const next=frondPoint(t+.035);
    leafTriangle(p.clone().add(new THREE.Vector3(0,0,-.04)),next,p.clone().add(new THREE.Vector3(0,0,.04)),sunLeaf);
  }
  const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(leafPositions,3));
  leafGeometry.setAttribute('color',new THREE.Float32BufferAttribute(leafColors,3));leafGeometry.computeVertexNormals();
  const leafMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide,emissive:0x172607,emissiveIntensity:.2});
  const fronds=new THREE.InstancedMesh(leafGeometry,leafMaterial,palmCount*frondsPerTree);
  const coconuts=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,8,6),camelDark,palmCount*3);
  const palmTransforms=[],transform=new THREE.Object3D();
  for(let i=0;i<palmCount;i++){
    const foreground=i<2,side=i%2?1:-1,backGrove=i>=12;
    const x=foreground?(i===0?-21:24):backGrove?-10+random()*25:side*(24+random()*11);
    const z=foreground?8:backGrove?-28-random()*13:-9-random()*30;
    const s=foreground?1.3:backGrove?.55+random()*.2:.7+random()*.35,y=groundHeight(x,z),yaw=random()*6.28;
    transform.position.set(x,y,z);transform.rotation.set(0,yaw,0);transform.scale.setScalar(s);transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix);
    const top=new THREE.Vector3(.65,8,0).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(s).add(new THREE.Vector3(x,y,z));
    for(let j=0;j<frondsPerTree;j++){
      const rotation=j/frondsPerTree*Math.PI*2+random()*.2;
      palmTransforms.push({top,scale:s,yaw:rotation,lean:(j%3-1)*.13,phase:random()*6.28});
    }
    for(let j=0;j<3;j++){
      transform.position.set(top.x+Math.sin(j*2.1)*s*.35,top.y-.28*s,top.z+Math.cos(j*2.1)*s*.35);
      transform.scale.setScalar(s);transform.updateMatrix();coconuts.setMatrixAt(i*3+j,transform.matrix);
    }
  }
  trunks.castShadow=true;fronds.castShadow=true;palmGroup.add(trunks,fronds,coconuts);

  const bankRocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),lightStone,95);
  const reeds=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,1,3),mat(0x879346),540);
  for(let i=0;i<95;i++){
    const a=random()*6.28,r=1.04+random()*.18;
    const x=oasisX+Math.cos(a)*waterRX*r,z=oasisZ+Math.sin(a)*waterRZ*r,y=groundHeight(x,z),s=.35+random()*.9;
    transform.position.set(x,y+.1,z);transform.rotation.set(random()*.3,random()*6.28,random()*.2);transform.scale.set(s*1.35,s*.75,s);
    transform.updateMatrix();bankRocks.setMatrixAt(i,transform.matrix);
  }
  const blades=[];
  for(let i=0;i<540;i++){
    const a=i/540*6.28+random()*.1,r=1.01+random()*.12;
    const x=oasisX+Math.cos(a)*waterRX*r,z=oasisZ+Math.sin(a)*waterRZ*r,h=.35+random()*.8;
    blades.push({x,y:groundHeight(x,z)+h/2,z,h,phase:random()*6.28});
  }
  scene.add(bankRocks,reeds);
  const bushes=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),mat(0x68823c),65);
  for(let i=0;i<65;i++){
    const a=random()*6.28,r=1.12+random()*.16;
    const x=oasisX+Math.cos(a)*waterRX*r,z=oasisZ+Math.sin(a)*waterRZ*r;
    transform.position.set(x,groundHeight(x,z)+.22,z);transform.rotation.set(0,random()*6.28,0);
    transform.scale.set(.35+random()*.6,.25+random()*.35,.35+random()*.6);transform.updateMatrix();bushes.setMatrixAt(i,transform.matrix);
  }
  scene.add(bushes);
  const pads=new THREE.InstancedMesh(new THREE.CircleGeometry(.35,12),mat(0x7c9b46),30);
  for(let i=0;i<30;i++){
    const a=random()*6.28,r=.6+random()*.3;
    transform.position.set(oasisX+Math.cos(a)*waterRX*r,.19,oasisZ+Math.sin(a)*waterRZ*r);
    transform.rotation.set(-Math.PI/2,0,random()*6.28);transform.scale.setScalar(.6+random()*.9);transform.updateMatrix();pads.setMatrixAt(i,transform.matrix);
  }
  scene.add(pads);

  // Broken column arcade above the far right bank.
  const ruins=new THREE.Group();ruins.name='oasis-ancient-ruins';ruins.position.set(24,groundHeight(24,-23),-23);scene.add(ruins);
  for(let i=0;i<5;i++){
    const x=(i-2)*2.9,height=i===4?2.4:4.8;
    block(ruins,x,.22,0,1.65,.44,1.65,lightStone);
    for(let j=0;j<Math.floor(height/.75);j++){
      const part=new THREE.Mesh(new THREE.CylinderGeometry(.48,.53,.73,9),j%2?sandstone:lightStone);
      part.position.set(x,.77+j*.75,0);part.rotation.y=j*.1;part.castShadow=true;ruins.add(part);
    }
    if(i<4)block(ruins,x,5.15,0,1.45,.55,1.35,lightStone);
    if(i<3)block(ruins,x+1.45,5.6,0,3.1,.55,1.15,sandstone);
  }
  for(let i=0;i<12;i++){
    const stone=block(ruins,-7+random()*15,.35,1+random()*3,.7+random(),.5+random()*.5,.7+random(),i%2?darkStone:lightStone);
    stone.rotation.set(random()*.2,random()*6.28,random()*.3);
  }
  const fallen=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,3.2,9),lightStone);fallen.rotation.z=Math.PI/2+.1;fallen.position.set(2,.6,4);ruins.add(fallen);

  // Dromedary on the left bank, with a lowered neck and packed red saddle.
  const camel=new THREE.Group();camel.name='drinking-camel';camel.position.set(-19.4,groundHeight(-19.4,-5)+.05,-5);camel.scale.setScalar(1.2);scene.add(camel);
  const body=oval(camel,-.2,2.75,0,2.2,1.02,.83,camelFur);
  oval(camel,-.55,3.58,0,.92,1.13,.72,camelFur);
  oval(camel,1.3,2.8,0,.65,.9,.74,camelFur);
  for(const x of [-1.55,1.2])for(const z of [-.58,.58]){
    const surface=groundHeight(camel.position.x+x*1.2,camel.position.z+z*1.2);
    const footY=(surface-camel.position.y)/1.2+.12,length=2.65-footY;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.15,.12,length,9),camelFur);leg.position.set(x,footY+length/2,z);camel.add(leg);
    oval(camel,x,footY+length*.5,z,.21,.22,.19,camelLight);
    for(const side of [-1,1])oval(camel,x+side*.09,footY,z-.04,.13,.13,.23,hoof);
  }
  const neck=new THREE.Group();neck.name='drinking-camel-neck';neck.position.set(1.6,3.2,0);camel.add(neck);
  const drinkingHeight=(.16-camel.position.y)/1.2-neck.position.y;
  const neckCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(.55,-.25,0),new THREE.Vector3(1,-1.2,0),
    new THREE.Vector3(1.55,drinkingHeight+.9,0),new THREE.Vector3(2.2,drinkingHeight+.45,0)
  ]);
  const neckMesh=new THREE.Mesh(new THREE.TubeGeometry(neckCurve,28,.27,10,false),camelFur);neck.add(neckMesh);
  const head=oval(neck,2.2,drinkingHeight+.5,0,.65,.43,.34,camelLight);head.rotation.z=-.55;
  oval(neck,2.78,drinkingHeight+.17,0,.49,.23,.3,camelLight);
  for(const side of [-1,1]){
    const ear=oval(neck,1.88,drinkingHeight+.93,side*.32,.12,.36,.13,camelFur);ear.rotation.z=-.7;
    oval(neck,2.34,drinkingHeight+.67,side*.31,.075,.085,.045,mat(0x25211e,.4));
    oval(neck,3.04,drinkingHeight+.24,side*.17,.075,.04,.035,camelDark);
  }
  const blanket=mat(0x9e3835),gold=mat(0xd4ae52);
  for(const side of [-1,1]){
    block(camel,-.48,3.04,side*.83,2.15,.9,.08,blanket);
    block(camel,-.48,2.62,side*.88,2.2,.09,.05,gold);
    block(camel,-.48,3.45,side*.88,2.2,.09,.05,gold);
    for(let i=0;i<5;i++)block(camel,-1.3+i*.41,3.04,side*.885,.1,.55,.035,gold);
    const pack=block(camel,-1.25,3.72,side*.58,.75,.55,.55,camelDark);pack.rotation.z=.1;
    block(camel,-1.25,3.74,side*.88,.15,.55,.04,gold);
  }
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.065,.035,1.3,7),camelDark);tail.position.set(-2.45,2.25,0);tail.rotation.z=-.25;camel.add(tail);
  oval(camel,-2.6,1.65,0,.15,.25,.12,camelDark);
  camel.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true}});
  const ripples=[];
  const muzzleX=camel.position.x+(neck.position.x+3)*1.2;
  for(let i=0;i<4;i++){
    const ripple=new THREE.Mesh(new THREE.RingGeometry(.55,.575,60),new THREE.MeshBasicMaterial({color:0xd5f2dc,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}));
    ripple.rotation.x=-Math.PI/2;ripple.position.set(muzzleX,.21,-5);scene.add(ripple);ripples.push(ripple);
  }

  const clouds=new THREE.Group(),cloudMaterial=new THREE.MeshBasicMaterial({color:0xfff3dc,transparent:true,opacity:.65,depthWrite:false});
  const cloudGeometry=new THREE.SphereGeometry(1,10,7);
  for(let i=0;i<6;i++)for(let j=0;j<4;j++)oval(clouds,-85+i*31+j*3,31+i%3*5,-125,4,1.35,2,cloudMaterial,cloudGeometry);
  scene.add(clouds);
  const dustPositions=[];
  for(let i=0;i<300;i++)dustPositions.push(random()*120-60,random()*6,-70+random()*100);
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const dustMaterial=new THREE.ShaderMaterial({uniforms:{time},transparent:true,depthWrite:false,
    vertexShader:`uniform float time;varying float opacity;void main(){vec3 p=position;p.x=mod(p.x+60.+time*.65,120.)-60.;p.y+=sin(time*.6+p.z)*.12;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(60./max(1.,-mv.z),1.,2.5);opacity=.08+fract(position.x)*.16;}`,
    fragmentShader:`varying float opacity;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(1.,.84,.57,(1.-smoothstep(.1,.5,r))*opacity);}`
  });
  const dust=new THREE.Points(dustGeometry,dustMaterial);dust.name='oasis-sand-drift';scene.add(dust);
  function update(elapsed){
    time.value=elapsed;
    const portrait=camera.aspect<1,fov=portrait?66:48;
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}
    camera.position.set((portrait?-16:0)+Math.sin(elapsed*.06)*1.4,10.5+Math.sin(elapsed*.11)*.14,32);
    camera.lookAt(portrait?-12:1,3,-20);
    neck.rotation.z=Math.sin(elapsed*Math.PI/4)*.028;
    body.scale.y=1.02+Math.sin(elapsed*1.3)*.015;
    tail.rotation.z=-.25+Math.sin(elapsed*1.7)*.15;
    palmTransforms.forEach((p,i)=>{
      transform.position.copy(p.top);transform.rotation.set(Math.sin(elapsed*.65+p.phase)*.035,p.yaw,p.lean+Math.sin(elapsed*.75+p.phase)*.025);
      transform.scale.setScalar(p.scale);transform.updateMatrix();fronds.setMatrixAt(i,transform.matrix);
    });fronds.instanceMatrix.needsUpdate=true;
    blades.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z);transform.rotation.set(.15+Math.sin(elapsed*.8+p.phase)*.12,p.phase,.18);
      transform.scale.set(1,p.h,1);transform.updateMatrix();reeds.setMatrixAt(i,transform.matrix);
    });reeds.instanceMatrix.needsUpdate=true;
    ripples.forEach((ripple,i)=>{const age=(elapsed*.4+i/4)%1;ripple.scale.setScalar(.4+age*2);ripple.material.opacity=(1-age)*.4});
    clouds.position.x=Math.sin(elapsed*.025)*2.5;
  }
  update(0);
  return {scene,camera,update};
}
