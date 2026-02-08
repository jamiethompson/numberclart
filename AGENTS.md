# Agent Guidelines

This project’s documentation must stay current. With every change you make, update the documentation to reflect the new architecture, operation, decisions, and watch‑outs.

Requirements:
- Keep `docs/system.md` accurate and holistic.
- Update `docs/running.md` when workflows change.
- If you add new behavior or constraints, document the rationale and any risks.
- Do not let documentation lag behind the implementation.

Commit message requirements (Conventional Commits):
- All commit messages must follow the Conventional Commits specification.
- Format: `<type>[optional scope][!]: <description>`
- `type` is required. Common types include: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`, `style`.
- `scope` is optional and should be a short, lower‑case noun in parentheses describing the area affected (for example: `(engine)`, `(ui)`, `(docs)`).
- `!` indicates a breaking change and must appear either after the type/scope (e.g. `feat(ui)!: ...`) or be described in a `BREAKING CHANGE:` footer.
- `description` is required, short, imperative, and lower‑case (for example: `add keyboard input handler`).
- A longer body is optional and should explain the what/why, wrapped at a reasonable width.
- Footers are optional. Use them for `BREAKING CHANGE:` explanations or to reference issues.
- Use a single commit per logical change set; avoid mixing unrelated changes in one commit.

Examples:
- `feat(ui): render 5x5 board`
- `fix(engine): prevent blocked move from advancing turn`
- `docs: explain deterministic move mapping`
- `refactor(engine)!: rename applyMove to applyAction`
  `BREAKING CHANGE: applyMove is now applyAction; update callers.`

Reference:
- https://www.conventionalcommits.org/en/v1.0.0/#specification
