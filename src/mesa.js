import * as THREE from 'three';

export function createMesa(){
  const root=new THREE.Group();
  root.name='mesa-scenery';
  root.visible=false;
  const heights=[0,1.5,3.6,5.1,7.8,9.1,11.8,13.3,16.5,16.5];
  const offsets=[0,2.9,5.4,8.5,11.1,14.4,17,20.4,23.4,27];
  const colors=[0xd69860,0xad573a,0xe5b979,0x8b493c,0xc8794f,0xf0cf91,0xb75c3b,0xdfa465,0xe5bd80];
  const rockMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,flatShading:true});
  function edgePoint(side,t,layer){
    const width=45+offsets[layer],depth=30+offsets[layer];
    const along=t*2-1;
    const edges=[[-width*along,-depth],[width,-depth*along],[width*along,depth],[-width,depth*along]];
    const [x,z]=edges[side];
    const erosion=layer?Math.sin(t*Math.PI)*Math.sin(t*Math.PI*8+side)*.55:0;
    return new THREE.Vector3(x,heights[layer]+erosion,z);
  }
  for(let layer=0;layer<heights.length-1;layer++){
    const positions=[],vertexColors=[];
    const color=new THREE.Color(colors[layer]);
    for(let side=0;side<4;side++){
      for(let i=0;i<32;i++){
        const a=edgePoint(side,i/32,layer),b=edgePoint(side,(i+1)/32,layer);
        const c=edgePoint(side,(i+1)/32,layer+1),d=edgePoint(side,i/32,layer+1);
        const shade=.93+.07*Math.cos(i*.7+side);
        for(const point of [a,b,d,b,c,d]){
          positions.push(point.x,point.y,point.z);
          vertexColors.push(color.r*shade,color.g*shade,color.b*shade);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
    geometry.computeVertexNormals();
    const layerMesh=new THREE.Mesh(geometry,rockMaterial);
    layerMesh.name='sloped-sandstone-layer-'+layer;
    layerMesh.receiveShadow=true;
    root.add(layerMesh);
  }

  const sand=new THREE.MeshStandardMaterial({color:0xe6bf83,roughness:1});
  const dunes=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,9),sand,32);
  const transform=new THREE.Object3D();
  for(let i=0;i<32;i++){
    const angle=i*2.39996;
    transform.position.set(Math.cos(angle)*(17+i%5*4),-.25,Math.sin(angle)*(11+i%4*4));
    transform.rotation.set(0,angle,0);
    transform.scale.set(3.5+i%3,.55+i%4*.14,1.7+i%2);
    transform.updateMatrix();
    dunes.setMatrixAt(i,transform.matrix);
  }
  dunes.receiveShadow=true;
  root.add(dunes);

  const strata=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
  for(const [x,z,height] of [[-54,-22,13],[55,15,17],[-52,31,15],[35,-48,18],[-25,-48,13]]){
    for(let layer=0;layer<6;layer++){
      const radius=4.4-layer*.29;
      const slab=new THREE.Mesh(new THREE.CylinderGeometry(radius*.93,radius,height/6,7),strata[layer]);
      slab.position.set(x,3+(layer+.5)*height/6,z);
      slab.rotation.y=.23;
      slab.receiveShadow=true;
      root.add(slab);
    }
  }
  const cactusMaterial=new THREE.MeshStandardMaterial({color:0x617649,roughness:.9});
  for(const [x,z,height] of [[-38,-18,2.7],[37,15,3.3],[-39,18,2],[33,-21,2.6]]){
    const cactus=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CapsuleGeometry(.18,height,5,9),cactusMaterial);
    trunk.position.y=height/2;
    cactus.add(trunk);
    for(const side of [-1,1]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.65,4,8),cactusMaterial);
      arm.position.set(side*.41,height*.5+side*.18,0);
      const elbow=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.4,8),cactusMaterial);
      elbow.rotation.z=Math.PI/2;
      elbow.position.set(side*.22,height*.5-.3+side*.18,0);
      cactus.add(arm,elbow);
    }
    cactus.position.set(x,0,z);
    root.add(cactus);
  }

  const dustPositions=[];
  for(let i=0;i<260;i++)dustPositions.push(Math.sin(i*5.17)*47,(i*.173)%9,Math.cos(i*3.31)*31);
  const dustGeometry=new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xffdba6,size:.07,transparent:true,opacity:.45,depthWrite:false}));
  root.add(dust);
  function update(dt){
    const points=dustGeometry.attributes.position;
    for(let i=0;i<points.count;i++){
      let x=points.getX(i)+dt*(1.6+i%3*.3);
      if(x>48)x=-48;
      points.setX(i,x);
    }
    points.needsUpdate=true;
  }
  return {root,update};
}

export const desertMonsterStats={
  cobra:{name:'코브라',damage:55,exp:500000,speed:4.1,reach:1.6,height:3.55},
  desertScorpion:{name:'사막전갈',damage:68,exp:700000,speed:3.3,reach:2.1,height:3.3}
};

