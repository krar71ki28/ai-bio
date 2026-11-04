const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const brainCanvas = document.getElementById('brainCanvas');
const bCtx = brainCanvas.getContext('2d');
const worker = new Worker('ai-worker.js');

let width, height, renderData = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth || window.innerWidth; 
  height = canvas.clientHeight || window.innerHeight * 0.6;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
  
  let bRect = brainCanvas.getBoundingClientRect();
  brainCanvas.width = (bRect.width || 200) * dpr; 
  brainCanvas.height = (bRect.height || 200) * dpr;
  bCtx.setTransform(1, 0, 0, 1, 0, 0); bCtx.scale(dpr, dpr);
  
  worker.postMessage({ type: 'resize', width, height });
}
window.addEventListener('resize', resize);

worker.onmessage = (e) => {
  const data = e.data;
  if (data.type === 'render') {
    renderData = data;
    document.getElementById('statGenPrey').innerText = data.genPrey;
    document.getElementById('statGenPred').innerText = data.genPred;
    draw();
    drawBrain(data.brainPrey, data.brainPred);
  }
  if (data.type === 'save') {
    // الحفظ التلقائي في ذاكرة المتصفح
    localStorage.setItem('ecosystem_prey', JSON.stringify(data.prey));
    localStorage.setItem('ecosystem_pred', JSON.stringify(data.pred));
  }
};

function draw() {
  if (!renderData) return;
  ctx.fillStyle = 'rgba(11, 17, 32, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#334155';
  for (let w of renderData.walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; ctx.lineWidth = 1; ctx.strokeRect(w.x, w.y, w.w, w.h);
  }

  ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
  for (let f of renderData.food) { ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI*2); ctx.fill(); }

  ctx.fillStyle = '#10b981';
  for (let p of renderData.preys) { if (!p.dead) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill(); } }

  for (let p of renderData.preds) {
    if (!p.dead) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2);
      ctx.fillStyle = '#ef4444'; ctx.fill();
      ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
      ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
}

function drawBrain(bPrey, bPred) {
  if (!bPrey || !bPred) return;
  bCtx.clearRect(0, 0, brainCanvas.width, brainCanvas.height);
  let w = brainCanvas.clientWidth || 200, h = brainCanvas.clientHeight || 200;
  
  function drawNet(brain, color, yOffset, heightPart) {
    let h1X = w * 0.3, h1YStep = heightPart / 16;
    let h2X = w * 0.7, h2YStep = heightPart / 8;
    for (let i=0; i<16; i++) {
      let y = yOffset + i * h1YStep + h1YStep/2;
      bCtx.beginPath(); bCtx.arc(h1X, y, 2 + Math.abs(brain.h1[i])*4, 0, Math.PI*2);
      bCtx.fillStyle = brain.h1[i] > 0 ? color : '#fff'; bCtx.fill();
    }
    for (let i=0; i<8; i++) {
      let y = yOffset + i * h2YStep + h2YStep/2;
      bCtx.beginPath(); bCtx.arc(h2X, y, 2 + Math.abs(brain.h2[i])*4, 0, Math.PI*2);
      bCtx.fillStyle = brain.h2[i] > 0 ? color : '#fff'; bCtx.fill();
    }
  }
  drawNet(bPrey, 'rgba(16, 185, 129, 0.8)', 0, h/2);
  drawNet(bPred, 'rgba(239, 68, 68, 0.8)', h/2, h/2);
}

document.getElementById('btnSpeed').addEventListener('click', (e) => {
  // السرعات الآمنة للموبايل (تصل إلى x100 كحد أقصى)
  const speeds = [1, 5, 10, 20, 50, 100];
  let current = parseInt(document.getElementById('statSpeed').innerText.replace('x', ''));
  let next = speeds[(speeds.indexOf(current) + 1) % speeds.length];
  document.getElementById('statSpeed').innerText = 'x' + next;
  worker.postMessage({ type: 'speed', value: next });
});

document.getElementById('btnPause').addEventListener('click', (e) => {
  let isPaused = e.target.innerText.includes('إيقاف');
  e.target.innerText = isPaused ? '▶️ متابعة' : '⏸️ إيقاف';
  worker.postMessage({ type: 'pause', value: isPaused });
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('مسح كل التقدم والبدء من جديد؟')) {
    localStorage.removeItem('ecosystem_prey'); 
    localStorage.removeItem('ecosystem_pred');
    worker.postMessage({ type: 'reset' });
  }
});

document.getElementById('btnSave').addEventListener('click', () => {
  let p = localStorage.getItem('ecosystem_prey'), pr = localStorage.getItem('ecosystem_pred');
  if (!p || !pr) return alert('لا يوجد عقل محفوظ بعد! انتظر بضعة أجيال.');
  const blob = new Blob([JSON.stringify({ prey: JSON.parse(p), pred: JSON.parse(pr) })], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ecosystem_brains.json'; a.click();
});

document.getElementById('btnLoad').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      worker.postMessage({ type: 'loadBrains', prey: data.prey, pred: data.pred });
      alert('تم تحميل العقول بنجاح!');
    } catch (err) { alert('ملف غير صالح!'); }
  };
  reader.readAsText(file);
});

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  worker.postMessage({ type: 'addWall', x: e.clientX - rect.left, y: e.clientY - rect.top });
});

window.addEventListener('load', () => {
  resize();
  setTimeout(() => {
    let savedPrey = localStorage.getItem('ecosystem_prey');
    let savedPred = localStorage.getItem('ecosystem_pred');
    if (savedPrey && savedPred) {
      worker.postMessage({ type: 'loadBrains', prey: JSON.parse(savedPrey), pred: JSON.parse(savedPred) });
    } else {
      worker.postMessage({ type: 'init', width, height });
    }
  }, 200);
});
