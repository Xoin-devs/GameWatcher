## Context
- Repository spans multiple domains (enterprise, cloud-native, embedded, data pipelines).
- Senior engineers require high maintainability, testability, and consistency.
- AI should suggest code aligned with company-wide standards and patterns.

## General Principles
- Apply SOLID design principles in every suggestion.
- Avoid duplicate logic; follow DRY.
- Favor simple, clear implementations (KISS).
- Only implement features when explicitly needed (YAGNI).
- Structure code for easy testing and change (modular, loosely coupled).

## Architecture & Patterns
- Suggest layered (UI → business → data) for standard enterprise services.
- Propose monoliths for small projects; microservices for large, scalable domains.
- Use Hexagonal/Clean/Onion patterns to isolate business logic.
- Recommend event-driven or CQRS where high throughput or auditability is required.
- Call out trade-offs when suggesting architectures.

## Coding Style & Conventions
- Follow repo’s formatting rules (use configured formatter/linters).
- Use meaningful, descriptive names (variables, functions, types).
- Keep functions short (one responsibility per function).
- Document public APIs with concise doc comments.
- Avoid deep nesting; extract helpers for clarity.

## Error Handling & Resilience
- Always handle exceptions or error results for I/O and external calls.
- Use retry/backoff and circuit-breaker patterns for transient failures.
- Provide graceful degradation or fallbacks on dependency failures.
- Validate all inputs and guard against invalid states.
- Centralize logging of errors with contextual metadata.

## Testing & QA
- Write unit tests for all new code paths (TDD encouraged).
- Include integration tests for critical interactions (DB, API).
- Mock external dependencies in unit tests; use real services sparingly.
- Follow testing pyramid: more unit tests, fewer E2E tests.
- Strive for high-value coverage, not just a percentage metric.

## Collaboration & Maintainability
- Keep pull requests small and focused.
- In code reviews, prioritize maintainability and clarity.
- Pair program on complex features and architecture discussions.
- Use trunk-based or feature-branch flow per team size and release cadence.
- Include AI suggestions in PRs with human review for every change.

## Domain-Specific Notes
- **Enterprise Apps:** Enforce strong domain models and transactional integrity.
- **Cloud-Native:** Design stateless services; follow Twelve-Factor App.
- **Embedded:** Optimize for resources; use industry safety standards.
- **Data Pipelines:** Build idempotent, modular ETL/streaming stages.

## Security & Compliance
- Validate and sanitize all external inputs.
- Enforce least privilege in code and configs.
- Never log sensitive data; record only safe metadata.
- Use secure defaults (HTTPS, strong crypto, environment-driven secrets).
- Keep dependencies updated; scan for vulnerabilities.

## Performance & Scalability
- Profile before optimizing; focus on real bottlenecks.
- Cache infrequently changing data with clear invalidation.
- Design for horizontal scaling (stateless processes, load-balanced).
- Use async/concurrent patterns appropriately.
- Balance performance gains against complexity and cost.
