**Backend Architecture**

Overview
- API: Fastify HTTP server exposing document lifecycle endpoints (/v1/documents, /v1/documents/:id/analyze, /v1/chat, /v1/analytics/summary)
- Worker: background processor (BullMQ with file-queue fallback) watches jobs and executes analysis
- Storage: lightweight JSON file for prototype; stores `documents` and `analyses`; uploads stored under `/data/uploads`

Design Goals
- Simple, observable, and testable prototype
- Clear separation: API handles ingestion and job enqueueing; Worker handles CPU-bound analysis and extraction
- Multipart upload support with PDF/DOCX/TXT extraction and text persistence

File layout (prototype)
- `/packages/api/src/server.ts` — API server implementation
- `/packages/worker/src/worker.ts` — worker process and job consumer
- `/data` — storage directory for `db.json`, `uploads/`, and `jobs/`

Notes
- For production: replace JSON storage with Postgres, replace file-queue with Redis/BullMQ, replace pdf-parse/mammoth with scalable extraction microservice, and add object storage (S3-compatible).
