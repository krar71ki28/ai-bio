let width = 800, height = 600, preys = [], walls = [], target = {}, gen = 1, speed = 1;
const POP = 30, LIFE = 300;

class NN {
  constructor() { this.w = Array.from({length: 6}, () => Math.random()*2-1); }
  predict(i) { let o=[0,0]; for(let x=0; x<4; x++){ o[0]+=i[x]*this.w[x]; o[1]+=i[x]*this.w[(x+2)%6]; } return o.map(Math.tanh); }
  mutate() { this.w = this.w.map(v => Math.random()<0.1 ? v+(Math.random()*2-1)*0.5 : v); }
}

function generateMaze() {
  walls = [];
  // توليد متاهة بناءً على تاريخ اليوم (تتغير كل يوم)
  const seed = new Date().getDate();
  target = { x: width - 100, y: height / 2 };
  for(let i=0; i<6; i++) {
    let x = (Math.sin(seed + i) * 0.4 + 0.5) * width;
    let y = (Math.cos(seed * i) * 0.4 + 0.5) * height;
    walls.push({x, y, w: 80, h: 20});
  }
}

function init() {
  generateMaze();
  preys = Array.from({length: POP}, () => ({x: 50, y: height/2, b: new NN(), dead: false, fit: 0}));
  gen = 1;
}

function loop() {
  for(let s=0; s<speed; s++) {
    preys.forEach(p => {
      if(p.dead) return;
      let dx = target.x - p.x, dy = target.y - p.y;
      let dir = p.b.predict([dx/width, dy/height, 0, 0]);
      p.x += dir[0]*2; p.y += dir[1]*2;
      p.fit += 0.1;
      walls.forEach(wl => { if(p.x>wl.x && p.x<wl.x+wl.w && p.y>wl.y && p.y<wl.y+wl.h) p.dead=true; });
      if(Math.hypot(p.x-target.x, p.y-target.y) < 25) { p.dead=true; p.fit+=1000; }
    });

    if(preys.every(p=>p.dead)) {
      gen++;
      preys.sort((a,b)=>b.fit-a.fit);
      let best = preys[0].b;
      preys = Array.from({length: POP}, () => { let n = new NN(); n.w = [...best.w]; n.mutate(); return {x:50, y:height/2, b:n, dead:false, fit:0}; });
    }
  }
}

self.onmessage = (e) => {
  if(e.data.type === 'init') { width=e.data.width; height=e.data.height; init(); setInterval(() => { loop(); self.postMessage({type:'render', gen, walls, target, preys}); }, 16); }
  if(e.data.type === 'resize') { width=e.data.width; height=e.data.height; }
  if(e.data.type === 'speed') speed = e.data.value;
  if(e.data.type === 'reset') init();
};
