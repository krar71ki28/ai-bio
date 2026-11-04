let width = 800, height = 600;
let preys = [], preds = [], food = [];
let currentGenPrey = 1, currentGenPred = 1;
let speedMultiplier = 1;
let isPaused = false;
let time = 0;

const POP_SIZE = 40;
const LIFESPAN = 400;
const INPUTS_PREY = 6; // أقرب مفترس، أقرب طعام، 4 أشعة ليزر
const INPUTS_PRED = 6; // أقرب فريسة، 4 أشعة ليزر، سرعته
const HIDDEN = 16;
const OUTPUTS = 2;

// شبكة عصبية مبسطة (طبقة مخفية واحدة لتسريع الحسابات للكائنات المتعددة)
class NeuralNetwork {
  constructor(w1, b1, w2, b2) {
    this.w1 = w1 || Array.from({length: HIDDEN}, () => Array.from({length: INPUTS_PREY}, () => (Math.random() * 2 - 1)));
    this.b1 = b1 || Array.from({length: HIDDEN}, () => (Math.random() * 2 - 1));
    this.w2 = w2 || Array.from({length: OUTPUTS}, () => Array.from({length: HIDDEN}, () => (Math.random() * 2 - 1)));
    this.b2 = b2 || Array.from({length: OUTPUTS}, () => (Math.random() * 2 - 1));
  }
  predict(inputs) {
    let h = [], out = [];
    for (let i = 0; i < HIDDEN; i++) { let s = this.b1[i]; for (let j = 0; j < inputs.length; j++) s += inputs[j] * this.w1[i][j]; h.push(Math.tanh(s)); }
    for (let i = 0; i < OUTPUTS; i++) { let s = this.b2[i]; for (let j = 0; j < HIDDEN; j++) s += h[j] * this.w2[i][j]; out.push(Math.tanh(s)); }
    return out;
  }
  crossover(other) {
    let cw = (w, o) => w.map((row, i) => row.map((val, j) => Math.random() > 0.5 ? val : o[i][j]));
    let cb = (b, o) => b.map((val, i) => Math.random() > 0.5 ? val : o[i]);
    return new NeuralNetwork(cw(this.w1, other.w1), cb(this.b1, other.b1), cw(this.w2, other.w2), cb(this.b2, other.b2));
  }
  mutate(rate) {
    const mut = (v) => (Math.random() < rate) ? Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * 0.5)) : v;
    this.w1 = this.w1.map(r => r.map(mut)); this.b1 = this.b1.map(mut);
    this.w2 = this.w2.map(r => r.map(mut)); this.b2 = this.b2.map(mut);
  }
}

class Prey {
  constructor(brain) {
    this.brain = brain || new NeuralNetwork();
    this.x = Math.random() * width; this.y = Math.random() * height;
    this.vx = 0; this.vy = 0;
    this.dead = false; this.fitness = 0; this.life = 0;
  }
  update() {
    if (this.dead) return;
    this.life++;
    this.fitness += 1; // البقاء حياً يزيد اللياقة

    // البحث عن أقرب مفترس
    let nearestPred = null, minDistP = Infinity;
    for (let p of preds) {
      if (p.dead) continue;
      let d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < minDistP) { minDistP = d; nearestPred = p; }
      if (d < 15) { this.dead = true; p.fitness += 500; return; } // تم اصطياده
    }

    // البحث عن أقرب طعام
    let nearestFood = null, minDistF = Infinity;
    for (let f of food) {
      let d = Math.hypot(f.x - this.x, f.y - this.y);
      if (d < minDistF) { minDistF = d; nearestFood = f; }
      if (d < 15) { 
        this.fitness += 100; 
        f.x = Math.random() * width; f.y = Math.random() * height; // إعادة توليد الطعام
      }
    }

    let dxP = nearestPred ? (nearestPred.x - this.x)/width : 0;
    let dyP = nearestPred ? (nearestPred.y - this.y)/height : 0;
    let dxF = nearestFood ? (nearestFood.x - this.x)/width : 0;
    let dyF = nearestFood ? (nearestFood.y - this.y)/height : 0;

