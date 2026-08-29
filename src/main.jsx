import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import './style.css';

const OLLAMA = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2';
const DEFAULT_PROMPT = 'أنت BLACK، مساعد محلي داخل Black Matrix. أجب بالعربية بوضوح ودقة. لا تدّعي تنفيذ إجراء لم تنفذه فعليًا، وإذا لم تعرف فقل ذلك.';
const GENESIS = '0'.repeat(64);

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

function Node({ node, selected, onSelect }) {
  const ref = useRef();
  const baseY = node.pos[1];
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.5 + node.pos[0]) * 0.08; });
  return <group position={node.pos}>
    <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}>
      <sphereGeometry args={[selected ? 0.28 : 0.18, 24, 24]} />
      <meshStandardMaterial color={selected ? '#ff1f6d' : '#00eaff'} emissive={selected ? '#ff1f6d' : '#00a8ff'} emissiveIntensity={selected ? 2.2 : 0.9} />
    </mesh>
    <Text position={[0, 0.38, 0]} fontSize={0.13} color="#dff6ff" anchorX="center">{node.label}</Text>
  </group>;
}

function Galaxy({ nodes, selected, onSelect }) {
  return <div className="galaxy"><Canvas camera={{ position: [0, 0, 6], fov: 55 }}>
    <ambientLight intensity={0.3} /><pointLight position={[5, 5, 5]} intensity={3} color="#00eaff" />
    <Stars radius={30} depth={15} count={900} factor={2} saturation={0} fade speed={0.4} />
    {nodes.map(n => <Node key={n.id} node={n} selected={selected === n.id} onSelect={onSelect} />)}
    <OrbitControls enablePan enableZoom rotateSpeed={0.5} />
  </Canvas><div className="galaxy-label">BLACK MATRIX · LOCAL KNOWLEDGE GRAPH · {nodes.length} NODES</div></div>;
}

