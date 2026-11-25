import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const gates = ['validate', 'browser', 'webkit', 'operations'];
const results = new Set(['success', 'failure', 'cancelled', 'skipped']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function requireState(condition, message) {
  if (!condition) throw new Error(message);
}

// Pure policy. The CLI below supplies the actual runner event/context, never PR
// inputs or a caller-selected lane. This is not an independent trust root for a
// PR that can itself modify the evaluator, fixtures or workflow.
export function evaluateMergeReadiness({eventName, ref, baseRef, repository, event, needs, workflowCancelled}) {
  requireState(workflowCancelled === 'false' || workflowCancelled === 'true', 'Missing or invalid cancellation state');
  requireState(workflowCancelled === 'false', 'Workflow cancellation prevents readiness');
  requireState(['pull_request', 'push', 'workflow_dispatch'].includes(eventName), 'Unsupported event type');
  requireState(typeof ref === 'string' && ref.length > 0, 'Missing runner ref');
  requireState(typeof repository === 'string' && /^[\w.-]+\/[\w.-]+$/.test(repository), 'Missing runner repository');
  requireState(object(event) && event.repository?.full_name === repository, 'Event repository does not match runner');

  if (eventName === 'pull_request') {
    const match = /^refs\/pull\/([1-9]\d*)\/merge$/.exec(ref);
    const pr = event.pull_request;
    requireState(match && object(pr) && Number.isSafeInteger(pr.number) && pr.number === Number(match[1]), 'Pull request/ref mismatch');
    requireState(event.number === pr.number, 'Pull request event number mismatch');
    requireState(['opened', 'synchronize', 'reopened'].includes(event.action), 'Unsupported pull request action');
    requireState(typeof baseRef === 'string' && baseRef.length > 0 && pr.base?.ref === baseRef, 'Pull request base does not match runner');
    requireState(typeof pr.head?.sha === 'string' && /^[a-f\d]{40}$/.test(pr.head.sha), 'Missing pull request head');
    // Eligible PR targets are selected by the reviewed workflow's branch filter.
    // Production stays main-only; isolated rehearsal targets are not production.
  } else {
    requireState(!event.pull_request, 'Non-PR event contains a pull request context');
    requireState(baseRef === '' || baseRef === undefined, 'Non-PR event has a base ref');
    if (eventName === 'push') {
      requireState(/^refs\/heads\/(?:main|qa\/.+)$/.test(ref), 'Push ref is outside the workflow branch policy');
      requireState(event.ref === ref && event.deleted === false, 'Push payload/ref mismatch or deleted branch');
    } else {
      requireState(/^refs\/(?:heads|tags)\/.+$/.test(ref), 'Invalid dispatch ref');
      requireState(event.ref === undefined || event.ref === ref || event.ref === ref.replace(/^refs\/(?:heads|tags)\//, ''), 'Dispatch payload/ref mismatch');
    }
  }

  requireState(object(needs), 'Missing dependency results');
  const expected = ['classify', ...gates].sort();
  requireState(JSON.stringify(Object.keys(needs).sort()) === JSON.stringify(expected), 'Missing or unexpected dependency');
  for (const name of expected) {
    requireState(object(needs[name]) && results.has(needs[name].result), `Missing or unknown result for ${name}`);
  }
  requireState(needs.classify.result === 'success', 'Classifier did not succeed');
  const docsOnly = needs.classify.outputs?.docs_only;
  requireState(docsOnly === 'true' || docsOnly === 'false', 'Missing or unknown classifier output');
  requireState(docsOnly !== 'true' || eventName === 'pull_request', 'Docs-only acceptance requires a real pull_request event');
  const requiredResult = docsOnly === 'true' ? 'skipped' : 'success';
  for (const name of gates) {
    requireState(needs[name].result === requiredResult, `${name} must be ${requiredResult} for the classified lane`);
  }
  return {accepted: true, lane: docsOnly === 'true' ? 'docs-only' : 'full', eventName, ref};
}

export function checkRunnerEnvironment(env) {
  requireState(env.GITHUB_ACTIONS === 'true', 'Readiness CLI requires the GitHub Actions runner context');
  requireState(typeof env.GITHUB_EVENT_PATH === 'string' && env.GITHUB_EVENT_PATH.length > 0, 'Missing event file');
  requireState(typeof env.READINESS_NEEDS === 'string' && env.READINESS_NEEDS.length > 0, 'Missing needs context');
  return evaluateMergeReadiness({
    eventName: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    baseRef: env.GITHUB_BASE_REF,
    repository: env.GITHUB_REPOSITORY,
    event: JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8')),
    needs: JSON.parse(env.READINESS_NEEDS),
    workflowCancelled: env.READINESS_CANCELLED,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireState(process.argv.length === 2, 'Readiness CLI does not accept lane/event overrides');
    console.log(JSON.stringify(checkRunnerEnvironment(process.env)));
  } catch (error) {
    console.error(JSON.stringify({accepted: false, error: error.message}));
    process.exitCode = 1;
  }
  // No retry, success fallback, neutral exit code or signal swallowing. Runner
  // cancellation can still terminate a job; cancellation is not a green result.
}