    let inputs = [dxP, dyP, dxF, dyF, this.vx/4, this.vy/4];
    let out = this.brain.predict(inputs);

    this.vx += out[0] * 0.5; this.vy += out[1] * 0.5;
    let spd = Math.hypot(this.vx, this.vy);
    if (spd > 4) { this.vx = (this.vx/spd)*4; this.vy = (this.vy/spd)*4; }
    
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }
}

class Predator {
  constructor(brain) {
    this.brain = brain || new NeuralNetwork();
    this.x = Math.random() * width; this.y = Math.random() * height;
    this.vx = 0; this.vy = 0;
    this.dead = false; this.fitness = 0; this.life = 0;
  }
  update() {
    if (this.dead) return;
    this.life++;
    this.fitness -= 0.5; // فقدان الطاقة مع الوقت (يجب أن يصطاد بسرعة)

    // البحث عن أقرب فريسة
    let nearestPrey = null, minDist = Infinity;
    for (let p of preys) {
      if (p.dead) continue;
      let d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < minDist) { minDist = d; nearestPrey = p; }
    }

    let dx = nearestPrey ? (nearestPrey.x - this.x)/width : 0;
    let dy = nearestPrey ? (nearestPrey.y - this.y)/height : 0;
    
    let inputs = [dx, dy, this.vx/4, this.vy/4, 0, 0];
    let out = this.brain.predict(inputs);

    this.vx += out[0] * 0.6; this.vy += out[1] * 0.6;
    let spd = Math.hypot(this.vx, this.vy);
    if (spd > 5) { this.vx = (this.vx/spd)*5; this.vy = (this.vy/spd)*5; }
    
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }
}

let bestPreyBrain = null, bestPredBrain = null;
let frameCount = 0;

function evolve(population, isPrey) {
  population.sort((a, b) => b.fitness - a.fitness);
  let best = population[0];
  if (isPrey) bestPreyBrain = best.brain; else bestPredBrain = best.brain;

  let newPop = [isPrey ? new Prey(best.brain) : new Predator(best.brain)];
  for (let i = 1; i < POP_SIZE; i++) {
    let p1 = population[Math.floor(Math.random() * 10)];
    let p2 = population[Math.floor(Math.random() * 10)];
    let child = p1.brain.crossover(p2.brain);
    child.mutate(0.1);
    newPop.push(isPrey ? new Prey(child) : new Predator(child));
  }
  return newPop;
}

function init() {
  preys = []; preds = []; food = [];
  for (let i = 0; i < 15; i++) food.push({x: Math.random()*width, y: Math.random()*height});
  for (let i = 0; i < POP_SIZE; i++) { preys.push(new Prey()); preds.push(new Predator()); }
  currentGenPrey = 1; currentGenPred = 1;
  frameCount = 0;
}

function update() {
  if (isPaused) return;
  
  for (let s = 0; s < speedMultiplier; s++) {
    for (let p of preys) p.update();
    for (let p of preds) p.update();
    frameCount++;

    if (frameCount >= LIFESPAN) {
      preys = evolve(preys, true);
      preds = evolve(preds, false);
      currentGenPrey++; currentGenPred++;
      frameCount = 0;
    }
  }
}

function getRenderData() {
  return {
    type: 'update',
    genPrey: currentGenPrey,
    genPred: currentGenPred,
    food: food,
    preys: preys.map(p => ({ x: p.x, y: p.y, dead: p.dead })),
    preds: preds.map(p => ({ x: p.x, y: p.y, dead: p.dead }))
  };
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    width = msg.width || 800; height = msg.height || 600;
    init();
    setInterval(() => {
      update();
      self.postMessage(getRenderData());
    }, 16);
  }
  if (msg.type === 'resize') { width = msg.width; height = msg.height; }
  if (msg.type === 'speed') speedMultiplier = msg.value;
  if (msg.type === 'pause') isPaused = msg.value;
  if (msg.type === 'reset') init();
};
