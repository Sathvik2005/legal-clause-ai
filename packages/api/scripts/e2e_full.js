// Uses global fetch (Node 18+)
const API = process.env.API_BASE ?? 'http://127.0.0.1:3000'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function createAndAnalyze(title, body) {
  console.log(`\n[E2E] Testing ${title}...`)
  const createRes = await fetch(`${API}/v1/documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, text: body })
  })
  if (!createRes.ok) throw new Error(`create failed ${createRes.status}`)
  const created = await createRes.json()
  const id = created.documentId
  console.log(`  ✓ Created document ${id}`)

  const analyzeRes = await fetch(`${API}/v1/documents/${id}/analyze`, { method: 'POST' })
  if (!analyzeRes.ok) throw new Error(`analyze failed ${analyzeRes.status}`)
  console.log(`  ✓ Enqueued analysis`)

  for (let i = 0; i < 60; i++) {
    await sleep(500)
    const getRes = await fetch(`${API}/v1/documents/${id}`)
    const j = await getRes.json()
    if (j.document?.status === 'analyzed') {
      const analysis = j.analyses[j.analyses.length - 1]
      console.log(`  ✓ Analysis complete (risk: ${analysis.riskScore}, flags: ${analysis.flags.length})`)
      
      const chatRes = await fetch(`${API}/v1/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId: id, message: 'What are the risks?' })
      })
      if (!chatRes.ok) throw new Error(`chat failed ${chatRes.status}`)
      const chat = await chatRes.json()
      console.log(`  ✓ Chat responded: "${chat.response?.substring(0, 80)}..."`)
      return { ok: true }
    }
  }
  throw new Error('Timed out waiting for analysis')
}

async function run() {
  console.log(`Starting comprehensive E2E test against ${API}\n`)
  
  // Test 1: Simple text
  await createAndAnalyze(
    'Simple Indemnity Clause',
    'Party A shall indemnify Party B. Payment of $5000 must be made within 30 days. Either party may terminate on material breach.'
  )
  
  // Test 2: Complex contract
  await createAndAnalyze(
    'SaaS Service Agreement',
    `SERVICE AGREEMENT

1. INDEMNIFICATION
The Vendor shall indemnify and hold harmless the Client from all claims, damages, and liabilities arising from the Vendor's breach of this Agreement.

2. PAYMENT TERMS
Client shall pay $10,000 monthly, due within 30 days of invoice. Late payments incur a 1.5% monthly fee. The Vendor may suspend services if payment is 60 days overdue.

3. LIMITATION OF LIABILITY
IN NO EVENT SHALL VENDOR'S LIABILITY EXCEED THE FEES PAID IN THE 12 MONTHS PRIOR. VENDOR SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.

4. TERMINATION
Either party may terminate on 30 days written notice. Client may terminate immediately if Vendor breaches material terms and fails to cure within 15 days.

5. CONFIDENTIALITY
Both parties shall maintain strict confidentiality of all non-public information and shall not disclose without prior written consent.`
  )
  
  console.log('\n✓ All E2E tests passed!')
}

run().catch((e) => { console.error('\n✗ E2E failed:', e?.message ?? e); process.exit(1) })