export function createDesertMonster(type){
  const mesh=new THREE.Group();
  mesh.name=type;
  const gold=new THREE.MeshStandardMaterial({color:0xb89245,roughness:.72});
  const belly=new THREE.MeshStandardMaterial({color:0xefcc87,roughness:.85});
  const shell=new THREE.MeshStandardMaterial({color:0x87452f,roughness:.68});
  const dark=new THREE.MeshStandardMaterial({color:0x32281d,roughness:.8});
  const eyeMaterial=new THREE.MeshStandardMaterial({color:0xe6b947,emissive:0xb87510,emissiveIntensity:.5});
  const limbs=[];
  let hood,coil,tail;
  function add(geometry,material,x=0,y=0,z=0,parent=mesh){
    const part=new THREE.Mesh(geometry,material);
    part.position.set(x,y,z);
    parent.add(part);
    return part;
  }
  function oval(x,y,z,rx,ry,rz,material,parent=mesh){
    const part=add(new THREE.SphereGeometry(1,16,12),material,x,y,z,parent);
    part.scale.set(rx,ry,rz);
    return part;
  }
  function tube(points,radius,material,parent=mesh){
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    return add(new THREE.TubeGeometry(curve,20,radius,9,false),material,0,0,0,parent);
  }
  function link(start,end,radius,parent,material){
    const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end);
    const direction=to.clone().sub(from);
    const segment=add(new THREE.CylinderGeometry(radius,radius*.85,direction.length(),8),material,0,0,0,parent);
    segment.position.copy(from.add(to).multiplyScalar(.5));
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  }
  if(type==='cobra'){
    coil=add(new THREE.TorusGeometry(.8,.2,10,28),gold,0,.22,.15);
    coil.rotation.x=Math.PI/2;
    add(new THREE.TorusGeometry(.5,.19,10,24),gold,0,.4,.1).rotation.x=Math.PI/2;
    hood=new THREE.Group();
    mesh.add(hood);
    tube([[0,.42,.2],[-.28,1,.15],[.2,1.5,-.15],[0,2.1,-.2],[0,2.64,-.36]],.19,gold,hood);
    oval(0,2.17,-.08,.8,.78,.16,gold,hood);
    oval(0,2.14,-.24,.51,.64,.055,belly,hood);
    for(let i=0;i<6;i++){
      const stripe=add(new THREE.BoxGeometry(.62-i*.035,.025,.02),gold,0,1.8+i*.15,-.3,hood);
      stripe.rotation.z=i%2?.04:-.04;
    }
    oval(0,2.65,-.43,.39,.24,.4,gold,hood);
    for(const side of [-1,1]){
      oval(side*.2,2.75,-.72,.07,.055,.04,dark,hood);
      const fang=add(new THREE.ConeGeometry(.05,.23,7),new THREE.MeshStandardMaterial({color:0xfff0d2}),side*.14,2.46,-.72,hood);
      fang.rotation.z=Math.PI;
    }
    const tongueMaterial=new THREE.LineBasicMaterial({color:0xb83a3b});
    const tongue=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,2.59,-.82),new THREE.Vector3(0,2.57,-1.08),
      new THREE.Vector3(0,2.57,-1.08),new THREE.Vector3(-.055,2.58,-1.19),
      new THREE.Vector3(0,2.57,-1.08),new THREE.Vector3(.055,2.58,-1.19)
    ]),tongueMaterial);
    hood.add(tongue);
  }else{
    oval(0,.66,0,.74,.43,1.13,shell);
    oval(0,.63,-.99,.52,.3,.46,shell);
    for(let i=0;i<4;i++){
      const plate=add(new THREE.TorusGeometry(.56,.045,5,12),dark,0,.66,-.25+i*.3);
      plate.scale.set(1,.65,1);
    }
    for(const side of [-1,1]){
      oval(side*.22,.82,-1.35,.065,.05,.04,eyeMaterial);
      for(let i=0;i<4;i++){
        const pivot=new THREE.Group();
        pivot.position.set(side*.57,.62,-.61+i*.43);
        mesh.add(pivot);
        link([0,0,0],[side*.68,-.08,.08],.09,pivot,shell);
        link([side*.68,-.08,.08],[side*1.08,-.59,.32],.065,pivot,dark);
        limbs.push({pivot,phase:i*Math.PI*.65+(side>0?0:Math.PI)});
      }
      tube([[side*.4,.65,-.88],[side*.92,.68,-1.3],[side*1.13,.72,-1.63]],.12,shell);
      oval(side*1.12,.72,-1.77,.3,.2,.34,shell);
      for(const jaw of [-1,1]){
        tube([[side*1.12+jaw*.2,.72,-1.88],[side*1.12+jaw*.24,.72,-2.13],[side*1.12+jaw*.04,.72,-2.36]],.065,shell);
      }
    }
    tail=new THREE.Group();
    mesh.add(tail);
    const tailPoints=[[0,.82,.89],[0,1.18,1.48],[0,1.86,1.35],[0,2.34,.7],[0,2.14,-.03]];
    for(let i=0;i<tailPoints.length-1;i++){
      link(tailPoints[i],tailPoints[i+1],.21-i*.03,tail,shell);
      oval(...tailPoints[i],.23-i*.025,.23-i*.025,.23-i*.025,shell,tail);
    }
    const stinger=add(new THREE.ConeGeometry(.14,.53,7),dark,0,2.07,-.27,tail);
    stinger.rotation.x=-Math.PI/2;
  }
  mesh.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true}});
  function animate(time,moving){
    if(hood){
      hood.rotation.z=Math.sin(time*(moving?5:1.8))*(moving?.09:.035);
      coil.scale.x=1+Math.sin(time*4)*.045;
    }
    if(tail)tail.rotation.z=Math.sin(time*2.1)*.075;
    for(const {pivot,phase} of limbs)pivot.rotation.z=moving?Math.sin(time*8+phase)*.15:0;
  }
  return {mesh,animate};
}
