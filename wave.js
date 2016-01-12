function WaveSimulator(width, renderer) {
  var camera = new THREE.Camera();
  var scene = new THREE.Scene();
  camera.position.z = 1;
  gl = renderer.getContext();
  if(!gl.getExtension( "OES_texture_float" )) {
    alert("No OES_texture_float support for float textures!");
  }
  var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2));
  scene.add(mesh);
  var wave0 = createRenderTarget(THREE.RGBAFormat);
  var wave1 = createRenderTarget(THREE.RGBAFormat);
  function createRenderTarget(type){
    return new THREE.WebGLRenderTarget(width, width, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: type,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    });
  }
  var disturbShader = WaveSimulator.disturbShader(width);
  var showShader = WaveSimulator.showShader(width);
  var waveShader = WaveSimulator.waveShader(width);
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
  this.calc = function(){
    this.wave = wave0;
    wave0 = wave1;
    wave1 = this.wave;
    mesh.material = waveShader;
    waveShader.uniforms.wave.value = wave0;
    renderer.render(scene, camera, wave1);
  }
  this.read = function(x,y,w,h){
    gl.bindFramebuffer(gl.FRAMEBUFFER,simulator.wave.__webglFramebuffer,true);
    var arr=new Float32Array(w*h*4)
    gl.readPixels(x,y,w,h,gl.RGBA,gl.FLOAT,arr);
    return arr;
  }
}
WaveSimulator.shaderCode = function(func, name){
  var code = func.toString();
  var start=code.indexOf('/*'+name);
  var end=code.indexOf('*/',start);
  if(start<0||end<0)throw 'no shader '+name+' found';
  return code.substring(start+name.length+2,end);
}
WaveSimulator.showShader = function(width){
  return new THREE.ShaderMaterial({
    uniforms: {texture: {type: "t"},time: {type: 'f'}},
    defines: {WIDTH: width.toFixed(2)},
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
    //vec4 uvha = texture2D(texture, gl_FragCoord.xy / WIDTH);
    vec4 uvhx0 = texture2D(texture, gl_FragCoord.xy/WIDTH-vec2(1,0)/WIDTH);
    vec4 uvhx1 = texture2D(texture, gl_FragCoord.xy/WIDTH+vec2(1,0)/WIDTH);
    vec4 uvhy0 = texture2D(texture, gl_FragCoord.xy/WIDTH-vec2(0,1)/WIDTH);
    vec4 uvhy1 = texture2D(texture, gl_FragCoord.xy/WIDTH+vec2(0,1)/WIDTH);
    float dx=uvhx1.z-uvhx0.z+gl_FragCoord.x/WIDTH/30.0;
    float dy=uvhy1.z-uvhy0.z+gl_FragCoord.y/WIDTH/30.0;
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
    gl_FragColor.a = 1.0;
  }
  */
}

WaveSimulator.disturbShader = function(width){
  return new THREE.ShaderMaterial({
    uniforms: {
      radius: {type: 'f'},
      center: {type: 'v2'},
      scale: {type: 'v4'},
      value: {type: 'v4'},
      texture: {type: "t"},
      overwrite: {type: 'f'}
    },
    defines: {WIDTH: width.toFixed(2)},
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
    vec2 uv = gl_FragCoord.xy/WIDTH;
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

WaveSimulator.waveShader = function(width){
  return new THREE.ShaderMaterial({
    uniforms: {
      wave: {type: "t"}
    },
    defines: {WIDTH: width.toFixed(2)},
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
  const vec2 dx = vec2(1.0/WIDTH, 0);
  const vec2 dy = vec2(0, 1.0/WIDTH);
  vec4 fetch(vec2 uv){
    vec2 p = WIDTH*uv;
    vec2 ip = floor(p);
    vec2 d=p-ip;
    return texture2D(wave, ip/WIDTH)*(1.0-d.x)*(1.0-d.y)+
    texture2D(wave, ip/WIDTH+dx)*d.x*(1.0-d.y)+
    texture2D(wave, ip/WIDTH+dy)*(1.0-d.x)*d.y+
    texture2D(wave, ip/WIDTH+dx+dy)*d.x*d.y;
  }
  void main(){
    vec2 coord = gl_FragCoord.xy/WIDTH;
    coord = coord + (texture2D(wave,coord).xy-vec2(0.5,0.5))/WIDTH-(dx+dy)/2.0;
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
