// ui.js — side panels, design form, blocks editor
import { S, addShape, addGroup, select, deleteSelected, pushUndo, on, THREE } from './scene.js';
import { BUILDERS, ELECTRONICS, PRESETS } from './parts.js';
import { setCode, getCode } from '../app.js';
import { invalidatePinCache } from './sim.js';

const $=s=>document.querySelector(s);
let section='cad', tab={cad:'Biblioteca', elec:'Componentes', sim:'Física', cfg:'Geral'};
export function setSection(s){ section=s; }
export function currentSection(){ return section; }

const SHAPES = ['Cubo','Esfera','Cilindro','Cone','Caixa','Plano','Toro','Cápsula','Tetraedro','Octaedro','Prisma Tri','Prisma Hex','Pirâmide'];
const PINFIELDS = {bomotor:[['pin','Pino PWM'],['side','Lado (L/R)']], dcmotor:[['pin','Pino PWM'],['side','Lado (L/R)']],
  servo:[['sig','Pino sinal']], servo360:[['pin','Pino PWM'],['side','Lado (L/R)']], led:[['pin','Pino']],
  buzzer:[['pin','Pino']], botao:[['sig','Pino']], ir:[['sig','Pino']], ultrasonic:[['trig','Pino TRIG'],['echo','Pino ECHO']],
  ldr:[['sig','Pino']], gas:[['sig','Pino']], color:[['sig','Pino']], dht11:[['sig','Pino']]};

export function renderSide(){
  const tabsEl=$('#side-tabs'), body=$('#side-body');
  const TABS = {cad:['Biblioteca','Desenho','Visão geral'], elec:['Componentes','Fiação','Desenho'],
    sim:['Física'], cfg:['Geral']}[section]||[];
  tabsEl.innerHTML='';
  TABS.forEach(t=>{
    const b=document.createElement('button'); b.textContent=t;
    b.classList.toggle('active', tab[section]===t);
    b.onclick=()=>{ tab[section]=t; renderSide(); };
    tabsEl.appendChild(b);
  });
  body.innerHTML='';
  const t = tab[section];
  if(section==='cad'){
    if(t==='Biblioteca') renderLibrary(body);
    if(t==='Desenho') renderDesign(body);
    if(t==='Visão geral') renderOverview(body);
  } else if(section==='elec'){
    if(t==='Componentes') renderElec(body);
    if(t==='Fiação') renderWiring(body);
    if(t==='Desenho') renderDesign(body);
  } else if(section==='sim'){
    renderSimInfo(body);
  } else if(section==='cfg'){
    renderCfg(body);
  }
}

function renderLibrary(body){
  body.innerHTML = `<div class="hint">Clique para adicionar à bancada. Teclas 1–0 adicionam as 10 primeiras formas.</div>
    <div class="cat">Básicas</div><div class="lib-grid" id="lg1"></div>
    <div class="cat">Modelos prontos</div><div class="lib-grid" id="lg2"></div>`;
  const g1=body.querySelector('#lg1'), g2=body.querySelector('#lg2');
  SHAPES.forEach(n=>{ const b=document.createElement('button'); b.textContent=n; b.onclick=()=>addShape(n); g1.appendChild(b); });
  PRESETS.forEach(p=>{ const b=document.createElement('button'); b.textContent=p.name; b.onclick=()=>{
    const o=addGroup(BUILDERS[p.id](), p.name.replace(/^[^\s]+\s/,''), p.id==='wheelpreset'?'wheel':'preset', {params:{}, build:p.id});
    o.position.set(Math.random()*4-2, 0, Math.random()*4-2); select(o);
  }; g2.appendChild(b); });
}

function renderElec(body){
  body.innerHTML = `<div class="hint">Adicione componentes e depois defina os pinos na aba Desenho. O código encontra o hardware pelo pino.</div>`;
  ELECTRONICS.forEach(c=>{
    const cat=document.createElement('div'); cat.className='cat'; cat.textContent=c.cat; body.appendChild(cat);
    const grid=document.createElement('div'); grid.className='lib-grid'; body.appendChild(grid);
    c.items.forEach(it=>{
      const b=document.createElement('button'); b.innerHTML=`${it.name}<br><small style="color:var(--dim)">${it.desc}</small>`;
      b.onclick=()=>{
        const params = defaultPins(it.id);
        const o=addGroup(BUILDERS[it.id](), it.name, it.id, {params, build:it.id});
        o.position.set(Math.random()*4-2, 0, Math.random()*4-2);
        invalidatePinCache(); select(o);
      };
      grid.appendChild(b);
    });
  });
}
function defaultPins(id){
  return {bomotor:{pin:3,side:'L'},dcmotor:{pin:3,side:'L'},servo:{sig:9},servo360:{pin:3,side:'R'},
    led:{pin:13},buzzer:{pin:8},botao:{sig:2},ir:{sig:7},ultrasonic:{trig:12,echo:11},
    ldr:{sig:0},gas:{sig:1},color:{sig:4},dht11:{sig:4}}[id]||{};
}

