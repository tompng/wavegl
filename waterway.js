function genWaterWay(size){
  var size=100;
  var arr=[];
  for(var i=0;i<size;i++)arr[i]=[];
  for(var i=0;i<size;i++){
    for(var j=0;j<size;j++){
      arr[i][j]={
        x:i+0.2+0.6*Math.random(),
        y:j+0.2+0.6*Math.random(),
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
    return (54321+12345*rnd)%1<0.5;
  }
  function lineRandom(line){
    return randfunc(line[0].x+line[1].x,line[0].y+line[1].y);
  }

  for(var i=0;i<size-1;i++){
    for(var j=0;j<size-1;j++){
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

  for(var i=1;i<size-1;i++)for(var j=1;j<size-1;j++)allPoints.push(arr[i][j]);
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
      var len=0.1
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
  return {
    points: allPoints,
    triangles: allTriangles,
    lines: allLines,
  }
}
