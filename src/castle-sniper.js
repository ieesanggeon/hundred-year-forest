import * as THREE from 'three';

export function createSniperVisual(){
  const rifle=new THREE.Group();
  rifle.name='guard-sniper-rifle';
  rifle.position.set(.28,1.88,-.45);
  const metal=new THREE.MeshStandardMaterial({color:0x24232b,metalness:.7,roughness:.4});
  const stock=new THREE.MeshStandardMaterial({color:0x584963,roughness:.85});
  function box(x,y,z,w,h,d,material){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);
    rifle.add(mesh);
    return mesh;
  }
  box(0,0,-.35,.22,.22,1.25,metal);
  box(0,-.05,.45,.28,.32,.55,stock);
  box(0,-.25,-.05,.13,.4,.2,stock).rotation.x=-.25;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,1.25,10),metal);
  barrel.rotation.x=Math.PI/2;
  barrel.position.set(0,.02,-1.35);
  rifle.add(barrel);
  const scope=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.7,12),metal);
  scope.rotation.x=Math.PI/2;
  scope.position.set(0,.25,-.35);
  rifle.add(scope);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.1,12),new THREE.MeshBasicMaterial({color:0xe02735}));
  lens.rotation.y=Math.PI;
  lens.position.set(0,.25,-.71);
  rifle.add(lens);
  const muzzle=new THREE.Object3D();
  muzzle.position.set(0,.02,-2);
  rifle.add(muzzle);
  const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.18),new THREE.MeshBasicMaterial({color:0xffdc83,toneMapped:false}));
  flash.position.copy(muzzle.position);
  flash.visible=false;
  rifle.add(flash);

  const laser=new THREE.Group();
  laser.name='guard-red-laser';
  laser.visible=false;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xff182b,transparent:true,opacity:.9,toneMapped:false}));
  line.frustumCulled=false;
  laser.add(line);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshBasicMaterial({color:0xff2435,toneMapped:false}));
  laser.add(dot);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),new THREE.MeshBasicMaterial({color:0xff182b,transparent:true,opacity:.18,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
  laser.add(halo);
  function setLaser(start,end,time){
    geometry.attributes.position.setXYZ(0,start.x,start.y,start.z);
    geometry.attributes.position.setXYZ(1,end.x,end.y,end.z);
    geometry.attributes.position.needsUpdate=true;
    dot.position.copy(end);
    halo.position.copy(end);
    halo.scale.setScalar(1+Math.sin(time*12)*.2);
  }
  return {rifle,laser,muzzle,flash,setLaser};
}
