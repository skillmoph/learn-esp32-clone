// app.js — boot, sections, editor, run/stop, persistence
import { S, THREE, initScene, addShape, addGroup, select, deleteSelected, serialize, deserialize, undo, redo, pushUndo, setTheme, on, emit } from './js/scene.js';
import { BUILDERS, ELECTRONICS, PRESETS } from './js/parts.js';
import { PROJECTS, makeTrack } from './js/projects.js';
import { transpile } from './js/transpile.js';
import { SIM, buildAPI, startRig, stopRig, simFrame, invalidatePinCache, setTrack } from './js/sim.js';
import { renderSide, setSection, currentSection, wireBlockButtons } from './js/ui.js';

window.__builders = BUILDERS;
window.__S = S; window.__SIM = SIM;
const $ = s=>document.querySelector(s);
const viewport = $('#viewport');

initScene(viewport);
if(matchMedia('(prefers-color-scheme: light)').matches) toggleTheme();

// ---------- theme ----------
function toggleTheme(){
  const light = document.body.classList.toggle('light');
  setTheme(light);
  $('#theme').textContent = light ? '☀️ Claro' : '🌙 Escuro';
}
$('#theme').onclick = toggleTheme;

// ---------- sections ----------
const NAVTITLES = {cad:'CAD / Biblioteca', elec:'ELETRÔNICA / Componentes', code:'CÓDIGO / C++', sim:'SIMULAR / Física', cfg:'AJUSTES'};
function goSection(sec){
  setSection(sec);
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.sec===sec));
  $('#codewrap').classList.toggle('open', sec==='code');
  $('#side').classList.toggle('hidden', sec==='code');
  if(sec!=='code') renderSide();
  $('#sec-title').textContent = NAVTITLES[sec]||sec;
}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>goSection(b.dataset.sec));
$('#side-close').onclick=()=>$('#side').classList.add('hidden');

// ---------- editor ----------
const codeEl = $('#code'), gutter = $('#gutter');
function refreshGutter(){
  const n = codeEl.value.split('\n').length;
  gutter.textContent = Array.from({length:n},(_,i)=>i+1).join('\n');
}
codeEl.addEventListener('input', ()=>{ refreshGutter(); markDirty(); });
codeEl.addEventListener('scroll', ()=>{ gutter.scrollTop = codeEl.scrollTop; });
codeEl.addEventListener('keydown', e=>{
  if(e.key==='Tab'){ e.preventDefault();
    const st=codeEl.selectionStart;
    codeEl.value = codeEl.value.slice(0,st)+'  '+codeEl.value.slice(codeEl.selectionEnd);
    codeEl.selectionStart=codeEl.selectionEnd=st+2; refreshGutter();
  }
});
export function setCode(t){ codeEl.value=t; refreshGutter(); }
export function getCode(){ return codeEl.value; }

// ---------- templates ----------
const tpl = $('#templates');
PROJECTS.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; tpl.appendChild(o); });
tpl.onchange = ()=>{ if(tpl.value) loadProject(tpl.value); tpl.value=''; };
function loadProject(id){ curProject=id;
  const p = PROJECTS.find(x=>x.id===id); if(!p) return;
  stopSim();
  deserialize({objects:[]});
  setTrack(null);
  S.scene.children.filter(m=>m.name==='__track').forEach(m=>S.scene.remove(m));
  p.build(S);
  S.objects.forEach(o=>o.updateMatrixWorld(true));
  invalidatePinCache();
  setCode(p.code);
  $('#projname').value = p.name.replace(/^[^\s]+\s/,'');
  select(null); markSaved('Projeto pronto carregado');
}

// ---------- progress shared with the Academe lesson shell ----------
const EMBED=new URLSearchParams(location.search).get('embed');
if(EMBED) document.documentElement.classList.add('embed');
let curProject=new URLSearchParams(location.search).get('projeto')||'seguidor-linha';
function markDone(){
  setTimeout(()=>{ if(!SIM.running) return;
    try{ const k='robolab:done'; const l=JSON.parse(localStorage.getItem(k)||'[]');
      if(!l.includes(curProject)){ l.push(curProject); localStorage.setItem(k,JSON.stringify(l)); } }catch(e){}
  },4000);
}
// ---------- run / stop ----------
let runTask = null;
function println(t, cls){
  const c=$('#console');
  const line=document.createElement('div'); if(cls) line.className=cls; line.textContent=t;
  c.appendChild(line); c.scrollTop=c.scrollHeight;
}
async function runSim(){
  try{
    const fn = transpile(getCode());
    const api = buildAPI(println);
    $('#console').innerHTML='';
    println('✓ Compilado com sucesso — executando ▶');
    SIM.gravity = parseFloat($('#gravity').value);
    SIM.startTime = performance.now();
    startRig(); SIM.running = true;
    $('#run').disabled=true; $('#stop').disabled=false;
    $('#sim-state').innerHTML='<b>● Rodando</b>';
    markDone();
    const {setup, loop} = fn(api, Math);
    runTask = (async()=>{ await setup(); while(SIM.running) await loop(); })();
    runTask.catch(e=>{ if(SIM.running) println('✕ Erro: '+e.message, 'err'); stopSim(); });
  }catch(e){
    println('✕ Falha na compilação: '+e.message, 'err');
  }
}
function stopSim(){
  SIM.running=false;
  stopRig();
  $('#run').disabled=false; $('#stop').disabled=true;
  $('#sim-state').textContent='Parado';
}
$('#run').onclick=runSim;
$('#stop').onclick=stopSim;
$('#gravity').onchange=()=>{ SIM.gravity=parseFloat($('#gravity').value); };

