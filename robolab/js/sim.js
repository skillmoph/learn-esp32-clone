// sim.js — runtime API and simulation loop
import { S, THREE, emit } from './scene.js';

export const SIM = { running:false, gravity:9.81, lv:0, rv:0, rig:null, startTime:0, telemetry:{} };

let audioCtx = null;
let track = null; // {canvas, size, y}
export function setTrack(t){ track = t; }

export function buildAPI(print){
  const pinBus = {}; // pin -> {type, value}
  const comps = ()=>S.objects.filter(o=>o.userData.robo?.params?.pin !== undefined || o.userData.robo?.params?.sig !== undefined);
  const byPin = (p)=>comps().find(o=>{
    const ps = o.userData.robo.params;
    return ps.pin==p || ps.sig==p || ps.trig==p || ps.echo==p;
  });
  const api = {
    pins: pinBus,
    pinMode(){},
    millis:()=>Math.floor(performance.now()-SIM.startTime),
    random:(a,b)=>b===undefined?Math.floor(Math.random()*a):Math.floor(a+Math.random()*(b-a)),
    map:(v,a,b,c,d)=>c+(d-c)*((v-a)/(b-a)),
    constrain:(v,a,b)=>Math.min(b,Math.max(a,v)),
    print:(x)=>print(String(x)),
    delay:(ms)=>new Promise(r=>setTimeout(r, Math.min(ms, 10000))),
    digitalWrite:(pin,val)=>{ pinBus[pin]={value:val?1:0}; applyDigital(pin, val?1:0); },
    analogWrite:(pin,val)=>{ pinBus[pin]={value:val}; applyAnalog(pin, val); },
    digitalRead:(pin)=>readDigital(pin),
    analogRead:(pin)=>readAnalog(pin),
    pulseIn:(pin)=>readUltrasonic(pin),
    tone:(pin,freq,ms)=>beep(freq, ms||200),
    noTone:()=>stopBeep(),
    newServo:()=>({
      _pin:null,
      attach(p){ this._pin=p; },
      write(deg){ applyServo(this._pin, deg); },
    }),
    oledPrint:(txt)=>oledText(String(txt)),
    oledClear:()=>oledText(''),
  };
  return api;
}

function findPart(pred){
  for(const o of S.objects){ if(pred(o.userData.robo||{})) return o; }
  return null;
}
function applyDigital(pin, v){
  const o = byPinCached(pin);
  if(!o) return;
  const k = o.userData.robo.kind;
  if(k==='led'){ const b=o.getObjectByName('bulb'); if(b){ b.material.emissive = new THREE.Color(v?0xff3030:0x000000); b.material.color.set(v?0xff6060:0x991b1b);} }
  if(k==='botao'){}
  if(k==='bomotor'||k==='dcmotor'){ setMotor(o, v?200:0); }
}
function applyAnalog(pin, val){
  const o = byPinCached(pin);
  if(!o) return;
  const k = o.userData.robo.kind;
  if(k==='bomotor'||k==='dcmotor'||k==='servo360') setMotor(o, val);
}
function setMotor(o, val){
  o.userData.robo.params.speed = val;
  const side = o.userData.robo.params.side || 'L';
  if(side==='L') SIM.lv = val; else SIM.rv = val;
}
function applyServo(pin, deg){
  const o = byPinCached(pin);
  if(!o) return;
  const horn = o.getObjectByName('horn') || o.getObjectByName('upper');
  if(horn) horn.rotation.y = THREE.MathUtils.degToRad(deg-90);
  o.userData.robo.params.angle = deg;
}
function readDigital(pin){
  const o = byPinCached(pin);
  if(!o) return 0;
  const k = o.userData.robo.kind;
  if(k==='ir') return irRead(o)?1:0;
  if(k==='botao') return o.userData.robo.params.pressed?1:0;
  if(k==='ldr') return readAnalog(pin)>512?1:0;
  return 0;
}
function readAnalog(pin){
  const o = byPinCached(pin);
  if(!o) return 0;
  const k = o.userData.robo.kind;
  if(k==='ldr') return Math.floor(400+300*Math.sin(performance.now()/1500));
  if(k==='dht11') return 26;
  if(k==='gas') return 40;
  if(k==='ir') return irRead(o)?900:80;
  return 0;
}
const ray = new THREE.Raycaster();
function readUltrasonic(pin){
  const o = byPinCached(pin);
  if(!o) return 999;
  const origin = new THREE.Vector3(); o.getWorldPosition(origin);
  const dir = new THREE.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));
  ray.set(origin, dir);
  const hits = ray.intersectObjects(S.scene.children, true).filter(h=>h.object.name!=='__ground' && !isInside(o, h.object));
  const d = hits.length ? hits[0].distance*10 : 400; // world unit ≈ 10 cm
  SIM.telemetry.distance = Math.round(d);
  return Math.round(d);
}
function isInside(root, obj){ let p=obj; while(p){ if(p===root) return true; p=p.parent; } return false; }
function irRead(o){
  if(!track) return false;
  const wp = new THREE.Vector3(); o.getWorldPosition(wp);
  const half = track.size/2;
  const u = (wp.x+half)/track.size, v = (wp.z+half)/track.size;
  if(u<0||u>1||v<0||v>1) return false;
  const ctx = track.canvas.getContext('2d');
  const px = ctx.getImageData(Math.floor(u*track.canvas.width), Math.floor(v*track.canvas.height), 1, 1).data;
  return px[0] < 60; // black line
}
function oledText(txt){
  const o = findPart(ud=>ud.kind==='oled');
  if(!o) return;
  const scr = o.getObjectByName('screen');
  if(!scr) return;
  const cv = document.createElement('canvas'); cv.width=128; cv.height=64;
  const c = cv.getContext('2d'); c.fillStyle='#061018'; c.fillRect(0,0,128,64);
  c.fillStyle='#7df9ff'; c.font='12px monospace';
  String(txt).split('\n').slice(0,4).forEach((l,i)=>c.fillText(l, 4, 16+i*15));
  const tex = new THREE.CanvasTexture(cv);
  scr.material = new THREE.MeshStandardMaterial({map:tex, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:.8, color:0x000000});
}
let osc=null;
function beep(freq, ms){
  try{
    audioCtx ??= new (window.AudioContext||window.webkitAudioContext)();
    stopBeep();
    osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.frequency.value=freq; g.gain.value=.05; osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + ms/1000);
  }catch(e){}
}
function stopBeep(){ try{ osc?.stop(); }catch(e){} osc=null; }

