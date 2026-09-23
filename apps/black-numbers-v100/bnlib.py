#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, re, sqlite3, subprocess, time, urllib.request
from pathlib import Path
from typing import Any
from bn_language import compile_bn

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'; WORKSPACE=ROOT/'workspace'; DATASETS=ROOT/'datasets'; KNOWLEDGE_REPO=ROOT/'knowledge_repo'; EVOLUTION=ROOT/'evolution'; LOGS=ROOT/'logs'
for p in (DATA,WORKSPACE,DATASETS,KNOWLEDGE_REPO,EVOLUTION,LOGS): p.mkdir(parents=True,exist_ok=True)
DB_PATH=DATA/'black_numbers.db'; CFG_PATH=ROOT/'config.json'

DEFAULT_CFG=json.loads((ROOT/'config.json').read_text(encoding='utf-8')) if (ROOT/'config.json').exists() else {}

SCHEMA='''
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS examples(id INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT NOT NULL, code TEXT NOT NULL, expected TEXT DEFAULT '', notes TEXT DEFAULT '', verified INTEGER DEFAULT 0, source TEXT DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT NOT NULL, code TEXT DEFAULT '', stage TEXT DEFAULT 'hypothesis', passed INTEGER DEFAULT 0, tested INTEGER DEFAULT 0, score REAL DEFAULT 0, test_output TEXT DEFAULT '', source TEXT DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS knowledge(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title TEXT DEFAULT '', content TEXT NOT NULL, content_hash TEXT DEFAULT '', confidence REAL DEFAULT 0.5, confirmations INTEGER DEFAULT 1, status TEXT DEFAULT 'observed', source TEXT DEFAULT '', score REAL DEFAULT 0.5, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge(status,confidence DESC);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL, source TEXT DEFAULT 'blackcore', priority INTEGER DEFAULT 0, status TEXT DEFAULT 'queued', stage TEXT DEFAULT 'observed', result TEXT DEFAULT '', retry_count INTEGER DEFAULT 0, next_retry_at INTEGER DEFAULT 0, last_error TEXT DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, message TEXT NOT NULL, data TEXT DEFAULT '{}', created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE TABLE IF NOT EXISTS identity(key TEXT PRIMARY KEY,value TEXT NOT NULL,weight REAL DEFAULT 1.0,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS identity_journal(id INTEGER PRIMARY KEY AUTOINCREMENT,note TEXT NOT NULL,source TEXT DEFAULT 'self',created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS mentor_health(url TEXT PRIMARY KEY,name TEXT DEFAULT '',failures INTEGER DEFAULT 0,last_ok INTEGER DEFAULT 0,last_fail INTEGER DEFAULT 0,cooldown_until INTEGER DEFAULT 0,last_error TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS knowledge_files(path TEXT PRIMARY KEY, sha256 TEXT NOT NULL, mtime INTEGER DEFAULT 0, size INTEGER DEFAULT 0, chunks INTEGER DEFAULT 0, next_chunk INTEGER DEFAULT 0, complete INTEGER DEFAULT 0, ingested_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS visual_observations(id INTEGER PRIMARY KEY AUTOINCREMENT,source_path TEXT DEFAULT '',width INTEGER,height INTEGER,features TEXT NOT NULL,status TEXT DEFAULT 'observed',confidence REAL DEFAULT 0.35,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
'''

STATUS_FLOW=['observed','hypothesis','compiled','executed','tested','validated','consolidated']

def now(): return int(time.time())
def sha256_text(s:str): return hashlib.sha256((s or '').encode('utf-8','ignore')).hexdigest()

def _deep_merge(d:dict, default:dict):
    for k,v in default.items():
        if k not in d: d[k]=v
        elif isinstance(v,dict) and isinstance(d.get(k),dict): _deep_merge(d[k],v)

def load_cfg()->dict:
    cfg=json.loads(CFG_PATH.read_text(encoding='utf-8')) if CFG_PATH.exists() else {}
    _deep_merge(cfg,DEFAULT_CFG)
    return cfg

def save_cfg(cfg:dict): CFG_PATH.write_text(json.dumps(cfg,indent=2,ensure_ascii=False)+"\n",encoding='utf-8')

