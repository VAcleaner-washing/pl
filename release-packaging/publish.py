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
MAIN = '76b83bad27c8a61bd9dccd7422d4342fe9633ea1'
BRANCH = 'refs/heads/release-artifacts/v4.3.61'
RUN = 43607449279
ARTIFACT = 14119006400
TREE = 'b53be1c5e112cf70358ce8d575ffd6d88964d1d943ecc189e6acc1696cad76d4'
TAG = 'v4.3.61'
HERE = Path(__file__).resolve().parent
PINS = {
    'VAcleaner-v4.3.61-build4361-production.zip': '97d5c7145bd4ddb45101ea07bc77b7ec33693d8294dd39e3eb022e4133127145',
    'VAcleaner-v4.3.46-build4346-pages.zip': '1d895a2bbde6c45054816d407ff12d58ca01a666de56f80715a2d681349b6d6e',
    'VAcleaner-v4.3.61-backend-code-rollback.zip': '2eb80b07ef0fbdf0dae2b1461f3ba7e5b87ebc1414e5b123928bea764200d395',
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
    require(len(paths) == 9 and set(paths) == set(manifest), 'Exactly nine reviewed release assets required')
    for name, metadata in manifest.items():
        body = paths[name].read_bytes()
        require(len(body) == metadata['bytes'] and sha(body) == metadata['sha256'], 'Asset hash/size mismatch: ' + name)
    for name, pin in PINS.items():
        require(manifest[name]['sha256'] == pin, 'Immutable ZIP pin changed: ' + name)
    checksums = dict((line.split('  ', 1)[1], line.split('  ', 1)[0]) for line in paths['SHA256SUMS.txt'].read_text().splitlines())
    require(set(checksums) == set(paths) - {'SHA256SUMS.txt'}, 'Checksum coverage mismatch')
    require(all(checksums[n] == manifest[n]['sha256'] for n in checksums), 'Checksum contents mismatch')
    production = zip_files(paths['VAcleaner-v4.3.61-build4361-production.zip'])
    require(len(production) == 273 and tree_digest(production) == TREE, 'Production tree differs from deployed pin')
    release = json.loads(production['release.json'])
    require(release['version'] == '4.3.61' and release['build'] == 4361, 'Production release identity mismatch')
    stable = zip_files(paths['VAcleaner-v4.3.46-build4346-pages.zip'])
    frozen_bytes = (HERE.parent / 'docs/stable-4346-manifest.json').read_bytes()
    require(sha(frozen_bytes) == '05c1095d9c513f07c9265ebe7fcce9cf13bbb6dc36664f33797e0126684ed3fd', 'Frozen stable manifest changed')
    frozen = json.loads(frozen_bytes)
    require(len(stable) == 270 and {n: sha(b) for n, b in stable.items()} == frozen['files'], 'Stable46 full manifest mismatch')
    zip_files(paths['VAcleaner-v4.3.61-backend-code-rollback.zip'])
    return paths, manifest, production


def verify_remote(production, tar_path):
    require(os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'Manual packaging dispatch required')
    require(os.environ.get('GITHUB_REPOSITORY') == REPO and os.environ.get('GITHUB_REF') == BRANCH, 'Exact packaging branch/repository required')
    require(api('commits/main')['sha'] == MAIN, 'Production main has moved; packaging receipt needs review')
    run = api('actions/runs/' + str(RUN))
    require(run['head_sha'] == MAIN and run['event'] == 'push' and run['status'] == 'completed' and run['conclusion'] == 'success', 'Actual production run is not the approved successful main run')
    artifact = api('actions/artifacts/' + str(ARTIFACT))
    require(artifact['name'] == 'production-pages' and artifact['workflow_run']['id'] == RUN and not artifact['expired'], 'Incorrect/expired production artifact')
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


def verify_release_assets(release, manifest):
    require(release['target_commitish'] == MAIN and release['tag_name'] == TAG and not release['prerelease'], 'Wrong release target/identity')
    assets = release['assets']
    require(len(assets) == 9 and {a['name'] for a in assets} == set(manifest), 'Release must contain all nine exact assets')
    for asset in assets:
        expected = manifest[asset['name']]
        require(asset['state'] == 'uploaded' and asset['size'] == expected['bytes'] and asset['digest'] == 'sha256:' + expected['sha256'], 'Uploaded release asset mismatch: ' + asset['name'])


def publish(paths, manifest):
    releases = api('releases?per_page=100')
    existing = [r for r in releases if r['tag_name'] == TAG]
    require(len(existing) <= 1, 'Duplicate release state')
    if existing:
        release = api('releases/' + str(existing[0]['id']))
        # No clobber, retry upload or overwrite: unexpected partial state needs review.
        verify_release_assets(release, manifest)
    else:
        gh('release', 'create', TAG, '--repo', REPO, '--target', MAIN, '--title', 'VAcleaner 4.3.61 / build 4361', '--notes-file', str(HERE / 'release-notes.md'), '--draft', *[str(paths[n]) for n in sorted(paths)])
        candidates = [r for r in api('releases?per_page=100') if r['tag_name'] == TAG]
        require(len(candidates) == 1, 'Created draft not uniquely readable')
        release = api('releases/' + str(candidates[0]['id']))
        verify_release_assets(release, manifest)
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
        print('Nine asset hashes, checksums, production273 and stable270 manifests verified; no remote mutation')
    else:
        require(args.artifact_tar, 'Actual deployed artifact tar required')
        verify_remote(production, Path(args.artifact_tar))
        publish(paths, manifest)
