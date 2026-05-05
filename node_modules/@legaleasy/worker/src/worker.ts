import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { clauseFingerprint, normalizeText, scoreRisk } from '@legaleasy/shared'

const dataDir = path.resolve(process.cwd(), '../../data')
const dbPath = path.join(dataDir, 'db.json')
const jobsDir = path.join(dataDir, 'jobs')

type DB = { documents: Array<any>; analyses: Array<any> }

function ensureDB(): DB {
  fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ documents: [], analyses: [] }, null, 2), 'utf8')
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
}

function saveDB(db: DB) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

function extractClauses(text: string) {
  const sentences = text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean)
  const keywords = ['shall', 'must', 'liable', 'indemnify', 'terminate', 'warrant', 'confidential']
  return sentences
    .filter((sentence) => keywords.some((k) => normalizeText(sentence).includes(k)))
    .map((text) => ({
      id: randomUUID(),
      text,
      fingerprint: clauseFingerprint(text),
      confidence: 0.74,
      evidence: [{ snippet: text.slice(0, 220) }]
    }))
}

function scoreClause(clause: any) {
  const text = normalizeText(clause.text)
  const money = /\$|usd|million|fee|payment/.test(text) ? 1 : 0.4
  const severity = /indemnify|liable|terminate|breach|audit|penalty/.test(text) ? 0.9 : 0.55
  return severity * money
}

async function processDocumentId(documentId: string) {
  const db = ensureDB()
  const doc = db.documents.find((d) => d.id === documentId)
  if (!doc) throw new Error('document not found')
  const text = fs.readFileSync(doc.textPath, 'utf8')
  const clauses = extractClauses(text)
  const contributions = clauses.map(scoreClause)
  const riskScore = scoreRisk(contributions, clauses.length)
  const flags = clauses.map((clause, index) => ({
    id: randomUUID(),
    clauseId: clause.id,
    reason: clause.text,
    confidence: clause.confidence,
    evidence: clause.evidence,
    scoreContribution: contributions[index]
  }))
  db.analyses.push({
    id: randomUUID(),
    documentId,
    riskScore,
    flags,
    clauseCount: clauses.length,
    promptVersion: 'v1',
    modelVersion: 'rules+heuristic',
    createdAt: new Date().toISOString()
  })
  doc.status = 'analyzed'
  saveDB(db)
  return { ok: true, riskScore }
}

function startFileWorker() {
  fs.mkdirSync(jobsDir, { recursive: true })
  console.log('[worker] file queue mode watching', jobsDir)
  const seen = new Set<string>()
  const handle = async (file: string) => {
    if (seen.has(file) || !file.endsWith('.json')) return
    seen.add(file)
    try {
      const job = JSON.parse(fs.readFileSync(file, 'utf8')) as { data?: { documentId?: string } }
      const documentId = job.data?.documentId
      if (!documentId) return
      await processDocumentId(documentId)
      fs.unlinkSync(file)
      console.log('[worker] processed file job', file)
    } catch (error) {
      console.error('[worker] file job failed', file, error)
    } finally {
      seen.delete(file)
    }
  }
  fs.watch(jobsDir, (event, filename) => {
    if (!filename) return
    void handle(path.join(jobsDir, filename))
  })
  for (const file of fs.readdirSync(jobsDir)) {
    void handle(path.join(jobsDir, file))
  }
}

function startBullMQWorker() {
  return import('bullmq').then(({ Worker }) => {
  new Worker(
    'document-analysis',
    async (job) => processDocumentId((job.data as { documentId: string }).documentId),
    { connection: { url: process.env.REDIS_URL } }
  )
  console.log('[worker] bullmq mode enabled')
  })
}

if (process.env.REDIS_URL) void startBullMQWorker()
else startFileWorker()
