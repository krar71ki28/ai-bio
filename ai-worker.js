let width = 800, height = 600;
let walls = [];
let target = { x: 0, y: 0 };
let start = { x: 0, y: 0 };
let population = [];
let currentGen = 1;
let speedMultiplier = 1;
let isPaused = false;
let championMode = false;
let bestBrainEver = null;
let bestFitnessEver = 0;
let time = 0;
let frameCount = 0;
let stagnationFrames = 0;
let lastBestFitness = 0;
let mutationRate = 0.1;

const POP_SIZE = 50;
const LIFESPAN = 300;
const INPUTS = 8;
const HIDDEN1 = 32;
const HIDDEN2 = 16;
const OUTPUTS = 2;

function castRay(x, y, angle, maxDist) {
  let dx = Math.cos(angle), dy = Math.sin(angle);
  let dist = maxDist;
  for (let w of walls) {
    let tmin = (w.x - x) / dx, tmax = (w.x + w.w - x) / dx;
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    let tymin = (w.y - y) / dy, tymax = (w.y + w.h - y) / dy;
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    if ((tmin > tymax) || (tymin > tmax)) continue;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    if (tmin < dist && tmin > 0) dist = tmin;
  }
  if (dx > 0) dist = Math.min(dist, (width - x) / dx);
  if (dx < 0) dist = Math.min(dist, (0 - x) / dx);
  if (dy > 0) dist = Math.min(dist, (height - y) / dy);
  if (dy < 0) dist = Math.min(dist, (0 - y) / dy);
  return dist;
}

class NeuralNetwork {
  constructor(w1, b1, w2, b2, w3, b3) {
    this.w1 = w1 || Array.from({length: HIDDEN1}, () => Array.from({length: INPUTS}, () => (Math.random() * 2 - 1)));
    this.b1 = b1 || Array.from({length: HIDDEN1}, () => (Math.random() * 2 - 1));
    this.w2 = w2 || Array.from({length: HIDDEN2}, () => Array.from({length: HIDDEN1}, () => (Math.random() * 2 - 1)));
    this.b2 = b2 || Array.from({length: HIDDEN2}, () => (Math.random() * 2 - 1));
    this.w3 = w3 || Array.from({length: OUTPUTS}, () => Array.from({length: HIDDEN2}, () => (Math.random() * 2 - 1)));
    this.b3 = b3 || Array.from({length: OUTPUTS}, () => (Math.random() * 2 - 1));
  }
  predict(inputs) {
    let h1 = [], h2 = [], out = [];
    for (let i = 0; i < HIDDEN1; i++) { let s = this.b1[i]; for (let j = 0; j < INPUTS; j++) s += inputs[j] * this.w1[i][j]; h1.push(Math.tanh(s)); }
    for (let i = 0; i < HIDDEN2; i++) { let s = this.b2[i]; for (let j = 0; j < HIDDEN1; j++) s += h1[j] * this.w2[i][j]; h2.push(Math.tanh(s)); }
    for (let i = 0; i < OUTPUTS; i++) { let s = this.b3[i]; for (let j = 0; j < HIDDEN2; j++) s += h2[j] * this.w3[i][j]; out.push(Math.tanh(s)); }
    return { out, h1, h2 };
  }
  crossover(other) {
    let cw = (w, o) => w.map((row, i) => row.map((val, j) => Math.random() > 0.5 ? val : o[i][j]));
    let cb = (b, o) => b.map((val, i) => Math.random() > 0.5 ? val : o[i]);
    return new NeuralNetwork(cw(this.w1, other.w1), cb(this.b1, other.b1), cw(this.w2, other.w2), cb(this.b2, other.b2), cw(this.w3, other.w3), cb(this.b3, other.b3));
  }
  mutate(rate) {
    const mut = (v) => (Math.random() < rate) ? Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * 0.5)) : v;
    this.w1 = this.w1.map(r => r.map(mut)); this.b1 = this.b1.map(mut);
    this.w2 = this.w2.map(r => r.map(mut)); this.b2 = this.b2.map(mut);
    this.w3 = this.w3.map(r => r.map(mut)); this.b3 = this.b3.map(mut);
  }
}

class Agent {
  constructor(brain) {
    this.brain = brain || new NeuralNetwork();
    this.x = start.x + (Math.random() - 0.5) * 20;
    this.y = start.y + (Math.random() - 0.5) * 20;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.fitness = 0; this.trail = [];
    this.lastActivation = { h1: new Array(HIDDEN1).fill(0), h2: new Array(HIDDEN2).fill(0) };
  }
  update() {
    if (this.dead) return;
    let dx = target.x - this.x, dy = target.y - this.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let r1 = castRay(this.x, this.y, 0, 300), r2 = castRay(this.x, this.y, Math.PI, 300);
    let r3 = castRay(this.x, this.y, Math.PI/2, 300), r4 = castRay(this.x, this.y, -Math.PI/2, 300);
    
    let inputs = [dx/width, dy/height, this.vx/5, this.vy/5, r1/300, r2/300, r3/300, r4/300];
    let res = this.brain.predict(inputs);
    
    this.vx += res.out[0] * 0.8; this.vy += res.out[1] * 0.8;
    let spd = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (spd > 7) { this.vx = (this.vx / spd) * 7; this.vy = (this.vy / spd) * 7; }
    this.x += this.vx; this.y += this.vy;
    
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > 20) this.trail.shift();
    