function App() {
  const [tab, setTab] = useState('core');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('النواة المحلية جاهزة. يمكنك تشغيل Ollama ثم إرسال أول أمر.');
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('black-matrix-system') || DEFAULT_PROMPT);
  const [logs, setLogs] = useState(() => load('black-matrix-audit', []));
  const [nodes, setNodes] = useState(() => load('black-matrix-nodes', [
    { id: 'core', label: 'BLACK Core', category: 'system', pos: [0, 0, 0] },
    { id: 'rag', label: 'Local RAG', category: 'knowledge', pos: [1.8, 1.2, -0.8] },
    { id: 'vault', label: 'Audit Vault', category: 'security', pos: [-1.8, -1.1, 0.5] },
    { id: 'ollama', label: 'Ollama', category: 'ai', pos: [1.2, -1.7, -1.2] }
  ]));
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(0);
  const [ollamaOK, setOllamaOK] = useState(null);
  const [knowledgeText, setKnowledgeText] = useState('');

  useEffect(() => { localStorage.setItem('black-matrix-audit', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('black-matrix-nodes', JSON.stringify(nodes)); }, [nodes]);
  useEffect(() => { localStorage.setItem('black-matrix-system', systemPrompt); }, [systemPrompt]);

  const addLog = async (text, tag = 'INFO') => {
    const previous = logs.at(-1)?.hash || GENESIS;
    const payload = { timestamp: new Date().toISOString(), agent_id: 'BLACK_LOCAL', action_type: tag, input_payload: text, previous_hash: previous };
    const hash = await sha256(JSON.stringify(payload));
    setLogs(prev => [...prev, { ...payload, hash }].slice(-100));
  };

  const checkOllama = async () => {
    try { const r = await fetch(`${OLLAMA}/api/tags`); setOllamaOK(r.ok); await addLog(r.ok ? 'Ollama online' : 'Ollama unavailable', r.ok ? 'HEALTH' : 'ERROR'); }
    catch { setOllamaOK(false); await addLog('تعذر الوصول إلى Ollama', 'ERROR'); }
  };

  const run = async () => {
    const q = prompt.trim(); if (!q || busy) return;
    setPrompt(''); setBusy(true); await addLog(q, 'CMD');
    try {
      const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: q }] }) });
      if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
      const data = await r.json(); setAnswer(data.message?.content || 'لم يصل رد.'); setRequests(v => v + 1); setOllamaOK(true); await addLog('تمت الإجابة بواسطة النموذج المحلي', 'AI');
    } catch (e) { setAnswer(`لم أستطع الاتصال بـ Ollama المحلي.\n\n${e.message}\n\nشغّل: ollama serve`); setOllamaOK(false); await addLog(e.message, 'ERROR'); }
    finally { setBusy(false); }
  };

  const addKnowledge = async () => {
    const text = knowledgeText.trim(); if (!text) return;
    const id = crypto.randomUUID();
    const node = { id, label: text.slice(0, 28), category: 'local-note', content: text, pos: [(Math.random() - .5) * 5, (Math.random() - .5) * 3.5, (Math.random() - .5) * 3] };
    setNodes(prev => [...prev, node]); setKnowledgeText(''); await addLog(`إضافة عقدة معرفة: ${node.label}`, 'KNOWLEDGE');
  };

  const clearAudit = () => { setLogs([]); localStorage.removeItem('black-matrix-audit'); };
  const statusText = busy ? 'PROCESSING' : ollamaOK === false ? 'OFFLINE' : 'READY';
  const selectedNode = useMemo(() => nodes.find(n => n.id === selected), [nodes, selected]);

  return <main>
    <header><div><strong>❖ BLACK MATRIX OS</strong><small>ZERO-COST · LOCAL-FIRST</small></div><nav>
      {['core','knowledge','audit','settings'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{({core:'المحرك',knowledge:'المعرفة',audit:'التدقيق',settings:'الإعدادات'})[t]}</button>)}
    </nav></header>

    {tab === 'core' && <section>
      <div className="statusbar"><span className={ollamaOK ? 'dot on' : ollamaOK === false ? 'dot off' : 'dot'}></span><b>{statusText}</b><span>MODEL: {MODEL}</span><span>OLLAMA: {OLLAMA}</span><button onClick={checkOllama}>فحص Ollama</button></div>
      <div className="core-grid"><div className="core"><h2>BLACK CORE</h2><pre>{answer}</pre></div><Galaxy nodes={nodes} selected={selected} onSelect={setSelected} /></div>
      <div className="input"><input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="اكتب أمرك هنا…"/><button onClick={run} disabled={busy}>{busy ? 'جارٍ…' : 'تنفيذ'}</button></div>
    </section>}

    {tab === 'knowledge' && <section><div className="card"><h2>LOCAL KNOWLEDGE GRAPH</h2><p>المعرفة تحفظ محليًا في المتصفح. هذه النسخة لا تستخدم قاعدة بيانات مدفوعة.</p><textarea value={knowledgeText} onChange={e => setKnowledgeText(e.target.value)} placeholder="أضف ملاحظة أو معلومة…"/><button onClick={addKnowledge}>+ إضافة عقدة</button></div><Galaxy nodes={nodes} selected={selected} onSelect={setSelected}/>{selectedNode && <div className="card"><b>{selectedNode.label}</b><p>{selectedNode.content || `الفئة: ${selectedNode.category}`}</p></div>}</section>}

    {tab === 'audit' && <section><div className="stats"><div><b>{requests}</b><span>AI REQUESTS</span></div><div><b>{logs.length}</b><span>AUDIT RECORDS</span></div><div><b>0$</b><span>PAID API</span></div></div><div className="terminal"><div className="termhead">CRYPTOGRAPHIC AUDIT VAULT · SHA-256 CHAIN</div>{logs.length ? logs.map((l, i) => <div className="log" key={i}><span>{new Date(l.timestamp).toLocaleTimeString()}</span> <i>[{l.action_type}]</i> {l.input_payload}<small>{l.hash.slice(0, 16)}…</small></div>) : <p>لا توجد سجلات بعد.</p>}</div><button className="danger" onClick={clearAudit}>مسح السجل المحلي</button></section>}

    {tab === 'settings' && <section><div className="card"><h2>BLACK SYSTEM PROMPT</h2><textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}/><button onClick={() => addLog('تم حفظ System Prompt', 'CONFIG')}>حفظ</button></div><div className="card"><h2>التشغيل المجاني</h2><p>النظام يستخدم Ollama محليًا ولا يحتاج مفتاح API. غيّر النموذج من <code>VITE_OLLAMA_MODEL</code> إذا أردت.</p><p>السجل والمعرفة محفوظان في LocalStorage على جهازك.</p></div></section>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
