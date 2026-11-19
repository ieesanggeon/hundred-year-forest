import * as THREE from 'three';

const surfaceFunctions=/* glsl */`
varying vec3 castleWorldPoint;
varying vec3 castleWorldNormal;
float castleHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float castleNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(castleHash(i),castleHash(i+vec2(1.,0.)),f.x),mix(castleHash(i+vec2(0.,1.)),castleHash(i+vec2(1.,1.)),f.x),f.y);
}
vec2 castleBrick(vec2 point,vec2 size){
  vec2 uv=point/size;float row=floor(uv.y);uv.x+=mod(row,2.)*.5;
  vec2 cell=floor(uv),f=fract(uv),edge=min(f,1.-f)*size;
  float seam=min(edge.x,edge.y),aa=max(fwidth(seam)*.7,.008);
  float bevel=smoothstep(.035-aa,.12+aa,seam);
  float grain=castleNoise(point*8.2),block=castleHash(cell);
  float scar=1.-smoothstep(.015,.045,abs(sin(point.x*1.8+castleNoise(point*.75)*4.)));
  float shade=mix(.36,.83+block*.3,bevel)*( .93+grain*.12)-scar*.035;
  return vec2(shade,bevel*.12+grain*.018+block*.012);
}
vec2 castleStoneSurface(vec3 p,vec3 n,vec2 size){
  vec3 weight=pow(abs(normalize(n)),vec3(8.));weight/=max(.001,weight.x+weight.y+weight.z);
  return castleBrick(p.zy,size)*weight.x+castleBrick(p.xz,size)*weight.y+castleBrick(p.xy,size)*weight.z;
}
vec2 castleRockSurface(vec3 p){
  vec2 q=vec2(p.x*.14+p.z*.19,p.y*.26+p.z*.06);
  float broad=castleNoise(q),middle=castleNoise(q*3.6),grain=castleNoise(q*29.);
  vec2 cell=floor(q),local=fract(q);float first=8.,second=8.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 offset=vec2(float(x),float(y));
    vec2 feature=.1+.8*vec2(castleHash(cell+offset),castleHash(cell+offset+vec2(73.7,19.3)));
    float distance=length(offset+feature-local);
    if(distance<first){second=first;first=distance;}else second=min(second,distance);
  }
  float crack=1.-smoothstep(.025,.085,second-first);
  float strata=sin(p.y*.72+broad*.8+middle*.3)*.5+.5;
  float shade=.68+broad*.18+middle*.14+grain*.08+strata*.08-crack*.15;
  return vec2(shade,broad*.16+middle*.11+grain*.055+strata*.035-crack*.05);
}
vec3 castleRelief(vec3 position,vec3 surfaceNormal,float height,float face){
  vec3 sx=normalize(dFdx(position)),sy=normalize(dFdy(position));
  vec3 r1=cross(sy,surfaceNormal),r2=cross(surfaceNormal,sx);
  float determinant=dot(sx,r1)*face;
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(abs(determinant)*surfaceNormal-gradient);
}
`;

// World-space patterns keep individual bricks the same size on every instance.
function texturedMaterial(color,kind,options={}){
  const material=new THREE.MeshStandardMaterial({color,roughness:.96,...options});
  material.userData.castleSurface=kind;
  material.customProgramCacheKey=()=>`castle-surface-${kind}-1`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 castleWorldPoint;varying vec3 castleWorldNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',
      '#include <defaultnormal_vertex>\ncastleWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 castleLocal=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        castleLocal=instanceMatrix*castleLocal;
      #endif
      castleWorldPoint=(modelMatrix*castleLocal).xyz;`);
    const sample=kind==='rock'?'castleRockSurface(castleWorldPoint)':
      kind==='paving'?'castleStoneSurface(castleWorldPoint,castleWorldNormal,vec2(2.4,1.5))':
      kind==='trim'?'castleStoneSurface(castleWorldPoint,castleWorldNormal,vec2(2.8,.65))':
      'castleStoneSurface(castleWorldPoint,castleWorldNormal,vec2(2.1,.85))';
    shader.fragmentShader=surfaceFunctions+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>\nvec2 castleSurface=${sample};diffuseColor.rgb*=castleSurface.x;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nnormal=castleRelief(-vViewPosition,normal,castleSurface.y,faceDirection);');
  };
  return material;
}

export function createCastleMaterials(){
  return {
    stone:texturedMaterial(0x64616b,'brick'),
    trim:texturedMaterial(0x918b98,'trim'),
    dark:new THREE.MeshStandardMaterial({color:0x201b28,roughness:.9}),
    rock:texturedMaterial(0x615867,'rock'),
    cliff:texturedMaterial(0xc4bdcb,'rock',{vertexColors:true,flatShading:true,side:THREE.DoubleSide}),
    roof:new THREE.MeshStandardMaterial({color:0x1e172e,roughness:.65}),
    floors:texturedMaterial(0x716979,'paving')
  };
}