    this.fitness = 1000 / (dist + 1);
    for (let w of walls) if (this.x > w.x && this.x < w.x + w.w && this.y > w.y && this.y < w.y + w.h) this.dead = true;
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.dead = true;
    if (dist < 30) { this.dead = true; this.fitness += 5000; }
    
    return res; // نرجع نشاط الدماغ للرسم
  }
}

function initPopulation() {
  population = [];
  for (let i = 0; i < POP_SIZE; i++) population.push(new Agent(i === 0 && bestBrainEver ? bestBrainEver : null));
  frameCount = 0; stagnationFrames = 0; lastBestFitness = 0;
}

function nextGeneration() {
  population.sort((a, b) => b.fitness - a.fitness);
  if (population[0].fitness > bestFitnessEver) {
    bestFitnessEver = population[0].fitness;
    bestBrainEver = population[0].brain;
  }
  let newPop = [new Agent(bestBrainEver)];
  for (let i = 1; i < POP_SIZE; i++) {
    let p1 = population[Math.floor(Math.random() * 20)];
    let p2 = population[Math.floor(Math.random() * 20)];
    let child = p1.brain.crossover(p2.brain);
    child.mutate(mutationRate);
    newPop.push(new Agent(child));
  }
  population = newPop;
  currentGen++; frameCount = 0; stagnationFrames = 0; lastBestFitness = 0;
  if (currentGen % 10 === 0) mutationRate = Math.min(0.5, mutationRate + 0.05);
  else mutationRate = Math.max(0.05, mutationRate - 0.01);
}

let leaderBrainActivation = { h1: new Array(HIDDEN1).fill(0), h2: new Array(HIDDEN2).fill(0) };

function updateEngine() {
  if (isPaused) return;
  time += 0.02;
  target.x = width/2 + Math.sin(time * 0.8) * (width * 0.35);
  target.y = height/2 + Math.cos(time * 1.2) * (height * 0.3);
  
  for (let s = 0; s < speedMultiplier; s++) {
    let alive = 0;
    for (let i = 0; i < population.length; i++) {
      let agent = population[i];
      if (!agent.dead) { 
        let res = agent.update(); 
        alive++;
        if (i === 0) leaderBrainActivation = res; // تحديث دماغ البطل
      }
    }
    frameCount++;
    
    if (!championMode) {
      if (population[0].fitness > lastBestFitness) { lastBestFitness = population[0].fitness; stagnationFrames = 0; }
      else stagnationFrames++;
    }
    if (championMode && alive === 0) { population[0].dead = false; population[0].x = start.x; population[0].y = start.y; alive = 1; }
    if (!championMode && (alive === 0 || frameCount >= LIFESPAN || stagnationFrames > 60)) { nextGeneration(); break; }
  }
}

function getRenderData() {
  return {
    type: 'update',
    gen: currentGen,
    bestFitness: bestFitnessEver,
    target: { x: target.x, y: target.y },
    walls: walls.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
    agents: population.map((a, i) => ({ x: a.x, y: a.y, dead: a.dead, isLeader: i === 0, trail: a.trail })),
    brain: leaderBrainActivation
  };
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    width = msg.width || 800; height = msg.height || 600;
    start = { x: width * 0.1, y: height * 0.5 };
    walls = [
      { x: width/2 - 15, y: -height/2, w: 30, h: height/2 + height*0.15 },
      { x: width/2 - 15, y: height - height*0.15, w: 30, h: height/2 }
    ];
    initPopulation();
    setInterval(() => {
      updateEngine();
      self.postMessage(getRenderData());
    }, 16); 
  }
  if (msg.type === 'resize') { width = msg.width; height = msg.height; start.x = width * 0.1; start.y = height * 0.5; }
  if (msg.type === 'speed') speedMultiplier = msg.value;
  if (msg.type === 'pause') isPaused = msg.value;
  if (msg.type === 'champion') {
    championMode = msg.value;
    if (championMode) population = [new Agent(bestBrainEver)];
    else initPopulation();
  }
  if (msg.type === 'reset') { currentGen = 1; bestFitnessEver = 0; bestBrainEver = null; initPopulation(); }
  if (msg.type === 'addWall') {
    // إضافة جدار بلمسة المستخدم (حجم ثابت 40x40)
    walls.push({ x: msg.x - 20, y: msg.y - 20, w: 40, h: 40 });
  }
};
