# LegalEasy SaaS Monorepo

This repo contains a production-oriented prototype for an AI-powered legal document analysis platform.

## Included

- `packages/api`: Fastify API with OpenAPI spec and document endpoints
- `packages/worker`: BullMQ worker that processes document analysis jobs
- `packages/shared`: shared risk, fingerprinting, and schema utilities
- `apps/web`: lightweight product mock for upload, analysis, dashboard, and chat
- `docs/feature-roadmap.md`: 100-feature product list plus roadmap

## Quick start

```bash
npm install
npm run dev:api
npm run dev:worker
npm run dev:web
```

## API

The API serves `GET /openapi.json` and the document workflow endpoints used by the web mock.

### Notes & File uploads

- The API now supports multipart uploads for `.pdf`, `.docx`, and `.txt` files and extracts text server-side (uses `pdf-parse` and `mammoth`).
- To run the text-based end-to-end test (requires API + worker running):

```bash
node packages/api/scripts/e2e_text.js
```
