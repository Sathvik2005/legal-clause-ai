**RAG & Vector Search (Design)**

Prototype
- Not wired in prototype. Clause-level text is stored and can be chunked for embedding.

Design
- Chunk clauses into semantically coherent passages (200-500 tokens), embed with an encoder (OpenAI, Llama2+embedder).
- Store vectors in a managed vector DB (Pinecone/Weaviate/RedisVector).
- For queries: retrieve top-K, run LLM with retrieved context, and return answers with provenance (clause ids + snippets).

Performance
- Use approximate nearest neighbor with shards; keep embeddings updated on analysis changes.
