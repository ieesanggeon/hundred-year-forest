import * as THREE from 'three';

const snowMaterial=new THREE.MeshStandardMaterial({color:0xe2f3fa,roughness:.94});
const iceMaterial=new THREE.MeshStandardMaterial({color:0x82cfe8,roughness:.26,metalness:.12});

export function createSnowfield(){
  const root=new THREE.Group();
  root.name='snowfield-scenery';
  root.visible=false;
  const bankMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.08,side:THREE.DoubleSide,flatShading:true});
  const levels=[0,2.1,4.8,7.9,11.5,15];
  const colors=[0x91d6ed,0x5daecf,0xbceaff,0x6cbedc,0xa9dfee];
  function edgePoint(side,t,layer){
    const width=45+layer*3.1;
    const depth=30+layer*3.1;
    const along=t*2-1;
    const positions=[[-width*along,-depth],[width,-depth*along],[width*along,depth],[-width,depth*along]];
    const [x,z]=positions[side];
    const height=levels[layer]+(layer?Math.sin(t*Math.PI*10+side*.8)*.38:0);
    return new THREE.Vector3(x,height,z);
  }
  // Continuous banks rise outward by 3.1m per layer, giving every edge a slope.
  for(let layer=0;layer<levels.length-1;layer++){
    const positions=[],vertexColors=[];
    const baseColor=new THREE.Color(colors[layer]);
    for(let side=0;side<4;side++){
      for(let i=0;i<30;i++){
        const a=edgePoint(side,i/30,layer);
        const b=edgePoint(side,(i+1)/30,layer);
        const c=edgePoint(side,(i+1)/30,layer+1);
        const d=edgePoint(side,i/30,layer+1);
        for(const vertex of [a,b,d,b,c,d]){
          positions.push(vertex.x,vertex.y,vertex.z);
          const shade=.88+.12*Math.sin(i*.83+side+layer);
          vertexColors.push(baseColor.r*shade,baseColor.g*shade,baseColor.b*shade);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
    geometry.computeVertexNormals();
    const bank=new THREE.Mesh(geometry,bankMaterial);
    bank.name='sloped-ice-layer-'+layer;
    bank.receiveShadow=true;
    root.add(bank);
  }

  const plateGeometry=new THREE.DodecahedronGeometry(1,0);
  const plates=new THREE.InstancedMesh(plateGeometry,iceMaterial,240);
  const snowCaps=new THREE.InstancedMesh(plateGeometry,snowMaterial,240);
  const transform=new THREE.Object3D();
  let index=0;
  for(let side=0;side<4;side++){
    for(let layer=1;layer<=4;layer++){
      for(let i=0;i<15;i++){
        const point=edgePoint(side,(i+.5)/15,layer);
        transform.position.copy(point);
        transform.position.y-=.4;
        transform.rotation.set(.12*Math.sin(i),side*Math.PI/2,.18*Math.cos(i*.9));
        transform.scale.set(3.4+(i%3)*.3,.9+(i%2)*.2,2.4);
        transform.updateMatrix();
        plates.setMatrixAt(index,transform.matrix);
        transform.position.y+=.65;
        transform.scale.y=.29;
        transform.updateMatrix();
        snowCaps.setMatrixAt(index,transform.matrix);
        index++;
      }
    }
  }
  plates.receiveShadow=true;
  root.add(plates,snowCaps);

  const driftGeometry=new THREE.SphereGeometry(1,12,8);
  const drifts=new THREE.InstancedMesh(driftGeometry,snowMaterial,40);
  for(let i=0;i<40;i++){
    const angle=i*2.39996;
    transform.position.set(Math.cos(angle)*(12+i%5*5),-.12,Math.sin(angle)*(9+i%4*5));
    transform.rotation.set(0,angle,0);
    transform.scale.set(2.3+i%3,.45+i%4*.13,1.6+i%3);
    transform.updateMatrix();
    drifts.setMatrixAt(i,transform.matrix);
  }
  drifts.receiveShadow=true;
  root.add(drifts);
  for(const [x,z,radius] of [[-19,-9,5],[22,10,4],[-15,17,3.5]]){
    const pool=new THREE.Mesh(new THREE.CircleGeometry(radius,24),iceMaterial);
    pool.rotation.x=-Math.PI/2;
    pool.position.set(x,.018,z);
    root.add(pool);
    const crack=new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-radius*.7,0,0),new THREE.Vector3(-.8,0,.6),
      new THREE.Vector3(.4,0,-.3),new THREE.Vector3(radius*.6,0,.8)
    ]),new THREE.LineBasicMaterial({color:0xd8f9ff}));
    crack.position.set(x,.035,z);
    root.add(crack);
  }

  const flakes=[];
  for(let i=0;i<550;i++)flakes.push(Math.sin(i*7.13)*48,(i*.137)%22,Math.cos(i*3.17)*33);
  const snowGeometry=new THREE.BufferGeometry();
  snowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flakes,3));
  const snow=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:0xffffff,size:.085,transparent:true,opacity:.8,depthWrite:false}));
  root.add(snow);
  function update(dt){
    const points=snowGeometry.attributes.position;
    for(let i=0;i<points.count;i++){
      let y=points.getY(i)-dt*(1.1+i%3*.24);
      if(y<0)y=22;
      let x=points.getX(i)+dt*.7;
      if(x>49)x=-49;
      points.setXY(i,x,y);
    }
    points.needsUpdate=true;
  }
  return {root,update};
}