function renderWiring(body){
  body.innerHTML = `<div class="hint">Mapa de fiação: qual componente está em qual pino. Edite na aba Desenho.</div>`;
  const rows = S.objects.filter(o=>PINFIELDS[o.userData.robo?.kind]);
  if(!rows.length){ body.innerHTML += `<p class="hint">Nenhum componente eletrônico na cena ainda.</p>`; return; }
  rows.forEach(o=>{
    const ud=o.userData.robo;
    const d=document.createElement('div'); d.className='ov-item';
    d.innerHTML=`<span class="nm">${ud.name}</span><small style="color:var(--dim)">${PINFIELDS[ud.kind].map(([k,l])=>l.replace('Pino ','')+': '+(ud.params[k]??'—')).join(' · ')}</small>`;
    d.onclick=()=>{ select(o); tab[section]='Desenho'; renderSide(); };
    body.appendChild(d);
  });
}

function renderDesign(body){
  const o=S.selected;
  if(!o){ body.innerHTML=`<div class="hint">🛠 Selecione um objeto na bancada para editar tamanho, cor, posição e pinos.</div>`; return; }
  const ud=o.userData.robo;
  body.innerHTML='';
  const mk=(label, inner)=>{ const f=document.createElement('div'); f.className='field';
    f.innerHTML=`<label>${label}</label>`; f.appendChild(inner); body.appendChild(f); return inner; };
  const nameIn=document.createElement('input'); nameIn.value=ud.name;
  nameIn.onchange=()=>{ ud.name=nameIn.value; pushUndo(); emit2(); };
  mk('Nome', nameIn);
  const mesh=o.isMesh?o:o.children.find(c=>c.isMesh);
  if(mesh){
    const col=document.createElement('input'); col.type='color'; col.value='#'+mesh.material.color.getHexString();
    col.onchange=()=>{ mesh.material.color.set(col.value); pushUndo(); };
    mk('Cor', col);
  }
  ['x','y','z'].forEach((ax,i)=>{
    const inp=document.createElement('input'); inp.type='number'; inp.step='0.5'; inp.value=o.position[ax].toFixed(1);
    inp.onchange=()=>{ o.position[ax]=parseFloat(inp.value)||0; pushUndo(); };
    mk('Pos '+ax.toUpperCase(), inp);
  });
  (PINFIELDS[ud.kind]||[]).forEach(([k,label])=>{
    const inp=document.createElement(k==='side'?'select':'input');
    if(k==='side'){ inp.innerHTML='<option>L</option><option>R</option>'; inp.value=ud.params.side||'L'; }
    else { inp.type='number'; inp.value=ud.params[k]??0; }
    inp.onchange=()=>{ ud.params[k]= k==='side'? inp.value : (+inp.value||0); invalidatePinCache(); pushUndo(); };
    mk(label, inp);
  });
  const del=document.createElement('button'); del.className='tbtn'; del.style.marginTop='8px'; del.textContent='🗑 Excluir objeto';
  del.onclick=()=>{ deleteSelected(); renderSide(); };
  body.appendChild(del);
}
function emit2(){ const ev=new Event('x'); }

function renderOverview(body){
  body.innerHTML = `<div class="hint">${S.objects.length} objeto(s) na cena.</div>`;
  S.objects.forEach(o=>{
    const d=document.createElement('div'); d.className='ov-item'+(o===S.selected?' sel':'');
    d.innerHTML=`<span class="nm">${o.userData.robo.name}</span>`;
    const x=document.createElement('button'); x.textContent='🗑';
    x.onclick=e=>{ e.stopPropagation(); select(o); deleteSelected(); renderSide(); };
    d.appendChild(x);
    d.onclick=()=>{ select(o); renderSide(); };
    body.appendChild(d);
  });
}

function renderSimInfo(body){
  body.innerHTML = `<div class="hint">🌍 A simulação usa física simplificada de verdade: tração, giro diferencial e gravidade (Terra, Lua, Marte ou Zero-G) mudam como o robô anda.</div>
  <div class="cat">Como rodar</div>
  <p class="hint">1. Monte ou abra um projeto pronto.<br>2. Vá em CÓDIGO e aperte ▶ Rodar.<br>3. Escolha a gravidade na barra inferior.<br>4. ■ Parar devolve o robô ao lugar.</p>
  <div class="cat">Sensores vivos</div>
  <p class="hint">Sensor IR lê a pista preta no chão. O ultrassônico mede distância de obstáculos. LED acende, servo gira, buzzer toca e a telinha OLED mostra texto.</p>`;
}

