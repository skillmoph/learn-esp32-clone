// parts.js — electronics components and robot presets
import { THREE } from './scene.js';

const M = (c,r=.5,e=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:.2,emissive:e});
const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));
const cyl=(r1,r2,h,c,seg=24)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),M(c));

export const BUILDERS = {};

// ---------- Electronics ----------
BUILDERS.arduino = ()=>{
  const g = new THREE.Group();
  const board = box(4.4,.18,3.2, 0x0b7285); board.position.y=.1; g.add(board);
  const usb = box(.9,.5,1.1,0x9aa3ad); usb.position.set(-1.9,.45,-.9); g.add(usb);
  const jack = cyl(.45,.45,.5,0x222222); jack.position.set(-1.9,.45,.9); g.add(jack);
  const chip = box(1,.15,.4,0x1a1a1a); chip.position.set(.4,.28,.6); g.add(chip);
  for(let i=0;i<10;i++){ const p=box(.16,.22,.16,0xd4a017); p.position.set(-1.9+i*.42,.3,1.45); g.add(p); }
  for(let i=0;i<8;i++){ const p=box(.16,.22,.16,0xd4a017); p.position.set(-1.5+i*.42,.3,-1.45); g.add(p); }
  g.userData.pins={};
  return g;
};
BUILDERS.esp32 = ()=>{
  const g = new THREE.Group();
  const board = box(3.6,.16,2.6, 0x30323d); board.position.y=.08; g.add(board);
  const shield = box(1.3,.25,1.1,0xb8bec9); shield.position.set(-.7,.3,0); g.add(shield);
  for(let i=0;i<8;i++){ const p=box(.14,.2,.14,0xd4a017); p.position.set(-1.5+i*.43,.25,1.15); g.add(p);
    const p2=p.clone(); p2.position.z=-1.15; g.add(p2); }
  return g;
};
BUILDERS.placa = ()=>{ // Placa Academe (ESP32 style, purple)
  const g = BUILDERS.esp32();
  g.children[0].material = M(0x892CDD);
  return g;
};
BUILDERS.ultrasonic = ()=>{
  const g = new THREE.Group();
  const board = box(2.6,.14,1.2,0x1460b4); board.position.y=.07; g.add(board);
  const c1=cyl(.45,.45,.9,0xc9ced6); c1.rotation.x=Math.PI/2; c1.position.set(-.65,.55,.2); g.add(c1);
  const c2=c1.clone(); c2.position.x=.65; g.add(c2);
  const g1=cyl(.3,.3,.1,0x333a45); g1.rotation.x=Math.PI/2; g1.position.set(-.65,.55,.66); g.add(g1);
  const g2=g1.clone(); g2.position.x=.65; g.add(g2);
  return g;
};
BUILDERS.ir = ()=>{
  const g=new THREE.Group();
  const b=box(1.6,.12,.6,0x1c7c46); b.position.y=.06; g.add(b);
  const led=cyl(.14,.14,.3,0x222831); led.position.set(-.3,.25,0); g.add(led);
  const rx=cyl(.14,.14,.3,0x9fb6c9); rx.position.set(.3,.25,0); g.add(rx);
  return g;
};
BUILDERS.gas = ()=>{
  const g=new THREE.Group();
  const b=box(1.4,.12,1,0x8c2f2f); b.position.y=.06; g.add(b);
  const s=cyl(.35,.35,.5,0xb9c0c9); s.position.set(0,.4,0); g.add(s);
  return g;
};
BUILDERS.color = ()=>{
  const g=new THREE.Group();
  const b=box(1.2,.12,1,0x2f2f8c); b.position.y=.06; g.add(b);
  const s=box(.4,.2,.4,0xffffff); s.position.set(0,.2,0); g.add(s);
  return g;
};
BUILDERS.ldr = ()=>{
  const g=new THREE.Group();
  const b=box(.9,.1,.7,0x1460b4); b.position.y=.05; g.add(b);
  const s=cyl(.2,.2,.12,0xd97b29); s.position.set(0,.17,0); g.add(s);
  return g;
};
BUILDERS.dht11 = ()=>{
  const g=new THREE.Group();
  const b=box(1,.9,.5,0x2f6fd0); b.position.y=.45; g.add(b);
  for(let i=0;i<4;i++){const h=box(.08,.5,.06,0x0c2a52); h.position.set(-.3+i*.2,.45,.26); g.add(h);}
  return g;
};
BUILDERS.oled = ()=>{
  const g=new THREE.Group();
  const b=box(1.6,.1,1.4,0x14401c); b.position.y=.05; g.add(b);
  const scr=box(1.3,.06,1,0x061018); scr.position.set(0,.13,0); scr.name='screen'; g.add(scr);
  return g;
};
BUILDERS.bomotor = ()=>{
  const g=new THREE.Group();
  const body=box(1.1,1,2.2,0xf0b429); body.position.y=.55; g.add(body);
  const cap=box(1.12,1.02,.5,0x4b5563); cap.position.set(0,.55,-1.05); g.add(cap);
  const shaft=cyl(.12,.12,.5,0xd7dce3); shaft.rotation.x=Math.PI/2; shaft.position.set(0,.55,1.3); shaft.name='shaft'; g.add(shaft);
  return g;
};
BUILDERS.dcmotor = ()=>{
  const g=new THREE.Group();
  const body=cyl(.6,.6,1.6,0x8a93a3); body.rotation.x=Math.PI/2; body.position.y=.6; g.add(body);
  const shaft=cyl(.1,.1,.5,0xd7dce3); shaft.rotation.x=Math.PI/2; shaft.position.set(0,.6,1); shaft.name='shaft'; g.add(shaft);
  return g;
};
BUILDERS.servo = ()=>{
  const g=new THREE.Group();
  const body=box(1.2,1.1,1.1,0x1e40af); body.position.y=.55; g.add(body);
  const horn=cyl(.35,.35,.12,0xffffff); horn.position.set(0,1.15,0); horn.name='horn'; g.add(horn);
  return g;
};
BUILDERS.servo360 = ()=>{
  const g=BUILDERS.servo(); g.children[0].material=M(0x7c2d12); return g;
};
BUILDERS.led = ()=>{
  const g=new THREE.Group();
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.35,20,16),M(0x991b1b,.3)); bulb.position.y=.6; bulb.name='bulb'; g.add(bulb);
  const l1=cyl(.03,.03,.5,0x9aa3ad); l1.position.set(-.12,.15,0); g.add(l1);
  const l2=l1.clone(); l2.position.x=.12; g.add(l2);
  return g;
};
BUILDERS.buzzer = ()=>{
  const g=new THREE.Group();
  const b=cyl(.55,.55,.45,0x222831); b.position.y=.25; g.add(b);
  const h=cyl(.15,.15,.06,0x000000); h.position.y=.5; g.add(h);
  return g;
};
BUILDERS.botao = ()=>{
  const g=new THREE.Group();
  const b=box(1,.4,1,0x374151); b.position.y=.2; g.add(b);
  const t=cyl(.25,.25,.2,0xdc2626); t.position.y=.5; t.name='top'; g.add(t);
  return g;
};
BUILDERS.wheel = ()=>{
  const g=new THREE.Group();
  const tire=cyl(.8,.8,.5,0x1f2430); tire.rotation.x=Math.PI/2; tire.name='spin'; g.add(tire);
  const hub=cyl(.35,.35,.54,0xd1d5db); hub.rotation.x=Math.PI/2; hub.name='spin'; g.add(hub);
  return g;
};

