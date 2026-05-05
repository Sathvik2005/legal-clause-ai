import crypto from 'node:crypto'

export function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function clauseFingerprint(text: string, clauseType = '', jurisdiction = '') {
  return crypto.createHash('sha256').update(`${normalizeText(text)}::${clauseType}::${jurisdiction}`).digest('hex')
}

export function scoreRisk(contributions: number[], clauseCount: number) {
  const raw = contributions.reduce((a, b) => a + b, 0)
  const normalized = raw / (1 + Math.sqrt(Math.max(clauseCount, 1)))
  const sigmoid = 1 / (1 + Math.exp(-1.15 * normalized + 0.8))
  return Math.max(0, Math.min(100, Math.round(sigmoid * 1000) / 10))
}
