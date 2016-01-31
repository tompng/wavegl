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
Particle.System = function(scene){
  var geometries = {};
  this.prepareGeometry = function(n){
    var geom = geometries[n];
    if(!geom){
      geom = Particle.geometry(n);
      geometries[n] = geom;
    }
    return geom;
  }
  var windowSize = 800;
  var particles=[];
  this.fire = function(num, position, time, material){
    var geom = this.prepareGeometry(num);
    var mesh = new THREE.PointCloud(geom, material.clone());
    mesh.renderOrder = 2;
    mesh.position.x = position.x;
    mesh.position.y = position.y;
    mesh.position.z = position.z;
    mesh.material.uniforms.time.value = 0;
    mesh.material.uniforms.windowSize.value = windowSize;
    scene.add(mesh);
    particles.push({
      mesh: mesh,
      time: performance.now()/1000,
      duration: time
    });
  }
  this.update = function(winsize){
    windowSize = winsize;
    var lives = [];
    var deads = [];
    var time=performance.now()/1000;
    particles.forEach(function(p){
      var t = (time-p.time)/p.duration;
      if(t>1){
        deads.push(p);
        return;
      }
      p.mesh.material.uniforms.time.value = t;
      p.mesh.material.uniforms.windowSize.value = windowSize;
      lives.push(p);
    })
    particles = lives;
    deads.forEach(function(p){
      scene.remove(p.mesh);
      p.mesh.material.dispose();
    })
  }
}


Particle.materialBase=function(func, uni){
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
    uniform float maxSize, time, windowSize;
    varying vec3 color;
  */
  /*VAR
    vec3 pos;
    float size;
  */
  /*CODE
    vec3 gpos = (modelMatrix*vec4(pos, 1)).xyz;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(pos, 1);
    float psize = windowSize*size/length(gpos - cameraPosition);
    gl_PointSize = clamp(psize, 1.0, maxSize);
    color = color*psize/gl_PointSize;
  */
}


Particle.vortexMaterial=Particle.materialBase(function(){/*
  float theta = 16.0*(2.0*time-time*time)+0.5*position.x*min(4.0*time,1.0);
  size = 0.5;
  pos = 2.0*time*time*(3.0-2.0*time)*vec3(cos(theta),sin(theta),6.0*time+0.5*sin(3.0*theta)*(1.0-time)-0.5*time*sin(2.0*theta))+(0.2+time)*normal*0.4;
  color = 4.0*time*(1.0-time)*(1.0-time)*vec3(0.5,0.4,0.3);
*/});

Particle.rippleMaterial=Particle.materialBase(function(){/*
  float theta = 1000.0*position.x+0.02*sin(4.0*position.y*time);
  size = 0.5;
  pos = vec3(vec2(cos(theta),sin(theta))*(0.5+4.0*time+0.4*position.z*time+0.4*position.x*(1.0-time)), 0.5+0.05*normal.z);
  color = 2.0*time*(1.0-time)*(1.0-time)*vec3(1.0,0.8,0.6);
*/});

Particle.divergenceMaterial=Particle.materialBase(function(){/*
  float phase = (1000.0*position.x+time);
  phase = phase - floor(phase);
  size = 0.5;
  pos = 1.0*normalize(normal)*phase+vec3(0,0,1);
  color = phase*phase*(1.0-phase)*vec3(1.0,0.8,0.6);
*/});

Particle.starMaterial=Particle.materialBase(function(){/*
  float theta = 1000.0*position.x;
  size = 1.0;
  pos = vec3(4.0*time*vec2(cos(theta),sin(theta))*(1.0+0.2*sin(5.0*theta)),0.5)+0.2*normal;
  color = 4.0*time*time*(1.0-time)*(1.0-time)*vec3(1.0,0.8,0.6);
*/});

Particle.navigateMaterial=Particle.materialBase(function(){
/*DEF
  uniform vec3 dst;
*/
/*CODE
  float t = 1000.0*position.x+time;
  t = t-floor(t);
  size = 1.0;
  pos = t*dst+0.25*position*t*(1.0-t)+0.25*t*t*normal;
  color = 0.02*t*vec3(1.0,0.8,0.6);
*/}, {dst: {type: 'v3'}});
