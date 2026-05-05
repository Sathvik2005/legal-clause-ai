**Data Model & DB Schemas (Prototype)**

Entities
- Document
  - id, title, originalName, mimeType, filePath, textPath, status, createdAt
- Analysis
  - id, documentId, riskScore, flags[], clauseCount, promptVersion, modelVersion, createdAt
- Flag
  - id, clauseId, reason, confidence, evidence[], scoreContribution

Prototype Storage
- `db.json` with shape: { documents: [], analyses: [] }

Production Recommendations
- Documents table (Postgres) with file metadata and S3 object keys
- Analyses table with JSONB flags and versioned metadata
- Vector index stored separately (e.g., Pinecone, Weaviate)