export const ELECTRONICS = [
  {cat:'Placas', items:[
    {id:'arduino', name:'Arduino UNO', desc:'Microcontrolador', kind:'mcu'},
    {id:'esp32', name:'ESP32 DevKit', desc:'Placa ESP32', kind:'mcu'},
    {id:'placa', name:'Placa Academe', desc:'ESP32 da Academe', kind:'mcu'},
  ]},
  {cat:'Sensores', items:[
    {id:'ultrasonic', name:'Ultrassônico', desc:'HC-SR04 distância', kind:'sensor'},
    {id:'ir', name:'Sensor IR', desc:'Detecta linha/obstáculo', kind:'sensor'},
    {id:'gas', name:'Sensor de gás', desc:'MQ inflamável', kind:'sensor'},
    {id:'color', name:'Sensor de cor', desc:'TCS3200 RGB', kind:'sensor'},
    {id:'ldr', name:'Sensor LDR', desc:'Nível de luz', kind:'sensor'},
    {id:'dht11', name:'DHT11', desc:'Temp + umidade', kind:'sensor'},
  ]},
  {cat:'Telas', items:[
    {id:'oled', name:'OLED', desc:'SSD1306 128×64', kind:'display'},
  ]},
  {cat:'Atuadores', items:[
    {id:'bomotor', name:'Motor BO', desc:'Motor com caixa de redução', kind:'actuator'},
    {id:'dcmotor', name:'Motor DC', desc:'Motor de tração', kind:'actuator'},
    {id:'servo', name:'Servo motor', desc:'Controle de ângulo', kind:'actuator'},
    {id:'servo360', name:'Servo 360°', desc:'Rotação contínua', kind:'actuator'},
    {id:'led', name:'LED', desc:'Saída de luz', kind:'actuator'},
    {id:'buzzer', name:'Buzzer', desc:'Saída de som', kind:'actuator'},
    {id:'botao', name:'Botão', desc:'Entrada digital', kind:'input'},
  ]},
];

