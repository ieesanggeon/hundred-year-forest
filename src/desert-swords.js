import * as THREE from 'three';

// Individually authored profiles use height, horizontal center and half-width.
export const DESERT_SWORDS=[
  {name:'모래바람의 칼날',guard:'swept',crystals:1,profile:[[0,0,.2],[.25,.03,.25],[.65,.15,.23],[.85,.3,.18],[1,.44,0]]},
  {name:'사암 수호검',guard:'bar',crystals:1,profile:[[0,0,.24],[.22,0,.31],[.46,0,.27],[.77,0,.35],[1,0,0]]},
  {name:'붉은 협곡의 은검',guard:'fork',crystals:2,profile:[[0,0,.2],[.2,.02,.31],[.42,.08,.23],[.7,.13,.29],[1,.24,0]]},
  {name:'사막 순찰자의 만곡검',guard:'swept',crystals:2,profile:[[0,0,.18],[.28,.06,.24],[.56,.21,.27],[.82,.42,.21],[1,.64,0]]},
  {name:'코브라 송곳니',guard:'fang',crystals:2,profile:[[0,0,.22],[.22,.04,.35],[.44,.1,.22],[.7,.29,.32],[1,.57,0]]},
  {name:'황혼의 모래검',guard:'crescent',crystals:3,profile:[[0,0,.2],[.24,-.02,.28],[.5,.09,.34],[.76,.3,.25],[1,.48,0]]},
  {name:'전갈 집게검',guard:'pincers',crystals:3,profile:[[0,0,.24],[.2,0,.32],[.4,-.08,.41],[.63,-.02,.28],[.82,.2,.42],[1,.44,0]]},
  {name:'유리모래 칼날',guard:'fork',crystals:3,profile:[[0,0,.17],[.24,0,.31],[.35,0,.2],[.64,0,.35],[.82,0,.19],[1,0,0]]},
  {name:'태양 문양검',guard:'sun',crystals:3,profile:[[0,0,.22],[.26,0,.3],[.44,0,.43],[.62,0,.27],[.84,0,.24],[1,0,0]]},
  {name:'메사 파쇄검',guard:'bar',crystals:4,profile:[[0,0,.28],[.25,0,.31],[.48,0,.48],[.82,0,.49],[.92,0,.33],[1,0,0]]},
  {name:'유목왕의 시미터',guard:'swept',crystals:4,profile:[[0,0,.21],[.3,.06,.3],[.58,.24,.34],[.82,.49,.27],[1,.77,0]]},
  {name:'붉은 지층의 대검',guard:'fork',crystals:4,profile:[[0,0,.27],[.17,0,.4],[.32,0,.28],[.56,0,.49],[.71,0,.31],[.86,0,.42],[1,0,0]]},
  {name:'사구의 쌍날검',guard:'twin',crystals:4,profile:[[0,0,.17],[.24,.02,.29],[.5,.04,.23],[.77,.08,.32],[1,.12,0]]},
  {name:'태양석 룬검',guard:'sun',crystals:5,profile:[[0,0,.25],[.22,0,.38],[.4,0,.27],[.61,0,.48],[.81,0,.3],[1,0,0]]},
  {name:'황금 오아시스',guard:'crescent',crystals:5,profile:[[0,0,.22],[.25,.01,.31],[.48,.13,.4],[.76,.35,.29],[1,.61,0]]},
  {name:'폭염의 장검',guard:'fang',crystals:5,profile:[[0,0,.24],[.19,-.05,.33],[.38,.09,.4],[.59,-.06,.29],[.81,.13,.34],[1,.3,0]]},
  {name:'코브라 군주의 맹독검',guard:'serpent',crystals:5,profile:[[0,0,.24],[.24,-.08,.36],[.45,.17,.3],[.68,-.03,.42],[.84,.22,.29],[1,.48,0]]},
  {name:'전갈왕의 심판',guard:'pincers',crystals:6,profile:[[0,0,.27],[.2,0,.39],[.4,-.11,.49],[.58,.02,.29],[.8,.3,.48],[1,.63,0]]},
  {name:'황금 협곡의 맹세',guard:'fork',crystals:6,profile:[[0,0,.25],[.2,0,.42],[.38,0,.3],[.57,0,.52],[.78,0,.4],[1,0,0]]},
  {name:'붉은 태양의 성검',guard:'sun',crystals:6,profile:[[0,0,.25],[.21,0,.34],[.38,0,.51],[.53,0,.29],[.78,0,.36],[1,0,0]]},
  {name:'유리폭풍의 천검',guard:'twin',crystals:6,profile:[[0,0,.19],[.22,.03,.35],[.43,-.04,.27],[.67,.16,.41],[.84,.28,.27],[1,.46,0]]},
  {name:'사막황제의 칼날',guard:'crown',crystals:7,profile:[[0,0,.27],[.21,0,.43],[.35,0,.3],[.6,0,.54],[.81,0,.38],[1,0,0]]},
  {name:'메사 심장의 지배자',guard:'serpent',crystals:7,profile:[[0,0,.27],[.18,-.05,.44],[.37,.08,.31],[.58,-.06,.53],[.77,.19,.36],[1,.43,0]]},
  {name:'태양을 가르는 검',guard:'crescent',crystals:7,profile:[[0,0,.26],[.2,.03,.39],[.45,.15,.46],[.7,.39,.38],[.85,.59,.3],[1,.85,0]]},
  {name:'영겁의 사막·솔라 크라운',guard:'crown',crystals:8,profile:[[0,0,.28],[.17,0,.4],[.32,0,.57],[.46,0,.31],[.66,0,.51],[.81,0,.3],[.92,0,.39],[1,0,0]]}
];

