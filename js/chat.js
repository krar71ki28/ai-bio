import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0';
env.allowLocalModels = false; env.useBrowserCache = true;
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const status = document.getElementById('status');
let generator = null;

async function load() {
  try {
    generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
      progress_callback: d => { if(d.status === 'progress') status.innerText = `تحميل: ${Math.round((d.loaded/d.total)*100)}%`; }
    });
    status.innerText = "✅ جاهز (بدون إنترنت)";
    userInput.disabled = false; sendBtn.disabled = false;
  } catch(e) { status.innerText = "❌ فشل التحميل"; }
}

async function send() {
  const t = userInput.value.trim(); if(!t || !generator) return;
  addMsg(t, 'user'); userInput.value = ''; userInput.disabled = true;
  const out = await generator(t, { max_new_tokens: 100 });
  addMsg(out[0].generated_text, 'ai');
  userInput.disabled = false; userInput.focus();
}
function addMsg(text, type) {
  const d = document.createElement('div'); d.className = `msg ${type}`; d.innerText = text;
  chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;
}
sendBtn.onclick = send;
userInput.onkeypress = e => { if(e.key === 'Enter') send(); };
load();
