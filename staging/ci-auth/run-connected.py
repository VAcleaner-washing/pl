"""CI-only driver: ephemeral workload credentials stay in process memory."""
import argparse,json,os,subprocess,sys,time,urllib.error,urllib.parse,urllib.request
from pathlib import Path

PROJECT='jdthhqxzfpvosfdxwfem'
ORIGIN='https://'+PROJECT+'.supabase.co'
BROKER=ORIGIN+'/functions/v1/r61-ci-identities'
ROOT=Path(__file__).resolve().parents[2]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args):return None
opener=urllib.request.build_opener(NoRedirect)

def workload_token():
    url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!='https' or not parsed.hostname.endswith('.actions.githubusercontent.com'):
        raise RuntimeError('unexpected_identity_issuer_request')
    url+=('&' if parsed.query else '?')+urllib.parse.urlencode({'audience':BROKER})
    request=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with opener.open(request,timeout=30) as response:
        token=json.load(response).get('value')
    if not isinstance(token,str) or token.count('.')!=2:raise RuntimeError('missing_identity_token')
    return token

def action(name):
    token=workload_token()
    key=json.loads((ROOT/'staging/hosted-r4-client.json').read_text())['publicKey']
    request=urllib.request.Request(BROKER,data=json.dumps({'action':name}).encode(),method='POST',
        headers={'Authorization':'Bearer '+token,'apikey':key,'Content-Type':'application/json'})
    with opener.open(request,timeout=60) as response:body=json.load(response)
    return body

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--artifacts',required=True);args=parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS')!='true':parser.error('Remote GitHub Actions only')
    out=Path(args.artifacts).resolve();out.mkdir(parents=True,exist_ok=True)
    run_id=os.environ['GITHUB_RUN_ID']
    results={'runId':run_id,'engines':{},'cleanup':None,'error':None,'credentialsWrittenToArtifacts':False}
    configured=False
    try:
        # The owner deploys a config pinned to this run after its ID is known.
        # This polls readiness only; it never retries a provisioning mutation.
        deadline=time.monotonic()+300
        while True:
            try:
                with opener.open(BROKER,timeout=15) as response:ready=json.load(response).get('ready') is True
            except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError):ready=False
            if ready:break
            if time.monotonic()>=deadline:raise RuntimeError('pinned_broker_not_ready')
            time.sleep(3)
        config=action('provision')
        if config.get('projectRef')!=PROJECT or config.get('origin')!=ORIGIN or config.get('runId')!=run_id:
            raise RuntimeError('ci_stage_identity_mismatch')
        configured=True
        for engine in ['chromium','webkit']:
            runtime_env=os.environ.copy();runtime_env.pop('DEBUG',None)
            runtime_env['VA_R61_CONNECTED_CONFIG']=json.dumps(config)
            completed=subprocess.run([sys.executable,str(ROOT/'scripts/admin_staging_connected_qa.py'),
                '--browser',engine,'--artifacts',str(out/engine)],cwd=ROOT,env=runtime_env)
            results['engines'][engine]={'exitCode':completed.returncode}
        del config
    except Exception as error:
        # No exception bodies, response URLs, credentials or request headers.
        results['error']=type(error).__name__
        print('Connected-stage setup/test failed: '+type(error).__name__,flush=True)
    finally:
        try:
            cleaned=action('cleanup') # New short-lived OIDC token for cleanup.
            count=cleaned.get('removedUsers')
            if not isinstance(count,int) or count<0 or count>2 or configured and count!=2:
                raise RuntimeError('unexpected_cleanup_result')
            results['cleanup']={'removedTemporaryUsers':count,'providerMessages':cleaned.get('providerMessages')}
        except Exception as error:
            results['cleanup']={'error':type(error).__name__}
            print('Temporary-identity cleanup needs owner review: '+type(error).__name__,flush=True)
        (out/'driver-result.json').write_text(json.dumps(results,indent=2)+'\n')
    success=(results['error'] is None and len(results['engines'])==2 and
             all(value['exitCode']==0 for value in results['engines'].values()) and
             results['cleanup'].get('removedTemporaryUsers')==2)
    print(json.dumps({'connectedStagePass':success,'engines':results['engines'],'cleanup':results['cleanup']}),flush=True)
    return 0 if success else 1

if __name__=='__main__':raise SystemExit(main())
