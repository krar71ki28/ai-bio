const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const brainCanvas = document.getElementById('brainCanvas');
const bCtx = brainCanvas.getContext('2d');
const worker = new Worker('ai-worker.js');

let width, height;
let renderData = null;
let championMode = false;
let isDrawing = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth; height = canvas.clientHeight;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  let bRect = brainCanvas.getBoundingClientRect();
  brainCanvas.width = bRect.width * dpr;
  brainCanvas.height = bRect.height * dpr;
  bCtx.scale(dpr, dpr);

  worker.postMessage({ type: 'resize', width, height });
}
window.addEventListener('resize', resize); resize();

// استقبال البيانات
worker.onmessage = (e) => {
  const data = e.data;
  if (data.type === 'update') {
    renderData = data;
    document.getElementById('statGen').innerText = data.gen;
    document.getElementById('statBest').innerText = Math.floor(data.bestFitness);
    if (data.gen > 5) document.getElementById('btnChampion').style.display = 'block';
    draw();
    if (data.brain && !championMode) drawBrain(data.brain);
  }
};

// رسم المحاكاة
function draw() {
  if (!renderData) return;
  ctx.fillStyle = 'rgba(11, 17, 32, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#334155';
  for (let w of renderData.walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  
  ctx.beginPath();
  ctx.arc(renderData.target.x, renderData.target.y, 20, 0, Math.PI*2);
  ctx.fillStyle = '#fbbf24'; ctx.fill();
  ctx.shadowBlur = 25; ctx.shadowColor = '#fbbf24';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.shadowBlur = 0;
  
  for (let agent of renderData.agents) {
    if (agent.dead) continue;
    if (agent.trail && agent.trail.length > 1) {
      ctx.beginPath(); ctx.moveTo(agent.trail[0].x, agent.trail[0].y);
      for (let i = 1; i < agent.trail.length; i++) ctx.lineTo(agent.trail[i].x, agent.trail[i].y);
      ctx.strokeStyle = agent.isLeader ? 'rgba(56, 189, 248, 0.8)' : 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = agent.isLeader ? 4 : 1; ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, agent.isLeader ? 8 : 3, 0, Math.PI*2);
    ctx.fillStyle = agent.isLeader ? '#38bdf8' : '#64748b'; ctx.fill();
    if (agent.isLeader) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  }
}

// رسم الدماغ العصبي
function drawBrain(brain) {
  bCtx.clearRect(0, 0, brainCanvas.width, brainCanvas.height);
  let w = brainCanvas.clientWidth, h = brainCanvas.clientHeight;
  
  // رسم طبقة المدخلات
  let inX = 30, inY = h/2;
  // رسم الطبقة المخفية 1 (32 خلية)
  let h1X = w * 0.35, h1YStep = h / 32;
  // رسم الطبقة المخفية 2 (16 خلية)
  let h2X = w * 0.65, h2YStep = h / 16;
  // رسم المخرجات
  let outX = w - 30, outY = h/2;

  // رسم الوصلات (خطوط خفيفة)
  bCtx.strokeStyle = 'rgba(167, 139, 250, 0.1)';
  bCtx.lineWidth = 1;
  bCtx.beginPath();
  for (let i = 0; i < 32; i++) {
    bCtx.moveTo(inX, inY); bCtx.lineTo(h1X, i * h1YStep + h1YStep/2);
    for (let j = 0; j < 16; j++) {
      if (i % 2 === 0) { bCtx.moveTo(h1X, i * h1YStep + h1YStep/2); bCtx.lineTo(h2X, j * h2YStep + h2YStep/2); }
    }
  }
  for (let j = 0; j < 16; j++) {
    bCtx.moveTo(h2X, j * h2YStep + h2YStep/2); bCtx.lineTo(outX, outY);
  }
  bCtx.stroke();

  // رسم الخلايا المضيئة
  function drawNeuron(x, y, val) {
    let intensity = Math.abs(val);
    bCtx.beginPath();
    bCtx.arc(x, y, 2 + intensity * 4, 0, Math.PI*2);
    bCtx.fillStyle = val > 0 ? `rgba(56, 189, 248, ${intensity})` : `rgba(239, 68, 68, ${intensity})`;
    bCtx.fill();
  }

  drawNeuron(inX, inY, 1); // المدخلات مبسطة
  for (let i = 0; i < 32; i++) drawNeuron(h1X, i * h1YStep + h1YStep/2, brain.h1[i]);
  for (let j = 0; j < 16; j++) drawNeuron(h2X, j * h2YStep + h2YStep/2, brain.h2[j]);
  drawNeuron(outX, outY, 1);
}

// الأزرار
document.getElementById('btnSpeed').addEventListener('click', (e) => {
  const speeds = [1, 10, 100, 1000, 10000, 100000];
  let currentSpeed = parseInt(document.getElementById('statSpeed').innerText.replace('x', ''));
  let idx = speeds.indexOf(currentSpeed);
  let nextSpeed = speeds[(idx + 1) % speeds.length];
  document.getElementById('statSpeed').innerText = 'x' + nextSpeed;
  worker.postMessage({ type: 'speed', value: nextSpeed });
});

document.getElementById('btnPause').addEventListener('click', (e) => {
  let isPaused = e.target.innerText.includes('إيقاف');
  e.target.innerText = isPaused ? '▶️ متابعة' : '⏸️ إيقاف';
  worker.postMessage({ type: 'pause', value: isPaused });
});

document.getElementById('btnChampion').addEventListener('click', (e) => {
  championMode = !championMode;
  e.target.innerText = championMode ? '👥 عرض الجميع' : '🏆 عرض البطل';
  e.target.classList.toggle('btn-red');
  e.target.classList.toggle('btn-primary');
  worker.postMessage({ type: 'champion', value: championMode });
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('هل تريد مسح التقدم؟')) worker.postMessage({ type: 'reset' });
});

// ميزة الرسم على الشاشة (إضافة جدران)
canvas.addEventListener('pointerdown', (e) => {
  isDrawing = true;
  addWall(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (isDrawing) addWall(e);
});
canvas.addEventListener('pointerup', () => isDrawing = false);
canvas.addEventListener('pointerleave', () => isDrawing = false);

function addWall(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  worker.postMessage({ type: 'addWall', x, y });
}

worker.postMessage({ type: 'init' });
