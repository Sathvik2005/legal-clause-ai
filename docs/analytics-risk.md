**Analytics & Risk Engine (Design)**

Risk Computation
- Clause-level scoring yields contribution values.
- Aggregate with normalization and sigmoid to 0-100 scale (see `packages/shared/src/risk.ts`).

Analytics
- Track: total documents analyzed, avg risk, distribution by jurisdiction/type, frequent flagged clauses.
- Expose simple API endpoints: `/v1/analytics/summary` (prototype implemented).

Quality & False-Positive Reduction
- Ensemble: deterministic rules + learned classifier
- Auditor reruns & human-in-the-loop verification for high-severity flags
