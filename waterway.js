var Waterway={};
Waterway.randfunc = function(x,y){
  var rnd=Math.sin(1234567*x)+Math.sin(987654*y);
  return (54321+12345*rnd)%1;
}
Waterway.genWaterWay=function(rectX,rectY,rectW,rectH){
  if(!rectW){rectW=rectH=rectX;rectX=rectY=0;}
  var arr=[];
  var offset=2;
  for(var i=0;i<rectW+2*offset;i++){
    arr[i]=[];
    for(var j=0;j<rectH+2*offset;j++){
      var ix=rectX+i-offset,iy=rectY+j-offset;
      arr[i][j]={
        x:ix+0.2+0.6*Waterway.randfunc(ix+0.5,iy),
        y:iy+0.2+0.6*Waterway.randfunc(ix,iy+0.5),
        tris: [],
        points: []
      }
    }
  }
  function triArea(a,b,c){
    var bx=b.x-a.x,by=b.y-a.y;
    var cx=c.x-a.x,cy=c.y-a.y;
    return (bx*cy-by*cx)/2;
  }
  var allTriangles=[];
  var allLines=[];
  var allPoints=[];
  function lineRandom(line){
    return Waterway.randfunc(line[0].x+line[1].x,line[0].y+line[1].y)<0.5;
  }

  for(var i=0;i<rectW+2*offset-1;i++){
    for(var j=0;j<rectH+2*offset-1;j++){
      var p00=arr[i+0][j+0];
      var p10=arr[i+1][j+0];
      var p01=arr[i+0][j+1];
      var p11=arr[i+1][j+1];
      var lines=[];
      lines.push([p00,p01]);
      lines.push([p00,p10]);
      var sa=triArea(p00,p10,p01);
      var sb=triArea(p11,p01,p10);
      var sc=triArea(p10,p11,p00);
      var sd=triArea(p01,p00,p11);
      var s=(sa+sb+sc+sd)/2;
      var tris;
      if(Math.abs(sa/s-0.5)>Math.abs(sc/s-0.5)){
        tris = [[p00,p10,p11],[p00,p11,p01]];
        lines.push([p00,p11]);
      }else{
        tris = [[p00,p10,p01],[p11,p01,p10]];
        lines.push([p10,p01]);
      }
      lines.forEach(function(l){
        allLines.push(l);
        l[0].points.push(l[1]);
        l[1].points.push(l[0]);
      })
      tris.forEach(function(tri){
        allTriangles.push(tri);
        tri.forEach(function(p){
          p.tris.push(tri);
        })
      });
    }
  }

  for(var i=1;i<rectW+2*offset-1;i++)for(var j=1;j<rectH+2*offset-1;j++)allPoints.push(arr[i][j]);
  allPoints.forEach(function(p){
    p.points.sort(function(a,b){
      return Math.atan2(a.x-p.x,a.y-p.y)-Math.atan2(b.x-p.x,b.y-p.y);
    });
  });
  var deadendTriangles = [];
  allPoints.forEach(function(p){
    if(p.points.length<=1)return;
    p.points.sort(function(a,b){
      return Math.atan2(a.x-p.x,a.y-p.y)-Math.atan2(b.x-p.x,b.y-p.y);
    });
    var sections = [[]];
    p.points.forEach(function(q){
      sections[sections.length-1].push(q);
      if(lineRandom([p,q]))sections.push([q]);
    })
    var first=sections[0];
    var last=sections[sections.length-1];
    if(first[0]!=last[last.length-1]){
      sections.pop();
      sections[0]=last.concat(first);
    }
    function triangleFor(a,b){
      for(var i=0;i<p.tris.length;i++){
        var t=p.tris[i];
        if(t.indexOf(a)>=0&&t.indexOf(b)>=0)return t;
      }
    }
    if(sections.length==1&&sections[0][0]==sections[0][sections[0].length-1]){
      var q=sections[0][0];
      var t1=triangleFor(q,sections[0][1]);
      var t2=triangleFor(q,sections[0][sections[0].length-2]);
      deadendTriangles.push({p:p,q:q,t1:t1,t2:t2});
    }
    if(sections.length==1)return;
    p.sections=sections;
    sections.forEach(function(sec){
      var a=sec[0],b=sec[sec.length-1];
      var da={x:a.x-p.x,y:a.y-p.y};
      var db={x:b.x-p.x,y:b.y-p.y};
      var ra=Math.sqrt(da.x*da.x+da.y*da.y);
      var rb=Math.sqrt(db.x*db.x+db.y*db.y);
      var cos=(da.x*db.x+da.y*db.y)/ra/rb;
      var sin=Math.sqrt(1-cos*cos);
      var len=0.1+0.1*Waterway.randfunc(a.x,b.y);
      var d={
        x:-len*(da.x/ra+db.x/rb)/sin,
        y:-len*(da.y/ra+db.y/rb)/sin
      }
      if(d.x*(a.y-p.y)-d.y*(a.x-p.x)>0)d.x=d.y=0;
      for(var i=0;i<sec.length-1;i++){
        var a=sec[i],b=sec[i+1];
        var t=triangleFor(a,b);
        var index = t.indexOf(p);
        t.moves=t.moves||[];
        t.moves[index] = d;
      }
    })
  })
  deadendTriangles.forEach(function(t){
    var m1=(t.t1.moves&&t.t1.moves[t.t1.indexOf(t.q)])||{x:0,y:0};
    var m2=(t.t2.moves&&t.t2.moves[t.t2.indexOf(t.q)])||{x:0,y:0};
    var tri=[
      t.p,
      {x:t.q.x-m1.x,y:t.q.y-m1.y},
      {x:t.q.x-m2.x,y:t.q.y-m2.y}
    ]
    allTriangles.push(tri);
  })
  var triangles = [];
  allTriangles.forEach(function(t){
    for(var i=0;i<3;i++){
      var m=(t.moves&&t.moves[i])||{x:0,y:0};
      t[i]={x: t[i].x-m.x,y:t[i].y-m.y}
    }
    var x=(t[0].x+t[1].x+t[2].x)/3;
    var y=(t[0].y+t[1].y+t[2].y)/3;
    var area=(t[1].x-t[0].x)*(t[2].y-t[0].y)-(t[1].y-t[0].y)*(t[2].x-t[0].x);
    if(area<0.05&&t.moves&&t.moves[0]&&t.moves[1]&&t.moves[2])return;
    if(rectX<=x&&x<rectX+rectW&&rectY<=y&&y<rectY+rectH&&!Waterway.ocean(x,y))triangles.push(t);
  })
  var lines = [];
  allLines.forEach(function(l){
    var x=(l[0].x+l[1].x)/2,y=(l[0].y+l[1].y)/2;
    if(rectX<=x&&x<rectX+rectW&&rectY<=y&&y<rectY+rectH&&lineRandom(l)&&!Waterway.ocean(x,y))lines.push(l);
  });
  return {
    triangles: triangles,
    lines: lines
  }
}
Waterway.ocean=function(x,y){
  var h=Waterway.hotspot(x,y);
  var hx=h.x-x,hy=h.y-y;
  if(hx*hx+hy*hy<h.r*h.r)return true;
  var a=Math.cos(Math.sin(0.112*x+0.127*y)+Math.cos(0.137*x-0.119*y)+0.1*x);
  var b=Math.cos(Math.sin(0.223*x+0.131*y)+Math.cos(0.231*y-0.113*x)+0.1*y);
  return (a+b)*(a+b)<0.25;
}
Waterway.hotspotScale=20;
Waterway.hotspot=function(x,y){
  var scale=Waterway.hotspotScale;
  var ix=Math.floor(x/scale),iy=Math.floor(y/scale);
  return {
    x0: scale*ix,
    y0: scale*iy,
    scale: scale,
    x:scale*(ix+0.2+0.6*Waterway.randfunc(ix,iy+0.5)),
    y:scale*(iy+0.2+0.6*Waterway.randfunc(ix+0.5,iy)),
    r: 0.2*scale*0.5
  };
}
Waterway.nearestHotspot=function(x,y){
  var scale=Waterway.hotspotScale;
  var ix=Math.floor(x/scale),iy=Math.floor(y/scale);
  var hmin=null,hdist2=0;
  for(var jx=-1;jx<=1;jx++)for(var jy=-1;jy<=1;jy++){
    var h=Waterway.hotspot(scale*(ix+jx+0.5),scale*(iy+jy+0.5))
    var r2=(h.x-x)*(h.x-x)+(h.y-y)*(h.y-y);
    if(!hmin||r2<hdist2){hmin=h;hdist2=r2;}
  }
  return hmin;
}

