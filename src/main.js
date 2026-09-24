import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createWorld } from './world.js';
import { createResident } from './characters.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch(error){$('#loading-title').textContent='暂时无法开启 3D 场景';$('#loading-subtitle').textContent='请使用支持 WebGL 2 的浏览器，并启用硬件加速。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const scene=new THREE.Scene();scene.name='Sunlit Bay';
const aspect=innerWidth/innerHeight;
const camera=new THREE.OrthographicCamera(-15.2*aspect,15.2*aspect,15.2,-15.2,.1,240);
camera.position.set(.35,19,41);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,1,-4);controls.enableDamping=true;controls.dampingFactor=.07;controls.minZoom=.65;controls.maxZoom=3.8;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.47;controls.maxTargetRadius=26;controls.enablePan=true;controls.autoRotateSpeed=.5;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.update();
const home={position:camera.position.clone(),target:controls.target.clone(),zoom:1};
const world=createWorld(scene);
const definitions=[
 {variant:'violet',x:-3.35,z:11.55,scale:1.18,rotation:.42},
 {variant:'brown',x:.2,z:12.35,scale:1.2,rotation:-.55},
 {variant:'pink',x:7.25,z:10.65,scale:1.20,rotation:-.25},
 {variant:'dino',x:11.95,z:10.35,scale:1.26,rotation:-.30},
 {variant:'police',x:-8.25,z:4.3,scale:1.15,rotation:.12},
 {variant:'worker',x:-10.5,z:-2.4,scale:1.07,behavior:'walk',path:{rx:.68,rz:1.30,speed:.27},phase:0},
 {variant:'bunny',x:-12.85,z:12.35,scale:1.10,behavior:'sit',rotation:.25},
 {variant:'black',x:-12.2,z:8.38,scale:1.12,behavior:'sit',rotation:.23},
 {variant:'tan',x:7.25,z:-6.6,scale:1.01,behavior:'walk',path:{rx:1.65,rz:.42,speed:.22},phase:.8},
 {variant:'mint',x:-3.6,z:-6.85,scale:1.04,behavior:'walk',path:{rx:.60,rz:.55,speed:.35},phase:.4},
 {variant:'pink',name:'小莓',role:'海风杂货店店员',x:11,z:-.35,scale:1.05,rotation:-.4},
 {variant:'violet',name:'星奈',role:'广场散步的少女',x:7.8,z:2.65,scale:1.07,behavior:'walk',path:{rx:.42,rz:1.20,speed:.22},phase:1.2}
];
// Merge only rigid sibling meshes, preserving all articulated pivots and facial animation.
function batchResident(root){root.traverse(g=>{if(g.isMesh)return;const byMaterial=new Map();for(const m of [...g.children]){if(!m.isMesh||Array.isArray(m.material))continue;const key=m.material.uuid+'|'+m.castShadow;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(m);}for(const list of byMaterial.values()){if(list.length<2)continue;const geos=list.map(m=>{m.updateMatrix();let geo=m.geometry.clone().applyMatrix4(m.matrix);if(geo.index)geo=geo.toNonIndexed();if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));return geo;});const geometry=mergeGeometries(geos,false);if(!geometry)continue;const m=new THREE.Mesh(geometry,list[0].material);m.name='Batched character detail';m.castShadow=list[0].castShadow;m.receiveShadow=true;g.add(m);for(const old of list)g.remove(old);for(const geo of geos)geo.dispose();}});}
const residents=definitions.map(d=>{const r=createResident({...d,scale:d.scale*1.18});if(d.behavior==='sit')r.root.position.y=.18;r.root.userData.dynamic=true;batchResident(r.root);scene.add(r.root);return r;});
const state={paused:false,mode:'life',speed:1,evening:false,orbit:false,elapsed:0,selected:null,view:'home'};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const selectionRing=new THREE.Mesh(new THREE.RingGeometry(.58,.63,48),new THREE.MeshBasicMaterial({color:'#fff3b5',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));selectionRing.rotation.x=-Math.PI/2;selectionRing.position.y=.06;selectionRing.visible=false;scene.add(selectionRing);
let toastTimeout,tween=null;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function setPause(value){state.paused=value;$('#pause').classList.toggle('active',value);$('#pause').setAttribute('aria-pressed',String(value));$('#pause-label').textContent=value?'继续生活':'暂停生活';$('#pause-icon').innerHTML=value?'<path d="m8 5 10 7-10 7Z"/>':'<path d="M9 5v14M15 5v14"/>';$('#status-text').textContent=value?'时光暂停':state.mode==='dance'?'广场派对':'小镇生活中';}
$('#pause').addEventListener('click',()=>setPause(!state.paused));
$('#dance').addEventListener('click',()=>{state.mode=state.mode==='dance'?'life':'dance';$('#dance').classList.toggle('active',state.mode==='dance');$('#dance').setAttribute('aria-pressed',String(state.mode==='dance'));setPause(false);toast(state.mode==='dance'?'音乐响起，全员一起跳舞':'派对结束，继续悠闲的小镇生活');});
$('#speed').addEventListener('change',e=>{state.speed=Number(e.target.value);toast('生活节奏 × '+state.speed);});
$('#evening').addEventListener('click',()=>{state.evening=!state.evening;$('#evening').classList.toggle('active',state.evening);$('#day-label').textContent=state.evening?'暖光时刻':'晴朗午后';$('#day-time').textContent=state.evening?'17:30':'14:00';});
$('#orbit').addEventListener('click',()=>{state.orbit=!state.orbit;controls.autoRotate=state.orbit;$('#orbit').classList.toggle('active',state.orbit);$('#orbit').setAttribute('aria-pressed',String(state.orbit));});
function flyTo(position,target,zoom=1){tween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),zoomFrom:camera.zoom,zoomTo:zoom,start:performance.now()};}
function reset(){state.orbit=false;controls.autoRotate=false;$('#orbit').classList.remove('active');$('#orbit').setAttribute('aria-pressed','false');state.selected=null;selectionRing.visible=false;$('#speech').classList.remove('visible');flyTo(home.position,home.target,1);state.view='home';$('#view-label').textContent='全景视角';}
$('#reset').addEventListener('click',reset);
$('#view').addEventListener('click',()=>{if(state.view==='home'){state.view='square';flyTo(new THREE.Vector3(10,15,27),new THREE.Vector3(0,1.6,4.2),1.42);$('#view-label').textContent='广场近景';}else reset();});
$('#photo').addEventListener('click',()=>{renderer.render(scene,camera);canvas.toBlob(blob=>{if(!blob){toast('截图失败，请重试');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sunlit-bay.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已保存这一刻 · 无界面场景截图');});});
const residentsPanel=$('#residents-panel');
$('#residents-toggle').addEventListener('click',()=>{residentsPanel.classList.toggle('open');$('#residents-toggle').setAttribute('aria-expanded',String(residentsPanel.classList.contains('open')));});
$('#close-residents').addEventListener('click',()=>{residentsPanel.classList.remove('open');$('#residents-toggle').setAttribute('aria-expanded','false');});
const colors={violet:'#b09acd',brown:'#c59565',pink:'#e7a6b7',dino:'#7dbeb8',police:'#798dac',worker:'#dfbd6f',bunny:'#d4ccea',black:'#8c93a4',tan:'#ca9a79',mint:'#a3c6b2'};
for(let i=0;i<residents.length;i++){const r=residents[i],button=document.createElement('button');button.className='resident-row';button.innerHTML=`<span class="avatar" style="--avatar:${colors[definitions[i].variant]}">${r.name[0]}</span><span><b>${r.name}</b><small>${r.role}</small></span><span class="resident-arrow">↗</span>`;button.addEventListener('click',()=>{select(r,true);if(innerWidth<680)residentsPanel.classList.remove('open');});$('#residents-list').appendChild(button);}
function select(r,focus=false){state.selected=r;r.wave(state.elapsed);if(state.paused)setPause(false);selectionRing.visible=true;$('#speech-name').textContent=r.name;$('#speech-text').textContent=['今天的海风刚刚好。','要一起去喷泉边坐坐吗？','欢迎来到海风小镇！','记得给今天留一张照片。'][residents.indexOf(r)%4];$('#speech').classList.add('visible');if(focus){const p=r.root.position;flyTo(new THREE.Vector3(p.x+3,9,p.z+13),new THREE.Vector3(p.x,1.2,p.z),2.15);}clearTimeout(select.timeout);select.timeout=setTimeout(()=>{state.selected=null;selectionRing.visible=false;$('#speech').classList.remove('visible');},6500);}
let down=null;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,time:performance.now()};tween=null;});
canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||performance.now()-down.time>700)return;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(residents.map(r=>r.root),true);if(hits.length){let obj=hits[0].object;while(obj&&!obj.userData.isResident)obj=obj.parent;const r=residents.find(r=>r.root===obj);if(r)select(r);}down=null;});
canvas.addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);});
const modal=$('#reference-modal');$('#reference').addEventListener('click',()=>modal.showModal());$('#close-reference').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
$('#help').addEventListener('click',()=>{$('#help-card').classList.toggle('open');});
window.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();setPause(!state.paused);}if(e.key.toLowerCase()==='r')reset();if(e.key==='Escape'){residentsPanel.classList.remove('open');$('#help-card').classList.remove('open');}});
function resize(){const a=innerWidth/innerHeight;const half=innerWidth<700?24.0/a:Math.max(10.0,22.1/a);camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();
let last=performance.now(),lastStats=last,frames=0;
const projected=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(!state.paused){const step=dt*state.speed;state.elapsed+=step;world.update(state.elapsed,step,state.evening);for(const r of residents)r.update(state.elapsed,step,state.mode);}
 if(tween){const p=Math.min((now-tween.start)/1100,1),s=p*p*(3-2*p);camera.position.lerpVectors(tween.from,tween.to,s);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,s);camera.zoom=THREE.MathUtils.lerp(tween.zoomFrom,tween.zoomTo,s);camera.updateProjectionMatrix();if(p>=1)tween=null;}
 controls.update();if(state.selected){const r=state.selected;selectionRing.position.x=r.root.position.x;selectionRing.position.z=r.root.position.z;selectionRing.scale.setScalar(1+Math.sin(state.elapsed*3)*.055);projected.copy(r.root.position);projected.y+=2.9*r.root.scale.y;projected.project(camera);const sx=(projected.x*.5+.5)*innerWidth,sy=(-projected.y*.5+.5)*innerHeight;$('#speech').style.left=Math.max(116,Math.min(innerWidth-116,sx))+'px';$('#speech').style.top=Math.max(130,sy)+'px';}
 renderer.render(scene,camera);frames++;if(now-lastStats>1000){$('#fps').textContent=Math.round(frames*1000/(now-lastStats));frames=0;lastStats=now;}
}
window.__TOWN__={scene,camera,renderer,controls,residents,state,world,reset,select};window.scene=scene;window.camera=camera;window.renderer=renderer;window.THREE=THREE;
renderer.compile(scene,camera);renderer.render(scene,camera);requestAnimationFrame(frame);setTimeout(()=>{$('#loading').classList.add('loaded');$('#app').classList.add('ready');},180);
