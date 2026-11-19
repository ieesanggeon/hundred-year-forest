import * as THREE from 'three';

// Each row is a forging family. Stations are height, blade center, and half-width.
const families=[
  {stations:[[0,0,.22],[.25,.04,.29],[.55,.16,.23],[.81,.28,.15],[1,.42,0]], length:1.58, metal:0x486253, trim:0x9fb66c, light:0xa7ed57},
  {stations:[[0,0,.19],[.19,0,.43],[.48,0,.32],[.79,-.07,.39],[1,-.22,0]], length:1.68, metal:0x4c3832, trim:0xb67849, light:0xffa252},
  {stations:[[0,0,.17],[.21,.02,.26],[.34,.14,.17],[.52,-.09,.35],[.74,.12,.19],[1,.31,0]], length:1.76, metal:0x263a2a, trim:0x81a63a, light:0xc9ff61},
  {stations:[[0,0,.19],[.36,0,.21],[.50,.13,.38],[.67,.30,.43],[.84,.43,.35],[1,.69,0]], length:1.82, metal:0x3b313e, trim:0xa66380, light:0xf49ccb},
  {stations:[[0,0,.13],[.24,0,.34],[.49,0,.47],[.76,0,.34],[1,0,0]], length:1.88, metal:0x18745a, trim:0xb1d8a5, light:0x88ffe0},
  {stations:[[0,0,.32],[.25,0,.31],[.47,0,.42],[.78,0,.42],[.87,0,.29],[1,0,0]], length:1.94, metal:0x49392d, trim:0xd4a34c, light:0xffd46c},
  {stations:[[0,0,.14],[.21,.07,.23],[.41,-.19,.29],[.62,.22,.30],[.82,-.12,.23],[1,.08,0]], length:1.98, metal:0x293149, trim:0x8196b4, light:0x97c4ff},
  {stations:[[0,0,.14],[.32,.04,.30],[.59,.23,.22],[.76,.37,.32],[.88,.57,.28],[1,.81,0]], length:2.02, metal:0x315462, trim:0x7abece, light:0xa7fff7},
  {stations:[[0,0,.21],[.25,0,.42],[.51,-.07,.36],[.68,0,.54],[.86,.05,.31],[1,0,0]], length:2.06, metal:0x3b2a59, trim:0xa587db, light:0xdcb1ff},
  {stations:[[0,0,.24],[.23,0,.29],[.36,0,.49],[.57,0,.29],[.79,0,.22],[1,0,0]], length:2.10, metal:0xc6e5df, trim:0xe4bd65, light:0x8dffe5}
];

export function buildForestSword(group,level,firstPerson){
  const rank=level-51;
  const tier=Math.floor(rank/5);
  const refinement=rank%5;
  const family=families[tier];
  const model=new THREE.Group();
  model.scale.setScalar(firstPerson?.7:1);
  group.add(model);
  const metal=new THREE.MeshStandardMaterial({color:family.metal,metalness:.57,roughness:.32});
  const trim=new THREE.MeshStandardMaterial({color:family.trim,metalness:.5,roughness:.3});
  const glow=new THREE.MeshStandardMaterial({color:family.light,emissive:family.light,emissiveIntensity:.23+tier*.06+refinement*.04});
  const grip=new THREE.MeshStandardMaterial({color:0x29222a,roughness:.96});
  function add(geometry,material,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    model.add(mesh);
    return mesh;
  }
  const length=family.length+refinement*.055;
  const widthScale=.82+refinement*.13;
  const base=.38;
  const stations=family.stations.map(([height,center,width])=>[
    base+height*length,center+Math.sin(height*Math.PI)*(.035*refinement)*(tier%2?1:-1),width*widthScale
  ]);
  const blade=new THREE.Shape();
  const outline=[
    ...stations.map(([y,x,w])=>[x-w,y]),
    ...stations.slice(0,-1).reverse().map(([y,x,w])=>[x+w,y])
  ];
  outline.forEach(([x,y],i)=>i?blade.lineTo(x,y):blade.moveTo(x,y));
  blade.closePath();
  const thickness=.075+tier*.005;
  const bevel=.025+refinement*.006;
  add(new THREE.ExtrudeGeometry(blade,{depth:thickness,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:.023}),[metal,trim],0,0,-thickness/2);

  add(new THREE.CylinderGeometry(.088,.074,.53,10),grip,0,.085);
  for(let i=0;i<4+refinement;i++){
    add(new THREE.TorusGeometry(.083,.012,5,10),trim,0,-.12+i*.39/(3+refinement)).rotation.x=Math.PI/2;
  }
  if(firstPerson)add(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:0xe7be91}),0,-.15).scale.y=1.2;
  add(new THREE.IcosahedronGeometry(.085+tier*.008,refinement>=3?1:0),trim,0,-.24);
  const guardSpan=.30+tier*.022+refinement*.031;
  for(const side of [-1,1]){
    const quillon=add(new THREE.CylinderGeometry(.032,.085,guardSpan,5+refinement),trim,side*guardSpan*.43,base,0);
    quillon.rotation.z=-side*(1.28+(refinement-2)*.34+(tier%3-1)*.16);
    if(refinement>=2)add(new THREE.OctahedronGeometry(.066),glow,side*guardSpan*.83,base+(refinement-2)*.055);
  }
  // Runes follow the actual blade contour on both faces.
  for(let i=1;i<=2+refinement;i++){
    const t=i/(3+refinement);
    const y=base+t*length*.86;
    const next=stations.findIndex(([height])=>height>=y);
    const [loY,loX]=stations[next-1];
    const [hiY,hiX]=stations[next];
    const x=THREE.MathUtils.lerp(loX,hiX,(y-loY)/(hiY-loY));
    for(const side of [-1,1]){
      const rune=add(new THREE.OctahedronGeometry(.053+tier*.003),glow,x,y,side*(thickness/2+.019));
      rune.scale.set(1,1.1+refinement*.13,.25);
      rune.rotation.z=(i%2?1:-1)*refinement*.17;
    }
  }
  if(tier>=6){
    const halo=add(new THREE.TorusGeometry(.13+(tier-6)*.035+refinement*.014,.014+tier*.001,6,24),glow,0,base+.07);
    halo.rotation.y=.25*(refinement-2);
  }
  if(level===100){
    for(const side of [-1,1]){
      const wing=add(new THREE.ConeGeometry(.15,.82,4),trim,side*.45,.69);
      wing.rotation.z=-side*.44;
      add(new THREE.OctahedronGeometry(.12),glow,side*.62,.97);
    }
  }
}
