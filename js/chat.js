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
  const t = userInput.value.trim(); 
  if(!t || !generator) return;
  
  addMsg(t, 'user'); 
  userInput.value = ''; 
  userInput.disabled = true;
  
  // إضافة فقاعة مؤقتة (جاري التفكير...)
  const loadingId = 'loading-' + Date.now();
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg ai';
  loadingDiv.id = loadingId;
  loadingDiv.innerText = '... جاري التفكير';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // إعطاء تعليمات للنموذج ليجيب بشكل أفضل
    const prompt = `Answer this: ${t}`;
    const out = await generator(prompt, { max_new_tokens: 100 });
    
    // حذف فقاعة التفكير
    document.getElementById(loadingId).remove();
    
    let reply = out[0].generated_text.trim();
    
    // التحقق مما إذا كان الرد فارغاً
    if (!reply || reply === "") {
      reply = "⚠️ عذراً، أنا نموذج صغير جداً ولا أفهم اللغة العربية. جرب أن تسألني بالإنجليزية (مثلاً: Hello, what is your name?).";
    }
    
    addMsg(reply, 'ai');
  } catch(e) {
    document.getElementById(loadingId).remove();
    addMsg("حدث خطأ أثناء المعالجة.", 'ai');
  } finally {
    userInput.disabled = false; 
    userInput.focus();
  }
}

function addMsg(text, type) {
  const d = document.createElement('div'); 
  d.className = `msg ${type}`; 
  d.innerText = text;
  chatBox.appendChild(d); 
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.onclick = send;
userInput.onkeypress = e => { if(e.key === 'Enter') send(); };
load();
