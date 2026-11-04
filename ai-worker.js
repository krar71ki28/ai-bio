let width = 800, height = 600;
let preys = [], preds = [], food = [], walls = [];
let currentGenPrey = 1, currentGenPred = 1;
let speedMultiplier = 1;
let isPaused = false;
let bestPreyBrain = null, bestPredBrain = null;

const POP_SIZE = 40;
const LIFESPAN = 400;
const HIDDEN1 = 16, HIDDEN2 = 8, OUTPUTS = 2;

class NeuralNetwork {
  constructor(w1, b1, w2, b2, w3, b3) {
    this.w1 = w1 || Array.from({length: HIDDEN1}, () => Array.from({length: 8}, () => (Math.random() * 2 - 1)));
    this.b1 = b1 || Array.from({length: HIDDEN1}, () => (Math.random() * 2 - 1));
    this.w2 = w2 || Array.from({length: HIDDEN2}, () => Array.from({length: HIDDEN1}, () => (Math.random() * 2 - 1)));
    this.b2 = b2 || Array.from({length: HIDDEN2}, () => (Math.random() * 2 - 1));
    this.w3 = w3 || Array.from({length: OUTPUTS}, () => Array.from({length: HIDDEN2}, () => (Math.random() * 2 - 1)));
    this.b3 = b3 || Array.from({length: OUTPUTS}, () => (Math.random() * 2 - 1));
  }
  predict(inputs) {
    let h1 = [], h2 = [], out = [];
    for (let i = 0; i < HIDDEN1; i++) { let s = this.b1[i]; for (let j = 0; j < inputs.length; j++) s += inputs[j] * this.w1[i][j]; h1.push(Math.tanh(s)); }
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

function castRay(x, y, angle) {
  let dx = Math.cos(angle), dy = Math.sin(angle);
  let dist = 300;
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
  return dist / 300;
}

class Prey {
  constructor(brain) {
    this.brain = brain || new NeuralNetwork();
    this.x = Math.random() * width; this.y = Math.random() * height;
    this.vx = 0; this.vy = 0; this.dead = false; this.fitness = 0;
  }
  update() {
    if (this.dead) return;
    this.fitness += 1; 
    let nearestPred = null, minP = Infinity;
    for (let p of preds) { if (!p.dead) { let d = Math.hypot(p.x-this.x, p.y-this.y); if (d<minP) { minP=d; nearestPred=p; } if (d<15) { this.dead=true; p.fitness+=500; return; } } }
    let nearestFood = null, minF = Infinity;
    for (let f of food) { let d = Math.hypot(f.x-this.x, f.y-this.y); if (d<minF) { minF=d; nearestFood=f; } if (d<15) { this.fitness+=100; f.x=Math.random()*width; f.y=Math.random()*height; } }

    let dxP = nearestPred ? (nearestPred.x-this.x)/width : 0, dyP = nearestPred ? (nearestPred.y-this.y)/height : 0;
    let dxF = nearestFood ? (nearestFood.x-this.x)/width : 0, dyF = nearestFood ? (nearestFood.y-this.y)/height : 0;
    
    let r1 = castRay(this.x, this.y, 0), r2 = castRay(this.x, this.y, Math.PI), r3 = castRay(this.x, this.y, Math.PI/2), r4 = castRay(this.x, this.y, -Math.PI/2);
    let res = this.brain.predict([dxP, dyP, dxF, dyF, r1, r2, r3, r4]);

    this.vx += res.out[0] * 0.5; this.vy += res.out[1] * 0.5;
    let spd = Math.hypot(this.vx, this.vy); if (spd > 4) { this.vx=(this.vx/spd)*4; this.vy=(this.vy/spd)*4; }
    this.x += this.vx; this.y += this.vy;
    if (this.x<0||this.x>width) this.vx*=-1; if (this.y<0||this.y>height) this.vy*=-1;
    return res;
  }
}

class Predator {
  constructor(brain) {
    this.brain = brain || new NeuralNetwork();
    this.x = Math.random() * width; this.y = Math.random() * height;
    this.vx = 0; this.vy = 0; this.dead = false; this.fitness = 0;
  }
  update() {
    if (this.dead) return;
    this.fitness -= 0.5; 
    let nearestPrey = null, minD = Infinity;
    for (let p of preys) { if (!p.dead) { let d = Math.hypot(p.x-this.x, p.y-this.y); if (d<minD) { minD=d; nearestPrey=p; } } }
    
    let dx = nearestPrey ? (nearestPrey.x-this.x)/width : 0, dy = nearestPrey ? (nearestPrey.y-this.y)/height : 0;
    let r1 = castRay(this.x, this.y, 0), r2 = castRay(this.x, this.y, Math.PI), r3 = castRay(this.x, this.y, Math.PI/2), r4 = castRay(this.x, this.y, -Math.PI/2);
    let res = this.brain.predict([dx, dy, r1, r2, r3, r4, this.vx/4, this.vy/4]);

    this.vx += res.out[0] * 0.6; this.vy += res.out[1] * 0.6;
    let spd = Math.hypot(this.vx, this.vy); if (spd > 5) { this.vx=(this.vx/spd)*5; this.vy=(this.vy/spd)*5; }
    this.x += this.vx; this.y += this.vy;
    if (this.x<0||this.x>width) this.vx*=-1; if (this.y<0||this.y>height) this.vy*=-1;
    return res;
  }
}

let frameCount = 0;
let leaderBrainPrey = { h1: new Array(HIDDEN1).fill(0), h2: new Array(HIDDEN2).fill(0) };
let leaderBrainPred = { h1: new Array(HIDDEN1).fill(0), h2: new Array(HIDDEN2).fill(0) };

function init(data) {
  if (data && data.width) width = data.width;
  if (data && data.height) height = data.height;
  preys = []; preds = []; food = []; walls = [];
  
  walls.push({x: width/2 - 10, y: 0, w: 20, h: height/3});
  walls.push({x: width/2 - 10, y: height*2/3, w: 20, h: height/3});

  for (let i = 0; i < 15; i++) food.push({x: Math.random()*width, y: Math.random()*height});
  
  for (let i = 0; i < POP_SIZE; i++) { 
    preys.push(new Prey(i===0 && bestPreyBrain ? bestPreyBrain : null)); 
    preds.push(new Predator(i===0 && bestPredBrain ? bestPredBrain : null)); 
  }
  currentGenPrey = 1; currentGenPred = 1; frameCount = 0;
}

function evolve(pop, isPrey) {
  pop.sort((a, b) => b.fitness - a.fitness);
  let best = pop[0];
  let newPop = [isPrey ? new Prey(best.brain) : new Predator(best.brain)];
  for (let i = 1; i < POP_SIZE; i++) {
    let p1 = pop[Math.floor(Math.random() * 10)];
    let p2 = pop[Math.floor(Math.random() * 10)];
    let child = p1.brain.crossover(p2.brain);
    child.mutate(0.1);
    newPop.push(isPrey ? new Prey(child) : new Predator(child));
  }
  return newPop;
}

function update() {
  if (isPaused) return;
  // السرعة القصوى الآمنة للهاتف هي 100
  let safeSpeed = Math.min(speedMultiplier, 100);
  
  for (let s = 0; s < safeSpeed; s++) {
    for (let i=0; i<preys.length; i++) { let res = preys[i].update(); if (i===0) leaderBrainPrey = res; }
    for (let i=0; i<preds.length; i++) { let res = preds[i].update(); if (i===0) leaderBrainPred = res; }
    frameCount++;

    if (frameCount >= LIFESPAN) {
      preys = evolve(preys, true); preds = evolve(preds, false);
      currentGenPrey++; currentGenPred++;
      bestPreyBrain = preys[0].brain; bestPredBrain = preds[0].brain;
      // طلب الحفظ التلقائي
      self.postMessage({ type: 'save', prey: bestPreyBrain, pred: bestPredBrain }); 
      frameCount = 0;
    }
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') init(msg);
  if (msg.type === 'resize') { width = msg.width; height = msg.height; }
  if (msg.type === 'speed') speedMultiplier = msg.value;
  if (msg.type === 'pause') isPaused = msg.value;
  if (msg.type === 'reset') { bestPreyBrain = null; bestPredBrain = null; init({width, height}); }
  if (msg.type === 'loadBrains') { 
    bestPreyBrain = new NeuralNetwork(msg.prey.w1, msg.prey.b1, msg.prey.w2, msg.prey.b2, msg.prey.w3, msg.prey.b3); 
    bestPredBrain = new NeuralNetwork(msg.pred.w1, msg.pred.b1, msg.pred.w2, msg.pred.b2, msg.pred.w3, msg.pred.b3); 
    init({width, height}); 
  }
  if (msg.type === 'addWall') { walls.push({x: msg.x - 15, y: msg.y - 15, w: 30, h: 30}); }
};

setInterval(() => {
  update();
  self.postMessage({
    type: 'render',
    genPrey: currentGenPrey, genPred: currentGenPred,
    food: food, walls: walls,
    preys: preys.map(p => ({ x: p.x, y: p.y, dead: p.dead })),
    preds: preds.map(p => ({ x: p.x, y: p.y, dead: p.dead })),
    brainPrey: leaderBrainPrey, brainPred: leaderBrainPred
  });
}, 16);
