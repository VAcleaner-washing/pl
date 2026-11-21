import {classifyPullRequestChanges} from './classify-pr-changes.mjs';
import {writeFileSync} from 'node:fs';
const event = process.env.GITHUB_EVENT_NAME;
const output = process.env.GITHUB_OUTPUT;
if (!output) throw new Error('GITHUB_OUTPUT missing');
let docsOnly = false;
if (event === 'pull_request') {
  const repo = process.env.GITHUB_REPOSITORY;
  const number = Number(process.env.PR_NUMBER);
  const token = process.env.GITHUB_TOKEN;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !Number.isSafeInteger(number) || number < 1 || !token) {
    throw new Error('Cannot classify PR safely: missing GitHub context');
  }
  let page = 1;
  const changes = [];
  while (true) {
    if (page > 100) throw new Error('Too many PR file pages; fail closed');
    const response = await fetch(`https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`, {
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    });
    if (!response.ok) throw new Error(`GitHub file listing failed: HTTP ${response.status}`);
    const files = await response.json();
    if (!Array.isArray(files)) throw new Error('Invalid GitHub file listing');
    changes.push(...files);
    if (files.length < 100) break;
    page++;
  }
  const decision = classifyPullRequestChanges(changes);
  docsOnly = decision.docsOnly;
  console.log(`PR file classification: ${decision.reason}, ${changes.length} files`);
}
writeFileSync(output, `docs_only=${docsOnly}\n`, {flag:'a'});
