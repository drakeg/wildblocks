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
**Status:** In progress · November 22 isolated macOS Electron profile verified saved inventory and hunger, crop growth, facing, two-world isolation, UI backup restore/undo, and those saved fields surviving a complete Electron quit/relaunch. The state was injected into disposable QA storage and inspected read-only after restart; manual inventory/crop gameplay manipulation, an independently verified moved player position and screenshot-based visual acceptance remain open.
**Outcome:** Players trust that a world returns to its saved state.
**Acceptance:**
- [ ] In a disposable slot, save distinct position/facing, inventory, hunger and crop state, fully quit, reopen and verify those values.
- [ ] Restore a known session backup through the UI, verify it, undo the restoration before another session, and confirm a second slot remains unchanged.
- [ ] Record screenshots/read-only diagnostics and exact steps; reproduce and fix any app defect or identify the specific automation blocker without claiming a pass.
**Verification:** Native Electron source QA on November 22 used a fresh disposable `--user-data-dir`, seeded two world slots with different states, reloaded, invoked the Restore button twice to verify reversibility, then quit and relaunched the same isolated profile. QA values: inventory material 30 count 1 vs backup 3; hunger 14 vs backup 7.25; crop growth 145 vs 81; yaw -0.4 vs 0.7; second world seed unchanged. Regression now checks those fields and distinct saved X coordinates across backup/undo. Full GUI gameplay interactions, visual screenshots and movement restoration still need acceptance. Never replace or restore a human-used slot.
**Dependencies:** WB-001. **Files:** tests/world-library.test.mjs; dist/game.js only if a reproducible defect exists; sprint evidence.

### WB-003 — Protect unsaved progress during desktop exit (2 points)
**Status:** Done (technical) · PR #17 merged November 11, 2026; merged-main CI passed; product acceptance pending.
**Outcome:** A player is not silently told to quit successfully when local saving failed.
**Acceptance:**
- [x] Reproduce the storage-failure exit path in an isolated test; determine whether renderer checkpoint errors are swallowed.
- [x] On confirmed save failure, preserve the open session and offer a clear retry/export path; normal quit still completes when saving succeeds.
- [x] Meaningful tests cover failed and successful checkpoints, including hosted-server shutdown sequencing if changed.
**Verification:** Inspect desktop/preload.cjs and desktop/main.cjs with dist/game.js saveSession; focused automated tests and native failure/retry check. Do not fill human storage to simulate failure.
**Dependencies:** None; may proceed if WB-002 is blocked. **Files:** desktop/main.cjs, desktop/preload.cjs, dist/game.js, focused tests. Split if investigation exceeds this size.

### WB-004 — Record repeatable release checks (1 point)
**Status:** Done (technical) · checklist and 0.13.0 baseline recorded in RELEASES.md; product acceptance pending.
**Outcome:** Each release states what has actually been tested.
**Acceptance:**
- [x] Document source/head, tests, CI, expected assets and checksum checks in a reusable checklist.
- [x] Separate automated platform coverage from native manual checks and record unresolved limitations.
- [x] Apply the checklist to 0.13.0 and link the evidence from the sprint review.
**Verification:** Compare checklist against the actual packaging workflow; no redundant pipeline rewrite.
**Dependencies:** WB-001; desktop evidence depends on WB-002. **Files:** RELEASES.md, tasks/sprints/01.md.

## Ordered future backlog — not committed

