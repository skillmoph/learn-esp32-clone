// projects.js — ready-to-run projects
import { THREE, addGroup } from './scene.js';
import { BUILDERS } from './parts.js';
import { setTrack } from './sim.js';

function put(builderId, name, kind, x, y, z, params={}, ry=0){
  const o = addGroup(BUILDERS[builderId](), name, kind, {params, build:builderId});
  o.position.set(x,y,z); o.rotation.y = ry;
  return o;
}
export function makeTrack(){
  const cv = document.createElement('canvas'); cv.width=cv.height=512;
  const c = cv.getContext('2d');
  c.fillStyle='#241038'; c.fillRect(0,0,512,512);
  c.strokeStyle='#0a0a0a'; c.lineWidth=22; c.lineCap='round';
  c.beginPath();
  c.moveTo(120,110); c.lineTo(392,110); c.quadraticCurveTo(452,110,452,180);
  c.lineTo(452,340); c.quadraticCurveTo(452,410,392,410);
  c.lineTo(120,410); c.quadraticCurveTo(60,410,60,340);
  c.lineTo(60,180); c.quadraticCurveTo(60,110,120,110);
  c.stroke();
  const size = 60;
  const tex = new THREE.CanvasTexture(cv);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size,size),
    new THREE.MeshStandardMaterial({map:tex, roughness:.9}));
  plane.rotation.x=-Math.PI/2; plane.position.y=.005; plane.receiveShadow=true;
  plane.name='__track';
  setTrack({canvas:cv, size});
  return plane;
}

