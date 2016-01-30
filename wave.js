function WaveSimulator(size, renderer, pattern) {
  var camera = new THREE.Camera();
  var scene = new THREE.Scene();
  camera.position.z = 1;
  gl = renderer.getContext();
  if(!gl.getExtension( "OES_texture_float" )) {
    alert("No OES_texture_float support for float textures!");
  }
  var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2));
  scene.add(mesh);
  var wave0 = createRenderTarget(size,size);
  var wave1 = createRenderTarget(size,size);
  this.waveNormal = createRenderTarget(size,size,{type:THREE.UnsignedByteType,filter:THREE.LinearFilter});
  var normalShader = WaveSimulator.normalShader(size, pattern);
  var maxStore = 128;
  var store = {
    target: createRenderTarget(1,maxStore,{type:THREE.UnsignedByteType}),
    array: new Uint8Array(maxStore*4),
    position: {},
    index: 0,
    max: maxStore
  }
  store.scene = new THREE.Scene();
  store.meshes = [];
  store.shader = WaveSimulator.storeShader();
  store.shader.uniforms.size.value = size;
  store.shader.uniforms.height.value = store.max;
  for(var i=0;i<maxStore;i++){
    var smesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2));
    smesh.material = store.shader;
    store.meshes.push(smesh);
    store.scene.add(smesh);
  }
  function createRenderTarget(w,h,option){
    option=option||{};
    return new THREE.WebGLRenderTarget(w, h, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: option.filter || THREE.NearestFilter,
      magFilter: option.filter || THREE.NearestFilter,
      format: option.format||THREE.RGBAFormat,
      type: option.type||THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    });
  }
  var waveShader = WaveSimulator.waveShader(size);
  var initShader = WaveSimulator.initShader();
  this.init = function(){
    mesh.material = initShader;
    renderer.render(scene, camera, wave0);
    renderer.render(scene, camera, wave1);
  }
  this.init();
  this.storeLoad = function(){
    if(store.index){
      gl.bindFramebuffer(gl.FRAMEBUFFER, store.target.__webglFramebuffer, true);
      gl.bindFramebuffer(gl.FRAMEBUFFER,store.target.__webglFramebuffer,true);
      gl.readPixels(0, 0, 1, store.index, gl.RGBA, gl.UNSIGNED_BYTE, store.array);
    }
    store.meshes.forEach(function(m){m.visible=false;})
    store.captured = {};
    for(var id in store.positions){
      var index = store.positions[id];
      var arr=[]
      for(var i=0;i<4;i++)arr[i]=store.array[4*index+i]/0xff;
      store.captured[id] = {vx: 2*arr[0]-1, vy: 2*arr[1]-1, h: 2.0*arr[2]-1, a: arr[3]};
    }
    window.store=store;
    store.index = 0;
    store.positions = {};
  }
  this.readStoredPixel = function(id){
    return store.captured[id];
  }
  this.storePixel = function(id,x,y){
    if(store.index==store.max)return;
    store.positions[id]=store.index;
    var mesh = store.meshes[store.index];
    mesh.position.x = x/size;
    mesh.position.y = y/size;
    mesh.position.z = store.index/store.max;
    mesh.visible = true;
    store.index++;
  }
  this.storeDone = function(){
    store.shader.uniforms.texture.value = this.wave;
    renderer.render(store.scene, camera, store.target);
  }
  this.calc = function(){
    this.wave = wave0;
    wave0 = wave1;
    wave1 = this.wave;

    mesh.material = normalShader;
    normalShader.uniforms.wave.value = wave1;
    if(pattern)normalShader.uniforms.time.value = performance.now()/1000;
    renderer.render(scene, camera, this.waveNormal);

    mesh.material = waveShader;
    waveShader.uniforms.wave.value = wave0;
    renderer.render(scene, camera, wave1);
  }
}
WaveSimulator.shaderCode = function(func, name, ignore){
  var code = func.toString();
  if(!name)name='';
  var start=code.indexOf('/*'+name);
  var end=code.indexOf('*/',start);
  if(start<0||end<0){
    if(ignore)return;
    throw 'no shader '+name+' found';
  }
  return code.substring(start+name.length+2,end);
}
WaveSimulator.storeShader = function(){
  return new THREE.ShaderMaterial({
    uniforms: {
      texture: {type: "t"},
      size: {type: 'f'},
      height: {type: 'f'},
    },
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*VERT
  uniform float size, height;
  varying vec2 vsrc;
  void main(){
    vec4 xyiw = modelMatrix*vec4(0,0,0,1);
    vsrc=xyiw.xy+position.xy/size;
    gl_Position=vec4(
      position.x,
      2.0*xyiw.z-1.0+(position.y+1.0)/height,
      0,
      1
    );
  }
  */
  /*FRAG
  uniform sampler2D texture;
  varying vec2 vsrc;
  void main(){gl_FragColor=texture2D(texture,vsrc);}
  */
}
WaveSimulator.vertexShaderCode = 'void main(){gl_Position=vec4(position,1);}';
WaveSimulator.initShader = function(){
  return new THREE.ShaderMaterial({
    vertexShader: WaveSimulator.vertexShaderCode,
    fragmentShader: 'void main(){gl_FragColor = vec4(0.5,0.5,0.5,0);}',
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
}
WaveSimulator.waveShader = function(size){
  return new THREE.ShaderMaterial({
    uniforms: {wave: {type: "t"}},
    defines: {SIZE: size.toFixed(2)},
    vertexShader: WaveSimulator.vertexShaderCode,
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*FRAG
  uniform sampler2D wave;
  const vec2 dx = vec2(1.0/SIZE, 0);
  const vec2 dy = vec2(0, 1.0/SIZE);
  vec4 fetch(vec2 uv){
    vec2 p = SIZE*uv;
    vec2 ip = floor(p);
    vec2 d=p-ip;
    return texture2D(wave, ip/SIZE)*(1.0-d.x)*(1.0-d.y)+
    texture2D(wave, ip/SIZE+dx)*d.x*(1.0-d.y)+
    texture2D(wave, ip/SIZE+dy)*(1.0-d.x)*d.y+
    texture2D(wave, ip/SIZE+dx+dy)*d.x*d.y;
  }
  void main(){
    vec2 coord = gl_FragCoord.xy/SIZE;
    coord = coord + (texture2D(wave,coord).xy-vec2(0.5,0.5))/SIZE-(dx+dy)/2.0;
    vec4 uvh = fetch(coord);
    vec4 uvhx0 = fetch(coord-dx);
    vec4 uvhx1 = fetch(coord+dx);
    vec4 uvhy0 = fetch(coord-dy);
    vec4 uvhy1 = fetch(coord+dy);
    vec4 uvhdx = (uvhx1-uvhx0);
    vec4 uvhdy = (uvhy1-uvhy0);
    vec4 diff = vec4(
      4.0*uvhdx.z,
      4.0*uvhdy.z,
      (uvhdx.x+uvhdy.y)/4.0,
      0
    );
    vec4 av = (uvhx0+uvhx1+uvhy0+uvhy1)/4.0;
    vec4 outvec = 0.7*uvh+0.3*av + 0.2*diff;
    outvec.a = uvh.a;
    gl_FragColor = clamp(0.5+(outvec-0.5)*0.9999, vec4(0,0,0,0), vec4(1,1,1,1));
  }
  */
}

WaveSimulator.normalShader = function(size, pattern){
  var uniforms = {wave: {type: 't'}};
  var defines = {SIZE: size.toFixed(2)};
  if(pattern){
    uniforms.pattern = {type: 't', value: pattern};
    uniforms.time = {type: 'f'};
    defines.PATTERN = '1';
  }
  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    defines: defines,
    vertexShader: WaveSimulator.vertexShaderCode,
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*FRAG
  const vec2 dx = vec2(1.0/SIZE, 0);
  const vec2 dy = vec2(0, 1.0/SIZE);
  uniform sampler2D wave;
  #ifdef PATTERN
  uniform float time;
  uniform sampler2D pattern;
  #endif
  void main(){
    vec2 coord = gl_FragCoord.xy/SIZE;
    vec2 hax0 = texture2D(wave,coord-dx).zw;
    vec2 hax1 = texture2D(wave,coord+dx).zw;
    vec2 hay0 = texture2D(wave,coord-dy).zw;
    vec2 hay1 = texture2D(wave,coord+dy).zw;
    vec2 norm = 32.0*vec2(hax1.x-hax0.x,hay1.x-hay0.x);
    #ifdef PATTERN
    norm = norm+
      0.25*(+texture2D(pattern, 3.0*coord+time*vec2(0.22,0.0)).xy
      +texture2D(pattern, 3.0*coord+time*vec2(-0.1,0.2)).yz
      +texture2D(pattern, 3.0*coord+time*vec2(-0.1,-0.2)).zx
      -vec2(1.5,1.5));
    #endif
    gl_FragColor = vec4(vec2(0.5,0.5)+norm, 0.25*(hax0+hax1+hay0+hay1));
  }
  */
}

WaveSimulator.waveMultShader = function(){
  return new THREE.ShaderMaterial({
    uniforms: {value: {type: 'v4'}},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    depthTest: false,
    blending: THREE.MultiplyBlending,
  });
  /*VERT
  void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}
  */
  /*FRAG
  uniform vec4 value;
  void main(){gl_FragColor=value;}
  */
}
WaveSimulator.waveAddShader = function(){
  return new THREE.ShaderMaterial({
    uniforms: {value: {type: 'v4'}},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  /*VERT
  void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}
  */
  /*FRAG
  uniform vec4 value;
  void main(){gl_FragColor=value;}
  */
}
