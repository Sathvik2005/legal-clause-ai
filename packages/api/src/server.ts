import Fastify from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

type DB = {
  documents: Array<any>
  analyses: Array<any>
}

const dataDir = path.resolve(process.cwd(), '../../data')
const dbPath = path.join(dataDir, 'db.json')
const uploadDir = path.join(dataDir, 'uploads')
const jobsDir = path.join(dataDir, 'jobs')
const openApiPath = path.resolve(process.cwd(), 'openapi.json')

function ensureDB(): DB {
  fs.mkdirSync(uploadDir, { recursive: true })
  fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ documents: [], analyses: [] }, null, 2), 'utf8')
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
}

function saveDB(db: DB) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

function enqueueJob(documentId: string) {
  fs.mkdirSync(jobsDir, { recursive: true })
  const job = { id: randomUUID(), type: 'analyze-document', data: { documentId }, createdAt: new Date().toISOString() }
  fs.writeFileSync(path.join(jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8')
  return job
}

function queueMode() {
  return process.env.REDIS_URL ? 'bullmq' : 'file'
}

async function main() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    // allow all origins in dev for convenience; restrict in production
    origin: process.env.NODE_ENV === 'production' ? ['http://127.0.0.1:5173', 'http://localhost:5173'] : true,
    methods: ['GET', 'POST', 'OPTIONS']
  })
  // enable file uploads (pdf/docx/txt)
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }
  })
  await app.register(swagger, { openapi: { info: { title: 'LegalEasy API', version: '0.1.0' } } })
  await app.register(swaggerUI, { routePrefix: '/docs' })

  app.get('/openapi.json', async () => JSON.parse(fs.readFileSync(openApiPath, 'utf8')))
  app.get('/health', async () => ({ ok: true }))

  app.post('/v1/documents', async (req: any, reply) => {
    // Support both JSON text uploads and multipart file uploads.
    const ct = (req.headers?.['content-type'] ?? '').toString()
    const db = ensureDB()

    // Multipart upload (file + optional title)
    if (ct.includes('multipart/form-data')) {
      const parts = req.parts()
      let title: string | undefined
      let filePart: any = null
      for await (const part of parts) {
        if (part.file) {
          filePart = part
          break
        }
        // simple form field
        if (part.fieldname === 'title') title = part.value
      }
      if (!filePart) return reply.code(400).send({ error: 'no file uploaded' })
      const buffer = await filePart.toBuffer()
      const filename = filePart.filename ?? 'upload'
      const mimetype = filePart.mimetype ?? ''

      // extract text depending on type
      let extractedText = ''
      try {
        if (mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
          try {
            const pdf = await import('pdf-parse')
            const parsed = await pdf.default(buffer)
            extractedText = parsed?.text ?? ''
          } catch (e) {
            extractedText = ''
          }
        } else if (filename.toLowerCase().endsWith('.docx') || mimetype.includes('wordprocessingml')) {
          try {
            const mammoth = await import('mammoth')
            const result = await mammoth.extractRawText({ buffer })
            extractedText = result?.value ?? ''
          } catch (e) {
            extractedText = ''
          }
        } else {
          extractedText = buffer.toString('utf8')
        }
      } catch (err) {
        extractedText = ''
      }

      const id = randomUUID()
      const filePath = path.join(uploadDir, `${id}-${filename}`)
      fs.writeFileSync(filePath, buffer)
      const textPath = path.join(uploadDir, `${id}.txt`)
      fs.writeFileSync(textPath, extractedText, 'utf8')

      db.documents.push({ id, title: title ?? null, originalName: filename, mimeType: mimetype, filePath, textPath, status: 'uploaded', createdAt: new Date().toISOString() })
      saveDB(db)
      return reply.code(201).send({ documentId: id })
    }

    // Fallback: JSON body with text (existing behavior)
    const body = z.object({ title: z.string().optional(), text: z.string().min(1) }).parse(req.body)
    const id = randomUUID()
    const filePath = path.join(uploadDir, `${id}.txt`)
    fs.writeFileSync(filePath, body.text, 'utf8')
    db.documents.push({ id, title: body.title ?? null, textPath: filePath, status: 'uploaded', createdAt: new Date().toISOString() })
    saveDB(db)
    return reply.code(201).send({ documentId: id })
  })

  app.post('/v1/documents/:id/analyze', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const db = ensureDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return reply.code(404).send({ error: 'document not found' })
    doc.status = 'processing'
    saveDB(db)
    if (queueMode() === 'bullmq') {
      const { Queue } = await import('bullmq')
      const queue = new Queue('document-analysis', { connection: { url: process.env.REDIS_URL } })
      const job = await queue.add('analyze-document', { documentId: id }, { removeOnComplete: true, attempts: 3 })
      await queue.close()
      return reply.code(202).send({ jobId: String(job.id), queueMode: 'bullmq' })
    }
    const job = enqueueJob(id)
    return reply.code(202).send({ jobId: job.id, queueMode: 'file' })
  })

  app.get('/v1/documents/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const db = ensureDB()
    const document = db.documents.find((d) => d.id === id)
    if (!document) return reply.code(404).send({ error: 'document not found' })
    return { document, analyses: db.analyses.filter((a) => a.documentId === id) }
  })

  app.get('/v1/analytics/summary', async () => {
    const db = ensureDB()
    const totalAnalyzed = db.analyses.length
    const avgRisk = totalAnalyzed ? db.analyses.reduce((s, a) => s + a.riskScore, 0) / totalAnalyzed : 0
    return { totalAnalyzed, avgRisk: Math.round(avgRisk * 10) / 10 }
  })

  app.post('/v1/chat', async (req) => {
    const body = z.object({ documentId: z.string(), message: z.string() }).parse(req.body)
    const db = ensureDB()
    const analysis = db.analyses.find((a) => a.documentId === body.documentId)
    const topFlags = analysis?.flags?.slice(0, 3) ?? []
    return {
      response: `Based on the analyzed document, the highest risk areas are ${topFlags.map((f: any) => f.reason).join(', ') || 'not yet available'}.`,
      sources: topFlags.map((f: any) => ({ clauseId: f.clauseId, snippet: f.evidence?.[0]?.snippet ?? '' }))
    }
  })

  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
