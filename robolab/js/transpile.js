// transpile.js — Arduino C++ subset → async JS
export function transpile(src){
  let s = src;
  const strings = [];
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, m=>{ strings.push(m); return '\u0001'+(strings.length-1)+'\u0001'; });
  s = s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  s = s.replace(/^\s*#include[^\n]*/gm,'');
  s = s.replace(/^\s*#define\s+(\w+)\s+([^\n]+)/gm,'const $1 = $2;');
  // Servo declarations
  s = s.replace(/^\s*Servo\s+(\w+)\s*;/gm,'let $1 = api.newServo();');
  // types
  s = s.replace(/\b(?:unsigned\s+long|unsigned\s+int|long\s+long|long|int|float|double|byte|boolean|bool|char|String)\s+(?=\w+\s*[=;,)])/g,'let ');
  s = s.replace(/\b(?:unsigned\s+long|unsigned\s+int|long|int|float|double|byte|boolean|bool|char|String)\s+(\w+)\s*\[/g,'let $1 = [/*');
  // functions: make everything async
  s = s.replace(/\bvoid\s+(\w+)\s*\(/g,'async function $1(');
  // arduino API
  const apiMap = {pinMode:'api.pinMode',digitalWrite:'api.digitalWrite',analogWrite:'api.analogWrite',
    digitalRead:'api.digitalRead',analogRead:'api.analogRead',delay:'api.delay',tone:'api.tone',
    noTone:'api.noTone',millis:'api.millis',pulseIn:'api.pulseIn',random:'api.random',map:'api.map',
    oledPrint:'api.oledPrint',oledClear:'api.oledClear',
    constrain:'api.constrain',abs:'Math.abs',min:'Math.min',max:'Math.max',sqrt:'Math.sqrt'};
  for(const [k,v] of Object.entries(apiMap)){
    s = s.replace(new RegExp('(?<![\\w.])'+k+'\\s*\\(','g'), v+'(');
  }
  s = s.replace(/\bSerial\.(print|println)\s*\(/g,'api.print(');
  s = s.replace(/\bSerial\.begin\s*\([^)]*\)\s*;?/g,'');
  // await all api calls (delay etc.)
  s = s.replace(/(?<!await )(?<!function )(?<!\.)\b(api\.(?!newServo)\w+)\(/g,'await $1(');
  // await user functions
  const fns = [...s.matchAll(/async function (\w+)\(/g)].map(m=>m[1]).filter(f=>f!=='setup'&&f!=='loop');
  for(const f of fns){
    s = s.replace(new RegExp('(?<![\\w.])(?<!await )(?<!function )'+f+'\\s*\\(','g'), 'await '+f+'(');
  }
  s = s.replace(/\u0001(\d+)\u0001/g, (m,i)=>strings[+i]);
  if(!/async function setup\s*\(/.test(s) && !/async function loop\s*\(/.test(s))
    throw new Error('O código precisa de setup() e loop().');
  const body = '"use strict";\nconst OUTPUT=1,INPUT=0,INPUT_PULLUP=2,HIGH=1,LOW=0;\n'+s+'\nreturn {setup: typeof setup!=="undefined"?setup:async()=>{}, loop: typeof loop!=="undefined"?loop:async()=>{}};';
  return new Function('api','Math', body);
}
