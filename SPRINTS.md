# Wildblocks Sprints

[Development process](tasks/plan.md) · [Detailed Sprint 1 evidence](tasks/sprints/01.md) · [Authoritative story statuses](tasks/todo.md)

The existing Agile history remains under `tasks/`. This file gives contributors a current view without resetting completed work. Sprint windows are planning periods, not autonomous scheduling or release triggers.

## Sprint 1 — Save and release reliability (Nov 9–15, 2026)
Goal: defend world saves and document release verification. WB-001 and WB-003/WB-004 technical work completed; WB-002 native inventory/crop/screenshot acceptance remains open. [v0.13.1](https://github.com/drakeg/wildblocks/releases/tag/v0.13.1) shipped as a maintenance release. Review and product acceptance are not automatically inferred from PR merges.

## Sprint 2 — Beds and dependable respawn (Nov 16–22, 2026)
Goal: complete WB-006 as a verified solo and multiplayer gameplay feature, then prepare v0.14.0 if remaining checks pass.
- Implemented in merged PRs: [bed crafting #27](https://github.com/drakeg/wildblocks/pull/27), [respawn checkpoints #29](https://github.com/drakeg/wildblocks/pull/29), [bed model #30](https://github.com/drakeg/wildblocks/pull/30).
- **Current verification:** native visual model review and complete two-client multiplayer interaction/respawn QA remain open. A completed CI matrix is not proof of native UI acceptance.
- **Next:** close repeatable QA gaps using isolated worlds and server data; address workflow or dependency regressions; maintain sprint evidence. Review/retrospective pending.

## Sprint 3 — Saved multiplayer servers (planned)
Goal: WB-007 saved server selection, secure address validation and helpful connection failures. Acceptance: add/name/remove addresses without passwords; verify unavailable/available server behavior; preserve administrator-owned game mode.

## Sprint 4 — Survival depth (candidate)
Refine WB-008 into a limited cooking/farming vertical slice, only after higher priority save, multiplayer and release issues are addressed.

## Release rule
Use [RELEASES.md](RELEASES.md) and [CHANGELOG.md](CHANGELOG.md). Patch releases fix reliability/security; minor releases deliver backward-compatible game features; major releases require intentional incompatible behavior/data changes with migration guidance. A sprint ending does not trigger a release.
