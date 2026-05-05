// Uses global fetch (Node 18+)
const API = process.env.API_BASE ?? 'http://127.0.0.1:3000'

async function run() {
  console.log('Starting text-based E2E test against', API)
  const res = await fetch(`${API}/v1/documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'E2E Test', text: 'Party A shall indemnify Party B. Payment due 30 days.' })
  })
  if (!res.ok) throw new Error('create failed ' + res.status)
  const payload = await res.json()
  const id = payload.documentId
  console.log('Created document', id)
  const a = await fetch(`${API}/v1/documents/${id}/analyze`, { method: 'POST' })
  if (!a.ok) throw new Error('analyze failed ' + a.status)
  console.log('Enqueued analysis, polling...')
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const s = await fetch(`${API}/v1/documents/${id}`)
    const j = await s.json()
    if (j.document?.status === 'analyzed') {
      console.log('Analysis complete; analysis:', j.analyses[j.analyses.length - 1])
      return
    }
  }
  throw new Error('Timed out waiting for analysis')
}

run().catch((e) => { console.error(e); process.exit(1) })
