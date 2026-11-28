import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeEligibility} from '../scripts/ci-automerge.mjs';
const sha='a'.repeat(40), base='b'.repeat(40),repo='drakeg/wildblocks';
function fixture(){
 const candidate={number:49,head:{sha,repo:{id:7}},base:{sha:base}};
 const event={repository:{full_name:repo},workflow_run:{
   name:'Build and release',event:'pull_request',status:'completed',
   conclusion:'success',head_sha:sha,head_branch:'renovate/packager',
   head_repository:{full_name:repo},pull_requests:[candidate]
 }};
 const pr={number:49,state:'open',draft:false,user:{login:'renovate[bot]'},
   labels:[],base:{ref:'main',sha:base},head:{ref:'renovate/packager',sha,repo:{full_name:repo,id:7}}};
 return {candidate,event,pr};
}
test('merges trusted internal PR only after full successful CI on exact head and base',()=>{
 const {event,pr,candidate}=fixture();
 assert.equal(mergeEligibility(event,pr,candidate),null);
 pr.user.login='drakeg';
 assert.equal(mergeEligibility(event,pr,candidate),null);
});
test('rejects untrusted authors, forks, drafts and opt-outs',()=>{
 for(const mutation of [
   f=>f.pr.user.login='outside-contributor',
   f=>f.pr.head.repo.full_name='outside/fork',
   f=>f.pr.draft=true,
   f=>f.pr.labels=[{name:'no-automerge'}],
   f=>f.pr.labels=[{name:'requires-manual-review'}],
   f=>f.pr.base.ref='develop'
 ]){const f=fixture();mutation(f);assert.notEqual(mergeEligibility(f.event,f.pr,f.candidate),null);}
});
test('refuses failed, incomplete, outdated, or unrelated checks',()=>{
 for(const mutation of [
   f=>f.event.workflow_run.conclusion='failure',
   f=>f.event.workflow_run.status='in_progress',
   f=>f.event.workflow_run.event='push',
   f=>f.event.workflow_run.name='Unrelated workflow',
   f=>f.event.workflow_run.head_sha='c'.repeat(40),
   f=>f.event.workflow_run.head_branch='old-branch',
   f=>f.pr.head.sha='c'.repeat(40),
   f=>f.pr.base.sha='c'.repeat(40),
   f=>f.candidate.base.sha='c'.repeat(40),
   f=>f.event.repository.full_name='someone/else',
   f=>f.candidate.number=48
 ]){const f=fixture();mutation(f);assert.notEqual(mergeEligibility(f.event,f.pr,f.candidate),null);}
});