def _columns(con,table): return {r[1] for r in con.execute(f'PRAGMA table_info({table})')}
def migrate_schema(con):
    # compatibility with v0.2 database
    additions={
      'knowledge':[('content_hash',"TEXT DEFAULT ''")],
      'attempts':[('stage',"TEXT DEFAULT 'hypothesis'")],
      'tasks':[('stage',"TEXT DEFAULT 'observed'"),('retry_count','INTEGER DEFAULT 0'),('next_retry_at','INTEGER DEFAULT 0'),('last_error',"TEXT DEFAULT ''")],
      'knowledge_files':[('next_chunk','INTEGER DEFAULT 0'),('complete','INTEGER DEFAULT 0')]
    }
    for table,cols in additions.items():
        have=_columns(con,table)
        for name,typ in cols:
            if name not in have: con.execute(f'ALTER TABLE {table} ADD COLUMN {name} {typ}')
    # backfill knowledge hashes best-effort
    if 'content_hash' in _columns(con,'knowledge'):
        for r in con.execute("SELECT id,content FROM knowledge WHERE COALESCE(content_hash,'')='' LIMIT 10000").fetchall():
            h=sha256_text(r['content'])
            try: con.execute('UPDATE knowledge SET content_hash=? WHERE id=?',(h,r['id']))
            except sqlite3.IntegrityError: pass
    con.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_hash ON knowledge(content_hash)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_tasks_ready ON tasks(status,next_retry_at,priority DESC,id ASC)")
    # FTS5 is optional on exotic SQLite builds; normal Termux SQLite supports it.
    try:
        con.executescript('''
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(title, content, content='knowledge', content_rowid='id');
        CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
          INSERT INTO knowledge_fts(rowid,title,content) VALUES(new.id,new.title,new.content);
        END;
        CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
          INSERT INTO knowledge_fts(knowledge_fts,rowid,title,content) VALUES('delete',old.id,old.title,old.content);
        END;
        CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE OF title,content ON knowledge BEGIN
          INSERT INTO knowledge_fts(knowledge_fts,rowid,title,content) VALUES('delete',old.id,old.title,old.content);
          INSERT INTO knowledge_fts(rowid,title,content) VALUES(new.id,new.title,new.content);
        END;
        ''')
        con.execute("INSERT INTO knowledge_fts(knowledge_fts) VALUES('rebuild')")
        con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('fts5','1')")
    except sqlite3.OperationalError:
        con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('fts5','0')")
    con.commit()

def db()->sqlite3.Connection:
    con=sqlite3.connect(DB_PATH,timeout=30)
    con.row_factory=sqlite3.Row
    con.executescript(SCHEMA)
    migrate_schema(con); seed_identity(con); ensure_strategy(con)
    return con

def seed_identity(con):
    defaults={
      'name':('Black Numbers',1.0),
      'version':('1.0.0',1.0),
      'identity':('Núcleo local relacional especializado em criar e validar sites, apps, animações e experiências em Black Numbers.',1.0),
      'memory_continuity':('persistente',1.0),
      'current_focus':('linguagem relacional executável, evidência testável e integração real com Black Core',1.0)
    }
    for k,(v,w) in defaults.items(): con.execute('INSERT OR IGNORE INTO identity(key,value,weight,updated_at) VALUES(?,?,?,?)',(k,v,w,now()))
    con.commit()

def ensure_strategy(con):
    row=con.execute("SELECT value FROM meta WHERE key='strategy'").fetchone()
    if not row:
        strategy={'version':1,'retrieval_top_k':8,'promotion_threshold':0.82,'focus_tags':['runtime','language','animation','layout','vision'],'exploration':0.45,'last_evolved_cycle':0}
        con.execute("INSERT INTO meta(key,value) VALUES('strategy',?)",(json.dumps(strategy,ensure_ascii=False),)); con.commit()

def get_strategy(con):
    row=con.execute("SELECT value FROM meta WHERE key='strategy'").fetchone();
    try: return json.loads(row['value']) if row else {}
    except Exception: return {}

def set_strategy(con,s): con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('strategy',?)",(json.dumps(s,ensure_ascii=False),)); con.commit()

def event(con,typ,msg,data=None):
    con.execute('INSERT INTO events(type,message,data,created_at) VALUES(?,?,?,?)',(typ,msg,json.dumps(data or {},ensure_ascii=False),now())); con.commit()
    cap=int(load_cfg().get('resources',{}).get('max_event_rows',5000))
    if cap>0:
        con.execute('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT ?)',(cap,)); con.commit()

def tokenize(s): return re.findall(r'[a-zA-ZÀ-ÿ_][a-zA-ZÀ-ÿ0-9_\-]*',(s or '').lower())
def words(s): return set(tokenize(s))
def similarity(a,b):
    aw,bw=words(a),words(b)
    if not aw or not bw: return 0.0
    j=len(aw&bw)/len(aw|bw)
    q=tokenize(a); d=tokenize(b); tf=sum(1 for t in q if t in bw)/max(1,len(q))
    return 0.65*j+0.35*tf