function WaterwayChunk(i,j,n,scale,scene){
  this.i=i;
  this.j=j;
  this.n=n;
  this.scale=scale;
  var ways = Waterway.genWaterWay(i*n,j*n,n,n);
  var positions = [];
  var normals = [];
  var triangles = [];
  ways.triangles.forEach(function(triangle){
    triangles.push(triangle.map(function(p){
      return {x:p.x*scale,y:p.y*scale}
    }));
  });
  triangles.forEach(function(triangle){
    addPrismMesh(triangle.map(function(p){
      return {x:p.x,y:p.y,z:1+Waterway.randfunc(p.x,p.y)};
    }));
    for(var i=0;i<3;i++){
      var a=triangle[i],b=triangle[(i+1)%3];
      var d={x:b.x-a.x,y:b.y-a.y};
      var dr=Math.sqrt(d.x*d.x+d.y*d.y);
      d.x/=dr;d.y/=dr;
      for(var j=0;j<2;j++){
        var w=scale*(0.1+0.3*Math.random());
        var h=scale*(0.1+0.3*Math.random());
        var x=(dr-w)*Math.random();
        var y=scale*0.05*Math.random();
        var p00={x:a.x+d.x*x-d.y*y,y:a.y+d.y*x+d.x*y};
        var p10={x:a.x+d.x*(x+w)-d.y*y,y:a.y+d.y*(x+w)+d.x*y};
        var p01={x:a.x+d.x*x-d.y*(y+h),y:a.y+d.y*x+d.x*(y+h)};
        var p11={x:a.x+d.x*(x+w)-d.y*(y+h),y:a.y+d.y*(x+w)+d.x*(y+h)};
        if(triInside(triangle,p00)&&triInside(triangle,p01)&&triInside(triangle,p10)&&triInside(triangle,p11)){
          var h=4+8*Math.random();
          addPrismMesh([p00,p10,p11,p01],h,h+2*Math.random());
        }
      }
    }
  })
  function addPrismMesh(points,height,height2){
    var center={x:0,y:0,z:0};
    points.forEach(function(p){
      center.x+=p.x/points.length;
      center.y+=p.y/points.length;
      center.z+=(height2||p.z||height)/points.length;
    });
    for(var i=0;i<points.length;i++){
      var a=points[i],b=points[(i+1)%points.length];
      positions.push(
        a.x,a.y,a.z||height,
        b.x,b.y,b.z||height,
        center.x,center.y,center.z
      );
      var idx=positions.length-9;
      var va={x:a.x-center.x,y:a.y-center.y,z:(a.z||height)-(center.z||height)}
      var vb={x:b.x-center.x,y:b.y-center.y,z:(b.z||height)-(center.z||height)}
      var n={
        x:va.y*vb.z-va.z*vb.y,
        y:va.z*vb.x-va.x*vb.z,
        z:va.x*vb.y-va.y*vb.x,
      };
      var nr=Math.sqrt(n.x*n.x+n.y*n.y+n.z*n.z);
      for(var j=0;j<3;j++)normals.push(n.x/nr,n.y/nr,n.z/nr);
      positions.push(
        a.x,a.y,0,
        b.x,b.y,0,
        b.x,b.y,b.z||height,
        a.x,a.y,0,
        b.x,b.y,b.z||height,
        a.x,a.y,a.z||height
      );
      var lx=b.x-a.x,ly=b.y-a.y,lr=Math.sqrt(lx*lx+ly*ly);
      for(var j=0;j<6;j++)normals.push(ly/lr,-lx/lr,0);
    }
  }
  var varr = new Float32Array(positions);
  var narr = new Float32Array(normals);
  geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', new THREE.BufferAttribute(varr, 3));
  geometry.addAttribute('normal', new THREE.BufferAttribute(narr, 3));
  this.mesh = new THREE.Mesh(geometry);
  this.triangles = triangles;
  this.lines = ways.lines.map(function(l){
    return l.map(function(p){return {x: p.x*scale, y: p.y*scale}});
  });
  scene.add(this.mesh);

  var triarr=new Float32Array(triangles.length*9);
  for(var i=0;i<triangles.length;i++){
    var tri=triangles[i];
    for(var j=0;j<3;j++){
      var a=tri[j],b=tri[(j+1)%3],c=tri[(j+2)%3];
      var db={x:b.x-a.x,y:b.y-a.y},rb=Math.sqrt(db.x*db.x+db.y*db.y);
      var dc={x:c.x-a.x,y:c.y-a.y},rc=Math.sqrt(dc.x*dc.x+dc.y*dc.y);
      var cos=(db.x*dc.x+db.y*dc.y)/rb/rc;
      var sin=Math.sqrt(1-cos*cos);
      var reduce=0.2;
      triarr[9*i+3*j+0]=a.x+(db.x/rb+dc.x/rc)/sin*reduce;
      triarr[9*i+3*j+1]=a.y+(db.y/rb+dc.y/rc)/sin*reduce;
      triarr[9*i+3*j+2]=0;
    }
  }
  var trigeometry=new THREE.BufferGeometry();
  trigeometry.addAttribute('position', new THREE.BufferAttribute(triarr, 3));
  this.trimesh1 = new THREE.Mesh(trigeometry);
  this.trimesh1.visible=false;
  this.trimesh1.wall1=true;
  this.trimesh2 = new THREE.Mesh(trigeometry);
  this.trimesh2.visible=false;
  this.trimesh2.wall2=true;
  scene.add(this.trimesh1)
  scene.add(this.trimesh2);

  var itemGeometry = new THREE.BoxGeometry(1, 1, 1);
  var itemWaveGeometry = new THREE.CircleGeometry(0.25,16);
  this.items = [];
  for(var i=0;i<20;i++){
    var l=this.lines[Math.floor(this.lines.length*Math.random())];
    if(!l)continue;
    var item = new THREE.Mesh(itemGeometry);
    var wave1 = new THREE.Mesh(itemWaveGeometry);
    var wave2 = new THREE.Mesh(itemWaveGeometry);
    var t=Math.random();
    wave1.position.x=wave2.position.x=item.position.x=l[0].x*t+(1-t)*l[1].x;
    wave1.position.y=wave2.position.y=item.position.y=l[0].y*t+(1-t)*l[1].y;
    item.rotateX(Math.random());
    item.rotateY(Math.random());
    item.rotateZ(Math.random());
    item.item=true;
    wave1.wall1=true;wave2.wall2=true;
    wave1.visible=wave2.visible=false;
    item.wave1=wave1;item.wave2=wave2;
    scene.add(item);
    scene.add(wave1,wave2);
    this.items.push(item);
  }

  this.dispose = function(){
    this.items.forEach(function(item){
      scene.remove(item);
      scene.remove(item.wave1);
      scene.remove(item.wave2);
    })
    itemGeometry.dispose();
    itemWaveGeometry.dispose();
    trigeometry.dispose();
    scene.remove(this.trimesh1);
    scene.remove(this.trimesh2);
    geometry.dispose();
    scene.remove(this.mesh);
  }
  this.update = function(pos){
    var count = 0;
    this.items.forEach(function(item){
      if(item.dead)return;
      item.rotateX(0.01);
      item.rotateY(0.01);
      item.rotateZ(0.01);
      var dx=pos.x-item.position.x;
      var dy=pos.y-item.position.y;
      var dr=Math.sqrt(dx*dx+dy*dy);
      var dt=0.05;
      if(!item.visible)return;
      if(!item.phase&&dr<4){
        item.original={x:item.position.x,y:item.position.y};
        item.phase=dt;
        count++;
      }else if(item.phase!==undefined){
        var t=item.phase*item.phase;
        var s=(1-t*t)*(1+16*t*Math.exp(-4*t));
        item.scale.x=item.scale.y=item.scale.z=s;
        var x=item.original.x*(1-t*t)+t*t*pos.x;
        var y=item.original.y*(1-t*t)+t*t*pos.y;
        item.position.x=x;item.position.y=y;
        item.wave1.position.x=item.wave2.position.x=x;
        item.wave1.position.y=item.wave2.position.y=y;
        item.wave1.scale.x=item.wave1.scale.y=item.wave1.scale.z=s;
        item.wave2.scale.x=item.wave2.scale.y=item.wave2.scale.z=s;
        item.phase+=dt;
        if(item.phase>=1){
          item.visible=item.wave1.visible=item.wave2.visible=false;
          item.dead=item.wave1.dead=item.wave2.dead=true;
        }
      }
    })
    return count;
  }
}

