import json,pathlib,sys
root=pathlib.Path(sys.argv[1]);rows=[]
for out in sorted(root.glob('sample-*')):
    if not out.is_dir():continue
    result=out/'result.json'
    if not result.exists():rows.append({'sample':out.name,'missing_result':True});continue
    j=json.loads(result.read_text())
    rows.append({'sample':out.name,'passed':j['passed'],'failed':j['failed'],'failures':[c for c in j['checks'] if not c['passed']],'settings_posts':sum(r['method']=='POST' and r['path'].endswith('/vacleaner-settings') for r in j['requests']),'productionWrites':j['productionWrites']})
(root/'summary.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(rows,ensure_ascii=False,indent=2))
# Diagnostic workflow GREEN means evidence capture, never release acceptance.
# Missing/crashed captures fail orchestration; application failures remain explicit.
raise SystemExit(int(len(rows)!=int(sys.argv[2] if len(sys.argv)>2 else 3) or any(r.get('missing_result') for r in rows)))
