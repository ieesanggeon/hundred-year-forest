import * as THREE from 'three';

// Each entry has an individually authored blade outline, guard and crystal layout.
// Profile stations are normalized height, horizontal center and half-width.
export const SNOW_SWORDS=[
  {name:'서리 문지기의 검',guard:'bar',crystals:1,profile:[[0,0,.19],[.24,0,.23],[.75,0,.17],[1,0,0]]},
  {name:'설풍의 은검',guard:'swept',crystals:1,profile:[[0,0,.17],[.3,.04,.2],[.73,.14,.19],[1,.3,0]]},
  {name:'푸른 고드름',guard:'fork',crystals:1,profile:[[0,0,.16],[.18,0,.28],[.37,0,.17],[.81,0,.12],[1,0,0]]},
  {name:'눈송이 수호검',guard:'snowflake',crystals:1,profile:[[0,0,.19],[.2,0,.29],[.49,0,.24],[.78,0,.31],[1,0,0]]},
  {name:'설원 추적자의 칼날',guard:'swept',crystals:2,profile:[[0,0,.18],[.24,-.03,.23],[.64,.06,.2],[.86,.22,.27],[1,.48,0]]},
  {name:'얼음늑대 송곳니',guard:'fang',crystals:2,profile:[[0,0,.21],[.2,.03,.32],[.46,.09,.22],[.71,.25,.3],[1,.5,0]]},
  {name:'빙하 조각검',guard:'fork',crystals:2,profile:[[0,0,.2],[.22,0,.34],[.35,0,.2],[.58,0,.39],[.79,0,.24],[1,0,0]]},
  {name:'혹한의 쌍날검',guard:'twin',crystals:2,profile:[[0,0,.14],[.21,0,.23],[.52,0,.19],[.8,0,.25],[1,0,0]]},
  {name:'오로라 세이버',guard:'swept',crystals:3,profile:[[0,0,.15],[.2,.02,.22],[.52,.13,.25],[.81,.32,.18],[1,.5,0]]},
  {name:'서리 가시검',guard:'fang',crystals:3,profile:[[0,0,.19],[.17,0,.32],[.27,0,.18],[.43,0,.37],[.55,0,.2],[.72,0,.32],[1,0,0]]},
  {name:'만년설 파쇄검',guard:'bar',crystals:3,profile:[[0,0,.25],[.22,0,.28],[.48,0,.42],[.82,0,.43],[.92,0,.32],[1,0,0]]},
  {name:'빙정 기사의 검',guard:'snowflake',crystals:3,profile:[[0,0,.21],[.23,0,.32],[.43,0,.24],[.7,0,.37],[.86,0,.22],[1,0,0]]},
  {name:'눈보라의 갈고리',guard:'swept',crystals:4,profile:[[0,0,.18],[.32,.01,.26],[.59,.16,.29],[.79,.39,.34],[.91,.57,.25],[1,.72,0]]},
  {name:'얼음심장 룬검',guard:'fork',crystals:4,profile:[[0,0,.22],[.18,0,.37],[.36,0,.23],[.56,0,.42],[.73,0,.3],[1,0,0]]},
  {name:'북극성의 맹세',guard:'snowflake',crystals:4,profile:[[0,0,.21],[.24,0,.26],[.42,0,.46],[.58,0,.25],[.83,0,.22],[1,0,0]]},
  {name:'은백의 날개',guard:'wings',crystals:4,profile:[[0,0,.18],[.2,0,.32],[.38,0,.2],[.69,0,.35],[.88,0,.18],[1,0,0]]},
  {name:'빙룡의 송곳니',guard:'fang',crystals:5,profile:[[0,0,.23],[.19,.04,.36],[.42,.12,.22],[.66,.29,.38],[.83,.46,.26],[1,.66,0]]},
  {name:'오로라 월광검',guard:'crescent',crystals:5,profile:[[0,0,.19],[.27,.04,.27],[.53,.21,.31],[.78,.45,.29],[.9,.59,.2],[1,.73,0]]},
  {name:'혹한왕의 대검',guard:'crown',crystals:5,profile:[[0,0,.27],[.18,0,.43],[.38,0,.31],[.61,0,.51],[.83,0,.4],[1,0,0]]},
  {name:'만년빙의 심판',guard:'fork',crystals:5,profile:[[0,0,.24],[.21,0,.35],[.4,0,.51],[.55,0,.33],[.76,0,.44],[1,0,0]]},
  {name:'겨울여왕의 성검',guard:'crown',crystals:6,profile:[[0,0,.22],[.2,0,.34],[.35,0,.45],[.49,0,.26],[.77,0,.31],[1,0,0]]},
  {name:'해동의 여명',guard:'wings',crystals:6,profile:[[0,0,.23],[.19,.02,.32],[.37,-.09,.38],[.63,.12,.33],[.83,.22,.25],[1,.36,0]]},
  {name:'설원의 군주',guard:'antlers',crystals:6,profile:[[0,0,.24],[.16,0,.42],[.32,0,.28],[.58,0,.48],[.73,0,.28],[.88,0,.35],[1,0,0]]},
  {name:'극광의 천검',guard:'twin',crystals:7,profile:[[0,0,.19],[.2,0,.32],[.44,.03,.27],[.69,.09,.39],[.83,.14,.25],[1,.18,0]]},
  {name:'세계를 가르는 서리',guard:'crescent',crystals:7,profile:[[0,0,.24],[.2,-.03,.39],[.39,.07,.29],[.64,.2,.46],[.84,.36,.3],[1,.58,0]]},
  {name:'영원한 겨울·프로스트 크라운',guard:'crown',crystals:8,profile:[[0,0,.24],[.15,0,.36],[.3,0,.55],[.44,0,.3],[.66,0,.47],[.81,0,.26],[.91,0,.34],[1,0,0]]}
];

