# Wildblocks Sprints

[Development process](tasks/plan.md) · [Detailed Sprint 1 evidence](tasks/sprints/01.md) · [Authoritative story statuses](tasks/todo.md)

The existing Agile history remains under `tasks/`. This file gives contributors a current view without resetting completed work. Sprint windows are planning periods, not autonomous scheduling or release triggers.

## Sprint 1 — Save and release reliability (Nov 9–15, 2026)
Goal: defend world saves and document release verification. WB-001 and WB-003/WB-004 technical work completed; WB-002 native inventory/crop/screenshot acceptance remains open. [v0.13.1](https://github.com/drakeg/wildblocks/releases/tag/v0.13.1) shipped as a maintenance release. Review and product acceptance are not automatically inferred from PR merges.

## Sprint 1 acceptance follow-up — Save/restart QA (Nov 22, 2026)
Native Electron isolated-profile verification now covers two saved slots, inventory and hunger values, crop growth, saved facing, UI backup restore/undo, and full app quit/relaunch. An additional regression protects distinct player coordinates and state across repeated restore/reopen. Screenshot review, actual gameplay inventory/crop manipulation and moved player-state confirmation remain open; technical source QA is not a published binary acceptance pass.

## Sprint 1 acceptance follow-up — Production farming-to-save regression (Nov 28, 2026)
Added a focused test for actual production till/plant/crop-growth/eat actions, then saving and reloading inventory, hunger, player position/facing, and crop growth, followed by reversible backup restore/undo and second-world isolation. CI pending; no new native graphical demonstration or manual release-binary pass is claimed.

## Sprint 1 native QA instrumentation (Nov 28, 2026)
Extend the existing read-only `window.wildblocksState` QA hook to expose exact facing, hunger, inventory and crop growth as defensive copies without authentication data. Native GUI acceptance and screenshots remain open; no saved data is mutated by diagnostics.

## Sprint 2 — Beds and dependable respawn (Nov 16–22, 2026)
Goal: complete WB-006 as a verified solo and multiplayer gameplay feature, then prepare v0.14.0 if remaining checks pass.
- Implemented in merged PRs: [bed crafting #27](https://github.com/drakeg/wildblocks/pull/27), [respawn checkpoints #29](https://github.com/drakeg/wildblocks/pull/29), [bed model #30](https://github.com/drakeg/wildblocks/pull/30).
- **Current verification:** native screenshot review and a full two-client graphical defeat demonstration remain open; two isolated native clients now verified real R interactions to bind their own Woven beds on November 26; deterministic two-player fatal combat and bed/camp fallback are now regression tested; isolated two-client native sign-in and reciprocal peer presence now verified, along with two-account checkpoint persistence integration tests. A completed CI matrix is not proof of native UI acceptance.
- **Next:** close repeatable QA gaps using isolated worlds and server data; address workflow or dependency regressions; maintain sprint evidence. Review/retrospective pending.

## Sprint 2 reliability follow-up — Multiplayer sign-out (Nov 28, 2026)
Fixed a discovered WB-003 save-safety regression: a multiplayer Sign Out had shown a false success after failed checkpoint/logout calls. Sign-out now requires a confirmed checkpoint and successful logout; failures remain visible and retryable. Automated regression tests and CI pending. No unrelated feature work was introduced.

## Sprint 3 — Saved multiplayer servers (planned)
Goal: WB-007 saved server selection, secure address validation and helpful connection failures. First slice adds credential-free named address list, selection and removal. Desktop on-demand status checking added; native live UI and multi-client acceptance remain pending; game mode remains administrator-controlled.

## Sprint 4 — Survival depth (candidate)
Refine WB-008 into a limited cooking/farming vertical slice, only after higher priority save, multiplayer and release issues are addressed.

## Release rule
Use [RELEASES.md](RELEASES.md) and [CHANGELOG.md](CHANGELOG.md). Patch releases fix reliability/security; minor releases deliver backward-compatible game features; major releases require intentional incompatible behavior/data changes with migration guidance. A sprint ending does not trigger a release.
