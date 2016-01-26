var SAMPLING_RATE = 44100;
function wave2url(data){
  var header=[];
  function puts(s){for(var i=0;i<s.length;i++)header.push(s.charCodeAt(i));}
  function puti(x,n){for(var i=0;i<n;i++)header.push((x>>(8*i))&0xff);}
  puts('RIFF');
  puti(2*data.length+44-8,4);
  puts('WAVEfmt ');
  puti(16,4);
  puti(1,2);
  puti(1,2);
  puti(SAMPLING_RATE,4);
  puti(SAMPLING_RATE*2,4);
  puti(2,2);
  puti(16,2);
  puts('data');
  puti(2*data.length,4);
  var file=new Uint8Array(header.length+2*data.length);
  for(var i=0;i<header.length;i++){
    file[i]=header[i];
  }
  for(var i=0;i<data.length;i++){
    var x=Math.round(0x8000*data[i]);
    if(x<-0x8000)x=-0x8000;
    if(x>=0x8000)x=0x7fff;
    if(x<0)x+=0x10000;
    file[header.length+2*i]=x&0xff;
    file[header.length+2*i+1]=x>>8;
  }
  window.header=header;
  var blob=new Blob([file]);
  window.file=file;
  return URL.createObjectURL(blob);
}

function gaussRandom(){
  var r=Math.sqrt(-2*Math.log(Math.random()));
  var t=2*Math.PI*Math.random();
  return r*Math.sin(t);
}

//smoothed with (exp(kx)-2exp(2kx)+exp(3kx))*cos(wx), w=2pi*freq, k=w/strength, variance=1
function FreqRandom(freq, strength){
  this.strength=strength||2;
  this.r1=this.i1=0;
  this.r2=this.i2=0;
  this.r3=this.i3=0;
  this.scale=Math.sqrt(30);
  this.w=2*Math.PI*freq;
  this.cos=Math.cos(this.w);
  this.sin=Math.sin(this.w);
  this.pn=Math.exp(-this.w/this.strength);
}
FreqRandom.prototype.next=function(){
  var rand=gaussRandom();
  var r1=this.pn*(this.r1*this.cos-this.i1*this.sin)+rand;
  var i1=this.pn*(this.r1*this.sin+this.i1*this.cos);
  var r2=this.pn*this.pn*(this.r2*this.cos-this.i2*this.sin)+rand;
  var i2=this.pn*this.pn*(this.r2*this.sin+this.i2*this.cos);
  var r3=this.pn*this.pn*this.pn*(this.r3*this.cos-this.i3*this.sin)+rand;
  var i3=this.pn*this.pn*this.pn*(this.r3*this.sin+this.i3*this.cos);
  this.r1=r1;this.r2=r2;this.r3=r3;
  this.i1=i1;this.i2=i2;this.i3=i3;
  return this.scale*(this.r1+this.r3-2*this.r2);
}

function decaySoundWave(time,uptime,freq,strength){
  var wave=[];
  var length=SAMPLING_RATE*time;
  var fr=new FreqRandom(freq/SAMPLING_RATE,strength);
  if(strength==Infinity){
    var a=2*Math.PI*Math.random();
    var fri=0;
    fr={next: function(){fri++;return Math.sin(2*Math.PI*freq*fri/SAMPLING_RATE+a)}}
  }
  var max=0;
  for(var i=0;i<length;i++){
    var t=i/length;
    var u=i/SAMPLING_RATE/uptime;
    var v=(u<1?u*u*(3-2*u):1)*Math.exp(-12*t);
    wave[i]=v*fr.next();
    max=Math.max(max,Math.abs(wave[i]));
  }
  for(var i=0;i<length;i++)wave[i]/=max;
  return wave;
}
function smoothSoundWave(time,freq,strength){
  var wave=[];
  var length=SAMPLING_RATE*time;
  var fr=new FreqRandom(freq/SAMPLING_RATE,strength);
  var max=0;
  for(var i=0;i<length;i++){
    var t=i/length;
    var v=t*t*t*(1-t)*(1-t)*(1-t);
    wave[i]=v*fr.next();
    max=Math.max(max,Math.abs(wave[i]));
  }
  for(var i=0;i<length;i++)wave[i]/=max;
  return wave;    
}

function Piano(time, uptime, strength){
  if(!time)time=2;
  if(!strength)strength=160;
  if(!uptime)uptime=0.1;
  var length=Math.round(SAMPLING_RATE*time);
  var num=4;
  var sounds=[];
  for(var k=0;k<=24;k++){
    var freq=441*Math.pow(2,k/12);
    var url=wave2url(decaySoundWave(time,uptime,freq,strength));
    sounds[k]=[];
    for(var i=0;i<num;i++){
      var audio=new Audio();
      audio.src=url;
      sounds[k].push(audio);
    }
  }
  this.sounds=sounds;
  this.play=function(k,vol){
    if(!vol)vol=1;
    var audio=sounds[k].shift();
    sounds[k].push(audio);
    audio.volume=vol;
    audio.play();
  }
}

function OceanSound(){
  audios = [];
  for(var n=0;n<10;n++){ 
    var audio = new Audio();
    audio.src = wave2url(smoothSoundWave(4,4410*(0.5+Math.random()),3));
    audios.push(audio);
  }
  var timer = null;
  this.start = function(){if(!timer)next();}
  this.stop = function(){clearTimeout(timer);timer=null;}
  var self=this;
  this.volume=1;
  var i=0;
  function next(){
    timer = null;
    i=(i+1)%audios.length;
    var r = gaussRandom();
    audios[i].volume=Math.min(0.1*r*r*self.volume, 1);
    audios[i].play();
    timer = setTimeout(next,400+400*Math.random());
  }
}
