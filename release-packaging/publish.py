"""Publish only the already-deployed, reviewed release archives. Never deploy Pages."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zipfile

REPO = 'VAcleaner-washing/pl'
MAIN = 'e76f8a133032eb09ac739d12b49711729101e0a7'
BRANCH = 'refs/heads/release-artifacts/v4.3.63'
RUN = 43948184720
ARTIFACT = 14265946616
TREE = 'b352e02782f86b9f650ea484a518f0fd5cc247e2ef24a98b244ef84089a18ece'
PREVIOUS_TREE = '24aabedb22bb71199e3409becf2f85d0e116d93c4221cc7958886a62d87afea1'
TAG = 'v4.3.63'
HERE = Path(__file__).resolve().parent
PINS = {
    'VAcleaner-v4.3.63-build4363-production.zip': 'a87cce96a494eea0c8c2fee65cbcd91ff059c8653dd1e81e6118128a2eccf45f',
    'VAcleaner-v4.3.62-build4362-production.zip': '73430f9009c66528bcce3d6dacfb8c58526c718f7174c7b0193c433909d47852',
    'VAcleaner-v4.3.46-build4346-pages.zip': '1d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e',
}
ASSETS = set(PINS) | {
    'SHA256SUMS.txt', 'RELEASE.md', 'main-pipeline-verification.json',
    'frontend-after.json', 'public-fulfillment-verification.json',
    'live-worker-manifest-verification.json',
}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def gh(*args):
    # Never echo the environment or credentials; normal Actions GITHUB_TOKEN only.
    return subprocess.run(['gh', *args], check=True, capture_output=True, text=True).stdout


def api(path):
    return json.loads(gh('api', 'repos/' + REPO + '/' + path))


def zip_files(path):
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None, 'ZIP CRC failure')
        names = archive.namelist()
        require(len(names) == len(set(names)), 'Duplicate ZIP paths')
        require(all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts for n in names), 'Unsafe ZIP path')
        return {n: archive.read(n) for n in names if not n.endswith('/')}


def tree_digest(files):
    digest = hashlib.sha256()
    for name in sorted(files):
        digest.update(name.encode() + b'\0' + files[name] + b'\0')
    return digest.hexdigest()


def verify_files():
    manifest = json.loads((HERE / 'assets-manifest.json').read_text())
    paths = {p.name: p for p in (HERE / 'assets').iterdir() if p.is_file()}
    require(len(ASSETS) == 9 and set(paths) == ASSETS and set(manifest) == ASSETS, 'Exactly nine named reviewed release assets required')
    for name, metadata in manifest.items():
        body = paths[name].read_bytes()
        require(len(body) == metadata['bytes'] and sha(body) == metadata['sha256'], 'Asset hash/size mismatch: ' + name)
    for name, pin in PINS.items():
        require(manifest[name]['sha256'] == pin, 'Immutable ZIP pin changed: ' + name)
    checksums = dict((line.split('  ', 1)[1], line.split('  ', 1)[0]) for line in paths['SHA256SUMS.txt'].read_text().splitlines())
    require(set(checksums) == set(paths) - {'SHA256SUMS.txt'}, 'Checksum coverage mismatch')
    require(all(checksums[n] == manifest[n]['sha256'] for n in checksums), 'Checksum contents mismatch')
    production = zip_files(paths['VAcleaner-v4.3.63-build4363-production.zip'])
    require(len(production) == 273 and tree_digest(production) == TREE, 'Production tree differs from deployed pin')
    release = json.loads(production['release.json'])
    require(release['version'] == '4.3.63' and release['build'] == 4363, 'Production release identity mismatch')
    previous = zip_files(paths['VAcleaner-v4.3.62-build4362-production.zip'])
    require(len(previous) == 273 and tree_digest(previous) == PREVIOUS_TREE, 'Previous62 recovery tree differs from its deployed pin')
    previous_release = json.loads(previous['release.json'])
    require(previous_release['version'] == '4.3.62' and previous_release['build'] == 4362, 'Previous62 recovery identity mismatch')
    stable = zip_files(paths['VAcleaner-v4.3.46-build4346-pages.zip'])
    frozen_bytes = (HERE.parent / 'docs/stable-4346-manifest.json').read_bytes()
    require(sha(frozen_bytes) == '05c1095d9c513f07c9265ebe7fcce9cf13bbb6dc36664f33797e0126684ed3fd', 'Frozen stable manifest changed')
    frozen = json.loads(frozen_bytes)
    require(len(stable) == 270 and {n: sha(b) for n, b in stable.items()} == frozen['files'], 'Stable46 full manifest mismatch')
    return paths, manifest, production


def verify_remote(production, tar_path):
    require(os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'Manual packaging dispatch required')
    require(os.environ.get('GITHUB_REPOSITORY') == REPO and os.environ.get('GITHUB_REF') == BRANCH, 'Exact packaging branch/repository required')
    require(api('commits/main')['sha'] == MAIN, 'Production main has moved; packaging receipt needs review')
    run = api('actions/runs/' + str(RUN))
    require(run['head_sha'] == MAIN and run['head_branch'] == 'main' and run['event'] == 'push' and run['status'] == 'completed' and run['conclusion'] == 'success', 'Actual production run is not the approved successful main run')
    jobs = api('actions/runs/' + str(RUN) + '/jobs?per_page=100')['jobs']
    deployment = [job for job in jobs if job['name'] == 'Deploy GitHub Pages']
    require(len(deployment) == 1 and deployment[0]['status'] == 'completed' and deployment[0]['conclusion'] == 'success', 'The approved production run did not actually deploy Pages successfully')
    artifact = api('actions/artifacts/' + str(ARTIFACT))
    require(artifact['name'] == 'production-pages' and artifact['workflow_run']['id'] == RUN and artifact['workflow_run']['head_sha'] == MAIN and not artifact['expired'], 'Incorrect/expired production artifact')
    with tarfile.open(tar_path) as archive:
        files = {}
        for member in archive.getmembers():
            name = str(PurePosixPath(member.name))
            require(not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts, 'Unsafe tar path')
            require(member.isfile() or member.isdir(), 'Unexpected tar member type')
            if member.isfile():
                require(name not in files, 'Duplicate tar path')
                files[name] = archive.extractfile(member).read()
    require(len(files) == 273 and tree_digest(files) == TREE and files == production, 'Reviewed ZIP differs from actually deployed artifact')


def verify_tag_if_present():
    refs = [ref for ref in api('git/matching-refs/tags/' + TAG) if ref['ref'] == 'refs/tags/' + TAG]
    require(len(refs) <= 1, 'Duplicate tag state')
    if refs:
        require(refs[0]['object']['type'] == 'commit' and refs[0]['object']['sha'] == MAIN, 'Existing release tag points to the wrong commit')


def verify_release_assets(release, manifest):
    require(release['target_commitish'] == MAIN and release['tag_name'] == TAG and not release['prerelease'], 'Wrong release target/identity')
    assets = release['assets']
    require(len(assets) == 9 and {a['name'] for a in assets} == set(manifest), 'Release must contain all nine exact assets')
    for asset in assets:
        expected = manifest[asset['name']]
        require(asset['state'] == 'uploaded' and asset['size'] == expected['bytes'] and asset['digest'] == 'sha256:' + expected['sha256'], 'Uploaded release asset mismatch: ' + asset['name'])


def publish(paths, manifest):
    verify_tag_if_present()
    releases = api('releases?per_page=100')
    existing = [r for r in releases if r['tag_name'] == TAG]
    require(len(existing) <= 1, 'Duplicate release state')
    if existing:
        release = api('releases/' + str(existing[0]['id']))
        # No clobber, retry upload or overwrite: unexpected partial state needs review.
        verify_release_assets(release, manifest)
    else:
        gh('release', 'create', TAG, '--repo', REPO, '--target', MAIN, '--title', 'VAcleaner 4.3.63 / build 4363', '--notes-file', str(HERE / 'release-notes.md'), '--draft', *[str(paths[n]) for n in sorted(paths)])
        candidates = [r for r in api('releases?per_page=100') if r['tag_name'] == TAG]
        require(len(candidates) == 1, 'Created draft not uniquely readable')
        release = api('releases/' + str(candidates[0]['id']))
        verify_release_assets(release, manifest)
    verify_tag_if_present()
    if release['draft']:
        gh('release', 'edit', TAG, '--repo', REPO, '--draft=false', '--latest')
    release = api('releases/tags/' + TAG)
    verify_release_assets(release, manifest)
    require(not release['draft'] and release['published_at'], 'Release is not published')
    ref = api('git/ref/tags/' + TAG)
    require(ref['object']['type'] == 'commit' and ref['object']['sha'] == MAIN, 'Published tag points to wrong commit')
    receipt = {'releaseUrl': release['html_url'], 'releaseId': release['id'], 'publishedAt': release['published_at'], 'mainCommit': MAIN, 'tagCommit': ref['object']['sha'], 'productionRun': RUN, 'artifactId': ARTIFACT, 'assets': release['assets'], 'allNineUploadedDigestsMatched': True, 'pagesDeployPerformed': False, 'businessDataMutations': 0}
    Path('release-packaging-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({k: receipt[k] for k in ['releaseUrl', 'publishedAt', 'tagCommit', 'allNineUploadedDigestsMatched', 'pagesDeployPerformed']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--artifact-tar')
    parser.add_argument('--verify-files-only', action='store_true')
    args = parser.parse_args()
    paths, manifest, production = verify_files()
    if args.verify_files_only:
        print('Nine asset hashes, checksums, production273, previous273 and stable270 manifests verified; no remote mutation')
    else:
        require(args.artifact_tar, 'Actual deployed artifact tar required')
        verify_remote(production, Path(args.artifact_tar))
        publish(paths, manifest)
