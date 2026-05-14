# LegalEasy SaaS Monorepo

This repo contains a production-oriented prototype for an AI-powered legal document analysis platform.

## Included

- `packages/api`: Fastify API with OpenAPI spec and document endpoints
- `packages/worker`: BullMQ worker that processes document analysis jobs
- `packages/shared`: shared risk, fingerprinting, and schema utilities
- `apps/web`: lightweight product mock for upload, analysis, dashboard, and chat
- `docs/feature-roadmap.md`: 100-feature product list plus roadmap
- `docs/system-architecture-complete.md`: full technical blueprint (architecture, agents, schemas, RAG, risk algorithms, QA, performance, security, CI/CD)

## Quick start

```bash
npm install
npm run dev
```

This starts all three services (API, worker, web) together using `concurrently`:
- **API**: http://127.0.0.1:3000 (Fastify)
- **Worker**: Watches `/data/jobs` directory for analysis tasks
- **Web**: http://localhost:5173 (Vite dev server)

### Running individual services

If you want to run services separately:
```bash
npm run dev:api      # Just the API server
npm run dev:worker   # Just the background worker
npm run dev:web      # Just the web frontend
```

## API

The API serves `GET /openapi.json` and the document workflow endpoints used by the web mock.

### Notes & File uploads

- The API now supports multipart uploads for `.pdf`, `.docx`, and `.txt` files and extracts text server-side (uses `pdf-parse` and `mammoth`).
- To run the text-based end-to-end test (requires API + worker running):

```bash
node packages/api/scripts/e2e_text.js
```

- To run the comprehensive E2E test (tests text, PDF, and DOCX uploads):

```bash
node packages/api/scripts/e2e_full.js
```

Both tests create documents, trigger analysis, and verify the full pipeline works end-to-end.

### Sanity (GROQ) integration

- This prototype can persist documents and analyses to Sanity using the GROQ-backed dataset. To enable, set these environment variables in your environment or Vercel project:

```
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_TOKEN=your_write_token
```

Schemas are located in `infra/sanity/schemas/` and the API/worker will automatically write to Sanity when the above variables are present.

### Vercel deployment (CI)

- Add the following secrets to your GitHub repository: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- The GitHub Action `.github/workflows/vercel-deploy.yml` will build and deploy to Vercel on push to `main`.

