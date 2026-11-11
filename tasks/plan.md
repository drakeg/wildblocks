# Wildblocks delivery process

## Purpose and roles
Deliver a dependable original sandbox for solo play and small groups of friends. Greg is the product owner: sets priorities, gives gameplay feedback, and accepts sprint outcomes. The development agent breaks work into small stories, implements them, tests, reviews, and reports evidence and limitations. This process does not schedule autonomous work; execution happens during active work sessions.

## Cadence
Use one-week sprints, Monday through Sunday in America/New_York. Sprint 1 runs November 9–15, 2026. Dates are planning windows, not guaranteed delivery. Begin with roughly 7 relative points (1 small, 2 moderate, 3 substantial); points express uncertainty and scope, not hours or agent speed. Adjust capacity using completed work after two sprints.

1. Planning: choose one sprint goal, pull ready stories from the ordered backlog, and record acceptance checks. The product owner may redirect priorities at any time.
2. Execution: work on one story at a time through Ready → In progress → Review → Done. Blocked is explicit, with a reason and next action; work on an independent sprint story when possible.
3. Progress updates: report completed evidence, the current story, and blockers during active sessions. No recurring meetings or notifications are created.
4. Review: demonstrate the playable result, link PRs/releases and test evidence, and record Greg's acceptance as pending until received. Technical completion and product acceptance are separate.
5. Retrospective: record one thing that helped, one that slowed work, and one improvement for the next sprint. Incomplete stories return to planning with their original IDs; they are never silently marked done.

## Scope and change control
The sprint goal governs scope. New ideas enter tasks/todo.md; urgent save-loss, security, or release failures take priority and displaced stories are recorded. Future sprint themes are forecasts, not commitments. Avoid starting additional features while a story is awaiting a fix. A PR merge alone does not prove acceptance criteria or release publication.

## Ready
A story has a player outcome, at most three acceptance criteria, a verification approach, a size of 1–3 points, and dependencies. Split larger work before starting it. Use a short specification for substantial behavior changes.

## Done
- Acceptance criteria have explicit evidence; any unperformed check remains open.
- Appropriate focused tests and relevant integration/build checks pass. Required CI passes for the actual PR head.
- Changed user interfaces have been inspected in the real app. Missing visual evidence blocks the affected story, not unrelated work.
- Review covers correctness, save compatibility, error handling, security, and clarity. Existing user saves are protected; QA uses disposable slots/profiles.
- Documentation and migration/recovery instructions match actual behavior; no prohibited third-party branding or assets enter the project.
- Source is committed and published through a reviewable PR. A release story additionally verifies published assets and clearly states platform coverage.

A story may be technically Done with product acceptance pending. A sprint closes with a review record even if its goal was not met. Do not lower the quality bar to finish the sprint.

## Records and workflow
- tasks/todo.md is the single backlog and story-status source. Use WB-### IDs in PR titles/descriptions and commits.
- tasks/sprints/01.md holds the sprint goal, ordered story IDs, evidence, review and retrospective. It links to the backlog rather than duplicating story status.
- Keep these files current in the same PR as the related work. Use small branches and PRs; do not silently amend unrelated work or rewrite history.
- Releases are independent of sprint boundaries. Ship a verified increment when ready; do not bump a version merely because a sprint ended.
- Future themes: Sprint 2 beds/respawn; Sprint 3 saved server selection and friend-play improvements; later animals, crops and cooking. Reorder after Sprint 1 feedback.

## Sprint 1 implementation order
WB-001 establishes the release baseline. WB-002 checks the remaining real-app save/restore behavior. WB-003 investigates the observed quit-save error path and fixes it if reproduced. WB-004 captures repeatable release evidence. See the sprint record for current evidence and the backlog for acceptance criteria.
