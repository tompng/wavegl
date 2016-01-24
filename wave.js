function WaveSimulator(size, renderer) {
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
  var maxStore = 128;
  var store = {
    target: createRenderTarget(2,2*maxStore,{type:THREE.UnsignedByteType}),
    array: new Uint8Array(2*2*maxStore*4),
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
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: option.format||THREE.RGBAFormat,
      type: option.type||THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    });
  }
  var disturbShader = WaveSimulator.disturbShader(size);
  var showShader = WaveSimulator.showShader(size);
  var waveShader = WaveSimulator.waveShader(size);
  this.disturb = function(option){
    mesh.material = disturbShader;
    for(name in option){
      disturbShader.uniforms[name].value = option[name]
    }
    disturbShader.uniforms.texture.value = wave1;
    renderer.render(scene, camera, wave0);
    this.wave = wave0;
    wave0 = wave1;
    wave1 = this.wave;
  }
  this.disturb({center:new THREE.Vector2(0,0),radius:1,scale:new THREE.Vector4(0,0,0,0),value:new THREE.Vector4(0,0,0,0),overwrite:0})
  this.show = function(){
    mesh.material = showShader;
    showShader.uniforms.texture.value = this.wave;
    showShader.uniforms.time.value = performance.now()/1000;
    renderer.render(scene, camera);
  }
  this.storeLoad = function(){
    if(store.index){
      gl.bindFramebuffer(gl.FRAMEBUFFER, store.target.__webglFramebuffer, true);
      gl.bindFramebuffer(gl.FRAMEBUFFER,store.target.__webglFramebuffer,true);
      gl.readPixels(0, 0, 2, 2*store.index, gl.RGBA, gl.UNSIGNED_BYTE, store.array);
    }
    store.meshes.forEach(function(m){m.visible=false;})
    store.captured = {};
    for(var id in store.positions){
      var index = store.positions[id];
      var arr=[]
      for(var i=0;i<16;i++)arr[i]=store.array[16*index+i]/0xff;
      store.captured[id] = arr;
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
    mesh.material = waveShader;
    waveShader.uniforms.wave.value = wave0;
    renderer.render(scene, camera, wave1);
  }
}
WaveSimulator.shaderCode = function(func, name){
  var code = func.toString();
  var start=code.indexOf('/*'+name);
  var end=code.indexOf('*/',start);
  if(start<0||end<0)throw 'no shader '+name+' found';
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
WaveSimulator.showShader = function(size){
  return new THREE.ShaderMaterial({
    uniforms: {texture: {type: "t"},time: {type: 'f'}},
    defines: {SIZE: size.toFixed(2)},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*VERT
  void main(){gl_Position=vec4(position,1);}
  */
  /*FRAG
  uniform sampler2D texture;
  uniform float time;
  void main(){
    vec4 uvha = texture2D(texture, gl_FragCoord.xy / SIZE);
    vec4 uvhx0 = texture2D(texture, gl_FragCoord.xy/SIZE-vec2(1,0)/SIZE);
    vec4 uvhx1 = texture2D(texture, gl_FragCoord.xy/SIZE+vec2(1,0)/SIZE);
    vec4 uvhy0 = texture2D(texture, gl_FragCoord.xy/SIZE-vec2(0,1)/SIZE);
    vec4 uvhy1 = texture2D(texture, gl_FragCoord.xy/SIZE+vec2(0,1)/SIZE);
    float dx=uvhx1.z-uvhx0.z+gl_FragCoord.x/SIZE/30.0;
    float dy=uvhy1.z-uvhy0.z+gl_FragCoord.y/SIZE/30.0;
    float dxt=dx-time*0.002,dyt=dy-time*0.001;
    float hoge=sin(200.*dxt)*sin(200.*dyt);
    float fuga=sin(130.*dxt+120.*dyt)*sin(120.*dxt-130.*dyt);
    float piyo=sin(60.*dxt+80.*dyt)*sin(80.*dxt-60.*dyt);
    float aaa=sin(410.*dx+780.*dy)*sin(780.*dx-410.*dy);
    aaa=aaa*aaa;aaa=aaa*aaa;
    float bbb=sin(530.*dx+770.*dy)*sin(770.*dx-530.*dy);
    bbb=bbb*bbb;bbb=bbb*bbb;
    float ccc=sin(750.*dx+490.*dy)*sin(490.*dx-750.*dy);
    ccc=ccc*ccc;ccc=ccc*ccc;
    float geso=aaa+bbb+ccc;geso=geso*geso;
    vec3 rgb=vec3(hoge,fuga,piyo);
    rgb=0.8*rgb*rgb*rgb*rgb*rgb*rgb+0.08*vec3(1,1,1)*geso;
    gl_FragColor.rgb = vec3(0,0,0.1)+(rgb+dot(rgb,vec3(1,1,1))*vec3(1,1,1))/2.0;
    //gl_FragColor.rgb=vec3((uvha.a-0.5)*10.0,1,1)*(0.5+(uvha.z-0.5)*2.0);
    float foo=uvha.a-0.5;
    gl_FragColor.rgb = gl_FragColor.rgb*(1.0-foo)+foo*foo*vec3(1,1,1);
    gl_FragColor.a = 1.0;
  }
  */
}

WaveSimulator.disturbShader = function(size){
  return new THREE.ShaderMaterial({
    uniforms: {
      radius: {type: 'f'},
      center: {type: 'v2'},
      scale: {type: 'v4'},
      value: {type: 'v4'},
      texture: {type: "t"},
      overwrite: {type: 'f'}
    },
    defines: {SIZE: size.toFixed(2)},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*VERT
  void main(){gl_Position=vec4(position,1);}
  */
  /*FRAG
  uniform float radius;
  uniform vec2 center;
  uniform vec4 scale, value;
  uniform sampler2D texture;
  uniform float overwrite;
  void main(){
    vec2 uv = gl_FragCoord.xy/SIZE;
    vec2 p = uv - center;
    float factor = 1.0/(1.0+(p.x*p.x+p.y*p.y)/(radius*radius));
    vec4 zero = vec4(0.5, 0.5, 0.5, 0.5);
    gl_FragColor = zero+scale*(texture2D(texture,uv)-zero)+value*factor;
    if(overwrite>0.0){
      factor = clamp((factor-0.5)*100.0,0.0,1.0);
      gl_FragColor = zero + (texture2D(texture,uv)-zero)*(vec4(1,1,1,1)-scale*factor)+value*factor;
      gl_FragColor = zero + (texture2D(texture,uv)-zero)*(1.0-factor*(1.0-scale))+value*factor;
    }
    gl_FragColor = clamp(gl_FragColor, vec4(0,0,0,0),vec4(1,1,1,1));
  }
  */
}

WaveSimulator.waveShader = function(size){
  return new THREE.ShaderMaterial({
    uniforms: {
      wave: {type: "t"}
    },
    defines: {SIZE: size.toFixed(2)},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG'),
    transparent: true,
    blending: THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.ZeroFactor
  });
  /*VERT
  void main(){gl_Position=vec4(position,1);}
  */
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

WaveSimulator.renderShader = function(size){
  return new THREE.ShaderMaterial({
    uniforms: {
      time: {type: "f"},
      size: {type: "f"},
      wave: {type: "t"},
      sky: {type: "t"},
      pattern: {type: "t"}
    },
    defines: {SIZE: size.toFixed(2)},
    vertexShader: WaveSimulator.shaderCode(arguments.callee, 'VERT'),
    fragmentShader: WaveSimulator.shaderCode(arguments.callee, 'FRAG')
  });
  /*VERT
  varying vec2 xyposition;
  varying vec2 pos;
  void main(){
    pos = position.xy;
    xyposition = (modelMatrix * vec4(position,1)).xy;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);
  }
  */
  /*FRAG
  varying vec2 xyposition, pos;
  uniform sampler2D wave, pattern, sky;
  uniform float size, time;
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
    vec2 ripple=
    +texture2D(pattern, 4.7*xyposition/size+time*vec2(0.22,0.0)).xy
    +texture2D(pattern, 4.3*xyposition/size+time*vec2(-0.1,0.2)).xy
    +texture2D(pattern, 4.1*xyposition/size+time*vec2(-0.1,-0.2)).xy
    -vec2(1.5,1.5);
    vec2 f=vec2(
      fetch(xyposition/size+dx).z-fetch(xyposition/size-dx).z,
      fetch(xyposition/size+dy).z-fetch(xyposition/size-dy).z
    )+ripple*0.015;
    gl_FragColor.rgb = texture2D(sky, 0.03*pos+vec2(0.5,0.5)+2.0*f).rgb;
    vec3 cdif=normalize(vec3(xyposition,0)-cameraPosition);
    vec3 norm=normalize(vec3(20.0*f,1));
    vec3 cn=cross(cdif,norm);
    gl_FragColor.rgb = gl_FragColor.rgb*(1.-1./(1.0+3.0*dot(cn,cn)));
    gl_FragColor.a = 1.0;
  }
  */
}