export function buildDesertSword(group,level,firstPerson=false){
  const rank=level-101;
  const design=DESERT_SWORDS[rank];
  const model=new THREE.Group();
  model.name=design.name;
  model.scale.setScalar(firstPerson?.7:1);
  group.add(model);
  const length=1.96+rank*.023;
  const metal=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.075,.24,.5+rank*.009),metalness:.72,roughness:.24});
  const gold=new THREE.MeshStandardMaterial({color:rank>=14?0xffd16b:0xc29b50,metalness:.65,roughness:.3});
  const stone=new THREE.MeshStandardMaterial({color:0xffaf60,emissive:rank>=16?0xd85525:0x94351a,emissiveIntensity:.2+rank*.018,roughness:.23});
  const grip=new THREE.MeshStandardMaterial({color:0x4d2c23,roughness:.9});
  const stations=design.profile.map(([y,x,w])=>[.43+y*length,x,w]);
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
  add(new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelThickness:.02,bevelSize:.025,bevelSegments:1,steps:1}),[metal,gold],0,0,-.045);
  if(design.guard==='twin'){
    const twin=add(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),stone,.25,0,0);
    twin.scale.x=.47;
    twin.rotation.z=-.21;
  }
  add(new THREE.CylinderGeometry(.092,.08,.55,10),grip,0,.085);
  for(let i=0;i<6;i++)add(new THREE.TorusGeometry(.091,.012,5,12),gold,0,-.13+i*.078).rotation.x=Math.PI/2;
  add(new THREE.OctahedronGeometry(.12+rank*.002),stone,0,-.27);
  if(firstPerson)add(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:0xe7be91}),0,-.15).scale.y=1.2;
  const span=.39+rank*.01;
  add(new THREE.BoxGeometry(span*2,.11,.16),gold,0,.4);
  const angles={bar:1.57,swept:.7,fork:-.4,fang:-.9,pincers:.3,crescent:1.15,twin:.55,sun:1.35,serpent:-.6,crown:-.35};
  for(const side of [-1,1]){
    const guard=add(new THREE.ConeGeometry(.11,span,6),gold,side*span,.5);
    guard.rotation.z=side*angles[design.guard];
    if(['fang','pincers','serpent'].includes(design.guard)){
      const claw=add(new THREE.ConeGeometry(.07,.43,5),stone,side*(span+.1),.75);
      claw.rotation.z=side*.45;
    }
    if(design.guard==='crown'){
      for(let i=0;i<3;i++){
        const spike=add(new THREE.ConeGeometry(.065,.36+i*.13,4),gold,side*(span+i*.1),.67+i*.04);
        spike.rotation.z=-side*(.25+i*.22);
      }
    }
  }
  if(design.guard==='crescent')add(new THREE.TorusGeometry(span,.05,6,28,Math.PI),gold,0,.48).rotation.z=Math.PI;
  if(design.guard==='sun'||rank>=19){
    add(new THREE.TorusGeometry(.2+rank*.001,.025,6,28),stone,0,.48,-.11);
    if(design.guard==='sun')for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      const ray=add(new THREE.ConeGeometry(.035,.16,4),gold,Math.sin(angle)*.28,.48+Math.cos(angle)*.28,-.11);
      ray.rotation.z=-angle;
    }
  }
  for(let i=0;i<design.crystals;i++){
    const y=.57+length*.76*(i+1)/(design.crystals+1);
    const next=stations.findIndex(([height])=>height>=y);
    const [lowY,lowX]=stations[next-1], [highY,highX]=stations[next];
    const x=THREE.MathUtils.lerp(lowX,highX,(y-lowY)/(highY-lowY));
    for(const side of [-1,1]){
      const crystal=add(new THREE.OctahedronGeometry(.075+rank*.001),stone,x,y,side*.07);
      crystal.scale.set(.8,1.4,.35);
    }
  }
  if(level===125){
    for(const side of [-1,1]){
      const wing=add(new THREE.ConeGeometry(.13,.83,4),gold,side*.47,1.02);
      wing.rotation.z=-side*.23;
    }
    add(new THREE.IcosahedronGeometry(.19,1),stone,0,.48,-.15);
  }
}
