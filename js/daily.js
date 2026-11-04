const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const worker = new Worker('js/daily-worker.js');
let w, h, speed = 1;

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
    
    // رسم الجدران
    ctx.fillStyle = '#334155';
    d.walls.forEach(wl => ctx.fillRect(wl.x, wl.y, wl.w, wl.h));

    // رسم الهدف
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(d.target.x, d.target.y, 15, 0, Math.PI*2); ctx.fill();
    
    // رسم الفرائس
    ctx.fillStyle = '#10b981';
    d.preys.forEach(p => { if(!p.dead) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill(); } });
  }
};

document.getElementById('btnSpeed').onclick = () => {
  const speeds = [1, 5, 10, 50];
  speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
  worker.postMessage({ type: 'speed', value: speed });
};
document.getElementById('btnReset').onclick = () => worker.postMessage({ type: 'reset' });

worker.postMessage({ type: 'init', width: w, height: h });
