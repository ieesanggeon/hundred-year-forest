import * as THREE from 'three';

// A separate title-screen world: no monsters, collisions, or stage state.
export function createSnowPanorama(){
  const scene=new THREE.Scene();
  scene.name='snow-valley-panorama';
  scene.background=new THREE.Color(0x73bce9);
  scene.fog=new THREE.Fog(0xc3def1,90,230);
  const camera=new THREE.PerspectiveCamera(48,1,.1,280);
  scene.add(new THREE.HemisphereLight(0xe5f5ff,0x71899f,3));
  const sunlight=new THREE.DirectionalLight(0xfff6e5,3.7);
  sunlight.position.set(-35,55,22);
  sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(1024,1024);
  Object.assign(sunlight.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:150});
  sunlight.shadow.bias=-.0003;
  scene.add(sunlight);
  const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
  const snow=mat(0xf0f7fc),blueSnow=mat(0xc3deed),stone=mat(0x677e90);
  const ice=mat(0x4da9d6,.3),pineGreen=mat(0x31585c),bark=mat(0x61534d);
  let seed=18473;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  function oval(parent,x,y,z,rx,ry,rz,material,geometry){
    const mesh=new THREE.Mesh(geometry||new THREE.SphereGeometry(1,16,12),material);
    mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);parent.add(mesh);
    return mesh;
  }
  const center=z=>1.5+5*Math.sin((z+18)*.045);
  const width=z=>7.3+(z+55)/95*5;
  function groundHeight(x,z){
    const bank=Math.abs(x-center(z))-width(z);
    return bank<0?-.3:.22+Math.min(3.2,bank*.17)+Math.sin(x*.14+z*.06)**2*.35;
  }

  // Faceted, irregular ridges with blue crevices and white snow shoulders.
  function mountain(x,z,radius,height,phase){
    const positions=[],colors=[],steps=28;
    const white=new THREE.Color(0xe2f2ff),shadow=new THREE.Color(0x3d79b1);
    function point(i,j){
      const nx=i/steps*2-1,nz=j/steps*2-1;
      const peaks=[[-.18,-.08,1],[.35,.14,.72],[-.47,.28,.6]];
      let ridge=0;
      for(const [px,pz,h] of peaks){
        const dx=nx-px,dz=(nz-pz)*1.3;
        ridge=Math.max(ridge,Math.max(0,1-Math.sqrt(dx*dx+dz*dz)*1.26)*h);
      }
      const folds=1+.19*Math.sin(nx*24+nz*14+phase)+.1*Math.cos(nz*31-nx*7+phase);
      return new THREE.Vector3(x+nx*radius,height*ridge**1.35*folds,z+nz*radius*.76);
    }
    for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){
      const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
      for(const triangle of [[a,d,b],[b,d,c]]){
        const normal=triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0])).normalize();
        const shade=THREE.MathUtils.clamp(.35+normal.y*.4-normal.x*.3,.05,1);
        const color=shadow.clone().lerp(white,shade);
        for(const vertex of triangle){positions.push(vertex.x,vertex.y,vertex.z);colors.push(color.r,color.g,color.b)}
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true,side:THREE.DoubleSide}));
    mesh.name='snow-mountain';scene.add(mesh);
  }
  for(let i=0;i<9;i++)mountain(-100+i*26,-120-Math.abs(i-5)*5,27+i%3*6,26+(i===5?20:i%3*7),i*1.3);
  mountain(24,-96,31,39,2.4);mountain(-31,-90,29,31,4.7);
  const cloudGeometry=new THREE.SphereGeometry(1,10,7);
  const cloudMaterial=new THREE.MeshBasicMaterial({color:0xe9f4fd,transparent:true,opacity:.72,depthWrite:false});
  const clouds=new THREE.Group();
  for(let i=0;i<6;i++)for(let j=0;j<4;j++)oval(clouds,-75+i*29+j*3,33+i%3*6,-140,4,1.6,2,cloudMaterial,cloudGeometry);
  scene.add(clouds);

  const terrainGeometry=new THREE.PlaneGeometry(160,160,64,64);
  terrainGeometry.rotateX(-Math.PI/2);terrainGeometry.translate(0,0,-28);
  const terrainPoints=terrainGeometry.attributes.position;
  for(let i=0;i<terrainPoints.count;i++)terrainPoints.setY(i,groundHeight(terrainPoints.getX(i),terrainPoints.getZ(i)));
  terrainGeometry.computeVertexNormals();
  const terrain=new THREE.Mesh(terrainGeometry,snow);terrain.receiveShadow=true;scene.add(terrain);

  // River coordinates are world X/Z, so snowbanks and drinking ripples line up.
  const riverPositions=[],riverUV=[],riverIndices=[],steps=80,across=16;
  for(let i=0;i<=steps;i++){
    const z=-65+i/steps*110;
    for(let j=0;j<=across;j++){
      riverPositions.push(center(z)+(j/across*2-1)*width(z),.06,z);
      riverUV.push(j/across,i/steps);
      if(i<steps&&j<across){const a=i*(across+1)+j,b=a+1,c=a+across+1;riverIndices.push(a,c,b,b,c,c+1)}
    }
  }
  const riverGeometry=new THREE.BufferGeometry();
  riverGeometry.setAttribute('position',new THREE.Float32BufferAttribute(riverPositions,3));
  riverGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(riverUV,2));
  riverGeometry.setIndex(riverIndices);riverGeometry.computeVertexNormals();
  const time={value:0};
  const riverMaterial=new THREE.ShaderMaterial({
    uniforms:{time},side:THREE.DoubleSide,
    vertexShader:`uniform float time;varying vec3 world;varying vec2 riverUV;
      void main(){vec3 p=position;p.y+=sin(p.x*1.4+time*1.4)*.035+cos(p.z*1.8-time*2.)*.025;
      world=p;riverUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float time;varying vec3 world;varying vec2 riverUV;
      void main(){float a=sin(world.x*.85+sin(world.z*.6-time)*.8+time*.25);
      float b=sin(world.z*4.8-time*2.4+sin(world.x*.7)*.65);
      float shine=pow(max(0.,a*.22+b*.78),10.);
      float reflection=.5+.5*sin(world.z*.45+sin(world.x*.6)+time*.25);
      vec3 c=mix(vec3(.025,.16,.29),vec3(.16,.48,.68),reflection*.7+.12);
      c+=shine*vec3(.42,.61,.69);
      float edge=pow(abs(riverUV.x*2.-1.),16.);c=mix(c,vec3(.62,.83,.93),edge*.7);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  });
  const river=new THREE.Mesh(riverGeometry,riverMaterial);river.name='flowing-snow-river';scene.add(river);

  // A long glacier shelf on the right; its cap is continuous above broken columns.
  const cliffPositions=[],cliffColors=[];
  const glacierColor=new THREE.Color(0x2f99cf),glacierTop=new THREE.Color(0xb9eaff);
  const glacierZ=x=>-45+Math.sin(x*.055)*5;
  const glacierHeight=x=>13+Math.sin(x*.12)*2+Math.cos(x*.29)*.6;
  for(let i=0;i<48;i++){
    const x=-1+i*1.8,x2=x+1.8,z=glacierZ(x),z2=glacierZ(x2),h=glacierHeight(x),h2=glacierHeight(x2);
    for(const v of [[x,1,z],[x2,1,z2],[x,h,z],[x2,1,z2],[x2,h2,z2],[x,h,z]]){
      cliffPositions.push(...v);const c=glacierColor.clone().lerp(glacierTop,v[1]/18);cliffColors.push(c.r,c.g,c.b);
    }
  }
  const cliffGeometry=new THREE.BufferGeometry();
  cliffGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cliffPositions,3));
  cliffGeometry.setAttribute('color',new THREE.Float32BufferAttribute(cliffColors,3));cliffGeometry.computeVertexNormals();
  const glacier=new THREE.Mesh(cliffGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.32,side:THREE.DoubleSide}));
  glacier.name='panorama-glacier';scene.add(glacier);
  const columnGeometry=new THREE.CylinderGeometry(.65,1,1,5,4);
  const columnPoints=columnGeometry.attributes.position;
  for(let i=0;i<columnPoints.count;i++){
    const x=columnPoints.getX(i),y=columnPoints.getY(i),z=columnPoints.getZ(i);
    columnPoints.setXYZ(i,x*(1+.18*Math.sin(y*12+z*6)),y,z*(1+.17*Math.cos(y*14+x*7)));
  }
  columnGeometry.computeVertexNormals();
  const iceColumns=new THREE.InstancedMesh(columnGeometry,ice,68);
  const glacierCaps=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),snow,68);
  const transform=new THREE.Object3D();
  for(let i=0;i<68;i++){
    const x=-1+i*1.25,h=glacierHeight(x),length=h*(.62+random()*.32);
    transform.position.set(x,h-length/2,glacierZ(x)+.35+random()*.3);
    transform.rotation.set((random()-.5)*.04,random(),(random()-.5)*.12);transform.scale.set(.8+random()*.7,length,.8);
    transform.updateMatrix();iceColumns.setMatrixAt(i,transform.matrix);
    transform.position.set(x,h+.1,glacierZ(x)-.8);transform.scale.set(1.25,.5,2.4);
    transform.updateMatrix();glacierCaps.setMatrixAt(i,transform.matrix);
  }
  scene.add(iceColumns,glacierCaps);
  const cracks=[];
  for(let i=0;i<42;i++){
    const x=i*1.85,h=glacierHeight(x),z=glacierZ(x)+.85;
    cracks.push(x,h-.9,z,x+.15,h-2.8-random()*3,z+.05,x+.15,h-2.8-random()*3,z+.05,x-.13,2+random()*4,z+.15);
  }
  const crackGeometry=new THREE.BufferGeometry();crackGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cracks,3));
  scene.add(new THREE.LineSegments(crackGeometry,new THREE.LineBasicMaterial({color:0x4a9cc9,transparent:true,opacity:.55})));

  const rockGeometry=new THREE.DodecahedronGeometry(1,1);
  const rocks=new THREE.InstancedMesh(rockGeometry,stone,74),rockCaps=new THREE.InstancedMesh(rockGeometry,snow,74);
  for(let i=0;i<74;i++){
    const z=-50+random()*83,side=i%2?1:-1;
    const x=center(z)+side*(width(z)+random()*5),scale=.45+random()*1.6,y=groundHeight(x,z);
    transform.position.set(x,y+.25,z);transform.rotation.set(random()*.2,random()*6.28,random()*.3);
    transform.scale.set(scale*1.4,scale*.85,scale);transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
    transform.position.y+=scale*.55;transform.scale.set(scale*1.35,scale*.33,scale*.96);
    transform.updateMatrix();rockCaps.setMatrixAt(i,transform.matrix);
  }
  rocks.receiveShadow=true;scene.add(rocks,rockCaps);

  const treeCount=70,tiers=5;
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.36,4.5,7),bark,treeCount);
  const crownGeometry=new THREE.ConeGeometry(1,1,12,3);
  const crownPoints=crownGeometry.attributes.position;
  for(let i=0;i<crownPoints.count;i++){
    const x=crownPoints.getX(i),y=crownPoints.getY(i),z=crownPoints.getZ(i),angle=Math.atan2(z,x);
    const spread=1+.12*Math.sin(angle*5+y*7);
    crownPoints.setXYZ(i,x*spread,y+Math.sin(angle*3)*.045*(.5-y),z*spread);
  }
  crownGeometry.computeVertexNormals();
  const branches=new THREE.InstancedMesh(crownGeometry,pineGreen,treeCount*tiers);
  const treeSnow=new THREE.InstancedMesh(crownGeometry,snow,treeCount*tiers);
  const treeGroup=new THREE.Group();treeGroup.name='snow-covered-pines';treeGroup.add(trunks,branches,treeSnow);scene.add(treeGroup);
  for(let i=0;i<treeCount;i++){
    const z=-65+random()*95,side=i%2?1:-1;
    const x=center(z)+side*(width(z)+7+random()*28),s=.6+random()*.9,y=groundHeight(x,z);
    transform.rotation.set(0,random()*6.28,0);transform.position.set(x,y+2*s,z);transform.scale.setScalar(s);
    transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix);
    for(let j=0;j<tiers;j++){
      const r=(2.3-j*.35)*s,h=3.1*s;
      transform.position.set(x,y+(3+j*1.15)*s,z);transform.scale.set(r,h,r);transform.updateMatrix();branches.setMatrixAt(i*tiers+j,transform.matrix);
      transform.position.y+=h*.13;transform.scale.set(r*.9,h*.78,r*.9);transform.updateMatrix();treeSnow.setMatrixAt(i*tiers+j,transform.matrix);
    }
  }

  // Red winter berries give the white foreground a few warm accents.
  const berryBark=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.05,1,5),bark,42);
  const berries=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,7,5),mat(0xb83c51,.5),168);
  const berrySnow=new THREE.InstancedMesh(new THREE.SphereGeometry(.14,7,5),snow,42);
  for(let i=0;i<42;i++){
    const z=6+random()*20,side=i%2?1:-1,x=center(z)+side*(width(z)+1+random()*7),y=groundHeight(x,z);
    transform.position.set(x,y+.6,z);transform.rotation.set(.3,random()*6.28,side*.4);transform.scale.set(1,1.2+random(),1);
    transform.updateMatrix();berryBark.setMatrixAt(i,transform.matrix);
    for(let j=0;j<4;j++){
      transform.position.set(x+Math.sin(j*2.4)*.19,y+1.2+j*.15,z+Math.cos(j*2.4)*.16);transform.rotation.set(0,0,0);transform.scale.setScalar(1);
      transform.updateMatrix();berries.setMatrixAt(i*4+j,transform.matrix);
    }
    transform.position.y+=.1;transform.scale.set(1,.4,1);transform.updateMatrix();berrySnow.setMatrixAt(i,transform.matrix);
  }
  scene.add(berryBark,berries,berrySnow);

  // Woolly mammoth with tapered trunk and two independently curved ivory tusks.
  const mammoth=new THREE.Group();mammoth.name='drinking-mammoth';mammoth.position.set(-11.5,groundHeight(-11.5,-9)+.06,-9);mammoth.scale.setScalar(1.25);
  const fur=mat(0x795343),darkFur=mat(0x4b352d),lightFur=mat(0x9b7156),ivory=mat(0xf0e3c8,.65),eye=mat(0x141a20,.35);
  const body=oval(mammoth,-.4,3.2,0,2.65,1.8,1.45,fur);
  oval(mammoth,.65,4.1,0,1.65,1.45,1.32,fur);
  for(const x of [-1.8,1.35])for(const z of [-.88,.88]){
    const surface=groundHeight(mammoth.position.x+x*1.25,mammoth.position.z+z*1.25);
    const footY=(surface-mammoth.position.y)/1.25+.32,length=2.6-footY;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.43,.36,length,10),darkFur);leg.position.set(x,footY+length/2,z);mammoth.add(leg);
    oval(mammoth,x,footY,z+.04,.5,.38,.57,darkFur);
  }
  const head=new THREE.Group();head.name='drinking-mammoth-head';head.position.set(2,3.5,0);mammoth.add(head);
  oval(head,0,.3,0,.98,1.18,.9,fur);
  oval(head,-.18,1.07,0,.8,.65,.78,lightFur);
  for(const side of [-1,1]){
    oval(head,-.48,.22,side*.83,.46,.67,.19,darkFur);
    oval(head,.57,.4,side*.76,.14,.11,.08,eye);
    oval(head,.61,.44,side*.813,.035,.03,.02,snow);
  }
  function taperedTube(points,radius,endRadius,material){
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    const frames=curve.computeFrenetFrames(36,false),positions=[],indices=[];
    for(let i=0;i<=36;i++){
      const t=i/36,p=curve.getPointAt(t),r=radius*(1-t)+endRadius*t;
      for(let j=0;j<10;j++){
        const a=j/10*Math.PI*2;
        const vertex=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
        positions.push(vertex.x,vertex.y,vertex.z);
        if(i<36){const k=i*10+j,n=i*10+(j+1)%10;indices.push(k,n,k+10,n,n+10,k+10)}
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);head.add(mesh);return mesh;
  }
  const drinkingHeight=(.13-mammoth.position.y)/1.25-head.position.y;
  const trunk=taperedTube([[.58,.1,0],[1.02,-.8,0],[1.3,-2.2,0],[1.6,drinkingHeight+.35,0],[2.25,drinkingHeight,0]],.38,.16,lightFur);
  for(const side of [-1,1])taperedTube([[.5,-.35,side*.62],[.95,-1.1,side*.95],[1.9,-1.2,side*1.16],[2.65,-.48,side*1.05]],.2,.012,ivory);
  const shag=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,.55,3),mat(0x826044),400);
  for(let i=0;i<400;i++){
    const a=random()*Math.PI*2,b=.35+random()*1.9;
    transform.position.set(-.4+Math.cos(a)*Math.sin(b)*2.65,3.2+Math.cos(b)*1.8,Math.sin(a)*Math.sin(b)*1.44);
    transform.rotation.set((random()-.5)*.4,random()*6.28,Math.PI+(random()-.5)*.25);
    transform.scale.setScalar(.65+random()*.7);transform.updateMatrix();shag.setMatrixAt(i,transform.matrix);
  }
  mammoth.add(shag);
  oval(mammoth,-.8,4.85,0,1.35,.13,.7,snow);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.09,.05,1.8,7),darkFur);tail.position.set(-3.03,2.8,0);tail.rotation.z=-.25;mammoth.add(tail);
  mammoth.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true}});
  scene.add(mammoth);
  const ripples=[];
  for(let i=0;i<4;i++){
    const ripple=new THREE.Mesh(new THREE.RingGeometry(.8,.83,64),new THREE.MeshBasicMaterial({color:0xd9f4ff,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));
    ripple.rotation.x=-Math.PI/2;ripple.position.set(-6.1,.14,-9);scene.add(ripple);ripples.push(ripple);
  }

  const flakes=[];
  for(let i=0;i<1000;i++)flakes.push(-65+random()*130,random()*32,-75+random()*110);
  const flakeGeometry=new THREE.BufferGeometry();flakeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flakes,3));
  const flakeMaterial=new THREE.ShaderMaterial({uniforms:{time},transparent:true,depthWrite:false,
    vertexShader:`uniform float time;varying float opacity;void main(){vec3 p=position;p.y=mod(p.y-time*(.65+fract(p.x)*.5),32.);p.x+=sin(time*.35+p.z)*.5;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(95./max(1.,-mv.z),1.,4.);opacity=.5+fract(position.z)*.3;}`,
    fragmentShader:`varying float opacity;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(.94,.98,1.,(1.-smoothstep(.12,.5,r))*opacity);}`
  });
  const snowfall=new THREE.Points(flakeGeometry,flakeMaterial);snowfall.name='panorama-snowfall';scene.add(snowfall);
  function update(elapsed){
    time.value=elapsed;
    const portrait=camera.aspect<1;
    const fov=portrait?60:48;
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}
    camera.position.set((portrait?-7:0)+Math.sin(elapsed*.075)*1.5,8.2+Math.sin(elapsed*.11)*.18,32);
    camera.lookAt(portrait?-5:1,3.8,-24);
    head.rotation.z=-.015+Math.sin(elapsed*Math.PI/4)*.035;
    trunk.rotation.z=Math.sin(elapsed*Math.PI/4+.3)*.035;
    body.scale.y=1.8+Math.sin(elapsed*1.2)*.025;
    tail.rotation.z=-.25+Math.sin(elapsed*1.4)*.12;
    treeGroup.rotation.z=Math.sin(elapsed*.65)*.0015;
    clouds.position.x=Math.sin(elapsed*.025)*2;
    ripples.forEach((ripple,i)=>{const age=(elapsed*.45+i/4)%1;ripple.scale.setScalar(.35+age*2.4);ripple.material.opacity=(1-age)*.42});
  }
  update(0);
  return {scene,camera,update};
}
