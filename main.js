const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const worker = new Worker('ai-worker.js');

let width, height;
let renderData = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  
  // حماية: إذا كانت الأبعاد صفر، استخدم أبعاد الشاشة
  if (width === 0 || height === 0) {
    width = window.innerWidth;
    height = window.innerHeight * 0.7;
  }
  
  canvas.width = width * dpr; 
  canvas.height = height * dpr;
  
  // إصلاح مشكلة تكرار التكبير (Reset Transform)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  worker.postMessage({ type: 'resize', width, height });
}
window.addEventListener('resize', resize);

worker.onmessage = (e) => {
  const data = e.data;
  if (data.type === 'update') {
    renderData = data;
    document.getElementById('statGenPrey').innerText = data.genPrey;
    document.getElementById('statGenPred').innerText = data.genPred;
    draw();
  }
};

function draw() {
  if (!renderData) return;
  ctx.fillStyle = 'rgba(11, 17, 32, 0.6)';
  ctx.fillRect(0, 0, width, height);
  
  // رسم الطعام
  ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
  for (let f of renderData.food) {
    ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI*2); ctx.fill();
  }

  // رسم الفرائس (خضراء)
  for (let prey of renderData.preys) {
    if (prey.dead) continue;
    ctx.beginPath();
    ctx.arc(prey.x, prey.y, 5, 0, Math.PI*2);
    ctx.fillStyle = '#10b981'; ctx.fill();
  }

  // رسم المفترسات (حمراء)
  for (let pred of renderData.preds) {
    if (pred.dead) continue;
    ctx.beginPath();
    ctx.arc(pred.x, pred.y, 7, 0, Math.PI*2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

document.getElementById('btnSpeed').addEventListener('click', (e) => {
  const speeds = [1, 5, 10, 50, 100];
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

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('هل تريد إعادة تشغيل النظام البيئي من الصفر؟')) worker.postMessage({ type: 'reset' });
});

// تشغيل المحاكي بعد تحميل الصفحة بالكامل لضمان وجود أبعاد
window.addEventListener('load', () => {
  resize();
  worker.postMessage({ type: 'init', width: width, height: height });
});
