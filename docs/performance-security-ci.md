**Performance, Security & CI/CD (High Level)**

Performance
- Horizontal scale: stateless API behind load balancer, workers autoscaled
- Use Redis/BullMQ for reliable queueing; use object storage for files

Security
- Authenticate API (JWT/OAuth) in production
- Encrypt storage at rest, scan uploaded files for malware
- Rate-limit uploads and large documents

CI/CD
- Use GitHub Actions: lint, test, build, and deploy services to staging
- Run integration tests and synthetic end-to-end runs on PRs
