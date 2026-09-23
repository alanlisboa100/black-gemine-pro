#!/usr/bin/env python3
from __future__ import annotations
import fcntl, json, mimetypes, signal, threading, time, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from bnlib import *
from bn_learning import process_cycle
from bn_language import compile_bn
from ingest_knowledge import ingest_path

STOP=False; LOCK=DATA/'daemon.lock'; PID=DATA/'daemon.pid'; WEB=ROOT/'web'; CYCLE_LOCK=threading.Lock()

def api_json(handler,status,obj):
    raw=json.dumps(obj,ensure_ascii=False).encode(); handler.send_response(status); handler.send_header('Content-Type','application/json; charset=utf-8'); handler.send_header('Content-Length',str(len(raw))); handler.send_header('Access-Control-Allow-Origin','*'); handler.end_headers(); handler.wfile.write(raw)

class API(BaseHTTPRequestHandler):
    server_version='BlackNumbers/1.0'
    def log_message(self,*args): pass
    def body(self):
        n=int(self.headers.get('Content-Length','0') or 0); return json.loads(self.rfile.read(n).decode() or '{}')
    def do_OPTIONS(self): self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS'); self.end_headers()
    def do_GET(self):
        cfg=load_cfg(); con=db(); p=urllib.parse.urlparse(self.path); path=p.path; qs=urllib.parse.parse_qs(p.query)
        try:
            if path in ('/health','/v1/status'): return api_json(self,200,{'ok':True,'name':'Black Numbers','status':status_snapshot(con,cfg)})
            if path=='/v1/knowledge':
                lim=min(200,int(qs.get('limit',['50'])[0])); rows=[dict(r) for r in con.execute('SELECT id,kind,title,confidence,confirmations,status,source,score,created_at,updated_at FROM knowledge ORDER BY id DESC LIMIT ?',(lim,)).fetchall()]; return api_json(self,200,{'ok':True,'items':rows})
            if path=='/v1/journal':
                lim=min(200,int(qs.get('limit',['50'])[0])); rows=[dict(r) for r in con.execute('SELECT * FROM identity_journal ORDER BY id DESC LIMIT ?',(lim,)).fetchall()]; return api_json(self,200,{'ok':True,'items':rows})
            if path=='/v1/tasks':
                lim=min(200,int(qs.get('limit',['50'])[0])); rows=[dict(r) for r in con.execute('SELECT * FROM tasks ORDER BY id DESC LIMIT ?',(lim,)).fetchall()]; return api_json(self,200,{'ok':True,'items':rows})
            if path=='/v1/strategy': return api_json(self,200,{'ok':True,'strategy':get_strategy(con)})
            if path.startswith('/v1/'): return api_json(self,404,{'ok':False,'error':'endpoint not found'})
            # static web
            rel='index.html' if path=='/' else path.lstrip('/'); fp=(WEB/rel).resolve()
            if WEB.resolve() not in fp.parents and fp!=WEB.resolve(): self.send_error(403); return
            if not fp.exists() or not fp.is_file(): fp=WEB/'index.html'
            raw=fp.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(str(fp))[0] or 'application/octet-stream'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw)
        finally: con.close()
    def do_POST(self):
        cfg=load_cfg(); con=db(); path=urllib.parse.urlparse(self.path).path
        try:
            try:data=self.body()
            except Exception:return api_json(self,400,{'ok':False,'error':'invalid json'})
            if path=='/v1/core/heartbeat': touch_heartbeat(cfg); return api_json(self,200,{'ok':True})
            if path=='/v1/task':
                prompt=str(data.get('prompt','')).strip()
                if not prompt:return api_json(self,400,{'ok':False,'error':'prompt required'})
                cur=con.execute('INSERT INTO tasks(prompt,source,priority,status,stage,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',(prompt,str(data.get('source','blackcore')),int(data.get('priority',0)),'queued','observed',now(),now())); con.commit(); return api_json(self,202,{'ok':True,'task_id':cur.lastrowid})
            if path=='/v1/observe':
                task=str(data.get('task','observação externa')); content=str(data.get('content','')).strip()
                if not content:return api_json(self,400,{'ok':False,'error':'content required'})
                kid=upsert_knowledge(con,'observation',task[:120],content[:12000],float(data.get('confidence',.42)),str(data.get('source','external-ai')),status='observed'); return api_json(self,200,{'ok':True,'knowledge_id':kid,'status':'observed'})
            if path=='/v1/learn':
                task=str(data.get('task','')).strip(); code=str(data.get('code','')).strip()
                if not task or not code:return api_json(self,400,{'ok':False,'error':'task and code required'})
                comp=compile_bn(code,allow_legacy_js=bool(cfg.get('security',{}).get('allow_legacy_js',False))); verified=1 if comp.ok else 0
                cur=con.execute('INSERT INTO examples(task,code,notes,verified,source,created_at) VALUES(?,?,?,?,?,?)',(task,code,str(data.get('notes','')),verified,str(data.get('source','creator')),now())); con.commit(); return api_json(self,200,{'ok':True,'example_id':cur.lastrowid,'compile':comp.__dict__})
            if path=='/v1/compile':
                comp=compile_bn(str(data.get('code','')),allow_legacy_js=bool(cfg.get('security',{}).get('allow_legacy_js',False))); return api_json(self,200,{'ok':True,'compile':comp.__dict__})
            if path=='/v1/ingest':
                raw=str(data.get('path',str(KNOWLEDGE_REPO))); rp=Path(raw).expanduser().resolve(); allowed=[KNOWLEDGE_REPO.resolve(),Path.home().resolve()]
                # only local user-owned paths; no URL fetching
                if not rp.exists():return api_json(self,400,{'ok':False,'error':'path not found'})
                res=ingest_path(rp,int(data.get('limit',200))); return api_json(self,200,{'ok':True,'result':res})
            if path=='/v1/cycle':
                con.close()
                if not CYCLE_LOCK.acquire(blocking=False): return api_json(self,409,{'ok':False,'error':'learning cycle already running'})
                try: result=process_cycle(cfg)
                finally: CYCLE_LOCK.release()
                return api_json(self,200,{'ok':True,'result':result})
            return api_json(self,404,{'ok':False,'error':'endpoint not found'})
        finally:
            try: con.close()
            except Exception: pass

