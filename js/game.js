const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const worker = new Worker('js/ai-worker.js');
let w, h, speed = 1, isPaused = false;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight * 0.8;
  worker.postMessage({ type: 'resize', width: w, height: h });
}
window.addEventListener('resize', resize); resize();

worker.onmessage = (e) => {
  const d = e.data;
  if (d.type === 'render') {
    document.getElementById('genText').innerText = 'الجيل: ' + d.gen;
    ctx.fillStyle = '#0b1120'; ctx.fillRect(0, 0, w, h);
    
    // رسم الطعام
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    d.food.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI*2); ctx.fill(); });
    
    // رسم الفرائس والمفترسات
    ctx.fillStyle = '#10b981';
    d.preys.forEach(p => { if(!p.dead) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill(); } });
    ctx.fillStyle = '#ef4444';
    d.preds.forEach(p => { if(!p.dead) { ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2); ctx.fill(); } });

    // المعلق الذكي
    if(d.gen % 5 === 0 && d.gen !== window.lastGen) {
      window.lastGen = d.gen;
      const comm = document.getElementById('commentator');
      comm.style.display = 'block';
      comm.innerText = `🤖 المعلق: الجيل ${d.gen}! الكائنات تتعلم بسرعة.`;
      setTimeout(() => comm.style.display = 'none', 3000);
    }
  }
};

document.getElementById('btnSpeed').onclick = () => {
  const speeds = [1, 5, 10, 50];
  speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
  document.getElementById('speedText').innerText = 'السرعة: x' + speed;
  worker.postMessage({ type: 'speed', value: speed });
};
document.getElementById('btnPause').onclick = (e) => {
  isPaused = !isPaused; e.target.innerText = isPaused ? '▶️ متابعة' : '⏸️ إيقاف';
  worker.postMessage({ type: 'pause', value: isPaused });
};
document.getElementById('btnReset').onclick = () => worker.postMessage({ type: 'reset' });

worker.postMessage({ type: 'init', width: w, height: h });