// button press interaction
on('select', o=>{
  if(o && o.userData.robo?.kind==='botao' && SIM.running){
    const p=o.userData.robo.params; p.pressed=!p.pressed;
    const t=o.getObjectByName('top'); if(t) t.position.y = p.pressed?.42:.5;
  }
  updateStatus();
});

// telemetry + frame hook
let lastT = performance.now();
on('frame', ()=>{
  const now=performance.now(); const dt=Math.min((now-lastT)/1000,.05); lastT=now;
  simFrame(dt);
  if(SIM.running){
    const t=[]; 
    if(SIM.telemetry.distance!==undefined) t.push('Distância: '+SIM.telemetry.distance+' cm');
    t.push('Vel: '+(SIM.telemetry.speed||0));
    $('#sim-telemetry').textContent = t.join(' · ');
  }
});

// ---------- status / undo ----------
function updateStatus(){
  const n=S.objects.length;
  $('#empty-hint').style.display = n? 'none':'flex';
  $('#statusline').textContent = 'Objetos: '+n+' · '+(S.selected? S.selected.userData.robo.name : 'Nada selecionado');
}
on('changed', ()=>{ updateStatus(); markDirty(); });
$('#undo').onclick=undo; $('#redo').onclick=redo;

let dirty=false;
function markDirty(){ dirty=true; $('#cloud-status').textContent='● Não salvo'; }
function markSaved(t){ dirty=false; $('#cloud-status').textContent=t||'✓ Salvo no navegador'; }

// ---------- file menu / persistence ----------
const menu = $('#filemenu-open');
$('#filemenu').onclick=e=>{ e.stopPropagation(); menu.classList.toggle('open'); };
document.addEventListener('click',()=>menu.classList.remove('open'));
menu.addEventListener('click', e=>e.stopPropagation());

