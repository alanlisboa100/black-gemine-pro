#!/usr/bin/env python3
import argparse,json,os,signal,subprocess,sys,time,urllib.request,webbrowser
from pathlib import Path
from bnlib import *
from bn_language import compile_bn
from ingest_knowledge import ingest_path

def api(method,path,obj=None,timeout=8):
    cfg=load_cfg(); url=f"http://{cfg['black_core']['api_host']}:{cfg['black_core']['api_port']}{path}"; data=None if obj is None else json.dumps(obj).encode(); req=urllib.request.Request(url,data=data,method=method,headers={'Content-Type':'application/json'} if data else {})
    with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode())
def ensure_daemon():
    try: api('GET','/health',timeout=1); return True
    except Exception: return False

def cmd_start(a):
    if ensure_daemon(): print('Black Numbers já está ativo.'); return
    log=LOGS/'daemon.log'; log.parent.mkdir(exist_ok=True)
    with log.open('ab') as f: subprocess.Popen([sys.executable,str(ROOT/'bn_daemon.py')],cwd=ROOT,stdout=f,stderr=f,start_new_session=True)
    for _ in range(30):
        if ensure_daemon(): print('Black Numbers v1.0 ativo em http://127.0.0.1:8117'); return
        time.sleep(.2)
    print('Falha ao iniciar. Veja:',log); sys.exit(1)
def cmd_stop(a):
    p=DATA/'daemon.pid'
    if not p.exists(): print('Daemon já está parado.'); return
    try: os.kill(int(p.read_text().strip()),signal.SIGTERM)
    except Exception: pass
    for _ in range(30):
        if not ensure_daemon(): print('Black Numbers parado.'); p.unlink(missing_ok=True); return
        time.sleep(.2)
    print('Sinal enviado; processo ainda pode estar finalizando.')
def cmd_restart(a): cmd_stop(a); time.sleep(.3); cmd_start(a)
def cmd_status(a):
    try: out=api('GET','/v1/status',timeout=2)
    except Exception:
        con=db(); out={'ok':False,'daemon':'offline','status':status_snapshot(con,load_cfg())}; con.close()
    print(json.dumps(out,indent=2,ensure_ascii=False))
def cmd_open(a):
    url='http://127.0.0.1:8117';
    if not ensure_daemon(): cmd_start(a)
    if subprocess.run(['sh','-lc',f'command -v termux-open-url >/dev/null'],capture_output=True).returncode==0: subprocess.run(['termux-open-url',url])
    else: print(url)
def cmd_task(a):
    if not ensure_daemon(): cmd_start(a)
    print(json.dumps(api('POST','/v1/task',{'prompt':a.prompt,'source':a.source,'priority':a.priority}),indent=2,ensure_ascii=False))
def cmd_cycle(a):
    if not ensure_daemon(): cmd_start(a)
    print(json.dumps(api('POST','/v1/cycle',{}),indent=2,ensure_ascii=False))
def cmd_compile(a):
    code=Path(a.file).read_text(encoding='utf-8') if a.file else a.code; print(json.dumps(compile_bn(code).__dict__,indent=2,ensure_ascii=False))
def cmd_observe(a):
    content=Path(a.file).read_text(encoding='utf-8') if a.file else a.content
    if not ensure_daemon(): cmd_start(a)
    print(json.dumps(api('POST','/v1/observe',{'task':a.task,'content':content,'source':a.source,'confidence':a.confidence}),indent=2,ensure_ascii=False))
def cmd_ingest(a): print(json.dumps(ingest_path(Path(a.path).expanduser().resolve(),a.limit),indent=2,ensure_ascii=False))
def cmd_knowledge(a):
    con=db(); rows=con.execute('SELECT id,status,confidence,confirmations,title,source FROM knowledge ORDER BY id DESC LIMIT ?',(a.limit,)).fetchall();
    for r in rows: print(f"#{r['id']} [{r['status']}] c={r['confidence']:.2f} x{r['confirmations']} {r['title']} ({r['source']})")
    con.close()
def cmd_tasks(a):
    con=db(); rows=con.execute('SELECT id,status,stage,retry_count,prompt,last_error FROM tasks ORDER BY id DESC LIMIT ?',(a.limit,)).fetchall();
    for r in rows: print(f"#{r['id']} {r['status']}/{r['stage']} retry={r['retry_count']} {r['prompt']}" + (f"\n  err: {r['last_error']}" if r['last_error'] else ''))
    con.close()
def cmd_export(a):
    con=db(); n=export_dataset(con); con.close(); print(f'{n} exemplos verificados exportados.')
def cmd_core(a):
    cfg=load_cfg(); p=_rooted_path(cfg['black_core']['force_active_file'])
    if a.state=='on': p.touch(); touch_heartbeat(cfg); print('Override Black Core ON.')
    elif a.state=='off': p.unlink(missing_ok=True); print('Override removido.')
    else: touch_heartbeat(cfg); print('Heartbeat enviado.')
def cmd_doctor(a):
    checks=[]
    checks.append(('python',sys.version.split()[0]))
    try: import PIL; checks.append(('pillow','ok'))
    except Exception: checks.append(('pillow','ausente (visão opcional)'))
    checks.append(('db',str(DB_PATH.exists())))
    try: st=api('GET','/health',timeout=1); checks.append(('daemon','ok'))
    except Exception: checks.append(('daemon','offline'))
    c=compile_bn('node A : diamond { x: 0.5\n y: 0.5\n r: 20 }\nscreen Main { root: A\n bg: ink }'); checks.append(('compiler','ok' if c.ok else c.output))
    for k,v in checks: print(f'{k:12} {v}')

def main():
    p=argparse.ArgumentParser(prog='bn',description='Black Numbers v1.0 unified core'); p.add_argument('--version',action='version',version='Black Numbers 1.0.0'); s=p.add_subparsers(dest='cmd',required=True)
    for n,fn in [('start',cmd_start),('stop',cmd_stop),('restart',cmd_restart),('status',cmd_status),('open',cmd_open),('cycle',cmd_cycle),('export',cmd_export),('doctor',cmd_doctor)]: x=s.add_parser(n); x.set_defaults(fn=fn)
    x=s.add_parser('task'); x.add_argument('prompt'); x.add_argument('--source',default='user'); x.add_argument('--priority',type=int,default=0); x.set_defaults(fn=cmd_task)
    x=s.add_parser('compile'); g=x.add_mutually_exclusive_group(required=True); g.add_argument('--file'); g.add_argument('--code'); x.set_defaults(fn=cmd_compile)
    x=s.add_parser('observe'); x.add_argument('--task',default='observação externa'); g=x.add_mutually_exclusive_group(required=True); g.add_argument('--file'); g.add_argument('--content'); x.add_argument('--source',default='external-ai'); x.add_argument('--confidence',type=float,default=.42); x.set_defaults(fn=cmd_observe)
    x=s.add_parser('ingest'); x.add_argument('path',nargs='?',default=str(KNOWLEDGE_REPO)); x.add_argument('--limit',type=int); x.set_defaults(fn=cmd_ingest)
    x=s.add_parser('knowledge'); x.add_argument('--limit',type=int,default=30); x.set_defaults(fn=cmd_knowledge)
    x=s.add_parser('tasks'); x.add_argument('--limit',type=int,default=30); x.set_defaults(fn=cmd_tasks)
    x=s.add_parser('core'); x.add_argument('state',choices=['on','off','heartbeat']); x.set_defaults(fn=cmd_core)
    a=p.parse_args(); a.fn(a)
if __name__=='__main__':main()