export function buildSnowSword(group,level,firstPerson=false){
  const rank=level-50;
  const design=SNOW_SWORDS[rank];
  const model=new THREE.Group();
  model.name=design.name;
  model.scale.setScalar(firstPerson?.7:1);
  group.add(model);
  const length=1.7+rank*.022;
  const metal=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.56,.2,.55+rank*.013),metalness:.65,roughness:.23});
  const trim=new THREE.MeshStandardMaterial({color:rank>=18?0xebd69a:0xb6d6eb,metalness:.65,roughness:.3});
  const ice=new THREE.MeshStandardMaterial({color:0x9defff,emissive:0x319ab9,emissiveIntensity:.2+rank*.018,metalness:.12,roughness:.2});
  const grip=new THREE.MeshStandardMaterial({color:0x25364e,roughness:.9});
  const stations=design.profile.map(([y,x,w])=>[.42+y*length,x,w]);
  const outline=[...stations.map(([y,x,w])=>[x-w,y]),...stations.slice(0,-1).reverse().map(([y,x,w])=>[x+w,y])];
  const shape=new THREE.Shape();
  outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
  shape.closePath();
  function add(geometry,material,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    model.add(mesh);
    return mesh;
  }
  add(new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelThickness:.018,bevelSize:.023,bevelSegments:1,steps:1}),[metal,ice],0,0,-.045);
  if(design.guard==='twin'){
    const second=add(new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false}),ice,.22,0,0);
    second.scale.x=.45;
    second.rotation.z=-.2;
  }
  add(new THREE.CylinderGeometry(.085,.08,.55,10),grip,0,.085);
  for(let i=0;i<6;i++)add(new THREE.TorusGeometry(.087,.012,5,12),trim,0,-.12+i*.075).rotation.x=Math.PI/2;
  add(new THREE.OctahedronGeometry(.11+rank*.002),ice,0,-.27);
  if(firstPerson)add(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:0xe7be91}),0,-.15).scale.y=1.2;

  const span=.38+rank*.008;
  add(new THREE.BoxGeometry(span*2,.105,.16),trim,0,.39);
  const guardAngles={bar:1.57,swept:.65,fork:-.45,snowflake:1,fang:-.8,twin:.5,wings:-.5,crescent:1.3,crown:-.3,antlers:-.65};
  for(const side of [-1,1]){
    const arm=add(new THREE.ConeGeometry(.1,span*.95,5),trim,side*span,.5);
    arm.rotation.z=side*guardAngles[design.guard];
    if(['wings','crown','antlers'].includes(design.guard)){
      for(let i=0;i<3;i++){
        const branch=add(new THREE.ConeGeometry(.06,.3+i*.09,4),ice,side*(span+i*.1),.61+i*.045);
        branch.rotation.z=-side*(.3+i*.2);
      }
    }
  }
  if(design.guard==='crescent')add(new THREE.TorusGeometry(span,.045,6,24,Math.PI),trim,0,.47).rotation.z=Math.PI;
  if(design.guard==='snowflake'){
    for(let i=0;i<6;i++){
      const ray=add(new THREE.BoxGeometry(.035,.5,.05),ice,0,.41,-.13);
      ray.rotation.z=i*Math.PI/3;
    }
  }
  for(let i=0;i<design.crystals;i++){
    const y=.56+length*.75*(i+1)/(design.crystals+1);
    const next=stations.findIndex(([height])=>height>=y);
    const [lowY,lowX]=stations[next-1];
    const [highY,highX]=stations[next];
    const x=THREE.MathUtils.lerp(lowX,highX,(y-lowY)/(highY-lowY));
    for(const side of [-1,1]){
      const gem=add(new THREE.OctahedronGeometry(.07+rank*.0009),ice,x,y,side*.065);
      gem.scale.set(.7,1.6,.4);
    }
  }
  if(rank>=18)add(new THREE.TorusGeometry(.15+(rank-18)*.005,.017,6,28),ice,0,.51,-.09);
  if(level===75){
    for(const side of [-1,1]){
      const crown=add(new THREE.ConeGeometry(.12,.78,4),trim,side*.42,.98);
      crown.rotation.z=-side*.2;
    }
  }
}
