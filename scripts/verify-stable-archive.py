"""Verify the frozen Pages archive before an explicitly approved frontend rollback."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

parser=argparse.ArgumentParser()
parser.add_argument('archive',type=Path)
parser.add_argument('--manifest',type=Path,default=Path('docs/stable-4346-manifest.json'))
parser.add_argument('--extract',type=Path,help='Optional NEW, empty staging directory; never a live deploy directory')
args=parser.parse_args()
manifest=json.loads(args.manifest.read_text())
digest=lambda data:hashlib.sha256(data).hexdigest()
if digest(args.archive.read_bytes())!=manifest['archiveSha256']:raise SystemExit('Archive checksum mismatch')
with zipfile.ZipFile(args.archive) as archive:
    names=archive.namelist()
    if len(names)!=len(set(names)) or set(names)!=set(manifest['files']):raise SystemExit('Unexpected archive contents')
    for name in names:
        path=PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name:raise SystemExit('Unsafe archive path')
        if digest(archive.read(name))!=manifest['files'][name]:raise SystemExit(f'File checksum mismatch: {name}')
    release=json.loads(archive.read('release.json'))
    if release['version']!='4.3.46' or release['build']!=4346:raise SystemExit('Not the stable 46 artifact')
    if args.extract:
        target=args.extract.resolve()
        if target.exists() and any(target.iterdir()):raise SystemExit('Extraction target must be new or empty')
        target.mkdir(parents=True,exist_ok=True)
        archive.extractall(target)
print(f'Verified stable 4.3.46 / 4346: {len(manifest["files"])} files; commit {manifest["commit"]}')