function renderCfg(body){
  body.innerHTML=`<div class="cat">Geral</div>`;
  const b1=document.createElement('button'); b1.className='tbtn'; b1.textContent='🗑 Apagar todos os projetos salvos';
  b1.onclick=()=>{ if(confirm('Apagar TODOS os projetos salvos neste navegador?')){ localStorage.removeItem('robolab.projects'); } };
  body.appendChild(b1);
  const p=document.createElement('p'); p.className='hint'; p.style.marginTop='12px';
  p.textContent='RoboLab Academe · oficina de robôs 3D gratuita · seus projetos ficam só no seu navegador.';
  body.appendChild(p);
}

// ---------- blocks editor ----------
const BLOCKS = [
  {id:'ledOn', label:'💡 Ligar LED no pino', fields:[['pin',13]], gen:f=>`digitalWrite(${f.pin}, HIGH);`},
  {id:'ledOff', label:'💡 Desligar LED no pino', fields:[['pin',13]], gen:f=>`digitalWrite(${f.pin}, LOW);`},
  {id:'motor', label:'⚙️ Motor no pino com velocidade', fields:[['pin',3],['vel',200]], gen:f=>`analogWrite(${f.pin}, ${f.vel});`},
  {id:'servo', label:'🦾 Servo no pino para o ângulo', fields:[['pin',9],['ang',90]], gen:f=>`braco.write(${f.ang});`, setup:'braco.attach(__PIN__);'},
  {id:'wait', label:'⏱ Esperar (ms)', fields:[['ms',500]], gen:f=>`delay(${f.ms});`},
  {id:'beep', label:'🔔 Tocar nota no pino', fields:[['pin',8],['freq',440]], gen:f=>`tone(${f.pin}, ${f.freq}, 200);`},
  {id:'print', label:'🖥 Escrever no serial', fields:[['txt','Ola']], text:true, gen:f=>`Serial.println("${f.txt}");`},
];
let program = [];
export function renderBlocks(){
  const pal=$('#blockpalette'), prog=$('#blockprog');
  pal.innerHTML='<div class="cat">Blocos</div>';
  BLOCKS.forEach(b=>{
    const el=document.createElement('button'); el.className='blk'; el.textContent=b.label;
    el.onclick=()=>{ program.push({id:b.id, f:Object.fromEntries(b.fields)}); renderBlocks(); };
    pal.appendChild(el);
  });
  prog.innerHTML='<div class="cat" style="margin-top:0">Seu programa (roda para sempre)</div>';
  if(!program.length) prog.innerHTML+='<p class="hint">Clique nos blocos à esquerda para montar o programa.</p>';
  program.forEach((row,i)=>{
    const def=BLOCKS.find(b=>b.id===row.id);
    const el=document.createElement('div'); el.className='brow';
    el.append(def.label+' ');
    def.fields.forEach(([k])=>{
      const inp=document.createElement('input'); inp.value=row.f[k];
      inp.onchange=()=>{ row.f[k]= def.text? inp.value : (+inp.value||0); };
      el.appendChild(inp);
    });
    const del=document.createElement('button'); del.className='del'; del.textContent='✕';
    del.onclick=()=>{ program.splice(i,1); renderBlocks(); };
    el.appendChild(del);
    prog.appendChild(el);
  });
  const use=document.createElement('button'); use.className='tbtn primary'; use.textContent='</> Usar no C++';
  use.onclick=()=>{ setCode(blocksToCpp()); toggleEditors(false); };
  prog.appendChild(use);
}
function blocksToCpp(){
  const needsServo = program.some(r=>r.id==='servo');
  const sp = program.find(r=>r.id==='servo');
  let out = '// Programa montado em blocos 🧩\n';
  if(needsServo) out+='Servo braco;\n';
  out+='\nvoid setup() {\n  Serial.begin(9600);\n';
  if(needsServo) out+=`  braco.attach(${sp.f.pin});\n`;
  out+='}\n\nvoid loop() {\n';
  program.forEach(r=>{ const def=BLOCKS.find(b=>b.id===r.id); out+='  '+def.gen(r.f)+'\n'; });
  out+='  delay(30);\n}\n';
  return out;
}
export function toggleEditors(showBlocks){
  $('#blockswrap').classList.toggle('open', showBlocks);
  $('#editorcol').style.display = showBlocks? 'none':'flex';
  $('#tab-blocks').style.display = showBlocks? 'none':'';
  $('#tab-cpp').style.display = showBlocks? '':'none';
  if(showBlocks) renderBlocks();
}
export function wireBlockButtons(){
  $('#tab-blocks').onclick=()=>toggleEditors(true);
  $('#tab-cpp').onclick=()=>toggleEditors(false);
}
