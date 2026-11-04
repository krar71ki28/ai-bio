const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const worker = new Worker('js/swarm-worker.js');
let w, h;

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
    
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(d.target.x, d.target.y, 15, 0, Math.PI*2); ctx.fill();
    
    // رسم آلاف الكائنات
    ctx.fillStyle = '#10b981';
    d.boids.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill(); });
  }
};

document.getElementById('btnReset').onclick = () => worker.postMessage({ type: 'reset' });

worker.postMessage({ type: 'init', width: w, height: h });
