var Particle = {};
Particle.geometry = function(num){
  var geometry = new THREE.BufferGeometry();
  var varr = new Float32Array(num*3);
  var narr = new Float32Array(num*3);
  for(var i=0;i<3*num;i++){
    varr[i]=gaussRandom();
    narr[i]=gaussRandom();
  }
  geometry.addAttribute('position', new THREE.BufferAttribute(varr, 3));
  geometry.addAttribute('normal', new THREE.BufferAttribute(narr, 3));
  return geometry;
}
Particle.fragmentShader = WaveSimulator.shaderCode(function(){/*
  varying vec3 color;
  void main(){
    gl_FragColor=vec4(sin(123456.0*gl_FragCoord.xy),color.b,1);
    vec2 coord = 2.0*gl_PointCoord.xy-vec2(1,1);
    float r2 = dot(coord,coord);
    gl_FragColor=vec4(color*max(1.0-r2,0.0),1);
  }
*/})

Particle.vortexShader=function(){
  return new THREE.ShaderMaterial({
    uniforms: {
      maxSize: {type: "f", value: 20},
      time: {type: "f", value: 0.5}
    },
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: Particle.fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  /*VERT
  uniform float maxSize, time;
  varying vec3 color;
  void main(){
    float theta = time*16.0+0.5*position.x*min(4.0*time,1.0);
    float size=6.0*time*(1.0-time)*(1.0-time);
    vec3 pos = 4.0*time*time*(3.0-2.0*time)*vec3(cos(theta),sin(theta),1.0-cos(3.0*theta)*(1.0-time)+time*sin(2.0*theta))+(0.2+time)*normal*0.4;
    vec3 gpos = (modelMatrix*vec4(pos, 1)).xyz;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(pos, 1);
    float psize = 100.0*size/length(gpos - cameraPosition);
    gl_PointSize = clamp(psize, 1.0, maxSize);
    color = vec3(0.5,0.4,0.3)*psize/max(psize,2.0);
  }
  */
}

Particle.rippleShader=function(){
  return new THREE.ShaderMaterial({
    uniforms: {
      maxSize: {type: "f", value: 20},
      time: {type: "f", value: 0.5}
    },
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: Particle.fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  /*VERT
  uniform float maxSize, time;
  varying vec3 color;
  void main(){
    float theta = 1000.0*position.x+0.02*sin(4.0*position.y*time);
    float size=2.0;
    vec3 pos = vec3(vec2(cos(theta),sin(theta))*(0.5+4.0*time+0.4*position.z*time+0.4*position.x*(1.0-time)), 0.1+0.05*normal.z);
    vec3 gpos = (modelMatrix*vec4(pos, 1)).xyz;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(pos, 1);
    float psize = 100.0*size/length(gpos - cameraPosition);
    gl_PointSize = clamp(psize, 1.0, maxSize);
    color = time*time*(1.0-time)*vec3(1.0,0.8,0.6)*psize/max(psize,2.0);
  }
  */
}
