import * as THREE from 'three';
import {createCastleMaterials} from './castle-materials.js';

export const CASTLE_SPRINT_SPEED=11.5;
const ROAD_HALF_WIDTH=7;
const ROUTE_POINTS=[
  [0,0,410],[0,0,235],[-122,10,220],[-122,24,-150],[122,38,-150],
  [122,52,165],[-84,66,165],[-84,80,-104],[84,94,-104],[84,108,105],
  [-46,122,105],[-46,136,-58],[46,150,-58],[46,160,40],[0,166,40],[0,170,-38],[0,170,-78]
];

export function createCastleStage(){
  const root=new THREE.Group();root.name='poisoned-castle-stage';root.visible=false;
  const route=ROUTE_POINTS.map(([x,y,z])=>({x,y,z})),segments=[];
  let routeLength=0;
  for(let i=0;i<route.length-1;i++){
    const a=route[i],b=route[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);
    segments.push({a,b,length,start:routeLength,index:i});routeLength+=length;
  }
  // Subtract more corner-cutting distance than a seven-metre corridor permits.
  const minimumTravelDistance=routeLength-4*ROAD_HALF_WIDTH*(route.length-2)-40;
  const minimumTravelSeconds=minimumTravelDistance/CASTLE_SPRINT_SPEED;
  const material=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
  const {stone,trim,dark,rock,roof,floors,cliff}=createCastleMaterials();
  const poison=new THREE.MeshStandardMaterial({color:0x6f348e,emissive:0x67228d,emissiveIntensity:.65,roughness:.55});
  const glow=new THREE.MeshBasicMaterial({color:0xc192ff,toneMapped:false});
  const rockTerraces=[[174,252,-2,-62,.5],[109,134,58,-4,1.3],[64,81,102,54,2.1],[32,50,156,98,3]];
  const placements=new Map(),geometryCache=new Map();
  const identity=new THREE.Quaternion();
  function queue(key,geometry,mat,position,scale,rotation=identity){
    if(!placements.has(key))placements.set(key,{geometry,mat,items:[]});
    placements.get(key).items.push(new THREE.Matrix4().compose(position,rotation,scale));
  }
  function box(key,mat,x,y,z,w,h,d,yaw=0){
    if(!geometryCache.has('box'))geometryCache.set('box',new THREE.BoxGeometry(1,1,1));
    queue(key,geometryCache.get('box'),mat,new THREE.Vector3(x,y,z),new THREE.Vector3(w,h,d),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
  }
  function cylinder(key,mat,x,y,z,r,h,sides=10){
    const geometryKey='cylinder-'+sides;
    if(!geometryCache.has(geometryKey))geometryCache.set(geometryKey,new THREE.CylinderGeometry(1,1,1,sides));
    queue(key,geometryCache.get(geometryKey),mat,new THREE.Vector3(x,y,z),new THREE.Vector3(r,h,r));
  }
  function cone(key,mat,x,y,z,r,h){
    if(!geometryCache.has('cone'))geometryCache.set('cone',new THREE.ConeGeometry(1,1,10));
    queue(key,geometryCache.get('cone'),mat,new THREE.Vector3(x,y,z),new THREE.Vector3(r,h,r));
  }
  function tower(x,y,z,r=8,h=27,spire=true,foundation=false){
    if(foundation){
      let ground=-8;
      for(const [rx,rz,top] of rockTerraces)if(top<=y&&(Math.abs(x/(rx*.94))**5+Math.abs((z-15)/(rz*.94))**5)<1)ground=Math.max(ground,top-3);
      cylinder('turret-foundations',rock,x,(y+ground)/2,z,r*1.12,y-ground);
    }
    cylinder('towers',stone,x,y+h/2,z,r,h);
    for(const level of [.05,.55,.94])cylinder('tower-trim',trim,x,y+h*level,z,r*1.1,1);
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2;
      box('merlons',trim,x+Math.cos(a)*r,y+h+.8,z+Math.sin(a)*r,2,2.5,1.5,a);
    }
    if(spire){cone('spires',roof,x,y+h+r*1.1+1.5,z,r*1.2,r*2.2);cylinder('finials',trim,x,y+h+r*2.2+3,z,.18,5)}
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const wx=x+Math.sin(angle)*(r+.03),wz=z+Math.cos(angle)*(r+.03);
      box('tower-windows',poison,wx,y+h*.67,wz,1.5,4,.12,angle);
    }
  }
  function terrace(rx,rz,y,bottom,phase){
    const positions=[],colors=[],count=56;
    const baseColor=new THREE.Color(0x6c6375);
    const top=[];
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2,shape=1+.045*Math.sin(i*2.1+phase);
      const x=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.4*rx*shape,z=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.4*rz*shape+15;
      top.push(new THREE.Vector3(x,y,z));
    }
    for(let i=0;i<count;i++){
      const a=top[i],b=top[(i+1)%count];
      const c=new THREE.Vector3(b.x*.94,bottom,b.z),d=new THREE.Vector3(a.x*.94,bottom,a.z);
      for(const v of [a,b,d,b,c,d]){
        positions.push(v.x,v.y,v.z);
        const color=baseColor.clone().multiplyScalar(.67+(i%4)*.1);colors.push(color.r,color.g,color.b);
      }
      for(const v of [new THREE.Vector3(0,y,15),b,a]){positions.push(v.x,v.y,v.z);colors.push(.09,.075,.12)}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,cliff);
    mesh.name='castle-rock-terrace';mesh.receiveShadow=true;root.add(mesh);
  }
  for(const spec of rockTerraces)terrace(...spec);

  const floorPositions=[],floorUV=[],floorIndices=[];
  const barriers=[];
  const isHall=(x,y,z)=>Math.abs(x)<29&&z<-43&&z>-119&&Math.abs(y-170)<3;
  function insideOtherRoad(x,y,z,ignore=-1){
    if(isHall(x,y,z))return true;
    return segments.some(({a,b,length,index})=>{
      if(index===ignore)return false;
      const t=((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/(length*length);
      if(t<0||t>1)return false;
      return Math.abs(y-THREE.MathUtils.lerp(a.y,b.y,t))<3&&Math.hypot(x-THREE.MathUtils.lerp(a.x,b.x,t),z-THREE.MathUtils.lerp(a.z,b.z,t))<ROAD_HALF_WIDTH+.9;
    });
  }
  function barrier(x,y,z,length,yaw,merlon=true){
    box('closed-road-boundary',stone,x,y+1.35,z,1.1,2.7,length+.14,yaw);
    if(merlon)box('closed-road-merlons',trim,x,y+3,z,1.2,1,Math.min(1.3,length),yaw);
    barriers.push({x,y,z,length,yaw});
  }
  for(const segment of segments){
    const {a,b,length,index}=segment,nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
    const base=floorPositions.length/3;
    for(const [point,side] of [[a,-1],[a,1],[b,-1],[b,1]]){
      floorPositions.push(point.x+nx*ROAD_HALF_WIDTH*side,point.y,point.z+nz*ROAD_HALF_WIDTH*side);
      floorUV.push(side<0?0:1,point===a?0:length/8);
    }
    floorIndices.push(base,base+1,base+2,base+1,base+3,base+2);
    // Parapets follow each ramp instead of sitting on a flat bounding box.
    const sideCount=Math.ceil(length/2.4);
    for(const side of [-1,1])for(let j=0;j<sideCount;j++){
      const t=(j+.5)/sideCount,x=THREE.MathUtils.lerp(a.x,b.x,t)+nx*side*(ROAD_HALF_WIDTH+.55),z=THREE.MathUtils.lerp(a.z,b.z,t)+nz*side*(ROAD_HALF_WIDTH+.55),y=THREE.MathUtils.lerp(a.y,b.y,t);
      if(insideOtherRoad(x,y,z,index))continue;
      const yaw=Math.atan2(b.x-a.x,b.z-a.z);
      barrier(x,y,z,length/sideCount,yaw,j%2===0);
    }
    // Masonry under the causeways makes the climb part of the island silhouette.
    const supports=Math.ceil(length/18);
    for(let j=0;j<supports;j++){
      const t=(j+.5)/supports,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t),y=THREE.MathUtils.lerp(a.y,b.y,t);
      const supportHeight=index===0?27:index===15?12:Math.min(35,Math.max(8,y-(-2)));
      box('ramp-supports',rock,x,y-supportHeight/2-1.1,z,13,supportHeight,length/supports+.3,Math.atan2(b.x-a.x,b.z-a.z));
      box('road-bands',trim,x,y+.015,z,13,.035,.35,Math.atan2(b.x-a.x,b.z-a.z));
    }
    if(index===0){
      for(let j=0;j<6;j++){
        const z=250+j*28;
        for(const side of [-1,1])box('bridge-piers',rock,side*4.8,-22,z,4,42,6);
      }
    }
  }
  const floorGeometry=new THREE.BufferGeometry();floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(floorPositions,3));
  floorGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(floorUV,2));floorGeometry.setIndex(floorIndices);floorGeometry.computeVertexNormals();
  const road=new THREE.Mesh(floorGeometry,floors);road.name='castle-climbing-road';road.receiveShadow=true;root.add(road);
  // Seal exposed landing arcs, while leaving both connected road mouths open.
  for(let i=1;i<route.length-1;i++){
    const point=route[i],radius=ROAD_HALF_WIDTH+.55,steps=40;
    for(let j=0;j<steps;j++){
      const angle=(j+.5)/steps*Math.PI*2,x=point.x+Math.cos(angle)*radius,z=point.z+Math.sin(angle)*radius;
      if(insideOtherRoad(x,point.y,z))continue;
      barrier(x,point.y,z,2*radius*Math.sin(Math.PI/steps),-angle,j%3===0);
    }
  }
  // The bridge only opens toward the castle, including behind the spawn point.
  barrier(0,0,route[0].z+3.2,ROAD_HALF_WIDTH*2+2,Math.PI/2,false);
  for(const side of [-1,1])barrier(side*(ROAD_HALF_WIDTH+.55),0,route[0].z+1.6,3.2,0,false);
  box('bridge-spawn-apron',floors,0,-.2,route[0].z+1.6,ROAD_HALF_WIDTH*2,.4,3.2);
  // Rounded landings join the walkable road segments at switchbacks.
  for(let i=1;i<route.length-1;i++){
    const p=route[i],landing=new THREE.Mesh(new THREE.CircleGeometry(ROAD_HALF_WIDTH+.2,20),floors);
    landing.rotation.x=-Math.PI/2;landing.position.set(p.x,p.y+.012,p.z);root.add(landing);
    if(i>1&&i<14){
      const previous=route[i-1],next=route[i+1];
      const away=new THREE.Vector2(p.x-(previous.x+next.x)/2,p.z-(previous.z+next.z)/2).normalize();
      tower(p.x+away.x*18,p.y-4,p.z+away.y*18,7,23,i%3!==0,true);
      box('turret-landings',stone,p.x+away.x*9,p.y-2,p.z+away.y*9,11,4,20,Math.atan2(away.x,away.y));
    }
  }
  tower(-17,-2,255,9,35);tower(17,-2,255,9,35);
  box('entrance-arch',stone,0,22,255,18,5,6);box('entrance-arch-trim',trim,0,25,255,19,1.5,6.3);

  // Upper bailey and a cathedral keep with an open, playable central nave.
  box('hall-plinth',stone,0,160,-77,76,16,106);
  for(const x of [-34,34])for(const z of [-127,-81])cylinder('keep-rock-pillars',rock,x,82,z,9,172,10);
  box('hall-floor',floors,0,169.5,-80,61,1,77);
  box('hall-left',stone,-32,185,-82,4,30,79);box('hall-right',stone,32,185,-82,4,30,79);
  box('hall-rear',stone,0,185,-120,65,30,4);
  for(const side of [-1,1]){
    box('hall-front',stone,side*22,182,-43,20,24,4);
    for(let i=0;i<5;i++){
      const z=-51-i*14;
      box('hall-buttress',trim,side*35,182,z,4,24,3);
      box('hall-window',poison,side*29.9,186,z,1,9,3);
    }
    tower(side*34,170,-45,8,42);tower(side*31,170,-117,7,50);
  }
  box('hall-lintel',stone,0,200,-43,65,8,6);
  const gableGeometry=new THREE.ConeGeometry(46,29,4);gableGeometry.rotateY(Math.PI/4);gableGeometry.scale(1,1,1.3);
  const gable=new THREE.Mesh(gableGeometry,roof);gable.position.set(0,219,-82);root.add(gable);
  tower(0,170,-130,13,87);tower(-17,170,-137,6,67);tower(17,170,-137,6,67);
  // Luminous pointed arch at the nave entrance.
  const archPoints=[[-10,170,-40],[-10,181,-40],[-7,187,-40],[0,192,-40],[7,187,-40],[10,181,-40],[10,170,-40]].map(v=>new THREE.Vector3(...v));
  const arch=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints),40,.4,6,false),poison);root.add(arch);

  const crystalGeometry=new THREE.OctahedronGeometry(1,0),crystals=new THREE.InstancedMesh(crystalGeometry,poison,135),dummy=new THREE.Object3D();
  for(let i=0;i<135;i++){
    const s=segments[1+i%(segments.length-1)],margin=Math.min(.4,18/s.length),t=margin+(((i*37)%101)/101)*(1-margin*2);
    const x=THREE.MathUtils.lerp(s.a.x,s.b.x,t),z=THREE.MathUtils.lerp(s.a.z,s.b.z,t),y=THREE.MathUtils.lerp(s.a.y,s.b.y,t);
    const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length,side=i%2?1:-1;
    dummy.position.set(x+nx*side*10,y+1,z+nz*side*10);dummy.scale.set(.6+i%3*.25,1.5+i%5*.5,.6);dummy.rotation.set(.1,i,.2*side);dummy.updateMatrix();crystals.setMatrixAt(i,dummy.matrix);
  }
  root.add(crystals);
  const banners=[];
  for(let i=2;i<route.length-1;i+=2){
    const point=route[i],previous=route[i-1],next=route[i+1];
    const away=new THREE.Vector2(previous.x-point.x,previous.z-point.z).normalize().add(new THREE.Vector2(next.x-point.x,next.z-point.z).normalize()).negate().normalize();
    const bx=point.x+away.x*15,bz=point.z+away.y*15;
    const banner=new THREE.Mesh(new THREE.PlaneGeometry(3,7,3,8),new THREE.MeshStandardMaterial({color:0x512967,side:THREE.DoubleSide,roughness:1}));
    banner.position.set(bx,point.y+8,bz);root.add(banner);banners.push(banner);
    cylinder('banner-poles',trim,bx,point.y+6,bz,.16,12);
    cone('beacons',glow,bx,point.y+12.3,bz,.45,1.2);
  }
  const fissures=[];
  for(const [rx,rz,top,bottom,phase] of rockTerraces)for(let i=0;i<14;i++){
    const a=(i+.5)/14*Math.PI*2;
    const x=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.4*rx,z=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.4*rz+15;
    let previous=null;
    for(let j=0;j<7;j++){
      const t=.12+j*.125,y=THREE.MathUtils.lerp(bottom,top,t);
      const v=new THREE.Vector3(x*(.94+t*.06)+Math.cos(a)*.7+Math.sin(j*2+phase)*.5,y,z+Math.sin(a)*.7+Math.cos(j*2+phase)*.4);
      if(previous)fissures.push(previous.x,previous.y,previous.z,v.x,v.y,v.z);previous=v;
    }
  }
  const veinGeometry=new THREE.BufferGeometry();veinGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fissures,3));
  const veins=new THREE.LineSegments(veinGeometry,new THREE.LineBasicMaterial({color:0xae6cdd,transparent:true,opacity:.6}));veins.name='castle-corruption-veins';root.add(veins);
  const rockShapes=[];
  for(const [rx,rz,top,bottom,phase] of rockTerraces)for(let i=0;i<72;i++){
    const a=i/72*Math.PI*2,t=.22+(i%5)*.13;
    const x=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.4*rx*(.94+t*.06),z=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.4*rz+15,y=THREE.MathUtils.lerp(bottom,top,t);
    const nearRoad=segments.some(({a,b,length})=>{
      const along=THREE.MathUtils.clamp(((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/(length*length),0,1);
      return Math.abs(y-THREE.MathUtils.lerp(a.y,b.y,along))<12&&Math.hypot(x-THREE.MathUtils.lerp(a.x,b.x,along),z-THREE.MathUtils.lerp(a.z,b.z,along))<16;
    });
    if(!nearRoad)rockShapes.push({x:x+Math.cos(a)*.7,y,z:z+Math.sin(a)*.7,a,phase});
  }
  const outcrops=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rock,rockShapes.length);
  rockShapes.forEach((p,i)=>{
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(.13*Math.sin(i),p.a,.13*Math.cos(i));
    dummy.scale.set(2.2+i%4*.6,.8+i%3*.5,1.8+i%4*.4);dummy.updateMatrix();outcrops.setMatrixAt(i,dummy.matrix);
  });outcrops.name='natural-cliff-outcrops';root.add(outcrops);
  const branchGeometry=new THREE.CylinderGeometry(1,1,1,6);
  for(let i=0;i<36;i++){
    const [rx,rz,y]=rockTerraces[i%rockTerraces.length],a=i*2.399;
    const x=Math.cos(a)*rx*.7,z=15+Math.sin(a)*rz*.7;
    const closeToRoad=segments.some(({a,b,length})=>{
      const t=THREE.MathUtils.clamp(((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/(length*length),0,1);
      return Math.hypot(x-THREE.MathUtils.lerp(a.x,b.x,t),z-THREE.MathUtils.lerp(a.z,b.z,t))<24;
    });
    if(closeToRoad)continue;
    cylinder('withered-trees',dark,x,y+3,z,.38,6,6);
    for(let j=0;j<3;j++){
      const direction=new THREE.Vector3(Math.sin(j*2.1+i)*2,1.6,Math.cos(j*2.1+i)*2);
      const base=new THREE.Vector3(x,y+2+j,z),position=base.clone().addScaledVector(direction,.5);
      queue('withered-branches',branchGeometry,dark,position,new THREE.Vector3(.18,direction.length(),.18),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
    }
  }
  for(const [key,batch] of placements){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.mat,batch.items.length);
    batch.items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.name=key;mesh.receiveShadow=true;
    // Large static architecture uses ambient lighting; shadow maps stay local.
    root.add(mesh);
  }
  const mistMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time:{value:0}},
    vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 v;uniform float time;void main(){float edge=sin(v.x*3.14159)*sin(v.y*3.14159);float w=.5+.5*sin(v.x*13.+v.y*9.+time*.3);gl_FragColor=vec4(.29,.11,.42,edge*(.045+w*.055));}`
  });
  for(const y of [-15,42,92,143]){
    const mist=new THREE.Mesh(new THREE.PlaneGeometry(390,560,1,1),mistMaterial);mist.rotation.x=-Math.PI/2;mist.position.set(0,y,45);root.add(mist);
  }
  const princess=new THREE.Group();princess.name='castle-princess';princess.position.set(0,170,-113);root.add(princess);
  const dress=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.8,16),material(0xe78fbd));dress.position.y=1.4;princess.add(dress);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.43,.52,1.2,12),material(0xf6a4d0));torso.position.y=2.5;princess.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,16,12),material(0xf1cbad));head.position.y=3.5;princess.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.57,16,12),material(0xf1ce62));hair.scale.set(1,1.1,.8);hair.position.set(0,3.6,-.2);princess.add(hair);
  for(const side of [-1,1]){
    const lock=new THREE.Mesh(new THREE.CapsuleGeometry(.2,1.2,4,8),material(0xf1ce62));lock.position.set(side*.45,2.9,-.18);princess.add(lock);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,1.1,8),material(0xf1cbad));arm.position.set(side*.67,2.5,0);princess.add(arm);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),material(0x323b55));eye.position.set(side*.17,3.55,.48);princess.add(eye);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(.02,8,6),material(0xffffff));glint.position.set(side*.17-.015,3.575,.535);princess.add(glint);
  }
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,6,18,Math.PI),material(0xac6674));smile.rotation.z=Math.PI;smile.position.set(0,3.33,.5);princess.add(smile);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(.4,.42,.14,16),material(0xecc875));crown.position.set(0,4.04,-.05);princess.add(crown);
  for(let i=0;i<5;i++){
    const angle=i/5*Math.PI*2,point=new THREE.Mesh(new THREE.ConeGeometry(.08,.3,6),material(0xecc875));point.position.set(Math.sin(angle)*.34,4.23,-.05+Math.cos(angle)*.34);princess.add(point);
  }
  const seal=new THREE.Group();seal.name='princess-seal';seal.position.copy(princess.position);root.add(seal);
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,bar=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,5,5),dark);bar.position.set(Math.cos(a)*2.1,2.5,Math.sin(a)*2.1);seal.add(bar);
  }
  const sealRing=new THREE.Mesh(new THREE.TorusGeometry(2.2,.11,6,40),poison);sealRing.rotation.x=Math.PI/2;sealRing.position.y=.14;seal.add(sealRing);
  const telegraph=new THREE.Mesh(new THREE.RingGeometry(.9,1,64),new THREE.MeshBasicMaterial({color:0xba74ff,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  telegraph.rotation.x=-Math.PI/2;telegraph.position.y=170.06;telegraph.visible=false;root.add(telegraph);

  function routePointAt(progress){
    const distance=THREE.MathUtils.clamp(progress,0,routeLength);
    const segment=segments.find(s=>distance<=s.start+s.length)||segments.at(-1);
    const t=THREE.MathUtils.clamp((distance-segment.start)/segment.length,0,1);
    return {x:THREE.MathUtils.lerp(segment.a.x,segment.b.x,t),y:THREE.MathUtils.lerp(segment.a.y,segment.b.y,t),z:THREE.MathUtils.lerp(segment.a.z,segment.b.z,t),
      tx:(segment.b.x-segment.a.x)/segment.length,tz:(segment.b.z-segment.a.z)/segment.length,slope:(segment.b.y-segment.a.y)/segment.length,progress:distance};
  }
  const guidance=new THREE.Group();guidance.name='golden-route-guidance';root.add(guidance);
  const guideCount=180,guidePositions=new Float32Array(guideCount*3),guidePhases=new Float32Array(guideCount),guideStrength=new Float32Array(guideCount);
  for(let i=0;i<guideCount;i++)guidePhases[i]=i*2.399;
  const guideGeometry=new THREE.BufferGeometry();guideGeometry.setAttribute('position',new THREE.BufferAttribute(guidePositions,3).setUsage(THREE.DynamicDrawUsage));
  guideGeometry.setAttribute('phase',new THREE.BufferAttribute(guidePhases,1));
  guideGeometry.setAttribute('strength',new THREE.BufferAttribute(guideStrength,1).setUsage(THREE.DynamicDrawUsage));
  const guideMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{time:{value:0}},
    vertexShader:`attribute float phase;attribute float strength;uniform float time;varying float shimmer;void main(){vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(230./max(1.,-view.z),2.5,12.);shimmer=(.28+.72*pow(.5+.5*sin(time*4.7+phase),2.))*strength;}`,
    fragmentShader:`varying float shimmer;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*70.);float halo=exp(-r*r*18.)*.28;float rays=(pow(max(0.,1.-abs(p.x)*20.),3.)+pow(max(0.,1.-abs(p.y)*20.),3.))*pow(max(0.,1.-r*2.),1.5)*.3;gl_FragColor=vec4(mix(vec3(1.,.65,.07),vec3(1.,.96,.7),core),(core+halo+rays)*shimmer);}`
  });
  const guideParticles=new THREE.Points(guideGeometry,guideMaterial);guideParticles.name='golden-route-particles';guideParticles.frustumCulled=false;guidance.add(guideParticles);
  const arrowShape=new THREE.Shape();arrowShape.moveTo(0,1);arrowShape.lineTo(.8,-.25);arrowShape.lineTo(.42,-.6);arrowShape.lineTo(0,.05);arrowShape.lineTo(-.42,-.6);arrowShape.lineTo(-.8,-.25);arrowShape.closePath();
  const arrowGeometry=new THREE.ShapeGeometry(arrowShape);arrowGeometry.rotateX(-Math.PI/2);
  const arrowMaterial=new THREE.MeshBasicMaterial({color:0xffce45,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const guideArrows=new THREE.InstancedMesh(arrowGeometry,arrowMaterial,9);guideArrows.name='golden-route-arrows';guideArrows.frustumCulled=false;guidance.add(guideArrows);
  const guideTransform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  function updateGuidance(time,progress,hidden){
    guidance.visible=!hidden;if(hidden)return;
    guideMaterial.uniforms.time.value=time;arrowMaterial.opacity=.65+Math.sin(time*2.4)**2*.2;
    for(let i=0;i<guideCount;i++){
      const ahead=4+(i/guideCount*116+time*7)%116,point=routePointAt(progress+ahead),side=Math.sin(i*2.399+time*.3)*.75;
      guideStrength[i]=progress+ahead>=routeLength-1?0:1;
      guidePositions[i*3]=point.x-point.tz*side;guidePositions[i*3+1]=point.y+.48+(i%5)*.08+Math.sin(time*1.9+i)*.2;guidePositions[i*3+2]=point.z+point.tx*side;
    }
    guideGeometry.attributes.position.needsUpdate=true;
    guideGeometry.attributes.strength.needsUpdate=true;
    for(let i=0;i<9;i++){
      const progressAhead=progress+8+i*13,point=routePointAt(progressAhead),normal=new THREE.Vector3(-point.tx*point.slope,1,-point.tz*point.slope).normalize();
      guideTransform.position.set(point.x,point.y+.2,point.z);
      guideTransform.quaternion.setFromUnitVectors(up,normal).multiply(new THREE.Quaternion().setFromAxisAngle(up,Math.atan2(-point.tx,-point.tz)));
      guideTransform.scale.setScalar(progressAhead>=routeLength?0:1.15);guideTransform.updateMatrix();guideArrows.setMatrixAt(i,guideTransform.matrix);
    }
    guideArrows.instanceMatrix.needsUpdate=true;
  }

  function surfaceAt(x,z,referenceY){
    if(z>route[0].z+2)return null;
    let best=null,bestScore=Infinity;
    if(x>=-27&&x<=27&&z>=-116&&z<=-46&&Math.abs(referenceY-170)<5)best={x,z,height:170,progress:routeLength,index:segments.length-1};
    if(Math.abs(x)<=10&&z>=-49&&z<=-41.6&&Math.abs(referenceY-170)<5)best={x,z,height:170,progress:segments.at(-1).start+(-38-z),index:segments.length-1};
    for(const segment of segments){
      const {a,b,length}=segment,t=THREE.MathUtils.clamp(((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/(length*length),0,1);
      const px=THREE.MathUtils.lerp(a.x,b.x,t),pz=THREE.MathUtils.lerp(a.z,b.z,t),height=THREE.MathUtils.lerp(a.y,b.y,t);
      const distance=Math.hypot(x-px,z-pz),delta=Math.abs(referenceY-height);
      if(distance>ROAD_HALF_WIDTH-.65||delta>5)continue;
      const score=delta*3+distance*.1;
      if(score<bestScore){bestScore=score;best={x,z,height,progress:segment.start+t*length,index:segment.index}}
    }
    return best;
  }
  function move(x,z,referenceY,dx,dz){
    const length=Math.hypot(dx,dz),scale=length>2?2/length:1;dx*=scale;dz*=scale;
    return surfaceAt(x+dx,z+dz,referenceY)||surfaceAt(x+dx,z,referenceY)||surfaceAt(x,z+dz,referenceY)||surfaceAt(x,z,referenceY);
  }
  const inArena=(x,y,z)=>Math.abs(x)<27&&z<-49&&z>-116&&Math.abs(y-170)<5;
  function update(time,defeated=false,progress=0,bossStarted=false){
    mistMaterial.uniforms.time.value=time;
    updateGuidance(time,progress,defeated||bossStarted);
    banners.forEach((banner,i)=>{banner.rotation.y=Math.sin(time*.8+i)*.12;banner.rotation.z=Math.sin(time+i)*.04});
    seal.visible=!defeated;sealRing.rotation.z=time*.25;
    princess.rotation.y=defeated?Math.sin(time*.6)*.1:0;
  }
  update(0);
  return {root,route,segments,routeLength,minimumTravelDistance,minimumTravelSeconds,roadHalfWidth:ROAD_HALF_WIDTH,barriers,
    spawn:{...route[0]},arena:{x:0,y:170,z:-84},surfaceAt,move,inArena,update,telegraph,guidance,routePointAt,princess,
    checkpoints:[0,4,8,12,15].map(index=>({...route[index],index,progress:index===0?0:segments[index-1].start+segments[index-1].length}))};
}

export {createCastleBoss} from './castle-boss.js';
