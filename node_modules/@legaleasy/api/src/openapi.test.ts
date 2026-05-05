import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('openapi spec contains the legal document endpoints', () => {
  const spec = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'openapi.json'), 'utf8'))
  assert.ok(spec.paths['/v1/documents'])
  assert.ok(spec.paths['/v1/documents/{id}/analyze'])
  assert.ok(spec.paths['/v1/documents/{id}'])
})
