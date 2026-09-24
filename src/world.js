import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();
const MAT = (color, roughness = .8) => {const key = color + ':' + roughness;if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({color, roughness})); return cache.get(key);};
const v = (x,y,z) => new THREE.Vector3(x,y,z);
let seed = 241;
const rnd = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
function mesh(g, geometry, color, pos=[0,0,0], scale=null, shadow=true) {const m=new THREE.Mesh(geometry,typeof color==='object'?color:MAT(color));m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=shadow;m.receiveShadow=true;g.add(m);return m;}
const box = (g,w,h,d,c,x=0,y=0,z=0,r=.035)=>mesh(g,new RoundedBoxGeometry(w,h,d,1,r),c,[x,y,z]);
const sphereGeo=new THREE.SphereGeometry(1,14,10);
const sphere=(g,r,c,x=0,y=0,z=0,s=[1,1,1])=>mesh(g,sphereGeo,c,[x,y,z],s.map(n=>n*r));
const cyl=(g,rt,rb,h,c,x=0,y=0,z=0,n=24)=>mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),c,[x,y,z]);
function tube(g,points,r,c,segments=32){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>v(...p))),segments,r,6,false),c);}
function ring(g,r,width,c,x,y,z){const o=mesh(g,new THREE.TorusGeometry(r,width,8,64),c,[x,y,z]);o.rotation.x=-Math.PI/2;return o;}
function label(g,text,x,y,z,w=2.6,h=.55,bg='#fdf3d6',ink='#344b37'){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,640,128);ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.strokeRect(12,12,616,104);ctx.fillStyle=ink;ctx.font='bold 56px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,69);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;const m=mesh(g,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.8}),[x,y,z]);return m;
}
function windowRound(g,x,y,z,r=.5){cyl(g,r+.085,r+.085,.10,'#fff2d4',x,y,z).rotation.x=Math.PI/2;const glass=cyl(g,r,r,.11,'#80c8d0',x,y,z+.025);glass.rotation.x=Math.PI/2;box(g,.055,r*1.8,.10,'#fff6d9',x,y,z+.10);box(g,r*1.8,.055,.10,'#fff6d9',x,y,z+.10);}
function windowRect(g,x,y,z,w=.65,h=.85){box(g,w+.15,h+.15,.12,'#fff0cf',x,y,z);box(g,w,h,.13,'#80bdc6',x,y,z+.045);box(g,.045,h,.07,'#fff2d9',x,y,z+.14);box(g,w,.045,.07,'#fff2d9',x,y,z+.14);box(g,w+.26,.12,.28,'#ffe8bc',x,y-h/2-.10,z+.04);}
function awning(g,x,y,z,w,c){const n=10;for(let i=0;i<n;i++){const m=box(g,w/n+.006,.085,1.2,i%2?'#fff4d8':c,x-w/2+w*(i+.5)/n,y,z);m.rotation.x=.23;box(g,w/n+.006,.22,.08,i%2?'#fff4d8':c,x-w/2+w*(i+.5)/n,y-.20,z+.57);}}
function planter(g,x,z,w=1.2,flowers=true){box(g,w,.40,.62,'#c48d5a',x,.28,z);box(g,w+.1,.10,.70,'#e0ab76',x,.49,z);box(g,w-.10,.05,.52,'#65563d',x,.48,z);for(let i=0;i<Math.round(w*5);i++){const px=x+(rnd()-.5)*(w-.08),pz=z+(rnd()-.5)*.40; sphere(g,.20,'#5d9f39',px,.61,pz,[1,1,1]);if(flowers){const col=['#ffde57','#ee849e','#f4f7e5','#a094e4'][i%4];sphere(g,.105,col,px,.81,pz);sphere(g,.04,'#ffc244',px,.90,pz);}}}
function shop(scene,{x,z,color,accent,name,h=5.0,w=3.8,angle=0}){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;g.name=name+' shop';scene.add(g);
 box(g,w+.6,.24,3.9,'#e8caab',0,.16,0);box(g,w,h,3.2,color,0,h/2+.2,0,.11);
 box(g,w+.25,.23,3.45,accent,0,h+.2,0);box(g,w-.18,.07,3.1,color,0,h+.34,0);
 // Short raised parapet gives the toy-town roofs a crafted silhouette.
 box(g,w+.2,.25,.16,accent,0,h+.39,-1.60);box(g,.16,.25,3.3,accent,-w/2-.04,h+.39,0);box(g,.16,.25,3.3,accent,w/2+.04,h+.39,0);
 box(g,w,.11,.11,'#f8d5b4',0,2.55,1.64);windowRound(g,0,3.86,1.65,.51);
 box(g,1.07,1.91,.17,'#fff0cc',.38,1.26,1.7);box(g,.86,1.73,.18,'#498889',.38,1.26,1.79);box(g,.045,1.6,.06,'#dfdbc0',.38,1.24,1.90);sphere(g,.06,'#eabe55',.64,1.20,1.93);
 windowRect(g,-.97,1.35,1.69,.65,.96);awning(g,.12,2.48,2.00,w-.45,accent);label(g,name,0,2.9,1.72,w-.52,.45,'#fff2d7',accent);
 planter(g,-1.24,2.22,.90);planter(g,1.32,2.05,.75);return g;
}
function clockHouse(scene,x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.name='Willow clock house';scene.add(g);
 box(g,4.6,.3,4.0,'#d6c5a0',0,.17,0);box(g,4.1,3.0,3.3,'#e9e0b2',0,1.78,0,.12);
 for(const xx of [-1.8,1.8]){box(g,.16,3.0,.12,'#55966c',xx,1.85,1.68);windowRect(g,xx*.67,1.65,1.73,.60,1.35);}
 box(g,1.27,2.2,.22,'#4c9472',0,1.39,1.77);box(g,1.00,1.96,.22,'#97683f',0,1.34,1.91);box(g,.06,1.90,.10,'#d9b475',0,1.35,2.07);
 const roof=mesh(g,new THREE.ConeGeometry(3.45,2.7,4), '#3e9265',[0,4.2,0],[1,1,.85]);roof.rotation.y=Math.PI/4;
 for(let j=0;j<4;j++){const y=3.22+j*.48,ww=4.8-j*.76;box(g,ww,.16,3.9-j*.63,j%2?'#5bad70':'#72b774',0,y,0,.06);}
 box(g,1.6,1.36,1.28,'#d9dcaa',0,4.65,.19);const top=mesh(g,new THREE.ConeGeometry(1.22,1.55,4),'#429d73',[0,5.95,.19]);top.rotation.y=Math.PI/4;
 windowRound(g,0,4.90,.88,.53);const face=cyl(g,.47,.47,.13,'#fff2d4',0,4.90,.94);face.rotation.x=Math.PI/2;box(g,.035,.3,.04,'#475e53',0,5.02,1.04);const hand=box(g,.24,.035,.04,'#475e53',.11,4.89,1.04);hand.rotation.z=-.32;
 label(g,'WILLOW',0,3.14,1.85,1.96,.4);sphere(g,.13,'#e4b95d',0,6.80,.19);planter(g,-2.0,2.1,.7);planter(g,2.0,2.1,.7);
}
function cafe(scene,x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.name='Matcha dome cafe';scene.add(g);
 cyl(g,2.12,2.2,.28,'#d9cfa0',0,.18,0);cyl(g,1.88,1.9,2.85,'#aad071',0,1.70,0,40);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;box(g,.13,2.5,.15,'#789b40',Math.sin(a)*1.91,1.75,Math.cos(a)*1.91);}
 cyl(g,2.22,2.25,.30,'#4c9c37',0,3.12,0,48);cyl(g,2.16,2.16,.13,'#8bc942',0,3.36,0,48);
 mesh(g,new THREE.SphereGeometry(2.12,40,20,0,Math.PI*2,0,Math.PI/2),'#78bf3e',[0,3.4,0],[1,1.02,1]);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const pts=[];for(let j=0;j<=20;j++){const t=j/20*Math.PI/2;pts.push([Math.cos(a)*2.13*Math.sin(t),3.40+2.16*Math.cos(t),Math.sin(a)*2.13*Math.sin(t)]);}tube(g,pts,.025,'#a0cf50',20);}
 cyl(g,.18,.22,.20,'#e4be69',0,5.63,0);windowRound(g,0,4.13,2.04,.53);label(g,'m',0,4.10,2.20,.72,.55,'#fff7dc','#559b39');
 box(g,1.32,2.00,.22,'#fff0cb',0,1.37,1.96);box(g,1.1,1.85,.23,'#467870',0,1.36,2.1);box(g,.07,1.85,.08,'#e9d498',0,1.36,2.25);awning(g,0,2.74,2.38,2.30,'#76b942');label(g,'MATCHA',0,3.13,2.25,2.0,.35,'#f3efd2','#457c35');
 planter(g,-1.69,2.25,.9);planter(g,1.69,2.25,.9);
 for(const xx of [-3,3]){cyl(g,.54,.54,.11,'#eddaa5',xx,.94,1.8);cyl(g,.065,.09,.83,'#75966a',xx,.51,1.8);cyl(g,.14,.19,.27,'#e0b586',xx,1.13,1.8);sphere(g,.25,'#62a749',xx,1.37,1.8);for(const zz of [1.15,2.46]){box(g,.54,.1,.52,'#d4bd81',xx,.55,zz);for(const dx of [-.19,.19])box(g,.055,.48,.055,'#71865b',xx+dx,.29,zz);}}
}
function market(scene,x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.name='Golden basket bakery';scene.add(g);
 box(g,5,.3,3.7,'#d8bf8b',0,.2,0);box(g,4.6,3.0,3.2,'#daa146',0,1.78,0,.11);
 for(const xx of [-1.96,-.95,.95,1.96]){box(g,.11,2.8,.12,'#f4cf75',xx,1.76,1.67);}box(g,1.7,2.1,.17,'#8e6740',0,1.48,1.72);box(g,1.42,1.84,.18,'#507c6f',0,1.43,1.83);box(g,.09,1.92,.12,'#ebca75',0,1.46,1.96);
 box(g,5.2,1.22,3.85,'#daa242',0,3.51,0,.13);
 for(let j=0;j<4;j++)box(g,5.34,.10,3.98,'#f1be55',0,3.00+j*.34,0,.06);
 for(let j=0;j<9;j++)box(g,.085,1.12,.04,'#f5c668',-2.35+j*.59,3.52,2.03);
 box(g,5.55,.23,4.15,'#f8ca60',0,4.17,0,.09);
 const bread=sphere(g,1.17,'#d38b47',-.4,4.84,-.3,[.79,1.05,.7]);bread.rotation.z=-.5;
 for(let i=0;i<4;i++){const a=box(g,.065,.65,.07,'#f4c187',-.91+i*.30,4.77+i*.18,.43);a.rotation.z=-.6;}
 const loaf=sphere(g,.7,'#e4a151',.8,4.61,-.20,[.8,1.18,.78]);loaf.rotation.z=.31;
 const handle=[];for(let i=0;i<=30;i++){const a=Math.PI*i/30;handle.push([-1.3+Math.cos(a)*.69,4.05+Math.sin(a)*2.02,-.69]);}tube(g,handle,.14,'#ba7735');
 for(let j=0;j<3;j++)sphere(g,.35,'#e96e55',1.30+j*.12,4.5+j*.23,-.42);
 sphere(g,.58,'#81a84a',1.50,4.42,-.35,[.5,1,.6]);awning(g,0,2.81,2.14,3.99,'#e3ab3f');label(g,'BAKERY & CO.',0,3.45,2.065,3.35,.51,'#f9d17b','#8a5735');planter(g,-2.0,2.34,.77);planter(g,2.0,2.34,.77);
}
function groundTexture(){
 const c=document.createElement('canvas');c.width=2048;c.height=2048;const ctx=c.getContext('2d');ctx.fillStyle='#ded9cb';ctx.fillRect(0,0,2048,2048);
 // Distinct tile pavement outside, turquoise / terracotta mosaic ribbon and a grassy heart.
 for(let y=0;y<2048;y+=25)for(let x=0;x<2048;x+=25){const n=Math.floor(rnd()*14);ctx.fillStyle=`rgb(${213+n},${213+n},${207+n})`;ctx.fillRect(x+1,y+1,23,23);}
 const X=x=>(x+21)/42*2048,Z=z=>(z+18)/36*2048;
 function outline(){ctx.beginPath();ctx.moveTo(X(-2),Z(-9.7));ctx.bezierCurveTo(X(-10),Z(-10),X(-9.0),Z(-3),X(-7),Z(.8));ctx.bezierCurveTo(X(-5),Z(5),X(-9),Z(8),X(-8),Z(11.9));ctx.bezierCurveTo(X(-7),Z(16.4),X(7),Z(16.4),X(8),Z(11.9));ctx.bezierCurveTo(X(9),Z(8),X(5),Z(5),X(7),Z(.8));ctx.bezierCurveTo(X(9),Z(-3),X(10),Z(-10),X(2),Z(-9.7));ctx.closePath();}
 outline();ctx.fillStyle='#f6e9cc';ctx.fill();ctx.lineWidth=68;ctx.strokeStyle='#f5eddb';ctx.stroke();ctx.lineWidth=41;ctx.strokeStyle='#68bcd8';ctx.stroke();
 ctx.save();outline();ctx.clip();for(let y=0;y<2048;y+=18)for(let x=0;x<2048;x+=19){const n=rnd();ctx.fillStyle=n>.75?'#efbd71':n>.3?'#eeb477':'#e9a873';ctx.fillRect(x+1,y+1,17,16);}ctx.restore();
 // Lawn curves are drawn independently to keep the foreground readable.
 ctx.beginPath();ctx.moveTo(X(-3.1),Z(.1));ctx.bezierCurveTo(X(-4.8),Z(3.2),X(-3.6),Z(4.3),X(-5.2),Z(7.4));ctx.bezierCurveTo(X(-7),Z(12.3),X(7),Z(12.3),X(5.2),Z(7.4));ctx.bezierCurveTo(X(3.6),Z(4.3),X(4.8),Z(3.2),X(3.1),Z(.1));ctx.closePath();ctx.fillStyle='#a4ca5c';ctx.fill();ctx.lineWidth=22;ctx.strokeStyle='#f9e9c9';ctx.stroke();
 ctx.save();ctx.clip();for(let i=0;i<16000;i++){ctx.fillStyle=['#aaca64','#aacd62','#98c156','#b1ce71'][i%4];ctx.fillRect(rnd()*2048,rnd()*2048,2+rnd()*3,2);}ctx.restore();
 ctx.strokeStyle='#fae8be';ctx.lineWidth=8;for(const r of [3.8,4.5,5.2]){ctx.beginPath();ctx.ellipse(X(0),Z(-3.9),r/42*2048,r/36*2048,0,0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ctx.beginPath();ctx.moveTo(X(Math.cos(a)*3.8),Z(-3.9+Math.sin(a)*3.8));ctx.lineTo(X(Math.cos(a)*5.2),Z(-3.9+Math.sin(a)*5.2));ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function foliage(g,x,y,z,r=.65,color='#63a849'){
 sphere(g,r,color,x,y,z,[1,1.04,1]);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;sphere(g,r*.48,i%2?'#7dbb53':'#69ad43',x+Math.cos(a)*r*.66,y+(rnd()-.3)*r*.7,z+Math.sin(a)*r*.6);}
}
function tree(scene,x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);cyl(g,.12,.20,1.75,'#a68453',0,.94,0,10);foliage(g,0,2.38,0,.89);cyl(g,.63,.7,.21,'#efddba',0,.17,0);cyl(g,.53,.53,.08,'#a1c360',0,.30,0);}
function palm(scene,x,z,s,phase,animated){
 const g=new THREE.Group();g.name='Coastal palm';g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);
 tube(g,[[0,0,0],[.12,1.6,0],[.02,3.5,.07],[.32,5.4,.02]],.20,'#ac8861');
 for(let i=0;i<15;i++){const y=i*.35+.2;const r=ring(g,.20,.031,'#c29b6c',.05+.25*Math.pow(y/5.4,2),y,0);r.rotation.z=-.05;}
 const crown=new THREE.Group();crown.position.set(.32,5.4,.02);g.add(crown);
 for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2+phase;const blade=new THREE.Group();blade.rotation.y=a;crown.add(blade);
  tube(blade,[[0,0,0],[.75,.40,0],[1.65,.17,0],[2.4,-.5,0]],.035,'#74a948',16);
  const verts=[],indices=[];for(let k=0;k<=16;k++){const t=k/16,xx=t*2.6,yy=Math.sin(t*Math.PI)*.48-t*t*.65,ww=Math.sin(t*Math.PI)*.25;verts.push(xx,yy-ww*.35,-ww,xx,yy+.025,0,xx,yy-ww*.35,ww);if(k<16){const j=k*3;indices.push(j,j+3,j+1,j+1,j+3,j+4,j+1,j+4,j+2,j+2,j+4,j+5);}}const broad=new THREE.BufferGeometry();broad.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));broad.setIndex(indices);broad.computeVertexNormals();const leafMat=MAT('#4a9c36');leafMat.side=THREE.DoubleSide;mesh(blade,broad,leafMat);
  for(let k=0;k<11;k++)for(const side of [-1,1]){
   const t=(k+1)/12,xx=t*2.45,yy=Math.sin(t*Math.PI)*.45-t*t*.57,width=.5*Math.sin(t*Math.PI)+.14;
   const verts=new Float32Array([xx-.1,yy,0, xx+.13,yy+.02,0, xx+.48,yy-.35,width*side]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(verts,3));geo.computeVertexNormals();const mat=MAT(k%3===0?'#8bbe46':'#62ad3f');mat.side=THREE.DoubleSide;mesh(blade,geo,mat);
  }
 }
 for(let i=0;i<4;i++)sphere(crown,.2,'#a67e38',Math.sin(i*1.6)*.22,-.15,Math.cos(i*1.6)*.22);
 animated.push({g:crown,phase});
}
function fence(scene,x,z,length,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);for(let i=0;i<=length/.48;i++){const xx=i*.48-length/2;box(g,.13,.80,.13,'#f3f2df',xx,.65,0);const cap=mesh(g,new THREE.ConeGeometry(.095,.14,4),'#fcfae9',[xx,1.12,0]);cap.rotation.y=Math.PI/4;}box(g,length,.11,.08,'#eaf0df',0,.52,.035);box(g,length,.11,.08,'#eaf0df',0,.91,.035);}
function lamp(scene,x,z,lights){const g=new THREE.Group();g.position.set(x,0,z);g.name='Promenade lantern';scene.add(g);cyl(g,.19,.29,.18,'#394d48',0,.21,0);cyl(g,.095,.17,2.76,'#42564e',0,1.55,0,10);cyl(g,.24,.13,.16,'#45534a',0,2.91,0);const m=new THREE.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffd287',emissiveIntensity:.25,roughness:.42});sphere(g,.27,m,0,3.22,0,[.78,1.25,.78]);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(g,.037,.53,.037,'#384d45',Math.sin(a)*.18,3.23,Math.cos(a)*.18);}const cap=mesh(g,new THREE.ConeGeometry(.37,.22,6),'#354e43',[0,3.60,0]);sphere(g,.075,'#3d5347',0,3.80,0);lights.push(m);}
function bench(scene,x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);for(let i=0;i<4;i++)box(g,2.9,.10,.20,'#ad7c47',0,.71,-.32+i*.22);for(let i=0;i<3;i++)box(g,2.9,.19,.12,i%2?'#ba8b51':'#b1834a',0,.98+i*.23,-.43);for(const xx of [-1.14,1.14]){box(g,.10,.76,.12,'#46584e',xx,.43,-.28);box(g,.10,.61,.12,'#46584e',xx,.36,.35);box(g,.14,.10,.83,'#435749',xx,.98,0);box(g,.07,.50,.09,'#435749',xx,.74,.39);}return g;}
function fountain(scene){
 const g=new THREE.Group();g.position.set(0,.03,-3.9);g.name='Pearl fountain';scene.add(g);
 cyl(g,3.18,3.34,.20,'#e6d3b9',0,.16,0,72);cyl(g,2.97,3.09,.19,'#f8ebd6',0,.34,0,72);cyl(g,2.72,2.86,.23,'#d9d5bd',0,.49,0,72);
 const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#57cadf',roughness:.19,metalness:.15,transparent:true,opacity:.84,clearcoat:1});cyl(g,2.72,2.72,.07,waterMaterial,0,.62,0,80);ring(g,2.9,.16,'#fff0d8',0,.63,0);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.2,dx=Math.sin(a),dz=Math.cos(a);cyl(g,.52,.61,.32,'#f9eddb',dx*2.77,.51,dz*2.77);tube(g,[[dx*2.77,.65,dz*2.77],[dx*2.43,1.65,dz*2.43],[dx*1.54,3.21,dz*1.54],[dx*.25,4.1,dz*.25]],.21,'#fff4e3',34);sphere(g,.31,'#f9f4df',dx*.37,3.96,dz*.37);}
 const orb= new THREE.MeshPhysicalMaterial({color:'#cef5de',metalness:.23,roughness:.12,transparent:true,opacity:.83,clearcoat:1});sphere(g,.49,orb,0,4.43,0);ring(g,.38,.045,'#d6b85d',0,4.14,0);
 const count=310,positions=new Float32Array(count*3);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const dot=document.createElement('canvas');dot.width=32;dot.height=32;const cx=dot.getContext('2d');const gradient=cx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.3,'rgba(236,255,255,.85)');gradient.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gradient;cx.fillRect(0,0,32,32);
 const drops=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#e6ffff',size:.12,map:new THREE.CanvasTexture(dot),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));g.add(drops);
 const stream=new THREE.MeshPhysicalMaterial({color:'#d1f7f2',transparent:true,opacity:.60,roughness:.1});tube(g,[[0,.7,0],[.02,1.9,0],[0,3.6,0]],.044,stream);
 const ripples=[];for(let i=0;i<7;i++){const mat=new THREE.MeshBasicMaterial({color:'#e1ffff',transparent:true,opacity:.35,depthWrite:false});const r=ring(g,.9,.018,mat,0,.68+i*.001,0);ripples.push(r);}
 return t=>{for(let i=0;i<count;i++){const j=i*3,a=i*2.39996,u=(t*.56+i*.097)%1;if(i<160){positions[j]=Math.cos(a)*(.10+u*.48);positions[j+1]=3.70-u*3.04;positions[j+2]=Math.sin(a)*(.10+u*.48);}else{const d=u*2.17;positions[j]=Math.cos(a)*d;positions[j+1]=.65+Math.sin(u*Math.PI)*1.29;positions[j+2]=Math.sin(a)*d;}}geometry.attributes.position.needsUpdate=true;for(let i=0;i<ripples.length;i++){const s=(t*.30+i/ripples.length)%1; ripples[i].scale.setScalar(.10+s*2.7);ripples[i].material.opacity=(1-s)*.46;}waterMaterial.color.setHSL(.54,.88,.34+Math.sin(t*1.2)*.015);};
}
function skyTexture(){
 const c=document.createElement('canvas');c.width=2048;c.height=1024;const cx=c.getContext('2d'),gr=cx.createLinearGradient(0,0,0,1024);gr.addColorStop(0,'#3f9fe5');gr.addColorStop(.38,'#8ad3f0');gr.addColorStop(1,'#cce8dc');cx.fillStyle=gr;cx.fillRect(0,0,2048,1024);
 for(let j=0;j<12;j++){const x=j*193-58,y=38+rnd()*86;for(let i=0;i<20;i++){const px=x+(rnd()-.5)*200,py=y+(rnd()-.5)*31,r=13+rnd()*32;const g=cx.createRadialGradient(px,py,1,px,py,r);g.addColorStop(0,'rgba(255,255,255,.94)');g.addColorStop(.60,'rgba(251,255,255,.8)');g.addColorStop(1,'rgba(239,250,255,0)');cx.fillStyle=g;cx.beginPath();cx.ellipse(px,py,r,r*.64,0,0,Math.PI*2);cx.fill();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function optimizeStatic(scene){scene.updateMatrixWorld(true);const groups=new Map(),originals=[];scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||!o.geometry.attributes.normal)return;let p=o,skip=false;while(p){if(p.userData.dynamic)skip=true;p=p.parent;}if(skip)return;const key=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});for(const meshes of groups.values()){if(meshes.length<3)continue;const geos=meshes.map(o=>{const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const n=g.index?g.toNonIndexed():g;for(const name of Object.keys(n.attributes))if(!['position','normal','uv'].includes(name))n.deleteAttribute(name);if(!n.attributes.uv)n.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n.attributes.position.count*2),2));return n;});const merged=mergeGeometries(geos,false);if(!merged)continue;const o=new THREE.Mesh(merged,meshes[0].material);o.castShadow=meshes[0].castShadow;o.receiveShadow=meshes[0].receiveShadow;o.name='Batched scenery';scene.add(o);for(const m of meshes)m.removeFromParent();for(const g of geos)g.dispose();}}