// cache pin->object (invalidated each frame cheaply)
let pinCache = {};
function byPinCached(pin){
  if(pinCache[pin] && S.objects.includes(pinCache[pin])) return pinCache[pin];
  pinCache = {};
  for(const o of S.objects){
    const ps = o.userData.robo?.params||{};
    for(const k of ['pin','sig','trig','echo']) if(ps[k]!==undefined && +ps[k]===+pin) pinCache[pin]=o;
  }
  return pinCache[pin]||null;
}
export function invalidatePinCache(){ pinCache={}; }

// ---------- drive the rig ----------
export function startRig(){
  if(SIM.rig) return;
  const rig = new THREE.Group(); rig.name='__rig';
  S.scene.add(rig);
  const movers = S.objects.filter(o=>o.userData.robo);
  movers.forEach(o=>rig.attach(o));
  SIM.rig = rig;
}
export function stopRig(){
  if(!SIM.rig) return;
  const movers=[...SIM.rig.children];
  movers.forEach(o=>S.scene.attach(o));
  S.scene.remove(SIM.rig);
  SIM.rig=null; SIM.lv=0; SIM.rv=0;
}
export function simFrame(dt){
  if(!SIM.running || !SIM.rig) return;
  const g = Math.max(SIM.gravity, 0);
  const scale = g===0 ? .35 : Math.min(g/9.81, 1.4); // gravity affects traction
  const v = (SIM.lv + SIM.rv)/2 / 255 * 14 * scale;
  const w = (SIM.rv - SIM.lv) / 255 * 2.2 * scale;
  SIM.rig.rotation.y += w*dt;
  const dir = new THREE.Vector3(0,0,1).applyQuaternion(SIM.rig.quaternion);
  SIM.rig.position.addScaledVector(dir, v*dt);
  // keep on ground
  SIM.rig.position.y = 0;
  const lim = 28;
  SIM.rig.position.x = Math.max(-lim, Math.min(lim, SIM.rig.position.x));
  SIM.rig.position.z = Math.max(-lim, Math.min(lim, SIM.rig.position.z));
  // spin wheels/motor shafts
  S.objects.forEach(o=>{
    const sp = o.userData.robo?.params?.speed||0;
    if(sp){
      o.traverse(m=>{ if(m.name==='shaft'||m.name==='spin') m.rotation.x += sp/255*dt*12; if(m.name==='spinY') m.rotation.y += sp/255*dt*12; });
    }
  });
  SIM.telemetry.speed = Math.round(v*10)/10;
}
