let width = 800, height = 600, preys = [], preds = [], food = [], gen = 1, speed = 1, isPaused = false;
const POP = 40, LIFE = 400;

class NN {
  constructor() { this.w = Array.from({length: 6}, () => Math.random()*2-1); }
  predict(i) { let o=[0,0]; for(let x=0; x<i.length; x++){ o[0]+=i[x]*this.w[x]; o[1]+=i[x]*this.w[(x+3)%6]; } return o.map(Math.tanh); }
  mutate() { this.w = this.w.map(v => Math.random()<0.1 ? Math.max(-1,Math.min(1,v+(Math.random()*2-1)*0.5)) : v); }
}

class Agent {
  constructor(brain) {
    this.b = brain || new NN(); this.x = Math.random()*width; this.y = Math.random()*height;
    this.vx = 0; this.vy = 0; this.dead = false; this.fit = 0;
  }
  update() {
    if(this.dead) return;
    let target = this.isPred ? preys.find(p=>!p.dead) : food[0];
    if(!target) { this.dead = true; return; }
    let dx = (target.x-this.x)/width, dy = (target.y-this.y)/height;
    let out = this.b.predict([dx, dy, this.vx/4, this.vy/4]);
    this.vx += out[0]*0.5; this.vy += out[1]*0.5;
    this.x += this.vx; this.y += this.vy;
    if(this.x<0||this.x>width) this.vx*=-1; if(this.y<0||this.y>height) this.vy*=-1;
    this.fit += this.isPred ? -0.1 : 0.1;
    if(Math.hypot(this.x-target.x, this.y-target.y) < 15) {
      this.dead = true; this.fit += this.isPred ? 500 : 100;
      if(!this.isPred) { target.x = Math.random()*width; target.y = Math.random()*height; }
    }
  }
}

function init() {
  preys = Array.from({length: POP}, () => { let a = new Agent(); a.isPred = false; return a; });
  preds = Array.from({length: 10}, () => { let a = new Agent(); a.isPred = true; return a; });
  food = Array.from({length: 15}, () => ({x: Math.random()*width, y: Math.random()*height}));
  gen = 1;
}

function evolve() {
  gen++;
  preys.sort((a,b)=>b.fit-a.fit); preds.sort((a,b)=>b.fit-a.fit);
  let bp = preys[0].b, bd = preds[0].b;
  preys = Array.from({length: POP}, () => { let a = new Agent(bp); a.b = new NN(); a.b.w = [...bp.w]; a.b.mutate(); a.isPred = false; return a; });
  preds = Array.from({length: 10}, () => { let a = new Agent(bd); a.b = new NN(); a.b.w = [...bd.w]; a.b.mutate(); a.isPred = true; return a; });
}

self.onmessage = (e) => {
  if(e.data.type === 'init') { width=e.data.width; height=e.data.height; init(); setInterval(() => { 
    if(!isPaused) { for(let s=0; s<speed; s++) { preys.forEach(p=>p.update()); preds.forEach(p=>p.update()); if(preys.every(p=>p.dead)) { evolve(); break; } } }
    self.postMessage({type:'render', gen, food, preys, preds}); 
  }, 16); }
  if(e.data.type === 'resize') { width=e.data.width; height=e.data.height; }
  if(e.data.type === 'speed') speed = e.data.value;
  if(e.data.type === 'pause') isPaused = e.data.value;
  if(e.data.type === 'reset') init();
};
