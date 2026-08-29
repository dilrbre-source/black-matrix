import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const OLLAMA = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2';
const DEFAULT_PROMPT = 'أنت مساعد ذكي ونظام Black Matrix. أجب باللغة العربية بوضوح ودقة، ولا تدّعي تنفيذ أفعال لم تنفذها.';

async function hash(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function App() {
  const [tab, setTab] = useState('main');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [answer, setAnswer] = useState('النظام جاهز. شغّل Ollama محليًا ثم أرسل أمرًا.');
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [password, setPassword] = useState('');

  const status = useMemo(() => busy ? 'جاري المعالجة…' : 'جاهز', [busy]);

  const addLog = async (text, tag = 'INFO') => {
    const previous = logs.at(-1)?.hash || 'GENESIS';
    const entry = { time: new Date().toLocaleTimeString(), tag, text, previous };
    entry.hash = await hash(JSON.stringify(entry));
    const next = [...logs, entry].slice(-50);
    setLogs(next);
    localStorage.setItem('black-matrix-audit', JSON.stringify(next));
  };

  const run = async () => {
    const q = prompt.trim();
    if (!q || busy) return;
    setPrompt(''); setBusy(true); await addLog(q, 'CMD');
    try {
      const res = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, stream: false, messages: [
          { role: 'system', content: systemPrompt }, { role: 'user', content: q }
        ] })
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = await res.json();
      setAnswer(data.message?.content || 'لم يصل رد من النموذج.');
      setRequests(v => v + 1); await addLog('تمت معالجة الطلب محليًا', 'AI');
    } catch (e) {
      setAnswer(`تعذر الاتصال بـ Ollama المحلي. شغّله ثم جرّب مرة أخرى.\n\n${e.message}`);
      await addLog(e.message, 'ERR');
    } finally { setBusy(false); }
  };

  const unlock = () => { if (password === '1234') setAdmin(true); else alert('رمز المرور غير صحيح'); };

  return <main>
    <header><strong>❖ BLACK MATRIX OS</strong><nav>
      <button className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>المحرك</button>
      <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>الإدارة</button>
    </nav></header>

    {tab === 'main' ? <section>
      <div className="core"><div className="title"><span>{status}</span><b>LOCAL</b></div><pre>{answer}</pre></div>
      <div className="actions"><button onClick={() => {setAnswer('فحص محلي: واجهة React تعمل.'); addLog('local health check','SYS')}}>⚡ فحص النظام</button><button onClick={() => {setAnswer(`Endpoint: ${OLLAMA}\nModel: ${MODEL}`); addLog('local connection details','TEST')}}>📡 اختبار الاتصال</button></div>
      <div className="terminal"><div className="termhead">AUDIT LOG · SHA-256 CHAIN</div>{logs.map((l,i)=><div key={i}>[{l.time}] <i>[{l.tag}]</i> {l.text} <small>{l.hash?.slice(0,12)}</small></div>)}</div>
      <div className="input"><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()} placeholder="أدخل أمرًا…"/><button onClick={run}>{busy?'…':'تنفيذ'}</button></div>
    </section> : <section>
      {!admin ? <div className="card"><h3>🔒 لوحة التحكم</h3><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز المرور التجريبي: 1234"/><button onClick={unlock}>دخول</button></div> : <>
        <div className="stats"><div><b>{requests}</b><span>طلبات هذه الجلسة</span></div><div><b>{logs.length}</b><span>سجلات التدقيق</span></div><div><b>0$</b><span>تكلفة API</span></div></div>
        <div className="card"><h3>🧠 System Prompt</h3><textarea value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)}/><button onClick={()=>addLog('تم تحديث System Prompt','CONFIG')}>حفظ</button></div>
      </>}
    </section>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />);