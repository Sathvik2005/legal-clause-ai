import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

const shell: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top, #1b1f2a 0%, #0a0d14 40%, #05070b 100%)',
  color: '#f4f4f5',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  padding: '40px'
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(12px)'
}

const field: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.2)',
  color: '#f4f4f5',
  padding: '12px 14px',
  outline: 'none'
}

const button: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  background: '#f4f4f5',
  color: '#111827',
  border: 0,
  fontWeight: 700,
  cursor: 'pointer'
}

type Flag = {
  clauseId: string
  reason: string
  confidence: number
  scoreContribution: number
  evidence?: Array<{ snippet: string }>
}

type Analysis = {
  riskScore: number
  flags: Flag[]
  createdAt: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:3000'

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function App() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('The party shall indemnify the other party. Payment of $5000 must be made within 30 days. Either party may terminate on material breach.')
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [chatInput, setChatInput] = useState('What are the highest risk clauses?')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatSources, setChatSources] = useState<Array<{ clauseId: string; snippet: string }>>([])

  const statusLabel = useMemo(() => {
    if (status === 'idle') return 'Ready'
    if (status === 'uploading') return 'Uploading'
    if (status === 'analyzing') return 'Analyzing'
    if (status === 'done') return 'Completed'
    return 'Failed'
  }, [status])

  async function analyzeDocument() {
    setError('')
    setStatus('uploading')
    setAnalysis(null)
    setChatAnswer('')
    setChatSources([])
    try {
      let createRes: Response
      if (file) {
        const fd = new FormData()
        fd.append('file', file, (file as any).name)
        if (title) fd.append('title', title)
        createRes = await fetch(`${API_BASE}/v1/documents`, { method: 'POST', body: fd })
      } else {
        createRes = await fetch(`${API_BASE}/v1/documents`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, text })
        })
      }
      if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`)
      const created = await createRes.json()
      setDocumentId(created.documentId)

      setStatus('analyzing')
      const analyzeRes = await fetch(`${API_BASE}/v1/documents/${created.documentId}/analyze`, { method: 'POST' })
      if (!analyzeRes.ok) throw new Error(`Analyze failed: ${analyzeRes.status}`)

      for (let i = 0; i < 40; i += 1) {
        await sleep(400)
        const getRes = await fetch(`${API_BASE}/v1/documents/${created.documentId}`)
        if (!getRes.ok) throw new Error(`Fetch status failed: ${getRes.status}`)
        const payload = await getRes.json()
        if (payload.document?.status === 'analyzed') {
          const latest = payload.analyses?.[payload.analyses.length - 1] ?? null
          setAnalysis(latest)
          setStatus('done')
          return
        }
      }
      throw new Error('Timed out waiting for analysis')
    } catch (e: any) {
      setStatus('error')
      setError(e?.message ?? 'Unknown error')
    }
  }

  async function askChat() {
    if (!documentId) return
    setError('')
    try {
      const res = await fetch(`${API_BASE}/v1/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId, message: chatInput })
      })
      if (!res.ok) throw new Error(`Chat failed: ${res.status}`)
      const payload = await res.json()
      setChatAnswer(payload.response ?? '')
      setChatSources(payload.sources ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Unknown chat error')
    }
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, letterSpacing: 2, opacity: 0.7 }}>LEGAL EASE</div>
            <h1 style={{ fontSize: 56, margin: '12px 0 0', fontWeight: 700, lineHeight: 1.02 }}>Understand what you're signing.</h1>
          </div>
          <button style={{ ...button, borderRadius: 999 }} onClick={analyzeDocument}>Start Analysis</button>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 24 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Upload / Analysis</h2>
            <div style={{ border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 16, padding: 20, minHeight: 240 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title (optional)" />
                <textarea
                  style={{ ...field, minHeight: 130, resize: 'vertical' }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste legal text here"
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input id="file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <label htmlFor="file" style={{ opacity: 0.8, fontSize: 12 }}>{file ? file.name : 'Drop or choose a PDF/DOCX/TXT'}</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ opacity: 0.8 }}>Status: {statusLabel}</div>
                  <button style={button} onClick={analyzeDocument} disabled={status === 'uploading' || status === 'analyzing'}>
                    {status === 'uploading' || status === 'analyzing' ? 'Running...' : 'Analyze Document'}
                  </button>
                </div>
                {documentId ? <div style={{ opacity: 0.6, fontSize: 12 }}>Document ID: {documentId}</div> : null}
                {error ? <div style={{ color: '#fda4af' }}>{error}</div> : null}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 24 }}>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Risk Snapshot</h3>
              <div style={{ fontSize: 54, fontWeight: 800 }}>{analysis ? analysis.riskScore.toFixed(1) : '--'}</div>
              <div style={{ opacity: 0.7 }}>{analysis ? `Flags found: ${analysis.flags.length}` : 'Run an analysis to view score'}</div>
            </div>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Chat with Document</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input style={field} value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                <button style={button} onClick={askChat} disabled={!documentId}>Ask</button>
                <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{chatAnswer || 'Ask questions after analysis completes.'}</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Document Viewer</h3>
            <div style={{ opacity: 0.8, lineHeight: 1.55 }}>{text || 'No text uploaded yet.'}</div>
          </div>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Flagged Clauses</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {(analysis?.flags ?? []).slice(0, 5).map((flag) => (
                <div key={flag.clauseId} style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{flag.reason}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Confidence: {flag.confidence.toFixed(2)} | Score: {flag.scoreContribution.toFixed(2)}</div>
                </div>
              ))}
              {analysis?.flags?.length ? null : <div style={{ opacity: 0.65 }}>No flags yet.</div>}
            </div>
          </div>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Chat Sources</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {chatSources.map((s, idx) => (
                <div key={`${s.clauseId}-${idx}`} style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 }}>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Clause: {s.clauseId}</div>
                  <div>{s.snippet || 'No snippet'}</div>
                </div>
              ))}
              {chatSources.length ? null : <div style={{ opacity: 0.65 }}>No sources yet.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
