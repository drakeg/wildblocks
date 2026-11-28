# Wildblocks agent and maintainer instructions

These instructions apply only to `drakeg/wildblocks`. Use [Mad Mallard repository standards](https://github.com/drakeg/madmallard-repository-standards) as a voluntary reference; Wildblocks' save-safety, original assets, desktop packaging, and server security rules take precedence. Never inspect unrelated repositories except this explicitly named standards reference.

## Requirement intake and Sprint discipline
- Record new feature requests in `tasks/todo.md` and `BACKLOG.md` first. Scope and prioritize them; assign a Sprint explicitly before implementing gameplay code.
- Do not interrupt active-Sprint acceptance tasks for new features. Confirmed break/fix (security, data loss, failing CI, critical regressions) may interrupt immediately.
- An exploratory feature branch is not authorization to merge or release that feature. Keep unfinished work isolated until planned.

## Delivery loop
- Build → deploy to an **isolated** desktop or dedicated-server test environment → test real gameplay → fix → retest. Continue with the next ready backlog item within the authorized session; never claim autonomous work outside a session.
- Fix failing CI, save loss, security failures, and broken builds before cosmetic or speculative features. Preserve player worlds, server accounts, backups, and persistent data.
- Use `BACKLOG.md` and `SPRINTS.md` as navigation and `tasks/todo.md`, `tasks/sprints/*.md` as the authoritative story evidence. Preserve historical IDs and acceptance status.
- Use focused feature branches and reviewable PRs. Report PR links and concrete `npm run check`, `npm test`, `npm audit --audit-level=high`, native smoke-test, and packaging evidence. Never assert unrun tests. Respect branch protections.
- Avoid paid deployments and public server exposure by default; dedicated servers are locally bound unless deliberately configured otherwise. Use disposable user-data profiles for desktop QA and temporary server data directories for integration tests.
- Maintain README, AGENTS, CONTRIBUTING, SPRINTS, BACKLOG, RELEASES, SECURITY and CHANGELOG in the same PR when relevant. Major gameplay changes should preserve previous save formats or include a safe migration.

## Check-gated PR auto-merge
- The repository setting `allow_auto_merge` is enabled. GitHub's built-in **Enable auto-merge** requires an unmet required check/review; on a fully clean PR with no pending merge gate, GitHub may reject arming it.
- The default-branch `.github/workflows/auto-merge.yml` handles this without bypassing checks: it runs only when the entire **Build and release** pull-request workflow completed successfully, fetches the current PR from GitHub, verifies the exact tested head SHA, matching target-base SHA, and permits only same-repository, non-draft PRs authored by `drakeg` or `renovate[bot]`.
- Do not auto-merge external/fork PRs or override GitHub-protected reviews. Add `no-automerge` or `requires-manual-review` to opt out before CI finishes. Any failed/missing CI, changed head, or advanced base must stop merge and require fresh successful CI.
- GitHub still enforces repository rules; if merge permission or required review prevents the workflow's merge, fix settings or reviews rather than bypassing them. Review branch protection/rulesets in GitHub Settings periodically; the connected GitHub App may not have administrative access to read these.
- The post-CI workflow takes effect only once merged to `main`. It cannot retroactively merge PRs whose runs finished before activation; rerun CI on their updated branch.

## README badges
- Place the two-row Shields.io block immediately below the README H1, bounded by `madmallard-badges` markers.
- Technology claims are based on `package.json`, `dist/vendor/three.module.js`, and actual workflow configuration. The release, CI, issue, and PR badges must remain dynamic. A CI badge does not imply every manual platform smoke test passed.
- Run `node scripts/badges.mjs --write` when a technology or version changes, and `node scripts/badges.mjs` to validate. The CI build's `npm run check` enforces drift detection.
- The repository has an owner-selected MIT `LICENSE` file and `package.json` must declare `MIT`; the single dynamic GitHub license badge reflects that. Never change licensing without explicit owner authorization.
- Never hardcode a passing test/security status. Badge validation does not substitute for tests or audits.

## Security, release, and business scope
- Treat all multiplayer input as untrusted; validate server-side reach, world edits, inventory, coordinates and authentication. Do not weaken security checks to make builds green.
- This is presently a sandbox game for players and small groups, not an evidenced SMB SaaS. Potential SMB value (private community/game servers, events, educational use) is a research hypothesis, not proven demand or revenue. Do not redirect gameplay development without customer evidence.
- The release process is documented in `RELEASES.md`; use semantic versioning, real release notes and verified asset checksums. A passing PR does not mean published artifacts have been tested manually.
- Before installing any tool or dependency, explain what it is and why; use the existing Node.js runtime and dependency lockfile when possible.