export function createWorld(scene){
 scene.background=skyTexture();scene.fog=new THREE.Fog('#b0dfec',75,180);
 const ambient=new THREE.HemisphereLight('#e4f4ff','#cab787',2.25);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#fff2d8',3.15);sun.position.set(-14,28,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-29;sun.shadow.camera.right=29;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-26;sun.shadow.camera.far=95;sun.shadow.normalBias=.05;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);sun.target.position.set(0,0,-1);scene.add(sun.target);
 const bounce=new THREE.DirectionalLight('#b4e4fa',.6);bounce.position.set(14,10,-17);scene.add(bounce);
 const ground=box(scene,42,.55,36,'#d3c5a6',0,-.28,0,.13);const pavement=mesh(scene,new THREE.PlaneGeometry(42,36),new THREE.MeshStandardMaterial({map:groundTexture(),roughness:1}),[0,.012,0]);pavement.rotation.x=-Math.PI/2;pavement.castShadow=false;
 // Ocean horizon and pale sand behind the white seafront railing.
 box(scene,180,.16,1.8,'#f5deb1',0,-.48,-18.8);const seaMat=new THREE.MeshStandardMaterial({color:'#2ca1ce',roughness:.32,metalness:.10});const sea=box(scene,180,.14,9.2,seaMat,0,-.63,-24.3,0);sea.castShadow=false;
 const waves=[];for(let i=0;i<37;i++){const wav=mesh(scene,new THREE.PlaneGeometry(3+rnd()*10,.035+rnd()*.07),new THREE.MeshBasicMaterial({color:'#d3f4f1',transparent:true,opacity:.24+rnd()*.3}),[(rnd()-.5)*120,-.545,-20-rnd()*8]);wav.rotation.x=-Math.PI/2;waves.push(wav);}
 fence(scene,0,-17.3,41);for(const xx of [-19.8,19.8]){fence(scene,xx,11.6,11,Math.PI/2);fence(scene,xx,-5.4,8,Math.PI/2);}fence(scene,-13.8,17.2,10);fence(scene,13.8,17.2,10);
 clockHouse(scene,-7.0,-11.8);cafe(scene,0,-12.2);market(scene,7.1,-11.6);
 shop(scene,{x:-16.7,z:-1.5,color:'#ed776c',accent:'#d74d53',name:'BLOOM',h:4.65,w:3.8,angle:.1});
 shop(scene,{x:-13.4,z:-6.2,color:'#f4b94e',accent:'#de9643',name:'SUNNY',h:4.95,w:3.7,angle:.1});
 shop(scene,{x:12.5,z:-7.8,color:'#eb83a8',accent:'#d75689',name:'PETAL',h:5.1,w:3.4,angle:-.1});
 shop(scene,{x:15.9,z:-4.1,color:'#58b9de',accent:'#3e9ccb',name:'SODA',h:5.0,w:3.5,angle:-.12});
 shop(scene,{x:18.1,z:.8,color:'#898add',accent:'#686ccc',name:'LUNA',h:4.8,w:3.4,angle:-.12});
 const palms=[];for(const [x,z,s] of [[-19,-14,1.0],[-14,-16,1.04],[-10.5,-17,.92],[10.5,-17,1.05],[15.5,-16,1.05],[19.5,-14,1.07],[-18,10.7,1.16],[18.4,11.5,1.18]])palm(scene,x,z,s,rnd()*6,palms);
 for(const side of [-1,1]){
  for(const z of [4.8,10.4]){box(scene,5.2,.14,4.5,'#a3c866',side*14,.08,z,.08);}
  for(let i=0;i<16;i++){const z=3.0+i*.88;foliage(scene,side*18.7,.48,z,.45);}
  for(let i=0;i<9;i++)foliage(scene,side*(10.0+i*1.0),.43,16.1,.47);
  for(const z of [-7.1,3.5,14.9])tree(scene,side*(z===-7.1?6.3:10.35),z,z===-7.1?.88:1.0);
  for(const z of [4.0,14.9])planter(scene,side*10.5,z,2.0,true);
 }
 const lights=[];for(const x of [-9.9,9.9])for(const z of [-8.9,.0,9.0])lamp(scene,x,z,lights);
 bench(scene,-12.3,8.4,.23);bench(scene,-12.8,12.4,.25);bench(scene,12.6,14.0,-.17);bench(scene,11.9,4.5,-.18);
 for(const x of [-8.8,8.8]){box(scene,.66,.83,.66,'#55776a',x,.47,13.9);box(scene,.71,.09,.70,'#e2cf9e',x,.94,13.9);box(scene,.42,.13,.04,'#324c46',x,.80,14.255);}
 const fountainUpdate=fountain(scene);
 // Clouds are soft groups of matte ellipsoids, behind rather than over the plaza.
 const clouds=[];for(let i=0;i<9;i++){const g=new THREE.Group();g.position.set(-44+i*11,12+rnd()*7,-49-rnd()*13);g.userData.dynamic=true;scene.add(g);for(let j=0;j<6;j++){const m=sphere(g,1.2+rnd()*.7,'#ffffff',(j-2.5)*1.3,rnd()*.85,0,[1.5,.75,.65]);m.castShadow=false;}clouds.push(g);}
 for(const {g} of palms){
  g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert();const groups=new Map();g.traverse(o=>{if(!o.isMesh)return;const k=o.material.uuid;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);});
  for(const list of groups.values()){const geos=list.map(o=>{let geom=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(geom.index)geom=geom.toNonIndexed();if(!geom.attributes.uv)geom.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geom.attributes.position.count*2),2));return geom;});const merged=mergeGeometries(geos,false);if(merged){const m=new THREE.Mesh(merged,list[0].material);m.castShadow=true;m.receiveShadow=true;g.add(m);list.forEach(o=>o.removeFromParent());}geos.forEach(geom=>geom.dispose());}
  g.userData.dynamic=true;
 }
 // Exclude all time-dependent fountain materials and geometry from batching.
 scene.getObjectByName('Pearl fountain').userData.dynamic=true;for(const w of waves)w.userData.dynamic=true;
 optimizeStatic(scene);
 let evening=0;
 return {sun,ambient,update(t,dt,isEvening){evening=THREE.MathUtils.damp(evening,isEvening?1:0,2,dt);sun.intensity=2.5-evening*.80;sun.color.setRGB(1,.97-evening*.18,.90-evening*.22);ambient.intensity=1.25-evening*.35;for(const mat of lights)mat.emissiveIntensity=.25+evening*2.3;fountainUpdate(t);palms.forEach(({g,phase})=>{g.rotation.z=Math.sin(t*.75+phase)*.03;g.rotation.x=Math.cos(t*.63+phase)*.022;});waves.forEach((w,i)=>{w.position.x+=Math.sin(t*.4+i)*dt*.13;w.material.opacity=.19+(Math.sin(t*.5+i)+1)*.12;});clouds.forEach((g,i)=>{g.position.x+=dt*.055;if(g.position.x>59)g.position.x=-59;});}, stats:{shops:8,palms:palms.length}};
}
