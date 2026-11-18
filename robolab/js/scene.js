// scene.js — 3D workbench: renderer, shapes, selection, transform, undo
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export const S = {
  scene:null, camera:null, renderer:null, orbit:null, tc:null,
  objects:[], selected:null, grid:null, axes:null,
  listeners:{}, ground:null,
  undoStack:[], redoStack:[],
};

export function on(ev,fn){ (S.listeners[ev]??=[]).push(fn); }
export function emit(ev,...a){ (S.listeners[ev]||[]).forEach(f=>f(...a)); }

const MAT = (c=0x892CDD,r=0.55)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:.15});

export function initScene(container){
  S.scene = new THREE.Scene();
  S.scene.background = new THREE.Color(0x12041f);
  S.scene.fog = new THREE.Fog(0x12041f, 90, 220);
  S.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  S.camera.position.set(16, 14, 18);
  S.renderer = new THREE.WebGLRenderer({antialias:true});
  S.renderer.shadowMap.enabled = true;
  container.appendChild(S.renderer.domElement);
  S.orbit = new OrbitControls(S.camera, S.renderer.domElement);
  S.orbit.enableDamping = true; S.orbit.mouseButtons = {LEFT:null, MIDDLE:THREE.MOUSE.ROTATE, RIGHT:THREE.MOUSE.PAN};
  S.orbit.target.set(0, 1, 0);
  const hemi = new THREE.HemisphereLight(0xcbb4f5, 0x1a0b2e, 1.0); S.scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.6); dir.position.set(14, 24, 10);
  dir.castShadow = true; dir.shadow.mapSize.set(2048,2048);
  dir.shadow.camera.left=-40; dir.shadow.camera.right=40; dir.shadow.camera.top=40; dir.shadow.camera.bottom=-40;
  S.scene.add(dir);
  S.ground = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshStandardMaterial({color:0x1c0930, roughness:.95}));
  S.ground.rotation.x = -Math.PI/2; S.ground.receiveShadow = true; S.ground.name='__ground';
  S.scene.add(S.ground);
  S.grid = new THREE.GridHelper(60, 60, 0x892CDD, 0x3a2058); S.grid.position.y=.001; S.scene.add(S.grid);
  S.axes = new THREE.AxesHelper(4); S.axes.position.y=.002; S.scene.add(S.axes);
  S.tc = new TransformControls(S.camera, S.renderer.domElement);
  S.tc.addEventListener('dragging-changed', e=>{ S.orbit.enabled = !e.value; if(!e.value) pushUndo(); });
  S.scene.add(S.tc);
  // picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  S.renderer.domElement.addEventListener('pointerdown', e=>{
    if(e.button!==0 || S.tc.dragging) return;
    ptr.x = (e.offsetX/S.renderer.domElement.clientWidth)*2-1;
    ptr.y = -(e.offsetY/S.renderer.domElement.clientHeight)*2+1;
    ray.setFromCamera(ptr, S.camera);
    const hits = ray.intersectObjects(S.scene.children, true);
    for(const h of hits){
      let o = h.object;
      while(o && !o.userData.robo) o = o.parent;
      if(o){ select(o); return; }
    }
    select(null);
  });
  function resize(){
    const w=container.clientWidth, h=container.clientHeight;
    S.camera.aspect=w/h; S.camera.updateProjectionMatrix(); S.renderer.setSize(w,h);
  }
  new ResizeObserver(resize).observe(container); resize();
  (function loop(){ requestAnimationFrame(loop); S.orbit.update(); emit('frame'); S.renderer.render(S.scene, S.camera); })();
}

export function setTheme(light){
  S.scene.background.set(light?0xf3eefb:0x12041f);
  S.scene.fog.color.set(light?0xf3eefb:0x12041f);
  S.ground.material.color.set(light?0xe8dff7:0x1c0930);
}

function reg(mesh, name, kind, extra={}){
  mesh.userData.robo = { id:'o'+Math.random().toString(36).slice(2,8), name, kind, ...extra };
  mesh.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } });
  S.scene.add(mesh); S.objects.push(mesh);
  pushUndo(); emit('changed'); return mesh;
}

