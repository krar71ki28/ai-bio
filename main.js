const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const worker = new Worker('ai-worker.js');

let width, height;
let renderData = null;
let championMode = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth; height = canvas.clientHeight;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  worker.postMessage({ type: 'resize', width, height });
}
window.addEventListener('resize', resize); resize();

// استقبال البيانات من المعالج الخلفي (Worker)
worker.onmessage = (e) => {
  const data = e.data;
  if (data.type === 'update') {
    renderData = data;
    document.getElementById('statGen').innerText = data.gen;
    document.getElementById('statBest').innerText = Math.floor(data.bestFitness);
    if (data.gen > 10) document.getElementById('btnChampion').style.display = 'block';
    draw();
  }
};

function draw() {
  if (!renderData) return;
  ctx.fillStyle = 'rgba(11, 17, 32, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  // رسم الجدران
  ctx.fillStyle = '#334155';
  for (let w of renderData.walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  
  // رسم الهدف
  ctx.beginPath();
  ctx.arc(renderData.target.x, renderData.target.y, 20, 0, Math.PI*2);
  ctx.fillStyle = '#fbbf24'; ctx.fill();
  ctx.shadowBlur = 25; ctx.shadowColor = '#fbbf24';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.shadowBlur = 0;
  
  // رسم الكائنات
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

// بدء التشغيل
worker.postMessage({ type: 'init' });
