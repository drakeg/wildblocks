import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// This runs from protected default-branch workflow code, never from a PR checkout.
// One completed, successful full build is the only event that can authorize a merge.
export function mergeEligibility(event, pr, candidate) {
  const run=event?.workflow_run;
  const repo=event?.repository?.full_name;
  if (!run || run.name !== 'Build and release' ||
      run.event !== 'pull_request' || run.status !== 'completed' ||
      run.conclusion !== 'success' || !repo || repo !== 'drakeg/wildblocks')
    return 'Not a successful Wildblocks PR build';
  if (!candidate || candidate.number !== pr?.number)
    return 'PR was not in the completed workflow';
  if (pr.state !== 'open' || pr.draft || pr.base?.ref !== 'main')
    return 'PR is not an open, ready main-branch proposal';
  if (pr.head?.repo?.full_name !== repo || run.head_repository?.full_name !== repo ||
      candidate.head?.repo?.id !== pr.head?.repo?.id)
    return 'Only same-repository PRs may auto-merge';
  if (!['drakeg','renovate[bot]'].includes(pr.user?.login))
    return 'Untrusted author; manual review required';
  if (pr.labels?.some(label=>['no-automerge','requires-manual-review'].includes(label.name)))
    return 'Opted out of automatic merging';
  if (run.head_sha !== pr.head?.sha || candidate.head?.sha !== pr.head?.sha)
    return 'PR head changed since successful CI';
  if (run.head_branch !== pr.head?.ref)
    return 'PR source branch changed since CI';
  if (!candidate.base?.sha || candidate.base.sha !== pr.base?.sha)
    return 'Base branch advanced since successful CI; rerun checks';
  return null;
}
export const REQUIRED_PR_JOBS = [
  'Test and package (macos-arm64)',
  'Test and package (macos-x64)',
  'Test and package (windows-x64)',
  'Test and package (linux-x64)',
  'Test and package (linux-arm64)',
  'Portable server source package',
  'Docker Compose dedicated-server smoke'
];
export function completeJobMatrix(jobs) {
  if (!Array.isArray(jobs)) return false;
  return REQUIRED_PR_JOBS.every(name=>jobs.some(j=>j.name===name &&
    j.status==='completed' && j.conclusion==='success'));
}
function gh(args) {
  return JSON.parse(execFileSync('gh',['api',...args],{
    env:process.env,encoding:'utf8',maxBuffer:8*1024*1024
  }));
}
export function main() {
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  if (!process.env.GH_TOKEN) throw Error('GitHub token unavailable');
  const run=event?.workflow_run,repo=event?.repository?.full_name;
  if (repo!=='drakeg/wildblocks' || run?.conclusion!=='success' ||
      run?.event!=='pull_request' || run.name!=='Build and release') {
    console.log('No successful Wildblocks PR workflow; skipping.');
    return;
  }
  for (const candidate of run.pull_requests || []) {
    if (!Number.isSafeInteger(candidate.number) || candidate.number < 1) continue;
    const pr=gh([`repos/${repo}/pulls/${candidate.number}`]);
    const reason=mergeEligibility(event,pr,candidate);
    if (reason) {console.log(`PR #${candidate.number}: ${reason}`);continue;}
    const jobs=gh([`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`]).jobs;
    if (!completeJobMatrix(jobs)) {
      console.log(`PR #${pr.number}: required packaging, audit, or Docker job missing/not green; no merge.`);
      continue;
    }
    console.log(`PR #${pr.number}: all seven jobs green at ${pr.head.sha}; requesting protected merge.`);
    // GitHub enforces existing required checks/reviews/rulesets; no admin bypass.
    const result=gh(['-X','PUT',`repos/${repo}/pulls/${pr.number}/merge`,
      '-f','merge_method=merge','-f',`sha=${pr.head.sha}`]);
    if (!result.merged) throw Error(`GitHub refused PR #${pr.number} merge`);
    console.log(`PR #${pr.number} merged as ${result.sha}`);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) main();