export const snowMonsterStats={
  polarBear:{name:'북극곰',damage:40,exp:8500,speed:3.9,reach:1.9,height:3.15},
  snowMummy:{name:'설원 미라',damage:34,exp:7000,speed:2.8,reach:1.5,height:3.35},
  thawedMammoth:{name:'해동된 메머드',damage:75,exp:35000,speed:2.5,reach:3.6,height:5.1}
};

export function createSnowMonster(type){
  const mesh=new THREE.Group();
  mesh.name=type;
  const limbs=[];
  const fur=new THREE.MeshStandardMaterial({color:type==='thawedMammoth'?0x715044:0xf6f4e9,roughness:1});
  const dark=new THREE.MeshStandardMaterial({color:0x273d4d,roughness:.8});
  const eyes=new THREE.MeshStandardMaterial({color:0x9ef4ff,emissive:0x1c91c7,emissiveIntensity:.7});
  const add=(geometry,material,x,y,z,parent=mesh)=>{
    const part=new THREE.Mesh(geometry,material);
    part.position.set(x,y,z);
    parent.add(part);
    return part;
  };
  function oval(x,y,z,rx,ry,rz,material=fur){
    const part=add(new THREE.SphereGeometry(1,14,10),material,x,y,z);
    part.scale.set(rx,ry,rz);
    return part;
  }
  function leg(x,y,z,radius,length,phase){
    const pivot=new THREE.Group();
    pivot.position.set(x,y,z);
    mesh.add(pivot);
    add(new THREE.CylinderGeometry(radius,radius*.86,length,10),fur,0,-length/2,0,pivot);
    const foot=add(new THREE.SphereGeometry(radius*1.15,10,8),fur,0,-length,-.08,pivot);
    foot.scale.set(1,.55,1.5);
    limbs.push({pivot,phase});
  }
  if(type==='snowMummy'){
    const linen=new THREE.MeshStandardMaterial({color:0xe7e2c9,roughness:1});
    const seams=new THREE.MeshStandardMaterial({color:0xaaa994,roughness:1});
    add(new THREE.CapsuleGeometry(.49,.8,6,12),linen,0,1.72,0);
    oval(0,2.72,-.04,.44,.48,.39,linen);
    add(new THREE.BoxGeometry(.64,.16,.1),dark,0,2.8,-.39);
    for(const side of [-1,1]){
      oval(side*.18,2.8,-.46,.065,.055,.03,eyes);
      const arm=add(new THREE.CylinderGeometry(.16,.13,1.2,9),linen,side*.62,1.93,-.43);
      arm.rotation.x=-.9;
      arm.rotation.z=side*.12;
      leg(side*.29,1.15,0,.18,.9,side>0?0:Math.PI);
    }
    for(let i=0;i<9;i++){
      const wrap=add(new THREE.TorusGeometry(.5,.035,4,12),seams,0,1.15+i*.13,0);
      wrap.rotation.set(Math.PI/2,0,(i%2?1:-1)*.09);
    }
    for(let i=0;i<5;i++){
      const wrap=add(new THREE.TorusGeometry(.41,.025,4,12),seams,0,2.48+i*.105,0);
      wrap.rotation.x=Math.PI/2;
    }
    add(new THREE.ConeGeometry(.19,.7,5),iceMaterial,-.56,2.25,.05).rotation.z=.45;
    add(new THREE.ConeGeometry(.15,.55,5),iceMaterial,.55,2.22,.05).rotation.z=-.5;
  }else if(type==='polarBear'){
    oval(0,1.45,0,1.02,1.04,1.52);
    oval(0,1.65,-1.32,.72,.7,.68);
    oval(0,1.42,-1.87,.46,.29,.41);
    oval(0,1.52,-2.15,.23,.15,.12,dark);
    for(const side of [-1,1]){
      oval(side*.47,2.19,-1.25,.21,.24,.18);
      oval(side*.29,1.85,-1.91,.07,.065,.045,dark);
      leg(side*.67,1.35,-.84,.27,1.04,side>0?0:Math.PI);
      leg(side*.67,1.35,.92,.27,1.04,side>0?Math.PI:0);
    }
    oval(0,1.35,1.51,.23,.23,.25);
  }else{
    oval(0,2.54,.1,1.63,1.7,2.22);
    oval(0,2.58,-1.96,1,1.05,.92);
    oval(0,3.33,-1.63,.94,.72,.7);
    for(const side of [-1,1]){
      oval(side*1.04,2.61,-1.9,.46,.71,.22);
      oval(side*.62,2.72,-2.7,.09,.08,.055,dark);
      leg(side*.99,1.65,-1.13,.43,1.3,side>0?0:Math.PI);
      leg(side*.99,1.65,1.35,.43,1.3,side>0?Math.PI:0);
      const tusk=new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*.65,2,-2.47),new THREE.Vector3(side*1.12,1.65,-3.25),
        new THREE.Vector3(side*1.5,2.05,-3.95),new THREE.Vector3(side*1.58,2.8,-4.15)
      ]);
      add(new THREE.TubeGeometry(tusk,16,.12,8,false),new THREE.MeshStandardMaterial({color:0xf9e9ba,roughness:.6}),0,0,0);
    }
    const trunk=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,2.58,-2.7),new THREE.Vector3(0,1.3,-3.1),
      new THREE.Vector3(0,.61,-3.54),new THREE.Vector3(.2,.82,-3.97)
    ]);
    add(new THREE.TubeGeometry(trunk,20,.25,10,false),fur,0,0,0);
    for(let i=0;i<20;i++){
      const tuft=add(new THREE.ConeGeometry(.21,.7,5),fur,Math.sin(i*2.4)*1.45,1.25+Math.cos(i)*.2,Math.cos(i*2.4)*1.65);
      tuft.rotation.z=Math.PI;
    }
    for(let i=0;i<6;i++){
      const shard=add(new THREE.ConeGeometry(.23,.85,5),iceMaterial,Math.sin(i*1.4)*1.05,3.8,Math.cos(i*1.4));
      shard.rotation.z=Math.sin(i)*.4;
    }
  }
  mesh.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true}});
  function animate(time,moving){
    for(const {pivot,phase} of limbs)pivot.rotation.x=moving?Math.sin(time*6+phase)*.28:0;
  }
  return {mesh,animate};
}