def main():
    global STOP
    cfg=load_cfg(); LOCK.parent.mkdir(exist_ok=True); lock=open(LOCK,'w')
    try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError: print('Black Numbers já está ativo.'); return
    PID.write_text(str(__import__('os').getpid()))
    def stop(*_):
        global STOP; STOP=True
    signal.signal(signal.SIGINT,stop); signal.signal(signal.SIGTERM,stop)
    srv=ThreadingHTTPServer((cfg['black_core'].get('api_host','127.0.0.1'),int(cfg['black_core'].get('api_port',8117))),API); srv.timeout=1
    def serve():
        while not STOP: srv.handle_request()
    t=threading.Thread(target=serve,daemon=True); t.start()
    con=db(); event(con,'daemon_start','Black Numbers v1.0 iniciado'); con.close()
    try:
        while not STOP:
            cfg=load_cfg(); active=blackcore_active(cfg); run=bool(cfg['learning'].get('enabled',True)) and (active or cfg['learning'].get('run_without_blackcore',True))
            if run:
                try:
                    if CYCLE_LOCK.acquire(blocking=False):
                        try: process_cycle(cfg)
                        finally: CYCLE_LOCK.release()
                except Exception as e:
                    c=db(); event(c,'cycle_crash',str(e)); c.close()
                for _ in range(max(1,int(cfg['learning'].get('cycle_seconds',60)))):
                    if STOP: break
                    time.sleep(1)
            else: time.sleep(max(3,int(cfg['learning'].get('idle_seconds',20))))
    finally:
        STOP=True; srv.server_close(); PID.unlink(missing_ok=True); c=db(); event(c,'daemon_stop','Black Numbers finalizado'); c.close()
if __name__=='__main__': main()