def retrieve_knowledge(con,query,limit=8):
    stage_bonus={'consolidated':0.22,'validated':0.16,'tested':0.10,'compiled':0.05,'hypothesis':0.02,'observed':0}
    rows=[]
    fts=(con.execute("SELECT value FROM meta WHERE key='fts5'").fetchone() or {'value':'0'})['value']=='1'
    toks=[t for t in tokenize(query) if len(t)>1][:12]
    if fts and toks:
        expr=' OR '.join('"'+t.replace('"','')+'"' for t in toks)
        try:
            rows=con.execute("SELECT k.* FROM knowledge_fts f JOIN knowledge k ON k.id=f.rowid WHERE knowledge_fts MATCH ? AND k.status!='rejected' ORDER BY bm25(knowledge_fts) LIMIT 240",(expr,)).fetchall()
        except sqlite3.OperationalError: rows=[]
    if not rows:
        rows=con.execute("SELECT * FROM knowledge WHERE status!='rejected' ORDER BY confidence DESC,confirmations DESC,id DESC LIMIT 3000").fetchall()
    scored=[]
    for r in rows:
        sim=similarity(query,(r['title'] or '')+' '+r['content'])
        s=sim+stage_bonus.get(r['status'],0)+min(.08,float(r['confidence'])*.08)
        if s>0.01: scored.append((s,r))
    scored.sort(key=lambda x:x[0],reverse=True)
    return [r for _,r in scored[:limit]]

def retrieve_examples(con,task,limit=5):
    rows=con.execute('SELECT * FROM examples ORDER BY verified DESC,id DESC LIMIT 600').fetchall(); scored=[]
    for r in rows:
        s=similarity(task,(r['task'] or '')+' '+(r['notes'] or ''))+(0.2 if r['verified'] else 0)
        scored.append((s,r))
    scored.sort(key=lambda x:x[0],reverse=True); return [r for _,r in scored[:limit]]

def upsert_knowledge(con,kind,title,content,confidence,source,score=None,status='observed'):
    content=(content or '').strip(); title=(title or '').strip(); h=sha256_text(content)
    if not content: raise ValueError('knowledge content vazio')
    exact=con.execute('SELECT * FROM knowledge WHERE content_hash=?',(h,)).fetchone()
    if exact:
        confirmations=int(exact['confirmations'])+1; nc=min(0.99,max(float(exact['confidence']),float(confidence))+0.03)
        st=exact['status']
        if STATUS_FLOW.index(st) < STATUS_FLOW.index(status): st=status
        # Repetition alone is not semantic validation. Repeated observations become hypotheses;
        # tested/validated content may advance only when the caller already supplied evidence.
        if confirmations>=2 and st=='observed': st='hypothesis'
        if STATUS_FLOW.index(status) > STATUS_FLOW.index(st): st=status
        con.execute('UPDATE knowledge SET confidence=?,confirmations=?,status=?,score=?,updated_at=? WHERE id=?',(nc,confirmations,st,max(float(exact['score']),float(score if score is not None else confidence)),now(),exact['id'])); con.commit(); return exact['id']
    # semantic near-dup only confirms if strongly similar and same kind
    candidates=con.execute('SELECT * FROM knowledge WHERE kind=? ORDER BY id DESC LIMIT 200',(kind,)).fetchall(); best=None; bs=0
    for r in candidates:
        s=similarity(title+' '+content,(r['title'] or '')+' '+r['content'])
        if s>bs: bs=s; best=r
    if best is not None and bs>=0.86:
        confirmations=int(best['confirmations'])+1; nc=min(0.99,max(float(best['confidence']),float(confidence))+0.04); st=best['status']
        if confirmations>=2 and st=='observed': st='hypothesis'
        if STATUS_FLOW.index(status) > STATUS_FLOW.index(st): st=status
        con.execute('UPDATE knowledge SET confidence=?,confirmations=?,status=?,score=?,updated_at=? WHERE id=?',(nc,confirmations,st,max(float(best['score']),float(score if score is not None else confidence)),now(),best['id'])); con.commit(); return best['id']
    cur=con.execute('INSERT INTO knowledge(kind,title,content,content_hash,confidence,confirmations,status,source,score,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(kind,title,content,h,max(0,min(1,float(confidence))),1,status,source,float(score if score is not None else confidence),now(),now())); con.commit(); return cur.lastrowid

def model_call(url,messages,cfg,model_name=None):
    m=cfg['model']; payload={'model':model_name or m.get('name','local-model'),'messages':messages,'temperature':m.get('temperature',.2),'max_tokens':m.get('max_tokens',1200),'stream':False}
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=float(m.get('timeout_seconds',18))) as resp:
        data=json.loads(resp.read().decode())
    return data['choices'][0]['message']['content'].strip()

def mentor_available(con,url,cfg):
    row=con.execute('SELECT * FROM mentor_health WHERE url=?',(url,)).fetchone()
    return not row or int(row['cooldown_until'] or 0)<=now()

