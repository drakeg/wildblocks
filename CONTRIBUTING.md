# Contributing to Wildblocks

Wildblocks uses reviewable PRs and [Sprint/backlog tracking](SPRINTS.md). Gameplay and tooling contributions, including agent-generated changes, must preserve world saves and use original or appropriately licensed assets.

## Getting started
Use a supported Node.js runtime with npm, then run `npm ci`, `npm run check`, and `npm test`. Desktop development: `npm run desktop`. Dedicated-server setup: [SERVER.md](SERVER.md). The release workflow tests and packages macOS, Windows and Linux builds; it is not proof of full graphical acceptance on each OS.

## Pull requests
1. Link a WB-### story in [BACKLOG.md](BACKLOG.md), or document an urgent fix. Scope changes narrowly and define reproduction/acceptance steps.
2. Branch from `main`. Prefer Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
3. Add tests for save persistence, security, multiplayer synchronization and compatibility when applicable. Test with isolated QA worlds/server data; never modify a real player save.
4. Run `npm run check` (includes badge validation), `npm test`, and `npm audit --audit-level=high` where dependencies are installed. Report the exact results; CI must pass before merging.
5. Update documentation, changelog/release notes if a player-visible change is included, and relevant sprint evidence. Describe security, risk, rollback and migration impact in the PR.

## Automatic merging
Ready, same-repository PRs from the repository owner or Renovate are eligible for automatic merging **after** the full `Build and release` pull-request workflow succeeds. The workflow checks the exact current head and base commits and relies on GitHub to enforce branch rules and reviews. Set the PR label `no-automerge` or `requires-manual-review` for manual review. PRs from external contributors and forks remain manual. Failed or outdated CI does not merge; push an updated branch and obtain fresh green checks. This is a CI-success merge workflow; GitHub's native auto-merge toggle remains available if the repository is configured with required merge gates.

## Badges and documentation
The root README badge block is owned by `scripts/badges.mjs`, which verifies the real manifest/workflow before generating it. After a verified technology/version change run `node scripts/badges.mjs --write`; CI checks for drift via `npm run check`. Never add fake build, test, security or license badges. Follow the project-specific guidance in [AGENTS.md](AGENTS.md).

## Reporting vulnerabilities
Use the private contact guidance in [SECURITY.md](SECURITY.md); avoid publishing credentials, user saves or working exploits in issues.