export const PROJECTS = [
{ id:'seguidor-linha', name:'🏎️ Seguidor de linha',
  build(S){
    const t = makeTrack(); S.scene.add(t);
    put('chassis2','Chassi','preset', 0,0,-14);
    put('bomotor','Motor esquerdo','bomotor', -2.2,0.3,-14, {pin:5, side:'L'}, 0);
    put('bomotor','Motor direito','bomotor', 2.2,0.3,-14, {pin:6, side:'R'}, 0);
    put('arduino','Arduino UNO','mcu', 0,1.15,-14.4);
    put('ir','Sensor IR esquerdo','ir', -1.1,0.25,-16.6, {sig:7});
    put('ir','Sensor IR direito','ir', 1.1,0.25,-16.6, {sig:8});
  },
  code:
`// SEGUIDOR DE LINHA — sensores IR nos pinos 7 (esq) e 8 (dir)
// Motores: esquerdo pino 5, direito pino 6
// Se o sensor vê a linha PRETA -> ajusta o rumo

int motorEsq = 5;
int motorDir = 6;
int irEsq = 7;
int irDir = 8;

void setup() {
  pinMode(motorEsq, OUTPUT);
  pinMode(motorDir, OUTPUT);
  pinMode(irEsq, INPUT);
  pinMode(irDir, INPUT);
  Serial.begin(9600);
}

void loop() {
  int esq = digitalRead(irEsq);   // 1 = linha preta embaixo
  int dir = digitalRead(irDir);

  if (esq == 1 && dir == 1) {          // os dois na linha: reto
    analogWrite(motorEsq, 220);
    analogWrite(motorDir, 220);
  } else if (esq == 1) {               // saiu pela direita: vira à esquerda
    analogWrite(motorEsq, 0);
    analogWrite(motorDir, 200);
  } else if (dir == 1) {               // saiu pela esquerda: vira à direita
    analogWrite(motorEsq, 200);
    analogWrite(motorDir, 0);
  } else {                             // perdeu a linha: anda devagar
    analogWrite(motorEsq, 90);
    analogWrite(motorDir, 90);
  }
  delay(30);
}`},

{ id:'rampa-motor', name:'⚡ Rampa de motor',
  build(S){
    put('dcmotor','Motor DC','dcmotor', 0,0,0, {pin:3, side:'L'});
    put('wheelpreset','Roda','wheel', 0,0.6,2, {});
    put('arduino','Arduino UNO','mcu', 3.5,0,0);
  },
  code:
`// RAMPA DE MOTOR — motor DC no pino 3 (PWM)
int pinoMotor = 3;

void setup() {
  pinMode(pinoMotor, OUTPUT);
}

void loop() {
  analogWrite(pinoMotor, 220);  // rápido
  delay(2000);
  analogWrite(pinoMotor, 80);   // devagar
  delay(1000);
  analogWrite(pinoMotor, 0);    // para
  delay(1000);
}`},

{ id:'robo-caminha', name:'🦿 Robô que caminha',
  build(S){
    put('leg','Perna esquerda','leg', -1.2,0,0);
    put('leg','Perna direita','leg', 1.2,0,0);
    put('servo','Servo do quadril','servo', -1.2,2.6,0, {sig:9});
    put('servo','Servo do quadril 2','servo', 1.2,2.6,0, {sig:10});
    put('placa','Placa Academe','mcu', 0,3.4,-2);
  },
  code:
`// ROBÔ QUE CAMINHA — servos nos pinos 9 e 10
// Cada servo balança uma perna, como uma marcha
Servo pernaEsq;
Servo pernaDir;

void setup() {
  pernaEsq.attach(9);
  pernaDir.attach(10);
}

void loop() {
  pernaEsq.write(60);    // passo da esquerda
  pernaDir.write(60);
  delay(400);
  pernaEsq.write(120);   // passo da direita
  pernaDir.write(120);
  delay(400);
}`},

{ id:'servo-varredura', name:'🦾 Varredura de servo',
  build(S){
    put('servo','Servo','servo', 0,0,0, {sig:9});
    put('ultrasonic','Olho ultrassônico','ultrasonic', 0,1.4,0, {trig:12, echo:11});
    put('arduino','Arduino UNO','mcu', 3,0,0);
  },
  code:
`// VARREDURA DE SERVO — como um radar, de 0° a 180°
Servo radar;

void setup() {
  radar.attach(9);
  Serial.begin(9600);
}

void loop() {
  for (int ang = 0; ang <= 180; ang = ang + 15) {
    radar.write(ang);
    int dist = pulseIn(11);
    Serial.print("Angulo: ");
    Serial.print(ang);
    Serial.print("  Distancia: ");
    Serial.print(dist);
    Serial.println(" cm");
    delay(150);
  }
  delay(800);
}`},

{ id:'led-pisca', name:'💡 LED piscante',
  build(S){
    put('led','LED vermelho','led', 0,0,0, {pin:13});
    put('arduino','Arduino UNO','mcu', 2.5,0,0);
  },
  code:
`// LED PISCANTE — o "olá, mundo" da robótica
int led = 13;

void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  digitalWrite(led, HIGH);
  delay(500);
  digitalWrite(led, LOW);
  delay(500);
}`},

{ id:'oled-display', name:'📺 Display OLED',
  build(S){
    put('oled','Tela OLED','oled', 0,0.8,0, {});
    put('placa','Placa Academe','mcu', 3,0,0);
  },
  code:
`// DISPLAY OLED — textos na telinha 128x64
void setup() {
  Serial.begin(9600);
}

void loop() {
  oledPrint("ROBOLAB\\nACADEME");
  delay(2000);
  oledPrint("Robotica\\npara todos!");
  delay(2000);
  oledPrint("Monte. Ligue.\\nPrograme.");
  delay(2000);
}`},

{ id:'matriz-led', name:'🟥 Matriz de LED',
  build(S){
    put('oled','Matriz 8x8','oled', 0,0.8,0, {});
    put('placa','Placa Academe','mcu', 3,0,0);
  },
  code:
`// MATRIZ DE LED — animação de contagem
void setup() {}

void loop() {
  oledPrint("3...");
  delay(700);
  oledPrint("2...");
  delay(700);
  oledPrint("1...");
  delay(700);
  oledPrint("VAI!");
  tone(8, 880, 300);
  delay(1200);
}`},

{ id:'buzzer', name:'🔔 Buzzer musical',
  build(S){
    put('buzzer','Buzzer','buzzer', 0,0,0, {pin:8});
    put('arduino','Arduino UNO','mcu', 2.5,0,0);
  },
  code:
`// BUZZER MUSICAL — uma melodia com tone()
int buzzer = 8;

void setup() {
  pinMode(buzzer, OUTPUT);
}

void loop() {
  tone(buzzer, 262, 200);  // Dó
  delay(250);
  tone(buzzer, 294, 200);  // Ré
  delay(250);
  tone(buzzer, 330, 200);  // Mi
  delay(250);
  tone(buzzer, 392, 200);  // Sol
  delay(250);
  tone(buzzer, 523, 400);  // Dó agudo
  delay(1000);
}`},

{ id:'motores', name:'🕹️ Motores: frente, ré e giro',
  build(S){
    put('chassis4','Chassi 4 rodas','preset', 0,0,0);
    put('bomotor','Motor esquerdo','bomotor', -2.4,0.3,0, {pin:5, side:'L'});
    put('bomotor','Motor direito','bomotor', 2.4,0.3,0, {pin:6, side:'R'});
    put('placa','Placa Academe','mcu', 0,1.15,0);
  },
  code:
`// MOTORES — frente, giro e ré com dois motores
int motorEsq = 5;
int motorDir = 6;

void setup() {
  pinMode(motorEsq, OUTPUT);
  pinMode(motorDir, OUTPUT);
}

void loop() {
  // frente
  analogWrite(motorEsq, 200);
  analogWrite(motorDir, 200);
  delay(1500);
  // giro no próprio eixo
  analogWrite(motorEsq, 200);
  analogWrite(motorDir, 0);
  delay(700);
  // ré
  analogWrite(motorEsq, -150);
  analogWrite(motorDir, -150);
  delay(1500);
  // para
  analogWrite(motorEsq, 0);
  analogWrite(motorDir, 0);
  delay(1000);
}`},

{ id:'botao', name:'🔘 Botão de comando',
  build(S){
    put('botao','Botão liga/desliga','botao', 0,0,2, {sig:2});
    put('led','LED vermelho','led', 0,0,-1.5, {pin:13});
    put('arduino','Arduino UNO','mcu', 2.5,0,0);
  },
  code:
`// BOTÃO DE COMANDO — aperte o botão na cena (clique nele)
int botao = 2;
int led = 13;

void setup() {
  pinMode(botao, INPUT);
  pinMode(led, OUTPUT);
}

void loop() {
  if (digitalRead(botao) == 1) {
    digitalWrite(led, HIGH);
  } else {
    digitalWrite(led, LOW);
  }
  delay(30);
}`},
];