function gondolaMesh(){
  var xsize=2.2,ysize=1.2,zsize=0.5;
  function coords(t){
    var x=2*t-1;
    var y=1-x*x*x*x;
    var z=x*x*x*x;
    var th=0.3;
    var tw=0.2;
    var data=[
      {x:x,y:0,z:z+th-y},
      {x:x,y:Math.max(y-0.2-tw,0),z:z+th-y},
      {x:x,y:Math.max(y-tw,0),z:z+1+y*th},
      {x:x,y:y,z:z+1},
      {x:x,y:Math.max(y-0.2,0),z:z-y},
    ];
    if(x*x>0.2){
      data[0]=data[1]={x:x,y:0,z:z+1+y/2};
    }else{
      data[0].z=data[1].z=0.5;
    }
    for(var i=data.length-1;i!=0;i--){
      var d=data[i];
      data.push({x:d.x,y:-d.y,z:d.z});
    }
    return data.map(function(p){
      return {
        x: p.x*xsize/2,
        y: p.y*ysize/2,
        z: p.z*zsize/2
      }
    });
  }
  var positions=[];
  var normals=[];
  var n=20;
  for(var i=0;i<n;i++){
    var d0=coords(i/n);
    var d1=coords((i+1)/n);
    for(var j=0;j<d0.length;j++){
      if(j<d0.length/2){
        triangle(d0[j],d1[(j+1)%d1.length],d0[(j+1)%d0.length]);
        triangle(d0[j],d1[j],d1[(j+1)%d1.length]);
      }else{
        triangle(d0[j],d1[j],d0[(j+1)%d0.length]);
        triangle(d0[(j+1)%d0.length],d1[j],d1[(j+1)%d1.length]);
      }
    }
  }
  var ferropos={x:xsize/2,y:0,z:zsize*3/4};
  var fsize={x:zsize/3,z:zsize*2/3,y:ysize/20}
  var ferroxz=[
    {x:-fsize.x/2,z:-0.1*fsize.z},
    {x:-fsize.x/2,z:+fsize.z},
    {x:+fsize.x/2,z:+fsize.z},
    {x:+fsize.x/2,z:+0.1*fsize.z},
  ]
  addxzobj(ferroxz,ferropos,fsize.y);
  var ferrobackxz=[
    {x:0,z:0},
    {x:0,z:fsize.z/2},
    {x:+fsize.x/2,z:fsize.z/2},
    {x:+fsize.x/2,z:0},
  ]
  addxzobj(ferrobackxz,{x:-ferropos.x,y:0,z:ferropos.z},fsize.y);
  addxzobj(ferrobackxz,{x:-ferropos.x*0.62,y:-ysize*0.4,z:ferropos.z},fsize.y);
  function addxzobj(coords,pos,w){
    for(var i=0;i<coords.length;i++){
      var p=coords[i],q=coords[(i+1)%coords.length];
      if(i!=0){
        var p0=coords[0];
        triangle(
          {x:pos.x+p0.x,y:pos.y+w/2,z:pos.z+p0.z},
          {x:pos.x+p.x,y:pos.y+w/2,z:pos.z+p.z},
          {x:pos.x+q.x,y:pos.y+w/2,z:pos.z+q.z}
        )
        triangle(
          {x:pos.x+p0.x,y:pos.y-w/2,z:pos.z+p0.z},
          {x:pos.x+q.x,y:pos.y-w/2,z:pos.z+q.z},
          {x:pos.x+p.x,y:pos.y-w/2,z:pos.z+p.z}
        )
      }
      triangle(
        {x:pos.x+p.x,y:pos.y+w/2,z:pos.z+p.z},
        {x:pos.x+q.x,y:pos.y-w/2,z:pos.z+q.z},
        {x:pos.x+q.x,y:pos.y+w/2,z:pos.z+q.z}
      )
      triangle(
        {x:pos.x+p.x,y:pos.y+w/2,z:pos.z+p.z},
        {x:pos.x+p.x,y:pos.y-w/2,z:pos.z+p.z},
        {x:pos.x+q.x,y:pos.y-w/2,z:pos.z+q.z}
      )
    }
  }

  function triangle(a,b,c){
    positions.push(
      a.x,a.y,a.z,
      b.x,b.y,b.z,
      c.x,c.y,c.z
    );
    var ab={x: b.x-a.x, y: b.y-a.y, z: b.z-a.z};
    var ac={x: c.x-a.x, y: c.y-a.y, z: c.z-a.z};
    var n={
      x: ab.y*ac.z-ab.z*ac.y,
      y: ab.z*ac.x-ab.x*ac.z,
      z: ab.x*ac.y-ab.y*ac.x
    };
    var nr=Math.sqrt(n.x*n.x+n.y*n.y+n.z*n.z)||1;
    for(var i=0;i<3;i++)normals.push(n.x/nr, n.y/nr, n.z/nr)
  }
  var varr = new Float32Array(positions);
  var narr = new Float32Array(normals);
  geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', new THREE.BufferAttribute(varr, 3));
  geometry.addAttribute('normal', new THREE.BufferAttribute(narr, 3));
  return new THREE.Mesh(geometry);
}