### WB-005 — Diagnose dependency update automation (1 point)
**Status:** In progress · November 12 fresh macOS `npm audit --audit-level=high` passed with 0 high/critical and 3 moderate findings; successful Dependabot remediation still unverified.
**Outcome:** Dependency updates run reliably.
**Acceptance:** Identify the failed Dependabot step's actual cause; fix configuration or document an external outage; verify the next relevant run without weakening security checks.
**Verification:** Failed [Dependabot run 42562616375](https://github.com/drakeg/wildblocks/actions/runs/42562616375), job 128982137083, reports a minimatch security update that could only be solved by the updater via a downgrade of `@electron/packager` 20.3.0 to 18.4.4, or by a compatible override. The current lockfile already selects `minimatch` 10.2.6 and `@electron/packager` 20.3.0; do not introduce a downgrade based on the stale failed run. A fresh `npm audit --audit-level=high --json` on an isolated macOS clone (November 12) passed with 0 high/critical vulnerabilities, but identified 3 moderate advisories involving `@electron/asar`, `glob`, and `minimatch`. Review those separately and verify a new successful Dependabot update run before marking Done. **Dependencies:** None. **Files:** only affected configuration.

### WB-006 — Craft a bed and choose a respawn point (3 points)
**Status:** In progress · craftable bed foundation merged; this slice adds persisted personal bed binding, safe adjacent respawn, camp fallback and authoritative server interaction. Native isolated-source smoke test covers oriented bed world loading; isolated two-account HTTP integration verifies distinct persisted bed checkpoints, server-side rejection of forged coordinates and both accounts retaining their checkpoints across restart (103 automated tests passing). On November 24, two isolated native Electron clients registered and entered the same temporary Survival server; each client's authenticated `/api/state` listed the other account and the server reported 2 players. Automated two-account presence/logout/re-login coverage now passes (105 tests). Deterministic two-player survival simulation now verifies simultaneous fatal attacks, independent respawn by each player's bed, personal checkpoint persistence and isolated blocked-bed camp fallback (107 automated tests). On November 26, two separate native Electron profiles signed in to an isolated seeded Survival server, aimed at their own Woven beds, pressed R in the game UI and received success feedback; the server confirmed distinct checkpoint coordinates (31,13,30) and (35,13,30). Actual graphical defeat/respawn and screenshot review in two native clients remain pending.
**Outcome:** A home provides a meaningful safe return point.
**Acceptance draft:** Craft/place a bed with original assets; set and persist a personal spawn through interaction; recover safely if the bed is removed or blocked, including multiplayer validation.
**Slices:** (1) Craft/place/orient bed furniture with legacy-save coverage; (2) solo interaction and personal respawn fallback; (3) authoritative multiplayer interaction and validation.
**Verification:** Solo and server behavior, persistence and blocked-spawn tests, desktop demonstration. **Dependencies:** save reliability. **Files:** determine during refinement; split crafting, interaction and server work if needed.

### WB-007 — Rejoin a saved server (2 points)
**Status:** In progress · first slice allows saved named addresses with no credentials, strict URL validation and removal; desktop online/offline status verified in an isolated native Electron menu against a temporary server on November 21, including shutdown detection and normal quit. Two-client gameplay acceptance and packaged binary confirmation remain pending. Native macOS isolated-profile QA verified save, reload, select, remove and graceful quit on November 20; no human saves were touched.
**Outcome:** Players can easily reconnect to friends.
**Acceptance draft:** Add/name/remove saved addresses without storing passwords; display reachable/unreachable status and safe errors; joining respects administrator mode.
**Verification:** Address validation, local server unavailable/online cases and real menu interaction. **Dependencies:** None. **Files:** determine during refinement.

### WB-008 — Expand food and cooking (size after refinement)
**Status:** Idea.
**Outcome:** Survival offers more food choices with meaningful gathering and crafting progression.
**Next refinement:** Choose one crop or recipe, define costs/nutrition and growth rules, then split into a playable vertical slice. Animals and complex farming remain separate stories.

### WB-009 — Accessible creative automation and advanced crafting (size after refinement)
**Status:** Backlog · proposed November 24, 2026; **not committed to an active Sprint**.
**Outcome:** Encourage inventive builds with approachable triggers, switches, sensors, timers and connected devices without rare-resource grinding or confusing crafting workflows.
**Design principles:** Start with common timber, stone and other plentiful materials; output useful component quantities per craft; provide clear in-game recipe guidance, craftable intermediate parts and intuitive placement/interaction. Expand toward wiring, logic, sensors and repeatable mechanisms progressively, rather than requiring every system up front. Preserve the option for advanced circuits for players who want complexity.
**Candidate slices (choose during refinement):**
1. Affordable switch/trigger operating a nearby door or mechanism with no wiring prerequisite; document what is controlled and how.
2. Connected trigger links, simple timers and pressure-sensitive switches with obvious feedback.
3. More complex mechanisms and logic combinations, with discoverable recipes, accessible resource acquisition and sample blueprints.
**Acceptance criteria to refine before Sprint assignment:** A new Survival player can gather inputs, craft and place the first mechanism quickly; components work for local and server players under server authority; existing saves and inventory remain backward compatible; removal/replacement and restart preserve expected behavior; costs and usability are tested in real gameplay. Creative mode can prototype freely.
**Dependencies:** Stability and gameplay acceptance for WB-002/WB-006, confirmed roadmap priority. **Commercialization:** Do not assert player demand or willingness to pay without evidence.
**Process:** Requirements enter the backlog first unless they are urgent break/fix; prioritize and assign a slice in Sprint planning before merging gameplay code.