// ---------- Presets ----------
BUILDERS.chassis2 = ()=>{
  const g=new THREE.Group();
  const base=box(5,.3,4,0x892CDD); base.position.y=1; g.add(base);
  const caster=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),M(0x666f7d)); caster.position.set(0,.5,1.8); g.add(caster);
  return g;
};
BUILDERS.chassis4 = ()=>{
  const g=new THREE.Group();
  const base=box(5.5,.3,4,0x5a1b9e); base.position.y=1; g.add(base);
  return g;
};
BUILDERS.leg = ()=>{
  const g=new THREE.Group();
  const hip=box(.7,.7,.7,0x374151); hip.position.y=2.2; g.add(hip);
  const up=box(.5,1.4,.6,0x892CDD); up.position.y=1.3; up.name='upper'; g.add(up);
  const lo=box(.4,1.3,.5,0xb9c0c9); lo.position.y=.2; lo.name='lower'; g.add(lo);
  return g;
};
BUILDERS.claw = ()=>{
  const g=new THREE.Group();
  const palm=box(1,.3,1,0x374151); palm.position.y=.8; g.add(palm);
  const f1=box(.18,1,.18,0x892CDD); f1.position.set(-.4,1.4,0); f1.rotation.z=.4; g.add(f1);
  const f2=f1.clone(); f2.position.x=.4; f2.rotation.z=-.4; g.add(f2);
  return g;
};
BUILDERS.head = ()=>{
  const g=new THREE.Group();
  const skull=box(1.6,1.4,1.5,0xd7dce3); skull.position.y=1.6; g.add(skull);
  const e1=box(.3,.3,.1,0x22d3ee); e1.position.set(-.4,1.7,.76); g.add(e1);
  const e2=e1.clone(); e2.position.x=.4; g.add(e2);
  const ant=cyl(.03,.03,.8,0x9aa3ad); ant.position.set(.5,2.7,0); g.add(ant);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.1),M(0xdc2626,0.3,0xdc2626)); tip.position.set(.5,3.1,0); g.add(tip);
  return g;
};
BUILDERS.propeller = ()=>{
  const g=new THREE.Group();
  const hub=cyl(.2,.2,.3,0x374151); hub.position.y=.6; hub.name='spinY'; g.add(hub);
  for(let i=0;i<3;i++){ const b=box(1.6,.06,.3,0x892CDD); b.position.y=.75; b.rotation.y=i*Math.PI*2/3;
    const hold=new THREE.Group(); hold.add(b); b.position.x=.9; hold.position.y=.75; hold.name='spinY'; hold.rotation.y=i*Math.PI*2/3; g.add(hold); }
  return g;
};
BUILDERS.nameplate = ()=>{
  const g=new THREE.Group();
  const p=box(3,.8,.12,0xffffff); p.position.y=1; g.add(p);
  return g;
};
BUILDERS.wheelpreset = BUILDERS.wheel;

export const PRESETS = [
  {id:'chassis2', name:'🚙 Chassi 2 rodas'},
  {id:'chassis4', name:'🚗 Chassi 4 rodas'},
  {id:'leg', name:'🦿 Perna'},
  {id:'claw', name:'🦾 Garra'},
  {id:'head', name:'🤖 Cabeça de robô'},
  {id:'propeller', name:'🌀 Hélice'},
  {id:'nameplate', name:'🏷️ Placa de nome'},
  {id:'wheelpreset', name:'🛞 Roda'},
];
