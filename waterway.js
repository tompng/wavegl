function genWaterWay(rectX,rectY,rectW,rectH){
  if(!rectW){rectW=rectH=rectX;rectX=rectY=0;}
  var arr=[];
  var offset=2;
  for(var i=0;i<rectW+2*offset;i++){
    arr[i]=[];
    for(var j=0;j<rectH+2*offset;j++){
      var ix=rectX+i-offset,iy=rectY+j-offset;
      arr[i][j]={
        x:ix+0.2+0.6*randfunc(ix+0.5,iy),
        y:iy+0.2+0.6*randfunc(ix,iy+0.5),
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
  function randfunc(x,y){
    var rnd=Math.sin(1234567*x)+Math.sin(987654*y);
    return (54321+12345*rnd)%1;
  }
  function lineRandom(line){
    return randfunc(line[0].x+line[1].x,line[0].y+line[1].y)<0.5;
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
  allPoints.forEach(function(p){
    if(p.points.length<=1)return;
    for(var i=0;i<p.points.length;i++){

    }
    p.points.sort(function(a,b){
      return Math.atan2(a.x-p.x,a.y-p.y)-Math.atan2(b.x-p.x,b.y-p.y);
    });
    var sections = [[]];
    p.points.forEach(function(q){
      sections[sections.length-1].push(q);
      if(!lineRandom([p,q]))sections.push([q]);
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
      var len=0.05+0.1*randfunc(a.x,b.y);
      var d={
        x:len*(da.x/ra+db.x/rb)/sin,
        y:len*(da.y/ra+db.y/rb)/sin
      }
      if(d.x*(a.y-p.y)-d.y*(a.x-p.x)>0){
        d.x*=-1;d.y*=-1;
      }
      for(var i=0;i<sec.length-1;i++){
        var a=sec[i],b=sec[i+1];
        var t=triangleFor(a,b);
        var index = t.indexOf(p);
        t.moves=t.moves||[];
        t.moves[index] = d;
      }
    })
  })
  var triangles = [];
  allTriangles.forEach(function(t){
    for(var i=0;i<3;i++){
      var m=(t.moves&&t.moves[i])||{x:0,y:0};
      t[i]={x: t[i].x-m.x,y:t[i].y-m.y}
    }
    var x=(t[0].x+t[1].x+t[2].x)/3;
    var y=(t[0].y+t[1].y+t[2].y)/3;
    if(rectX<=x&&x<rectX+rectW&&rectY<=y&&y<rectY+rectH)triangles.push(t);
  })
  return {
    points: allPoints,
    triangles: triangles,
    lines: allLines,
    random: randfunc
  }
}

function genPrismMesh(points,height){
  var center={x:0,y:0,z:0};
  points.forEach(function(p){
    center.x+=p.x/points.length;
    center.y+=p.y/points.length;
    center.z+=(p.z||height)/points.length;
  })
  var vertices=[];
  for(var i=0;i<points.length;i++){
    var a=points[i],b=points[(i+1)%points.length];
    vertices.push(
      a.x,a.y,a.z||height,
      b.x,b.y,b.z||height,
      center.x,center.y,center.z
    )
    vertices.push(
      a.x,a.y,0,
      b.x,b.y,0,
      b.x,b.y,b.z||height,
      a.x,a.y,0,
      b.x,b.y,b.z||height,
      a.x,a.y,a.z||height
    )
  }
  var varr = new Float32Array(vertices.length);
  for(var i=0;i<vertices.length;i++)varr[i]=vertices[i];
  geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', new THREE.BufferAttribute(varr, 3));
  return new THREE.Mesh(geometry);
}

