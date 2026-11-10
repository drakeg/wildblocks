# Wildblocks backlog

Status: Ready, In progress, Blocked, Review, Done. Points are relative scope. Product acceptance is tracked separately in the sprint review. This file is the authoritative story-status list.

## Sprint 1 — dependable saves and releases

### WB-001 — Verify the published release (1 point)
**Status:** Done · technical evidence recorded November 9, 2026.
**Outcome:** Players can find the current client and server downloads.
**Acceptance:**
- [x] 0.13.0 release and successful packaging run identified.
- [x] All 11 expected packages are uploaded and nonempty.
- [x] All package digests match the downloadable checksum manifest.
**Verification:** GitHub release metadata, workflow conclusion and manifest comparison. This does not claim every downloaded binary was manually launched.
**Dependencies:** None. **Files:** sprint evidence only.

### WB-002 — Verify restore and restart in the desktop client (3 points)
**Status:** Ready · prior attempts blocked by stale automation state; begin with one bounded automation check.
**Outcome:** Players trust that a world returns to its saved state.
**Acceptance:**
- [ ] In a disposable slot, save distinct position/facing, inventory, hunger and crop state, fully quit, reopen and verify those values.
- [ ] Restore a known session backup through the UI, verify it, undo the restoration before another session, and confirm a second slot remains unchanged.
- [ ] Record screenshots/read-only diagnostics and exact steps; reproduce and fix any app defect or identify the specific automation blocker without claiming a pass.
**Verification:** Native desktop interaction plus existing automated snapshot tests; never replace or restore a human-used slot. Stop repeated identical automation failures and report the blocker.
**Dependencies:** WB-001. **Files:** tests/world-library.test.mjs; dist/game.js only if a reproducible defect exists; sprint evidence.

### WB-003 — Protect unsaved progress during desktop exit (2 points)
**Status:** Ready.
**Outcome:** A player is not silently told to quit successfully when local saving failed.
**Acceptance:**
- [ ] Reproduce the storage-failure exit path in an isolated test; determine whether renderer checkpoint errors are swallowed.
- [ ] On confirmed save failure, preserve the open session and offer a clear retry/export path; normal quit still completes when saving succeeds.
- [ ] Meaningful tests cover failed and successful checkpoints, including hosted-server shutdown sequencing if changed.
**Verification:** Inspect desktop/preload.cjs and desktop/main.cjs with dist/game.js saveSession; focused automated tests and native failure/retry check. Do not fill human storage to simulate failure.
**Dependencies:** None; may proceed if WB-002 is blocked. **Files:** desktop/main.cjs, desktop/preload.cjs, dist/game.js, focused tests. Split if investigation exceeds this size.

### WB-004 — Record repeatable release checks (1 point)
**Status:** Ready.
**Outcome:** Each release states what has actually been tested.
**Acceptance:**
- [ ] Document source/head, tests, CI, expected assets and checksum checks in a reusable checklist.
- [ ] Separate automated platform coverage from native manual checks and record unresolved limitations.
- [ ] Apply the checklist to 0.13.0 and link the evidence from the sprint review.
**Verification:** Compare checklist against the actual packaging workflow; no redundant pipeline rewrite.
**Dependencies:** WB-001; desktop evidence depends on WB-002. **Files:** RELEASES.md, tasks/sprints/01.md.

## Ordered future backlog — not committed

### WB-005 — Diagnose dependency update automation (1 point)
**Status:** Ready · maintenance; reprioritize if updates cannot be delivered.
**Outcome:** Dependency updates run reliably.
**Acceptance:** Identify the failed Dependabot step's actual cause; fix configuration or document an external outage; verify the next relevant run without weakening security checks.
**Verification:** Workflow diagnostics and targeted configuration validation. **Dependencies:** None. **Files:** only affected configuration.

### WB-006 — Craft a bed and choose a respawn point (3 points)
**Status:** Needs refinement for Sprint 2.
**Outcome:** A home provides a meaningful safe return point.
**Acceptance draft:** Craft/place a bed with original assets; set and persist a personal spawn through interaction; recover safely if the bed is removed or blocked, including multiplayer validation.
**Verification:** Solo and server behavior, persistence and blocked-spawn tests, desktop demonstration. **Dependencies:** save reliability. **Files:** determine during refinement; split crafting, interaction and server work if needed.

### WB-007 — Rejoin a saved server (2 points)
**Status:** Needs refinement.
**Outcome:** Players can easily reconnect to friends.
**Acceptance draft:** Add/name/remove saved addresses without storing passwords; display reachable/unreachable status and safe errors; joining respects administrator mode.
**Verification:** Address validation, local server unavailable/online cases and real menu interaction. **Dependencies:** None. **Files:** determine during refinement.

### WB-008 — Expand food and cooking (size after refinement)
**Status:** Idea.
**Outcome:** Survival offers more food choices with meaningful gathering and crafting progression.
**Next refinement:** Choose one crop or recipe, define costs/nutrition and growth rules, then split into a playable vertical slice. Animals and complex farming remain separate stories.
