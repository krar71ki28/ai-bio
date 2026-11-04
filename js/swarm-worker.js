let width = 800, height = 600, boids = [], target = {x: 400, y: 300}, gen = 1;
const POP = 1000; // ألف كائن!

class NN {
  constructor() { this.w = Array.from({length: 4}, () => Math.random()*2-1); }
  predict(i) { let o=[0,0]; for(let x=0; x<2; x++){ o[0]+=i[x]*this.w[x]; o[1]+=i[x]*this.w[(x+2)%4]; } return o.map(Math.tanh); }
  mutate() { this.w = this.w.map(v => Math.random()<0.1 ? v+(Math.random()*2-1)*0.5 : v); }
}

function init() {
  boids = Array.from({length: POP}, () => ({x: 50, y: height/2, b: new NN(), fit: 0, dead: false}));
  gen = 1;
}

function loop() {
  boids.forEach(p => {
    if(p.dead) return;
    let dx = target.x - p.x, dy = target.y - p.y;
    let dir = p.b.predict([dx/width, dy/height]);
    p.x += dir[0]*2.5; p.y += dir[1]*2.5;
    p.fit += 0.1;
    if(Math.hypot(p.x-target.x, p.y-target.y) < 25) { p.dead=true; p.fit+=1000; }
  });

  if(boids.every(p=>p.dead)) {
    gen++;
    boids.sort((a,b)=>b.fit-a.fit);
    let best = boids[0].b;
    boids = Array.from({length: POP}, () => { let n = new NN(); n.w = [...best.w]; n.mutate(); return {x:50, y:height/2, b:n, fit:0, dead:false}; });
  }
}

self.onmessage = (e) => {
  if(e.data.type === 'init') { width=e.data.width; height=e.data.height; init(); setInterval(() => { loop(); self.postMessage({type:'render', gen, target, boids}); }, 30); }
  if(e.data.type === 'resize') { width=e.data.width; height=e.data.height; }
  if(e.data.type === 'reset') init();
};