def mentor_mark(con,url,name,ok,error='',cfg=None):
    row=con.execute('SELECT * FROM mentor_health WHERE url=?',(url,)).fetchone(); failures=0 if ok else ((int(row['failures']) if row else 0)+1)
    cooldown=0
    if not ok:
        base=int((cfg or load_cfg())['model'].get('cooldown_seconds',300)); cooldown=now()+min(3600,base*(2**min(failures-1,3)))
    con.execute('INSERT OR REPLACE INTO mentor_health(url,name,failures,last_ok,last_fail,cooldown_until,last_error) VALUES(?,?,?,?,?,?,?)',(url,name,failures,now() if ok else (int(row['last_ok']) if row else 0),now() if not ok else (int(row['last_fail']) if row else 0),cooldown,error[-1000:])); con.commit()

def discover_mentors(cfg,con=None):
    own=int(cfg['black_core'].get('api_port',8117)); found=[]; seen=set()
    for m in cfg.get('mentors',[]):
        url=m.get('base_url');
        if url and url not in seen: found.append(m); seen.add(url)
    primary=cfg['model'].get('primary_base_url')
    if primary and primary not in seen: found.append({'name':'primary','base_url':primary,'model':cfg['model'].get('name','local-model')}); seen.add(primary)
    for port in cfg['black_core'].get('discovery_ports',[]):
        if int(port)==own: continue
        for probe in ('/health','/v1/models'):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{probe}',timeout=.5) as r:
                    if 200<=r.status<500:
                        url=f'http://127.0.0.1:{port}/v1/chat/completions'
                        if url not in seen: found.append({'name':f'local:{port}','base_url':url,'model':'local-model'}); seen.add(url)
                        break
            except Exception: pass
    return [m for m in found if con is None or mentor_available(con,m['base_url'],cfg)]

def _rooted_path(v):
    p=Path(v); return p if p.is_absolute() else ROOT/p

def blackcore_active(cfg):
    bc=cfg['black_core']
    if os.getenv('BLACKCORE_FORCE_ACTIVE')=='1': return True
    if _rooted_path(bc.get('force_active_file','data/force_core_active')).exists(): return True
    hb=_rooted_path(bc.get('heartbeat_file','data/blackcore.heartbeat'))
    try:
        if hb.exists() and time.time()-hb.stat().st_mtime<=int(bc.get('heartbeat_ttl_seconds',180)): return True
    except OSError: pass
    try: out=subprocess.run(['ps','-A','-o','args='],capture_output=True,text=True,timeout=2).stdout.lower()
    except Exception: out=''
    return any(m.lower() in out for m in bc.get('process_markers',[]) if 'black_numbers' not in m.lower())

def touch_heartbeat(cfg):
    p=_rooted_path(cfg['black_core'].get('heartbeat_file','data/blackcore.heartbeat')); p.parent.mkdir(parents=True,exist_ok=True); p.touch()

def export_dataset(con,path=DATASETS/'black_numbers_train.jsonl'):
    path.parent.mkdir(parents=True,exist_ok=True); rows=con.execute('SELECT task,code,notes,source FROM examples WHERE verified=1 ORDER BY id').fetchall()
    with path.open('w',encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps({'messages':[{'role':'system','content':'Você programa em Black Numbers.'},{'role':'user','content':r['task']},{'role':'assistant','content':r['code']}],'meta':{'notes':r['notes'],'source':r['source']}},ensure_ascii=False)+'\n')
    return len(rows)

def status_snapshot(con,cfg):
    q=lambda sql: con.execute(sql).fetchone()[0]
    return {
      'version':'1.0.0','core_active':blackcore_active(cfg),'learning':bool(cfg['learning'].get('enabled',True)),
      'tasks':{'queued':q("SELECT COUNT(*) FROM tasks WHERE status='queued'"),'running':q("SELECT COUNT(*) FROM tasks WHERE status='running'"),'done':q("SELECT COUNT(*) FROM tasks WHERE status='done'"),'failed':q("SELECT COUNT(*) FROM tasks WHERE status='failed'")},
      'knowledge':{'total':q('SELECT COUNT(*) FROM knowledge'),'validated':q("SELECT COUNT(*) FROM knowledge WHERE status IN ('validated','consolidated')"),'consolidated':q("SELECT COUNT(*) FROM knowledge WHERE status='consolidated'")},
      'examples':{'total':q('SELECT COUNT(*) FROM examples'),'verified':q('SELECT COUNT(*) FROM examples WHERE verified=1')},
      'attempts':q('SELECT COUNT(*) FROM attempts'), 'cycles':int((con.execute("SELECT value FROM meta WHERE key='cycles'").fetchone() or {'value':'0'})['value']),
      'strategy':get_strategy(con)
    }
