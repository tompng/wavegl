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

Particle.shaderBase=function(func, uni){
  var uniforms = {
    windowSize: {type: 'f', value: 800},
    maxSize: {type: 'f', value: 20},
    time: {type: 'f', value: 0}
  };
  for(key in uni)uniforms[key]=uni[key];
  var code=[
    WaveSimulator.shaderCode(arguments.callee, 'DEF'),
    WaveSimulator.shaderCode(func, 'DEF', true),
    'void main(){',
    WaveSimulator.shaderCode(arguments.callee, 'VAR'),
    WaveSimulator.shaderCode(func, 'CODE', true) || WaveSimulator.shaderCode(func, ''),
    WaveSimulator.shaderCode(arguments.callee, 'CODE'),
    '}'
  ].join('');
  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: code,
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  /*FRAG
    varying vec3 color;
    void main(){
      gl_FragColor=vec4(sin(123456.0*gl_FragCoord.xy),color.b,1);
      vec2 coord = 2.0*gl_PointCoord.xy-vec2(1,1);
      float r2 = dot(coord,coord);
      gl_FragColor=vec4(color*max(1.0-r2,0.0),1);
    }
  */
  /*DEF
    uniform float maxSize, time;
    varying vec3 color;
  */
  /*VAR
    vec3 pos;
    float size;
  */
  /*CODE
    vec3 gpos = (modelMatrix*vec4(pos, 1)).xyz;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(pos, 1);
    float psize = 100.0*size/length(gpos - cameraPosition);
    gl_PointSize = clamp(psize, 1.0, maxSize);
    color = color*psize/gl_PointSize;
  */
}


Particle.vortexShader=function(){
  return Particle.shaderBase(function(){/*
    float theta = time*16.0+0.5*position.x*min(4.0*time,1.0);
    size=6.0*time*(1.0-time)*(1.0-time);
    pos = 4.0*time*time*(3.0-2.0*time)*vec3(cos(theta),sin(theta),1.0-cos(3.0*theta)*(1.0-time)+time*sin(2.0*theta))+(0.2+time)*normal*0.4;
    color = vec3(0.5,0.4,0.3);
  */});
}

Particle.rippleShader=function(){
  return Particle.shaderBase(function(){/*
    float theta = 1000.0*position.x+0.02*sin(4.0*position.y*time);
    size=2.0;
    pos = vec3(vec2(cos(theta),sin(theta))*(0.5+4.0*time+0.4*position.z*time+0.4*position.x*(1.0-time)), 0.1+0.05*normal.z);
    color = time*time*(1.0-time)*vec3(1.0,0.8,0.6);
  */});
}

Particle.divergenceShader=function(){
  return Particle.shaderBase(function(){/*
    float phase = (1000.0*position.x+2.0*time);
    phase = phase - floor(phase);
    size=2.0;
    pos = 1.0*normalize(normal)*phase+vec3(0,0,1);
    color = phase*phase*(1.0-phase)*vec3(1.0,0.8,0.6);
  */});
}