const LS='robolab.projects';
const readSaved=()=>{ try{return JSON.parse(localStorage.getItem(LS))||[]}catch(e){return[]} };
function currentData(){ return {name:$('#projname').value, code:getCode(), scene:serialize(), gravity:$('#gravity').value}; }
function loadData(d){
  deserialize(d.scene||{objects:[]});
  setCode(d.code||'void setup() {\n}\n\nvoid loop() {\n}\n');
  $('#projname').value=d.name||'Robô sem nome';
  if(d.gravity) $('#gravity').value=d.gravity;
  select(null);
}
menu.onclick=e=>{
  const act=e.target.dataset?.act; if(!act) return;
  menu.classList.remove('open');
  if(act==='new'){ if(confirm('Começar um projeto novo? O atual só se mantém se estiver salvo.')){ loadData({}); markDirty(); } }
  if(act==='open') openSavedModal();
  if(act==='export'){
    const blob=new Blob([JSON.stringify(currentData(),null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=($('#projname').value||'robo')+'.json'; a.click();
  }
  if(act==='import') $('#import-file').click();
  if(act==='share'){
    const b=btoa(unescape(encodeURIComponent(JSON.stringify(currentData()))));
    const url=location.origin+'/robolab/app#p='+b;
    navigator.clipboard.writeText(url).then(()=>markSaved('✓ Link copiado'));
  }
};
$('#import-file').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{ loadData(JSON.parse(await f.text())); markDirty(); }catch(err){ alert('Arquivo inválido.'); }
  e.target.value='';
};
$('#save').onclick=()=>{
  const list=readSaved();
  const name=$('#projname').value||'Robô sem nome';
  const i=list.findIndex(p=>p.name===name);
  const rec={...currentData(), savedAt:new Date().toISOString()};
  if(i>=0) list[i]=rec; else list.push(rec);
  localStorage.setItem(LS, JSON.stringify(list));
  markSaved();
};
function openSavedModal(){
  const list=readSaved();
  showModal(`<h2>📂 Abrir projeto salvo</h2>
    <div id="saved-list">${list.length? list.map((p,i)=>
      `<button data-i="${i}">${p.name}<small>${new Date(p.savedAt).toLocaleString('pt-BR')}</small></button>`).join('')
      : '<p>Nenhum projeto salvo ainda. Aperte 💾 Salvar para guardar seu trabalho.</p>'}</div>
    <div class="close-row"><button class="tbtn" id="m-close">Fechar</button></div>`);
  document.querySelectorAll('#saved-list button').forEach(b=>b.onclick=()=>{
    loadData(readSaved()[+b.dataset.i]); closeModal(); markSaved('✓ Projeto aberto');
  });
  $('#m-close').onclick=closeModal;
}

// ---------- modal ----------
function showModal(html){ $('#modal-card').innerHTML=html; $('#modal').classList.add('open'); }
function closeModal(){ $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });

$('#learn').onclick=()=>{
  showModal(`<h2>🎓 Tour rápido do RoboLab</h2>
  <div class="step-t">1 · Modele (CAD)</div><p>Escolha peças na Biblioteca à direita (ou teclas 1–0). Clique num objeto para selecionar; use Mover (W), Rotacionar (E) e Escalar (R). Delete remove.</p>
  <div class="step-t">2 · Ligue a eletrônica (ELETRÔNICA)</div><p>Adicione placas, sensores e atuadores. Selecione um componente e defina os pinos dele na aba Desenho — é assim que o código encontra o hardware.</p>
  <div class="step-t">3 · Programe (CÓDIGO)</div><p>Abra um dos 10 projetos prontos no menu 📚, ou escreva seu C++ de Arduino. Prefere blocos? Monte o programa em 🧩 Blocos e ele vira C++ de verdade.</p>
  <div class="step-t">4 · Rode (▶)</div><p>Aperte Rodar e veja seu robô se mover com física de verdade. Troque a gravidade para Lua, Marte ou Zero-G e sinta a diferença.</p>
  <div class="step-t">5 · Guarde</div><p>💾 Salvar grava no navegador. Em ☰ Arquivo você exporta JSON e copia um link de compartilhamento.</p>
  <div class="close-row"><button class="tbtn primary" id="m-close">Começar</button></div>`);
  $('#m-close').onclick=closeModal;
};

// ---------- hotkeys ----------
const HOT = ['Cubo','Esfera','Cilindro','Cone','Caixa','Plano','Toro','Cápsula','Tetraedro','Octaedro'];
document.addEventListener('keydown', e=>{
  if(e.target.matches('input,textarea,select')) return;
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
  const k=e.key.toLowerCase();
  if(k>='0'&&k<='9'){ addShape(HOT[(+k+9)%10]); return; }
  if(k==='w') setMode('translate'); if(k==='e') setMode('rotate'); if(k==='r') setMode('scale');
  if(k==='g'){ S.grid.visible=!S.grid.visible; }
  if(k==='a'){ S.axes.visible=!S.axes.visible; }
  if(k==='delete'||k==='backspace'){ deleteSelected(); }
  if(k==='f'&&S.selected){ const p=S.selected.position; S.orbit.target.set(p.x,p.y,p.z); }
});
function setMode(m){
  S.tc.setMode(m);
  document.querySelectorAll('#quicktools [data-mode]').forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
}
document.querySelectorAll('#quicktools [data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#qt-grid').onclick=()=>{ S.grid.visible=!S.grid.visible; };
$('#qt-axes').onclick=()=>{ S.axes.visible=!S.axes.visible; };
const snaps=[0,.5,1,2]; let snapI=2;
$('#qt-snap').onclick=()=>{
  snapI=(snapI+1)%snaps.length; const v=snaps[snapI];
  S.tc.setTranslationSnap(v||null); S.tc.setRotationSnap(v?THREE.MathUtils.degToRad(15):null);
  $('#qt-snap').firstChild.textContent='Snap: '+(v||'off')+' ';
};
$('#qt-min').onclick=()=>{ const b=$('#qt-body'); b.style.display=b.style.display==='none'?'flex':'none'; };

// ---------- boot: project from URL ----------
function boot(){
  const q=new URLSearchParams(location.search);
  const h=location.hash;
  if(h.startsWith('#p=')){
    try{ loadData(JSON.parse(decodeURIComponent(escape(atob(h.slice(3)))))); markSaved('✓ Projeto compartilhado aberto'); return; }catch(e){}
  }
  if(q.get('projeto')){ loadProject(q.get('projeto')); return; }
  loadProject('seguidor-linha');
}
wireBlockButtons();
goSection('cad');
boot();
updateStatus();
