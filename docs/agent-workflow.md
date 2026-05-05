**Agent-based AI Workflow (Design)**

Summary
- Multi-agent orchestration where specialist agents perform clause extraction, risk scoring, RAG retrieval, and explanation generation.

Agents
- Clause Extractor: transforms document text into canonical clauses, fingerprints them, and extracts evidentiary snippets.
- Risk Scorer: applies deterministic + learned models to compute contribution scores per clause and aggregate document risk.
- RAG Retriever: builds vector embeddings from clause chunks and answers queries with provenance.
- Auditor Agent: validates high-risk flags via secondary checks to reduce false positives.

Orchestration
- Worker enqueues a primary job to run Clause Extractor → Risk Scorer → Persist analyses and index vectors → Optionally dispatch Auditor Agent for manual review triggers.

Versioning & Reproducibility
- Save `promptVersion`, `modelVersion`, and `analysisRunId` with each analysis to enable re-evaluation and audits.
