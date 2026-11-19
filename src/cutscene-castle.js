import * as THREE from 'three';

const material=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.08});

export function createDarkCastle(){
  const root=new THREE.Group();
  root.name='cutscene-dark-castle';
  root.position.set(0,0,-30);
  root.visible=false;

  const stone=material(0x171922,.95);
  const middleStone=material(0x292c38,.9);
  const trim=material(0x484b59,.72);
  const roof=material(0x080a12,.64);
  const iron=material(0x090a0d,.38);
  const violet=new THREE.MeshStandardMaterial({color:0x49306f,emissive:0x35145f,emissiveIntensity:1.4});

  function add(geometry,meshMaterial,x=0,y=0,z=0,parent=root){
    const mesh=new THREE.Mesh(geometry,meshMaterial);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    parent.add(mesh);
    return mesh;
  }
  function battlements(parent,radius,y,count=8){
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2;
      const block=add(new THREE.BoxGeometry(.65,.72,.58),trim,Math.sin(angle)*radius,y,Math.cos(angle)*radius,parent);
      block.rotation.y=angle;
    }
  }
  function tower(x,z,radius,height,roofHeight,main=false){
    const group=new THREE.Group();
    group.position.set(x,0,z);
    root.add(group);
    add(new THREE.CylinderGeometry(radius*1.08,radius*1.18,height,8),main?middleStone:stone,0,height/2,0,group);
    add(new THREE.CylinderGeometry(radius*1.19,radius*1.24,.42,8),trim,0,1.1,0,group);
    add(new THREE.CylinderGeometry(radius*1.15,radius*1.15,.38,8),trim,0,height*.55,0,group);
    add(new THREE.CylinderGeometry(radius*1.25,radius*1.25,.44,8),trim,0,height-.22,0,group);
    battlements(group,radius*1.2,height+.25,main?12:8);
    const roofMesh=add(new THREE.ConeGeometry(radius*1.32,roofHeight,8),roof,0,height+roofHeight/2+.55,0,group);
    roofMesh.rotation.y=Math.PI/8;
    add(new THREE.CylinderGeometry(.07,.07,1.2,6),iron,0,height+roofHeight+1.1,0,group);
    for(const side of [-1,1]){
      const windowMesh=add(new THREE.BoxGeometry(.38,1.3,.12),violet,side*radius*.36,height*.66,radius*1.08,group);
      windowMesh.rotation.z=side*.03;
    }
    return group;
  }

  add(new THREE.CylinderGeometry(12.5,13.7,1.4,10),stone,0,.7,0);
  add(new THREE.BoxGeometry(17,5.5,9),stone,0,3.7,0);
  add(new THREE.BoxGeometry(14.8,.55,9.8),trim,0,6.5,0);
  battlements(root,8.4,7,16);

  tower(0,-1.5,3.25,13.5,5.3,true);
  tower(-6.6,1.3,1.8,8.2,4.1);
  tower(6.6,1.3,1.8,8.2,4.1);
  tower(-5.2,-4.2,1.45,10.2,3.8);
  tower(5.2,-4.2,1.45,10.2,3.8);
  tower(-8.2,-3.3,1.15,6.9,3.1);
  tower(8.2,-3.3,1.15,6.9,3.1);

  // Cathedral-like ribs and pointed arches inspired by the supplied castle silhouette.
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){
      const rib=add(new THREE.BoxGeometry(.32,5.8,.42),trim,side*(3.8+i*1.55),4.1,4.72);
      rib.rotation.z=-side*(.18+i*.055);
    }
    const arch=add(new THREE.TorusGeometry(2.15,.22,8,28,Math.PI),trim,side*3.25,4.15,4.72);
    arch.rotation.z=Math.PI;
  }

  // Grand stairway leading to the prisoned princess.
  for(let i=0;i<8;i++){
    const step=add(new THREE.BoxGeometry(7.6-i*.58,.38,1.05),middleStone,0,.22+i*.35,7.4-i*.58);
    step.rotation.y=.015*Math.sin(i);
  }
  add(new THREE.BoxGeometry(8.4,.55,2.8),trim,0,3.05,4.65);
  add(new THREE.BoxGeometry(4.1,4.5,.55),iron,0,5.45,4.61);

  const princess=new THREE.Group();
  princess.position.set(0,3.35,4.98);
  root.add(princess);
  const pink=material(0xf05f9a,.55);
  const lightPink=material(0xffa8ca,.48);
  const skin=material(0xf4c8a1,.72);
  const blonde=new THREE.MeshStandardMaterial({color:0xffdc58,roughness:.48,emissive:0x6b4700,emissiveIntensity:.22});
  const gold=new THREE.MeshStandardMaterial({color:0xffd34d,metalness:.65,roughness:.3});
  add(new THREE.ConeGeometry(1.05,2.65,18),pink,0,1.32,0,princess);
  add(new THREE.CylinderGeometry(.48,.7,1.15,14),lightPink,0,2.7,0,princess);
  for(const side of [-1,1]){
    const sleeve=add(new THREE.SphereGeometry(.34,12,8),lightPink,side*.67,2.84,0,princess);
    sleeve.scale.set(1.2,.82,.86);
    const arm=add(new THREE.CylinderGeometry(.11,.13,.78,9),skin,side*.78,2.42,.03,princess);
    arm.rotation.z=side*.22;
  }
  add(new THREE.SphereGeometry(.48,18,12),skin,0,3.72,0,princess);
  const hairBack=add(new THREE.SphereGeometry(.57,18,12),blonde,0,3.86,.18,princess);
  hairBack.scale.set(1,1.08,.82);
  add(new THREE.SphereGeometry(.48,18,10,0,Math.PI*2,0,Math.PI*.55),blonde,0,3.98,-.29,princess);
  for(const side of [-1,1]){
    const curl=add(new THREE.CapsuleGeometry(.13,.85,5,9),blonde,side*.43,3.42,-.02,princess);
    curl.rotation.z=side*.09;
    const eye=add(new THREE.SphereGeometry(.045,8,6),material(0x354a68,.4),side*.17,3.73,-.445,princess);
    eye.scale.z=.45;
  }
  add(new THREE.ConeGeometry(.38,.42,5),gold,0,4.55,0,princess);

  const bars=new THREE.Group();
  bars.position.set(0,3.25,5.55);
  root.add(bars);
  for(let i=-2;i<=2;i++)add(new THREE.CylinderGeometry(.075,.075,4.6,8),iron,i*.65,2.35,0,bars);
  for(const y of [.42,2.35,4.28]){
    const horizontal=add(new THREE.CylinderGeometry(.07,.07,3.15,8),iron,0,y,0,bars);
    horizontal.rotation.z=Math.PI/2;
  }

  const balcony=add(new THREE.BoxGeometry(5.2,.38,1.45),trim,0,3.25,5.2);
  balcony.rotation.x=-.02;
  const light=new THREE.PointLight(0xff8ebd,5.5,18,1.7);
  light.position.set(0,7,7.2);
  root.add(light);
  const moonLight=new THREE.SpotLight(0x879dff,8,55,Math.PI*.24,.55,1.3);
  moonLight.position.set(-12,22,13);
  moonLight.target.position.set(0,6,0);
  root.add(moonLight,moonLight.target);

  root.userData={princess,light,time:0};
  return root;
}

export function updateDarkCastle(castle,dt){
  if(!castle.visible)return;
  const data=castle.userData;
  data.time+=dt;
  data.princess.position.y=3.35+Math.sin(data.time*1.35)*.045;
  data.princess.rotation.y=Math.sin(data.time*.62)*.055;
  data.light.intensity=5.3+Math.sin(data.time*2.1)*.7;
}