const GEOS = {
  'Cubo':()=>new THREE.BoxGeometry(2,2,2),
  'Esfera':()=>new THREE.SphereGeometry(1.2,32,24),
  'Cilindro':()=>new THREE.CylinderGeometry(1,1,2,32),
  'Cone':()=>new THREE.ConeGeometry(1.2,2.2,32),
  'Caixa':()=>new THREE.BoxGeometry(3,1,2),
  'Plano':()=>new THREE.BoxGeometry(4,.15,4),
  'Toro':()=>new THREE.TorusGeometry(1.2,.45,20,40),
  'Cápsula':()=>new THREE.CapsuleGeometry(.8,1.4,8,20),
  'Tetraedro':()=>new THREE.TetrahedronGeometry(1.5),
  'Octaedro':()=>new THREE.OctahedronGeometry(1.4),
  'Prisma Tri':()=>{const g=new THREE.CylinderGeometry(1.2,1.2,2,3);return g;},
  'Prisma Hex':()=>new THREE.CylinderGeometry(1.2,1.2,1.4,6),
  'Pirâmide':()=>new THREE.ConeGeometry(1.4,2,4),
};

export function addShape(name, opts={}){
  const mesh = new THREE.Mesh(GEOS[name](), MAT(opts.color ?? 0x892CDD));
  mesh.position.set((Math.random()*4-2), 1.2, (Math.random()*4-2));
  return reg(mesh, name, 'shape');
}

export function addGroup(group, name, kind, extra){ return reg(group, name, kind, extra); }

export function select(obj){
  S.selected = obj;
  if(obj) S.tc.attach(obj); else S.tc.detach();
  emit('select', obj);
  emit('changed');
}
export function deleteSelected(){
  if(!S.selected) return;
  const o=S.selected; select(null);
  S.scene.remove(o); S.objects = S.objects.filter(x=>x!==o);
  pushUndo(); emit('changed');
}

export function serialize(){
  return { version:'1.0', objects: S.objects.map(o=>({
    ud:o.userData.robo,
    p:o.position.toArray(), r:[o.rotation.x,o.rotation.y,o.rotation.z], s:o.scale.toArray(),
    c:(()=>{const m=o.isMesh?o.material:o.children.find(c=>c.isMesh)?.material; return m? '#'+m.color.getHexString():null;})(),
  }))};
}
export function deserialize(data){
  [...S.objects].forEach(o=>{ S.scene.remove(o); }); S.objects=[]; select(null);
  (data.objects||[]).forEach(rec=>{
    let o;
    if(rec.ud.build){ o = window.__builders?.[rec.ud.build]?.(rec.ud.params||{}); }
    else if(GEOS[rec.ud.kind] || GEOS[rec.ud.name]){ o = new THREE.Mesh((GEOS[rec.ud.kind]||GEOS[rec.ud.name])(), MAT()); }
    else o = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), MAT(0x888888));
    if(!o) return;
    o.position.fromArray(rec.p); o.rotation.set(...rec.r); o.scale.fromArray(rec.s);
    if(rec.c){ const m=o.isMesh?o.material:o.children.find(c=>c.isMesh)?.material; if(m) m.color.set(rec.c); }
    reg(o, rec.ud.name, rec.ud.kind, {...rec.ud});
  });
  S.undoStack=[]; S.redoStack=[];
  emit('changed');
}

export function pushUndo(){
  try{
    S.undoStack.push(JSON.stringify(serialize()));
    if(S.undoStack.length>30) S.undoStack.shift();
    S.redoStack=[];
  }catch(e){}
}
export function undo(){
  if(S.undoStack.length<2) return;
  S.redoStack.push(S.undoStack.pop());
  deserializeQuiet(S.undoStack[S.undoStack.length-1]);
}
export function redo(){
  if(!S.redoStack.length) return;
  const s=S.redoStack.pop(); S.undoStack.push(s); deserializeQuiet(s);
}
function deserializeQuiet(json){
  const u=S.undoStack, r=S.redoStack;
  deserialize(JSON.parse(json));
  S.undoStack=u; S.redoStack=r; emit('changed');
}
export { THREE };