function Undine(material){
  var sphere=new THREE.SphereGeometry(1, 8, 8);
  var head=new THREE.Mesh(sphere, material);
  var hat=new THREE.Mesh(sphere, material);
  var arms=[[],[]];
  var legs=[[],[]];
  var oar=[];
  this.meshes=[];
  var body=[];
  var N=16;
  for(var i=0;i<N;i++){
    var a0=new THREE.Mesh(sphere, material);
    var a1=new THREE.Mesh(sphere, material);
    var l0=new THREE.Mesh(sphere, material);
    var l1=new THREE.Mesh(sphere, material);
    var b=new THREE.Mesh(sphere, material);
    var o=new THREE.Mesh(sphere, material);
    var t=i/(N-1);
    a0.t=a1.t=l0.t=l1.t=b.t=o.t=t;
    a0.dir=-1;a1.dir=1;l0.dir=-1;l1.dir=1;
    arms[0].push(a0);arms[1].push(a1);
    legs[0].push(l0);legs[1].push(l1);
    oar.push(o);body.push(b);
    a0.size=a1.size=0.2;
    l0.size=l1.size=0.25;
    b.size=0.4;
    o.size=0.15;
  }
  head.size=0.6;
  hat.size=0.6;
  var meshes=[];
  this.meshes=meshes;
  meshes.push(head, hat);
  arms.forEach(function(arm){arm.forEach(function(a){meshes.push(a)})});
  legs.forEach(function(leg){leg.forEach(function(l){meshes.push(l)})});
  body.forEach(function(b){meshes.push(b)});
  oar.forEach(function(o){meshes.push(o)});
  this.update = function(pos, th, roll, scale, xdiff){
    var t=performance.now()/1000;
    var oarval=Math.sin(t*7.5);
    var bodyLeg={x:0.25+0.1*oarval+0.1*Math.sin(t*8),y:0.1*Math.sin(t*6.2)-Math.sin(roll),z:0.5};
    var bodyArm={x:0.8*bodyLeg.x+0.1*oarval+0.5+0.1*Math.sin(t*5.3),y:0.8*bodyLeg.y+0.1*Math.sin(t*4.9),z:bodyLeg.z+0.5};
    var armth=Math.PI/4+0.2*Math.sin(7.9*t);
    var armdx=Math.sin(7.1*t)+oarval;
    var armdy=Math.cos(armth);
    var armdz=Math.sin(armth)+oarval;
    var oar0={x:bodyArm.x+0.6+0.5*armdx,y:bodyArm.y+0.4+0.5*armdy,z:bodyArm.z-0.5*armdz}
    var oar1={x: 0.4,y:-1.4,z:0.2};
    head.pos={x:bodyArm.x,y:bodyArm.y,z:bodyArm.z+0.6};
    hat.pos={x:head.pos.x-0.1,y:head.pos.y,z:head.pos.z+0.3};
    arms.forEach(function(arm){
      arm.forEach(function(a){
        var p0={x:bodyArm.x,y:bodyArm.y+0.4*a.dir,z:bodyArm.z};
        var ta=0.7;
        var p1=a.dir==1?oar0:{x:oar0.x*(1-ta)+ta*oar1.x,y:oar0.y*(1-ta)+ta*oar1.y,z:oar0.z*(1-ta)+ta*oar1.z}
        a.pos={x:p0.x*(1-a.t)+a.t*p1.x,y:p0.y*(1-a.t)+a.t*p1.y,z:p0.z*(1-a.t)+a.t*p1.z};
      })
    })
    legs.forEach(function(leg){
      leg.forEach(function(l){
        var p0={x:bodyLeg.x,y:bodyLeg.y+0.3*l.dir,z:bodyLeg.z};
        var p1={x:l.dir*0.2,y:0.4*l.dir-Math.sin(roll),z:-l.dir*Math.sin(roll)};
        l.pos={x:p0.x*(1-l.t)+l.t*p1.x,y:p0.y*(1-l.t)+l.t*p1.y,z:p0.z*(1-l.t)+l.t*p1.z};
      })
    })
    body.forEach(function(b){
      var p0=bodyArm,p1=bodyLeg;
      b.pos={x:p0.x*(1-b.t)+b.t*p1.x,y:p0.y*(1-b.t)+b.t*p1.y,z:p0.z*(1-b.t)+b.t*p1.z};
    })
    oar.forEach(function(o){
      var p0=oar0;
      var p1=oar1;
      var t=o.t*1.5;
      o.pos={x:p0.x*(1-t)+t*p1.x,y:p0.y*(1-t)+t*p1.y,z:p0.z*(1-t)+t*p1.z};
    })
    var cos=Math.cos(th), sin=Math.sin(th);
    meshes.forEach(function(m){
      var x=m.pos.x+xdiff/scale, y=0.2+m.pos.y, z=m.pos.z;
      m.position.x=pos.x+(x*cos-y*sin)*scale
      m.position.y=pos.y+(x*sin+y*cos)*scale
      m.position.z=pos.z+z*scale;
      m.scale.x=m.scale.y=m.scale.z=m.size*scale;
    })
    hat.scale.z=hat.size*0.2;
  }
}
