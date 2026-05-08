import type { SanityClient } from '@sanity/client'

export async function createSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET ?? 'production'
  const token = process.env.SANITY_API_TOKEN
  if (!projectId || !token) return null
  const mod = await import('@sanity/client')
  const client: SanityClient = mod.default({
    projectId,
    dataset,
    apiVersion: '2023-10-01',
    token,
    useCdn: false
  })
  return client
}

export async function createDocumentInSanity(payload: any) {
  const client = await createSanityClient()
  if (!client) return null
  const doc = {
    _type: 'legalDocument',
    docId: payload.id,
    title: payload.title ?? null,
    originalName: payload.originalName ?? null,
    mimeType: payload.mimeType ?? null,
    filePath: payload.filePath ?? null,
    textPath: payload.textPath ?? null,
    status: payload.status ?? 'uploaded',
    createdAt: payload.createdAt
  }
  return client.createOrReplace({ _id: `doc.${payload.id}`, ...doc })
}

export async function createAnalysisInSanity(payload: any) {
  const client = await createSanityClient()
  if (!client) return null
  const doc = {
    _type: 'analysis',
    analysisId: payload.id,
    documentId: payload.documentId,
    riskScore: payload.riskScore,
    flags: payload.flags?.map((f: any) => ({ clauseId: f.clauseId, reason: f.reason, confidence: f.confidence, scoreContribution: f.scoreContribution, evidence: (f.evidence||[]).map((e:any)=>e.snippet||e) })) ?? [],
    clauseCount: payload.clauseCount,
    promptVersion: payload.promptVersion,
    modelVersion: payload.modelVersion,
    createdAt: payload.createdAt
  }
  return client.create({ _type: 'analysis', ...doc })
}

export async function patchDocumentStatusInSanity(documentId: string, status: string) {
  const client = await createSanityClient()
  if (!client) return null
  return client.patch(`doc.${documentId}`).set({ status }).commit()
}
