#!/usr/bin/env python3
from __future__ import annotations
import json, random, re
from pathlib import Path
from bnlib import *
from bn_language import compile_bn

CURRICULUM=[
('language','Declare um elemento visual mínimo e suas propriedades em Black Numbers.'),
('animation','Crie uma animação temporal reutilizável em Black Numbers.'),
('layout','Modele layout responsivo com dimensões relativas.'),
('state','Represente estado e transições como relações, não handlers espalhados.'),
('input','Modele toque/input como sinal relacional.'),
('runtime','Crie um teste executável para validar um programa Black Numbers.'),
('vision','Converta observação visual em relações e componentes sem confundir observação com validação.'),
('app','Descreva uma tela de aplicativo com estado, layout e animação em Black Numbers.'),
]

def local_hypothesis(task:str):
    q=task.lower()
    if any(x in q for x in ('layout','responsiv','tela','app')):
        code='''node Frame : field {\n  fill: ink\n  x: 0.5\n  y: 0.5\n}\nnode Hero : rect {\n  fill: lime\n  x: 0.5\n  y: 0.22\n  w: 0.72\n  h: 0.10\n}\nscreen Main {\n  root: Frame\n  bg: ink\n  layout: stack\n}'''
        lesson='Layout usa nodes nomeados, coordenadas relativas e screen explícita.'
    elif any(x in q for x in ('estado','transição','transicao')):
        code='''node Flag : rect {\n  fill: lime\n  x: 0.5\n  y: 0.5\n  w: 48\n  h: 48\n}\nrelate Flicker : time -> Flag.opacity {\n  via: 0.45 + abs(sin(t * 0.003)) * 0.5\n}\nscreen Main {\n  root: Flag\n  bg: ink\n}'''
        lesson='Estado visual é derivado de relações explícitas e testáveis.'
    else:
        code='''node Core : diamond {\n  fill: lime\n  x: 0.5\n  y: 0.5\n  r: 36\n}\nrelate Pulse : time -> Core.r {\n  via: 36 + sin(t * 0.0024) * 10\n}\nscreen Main {\n  root: Core\n  bg: ink\n}'''
        lesson='Uma relação temporal simples fornece evidência executável para o runtime.'
    return {'lesson_title':task[:100],'lesson':lesson,'candidate_code':code,'confidence':0.48,'self_note':'Hipótese local produzida sem depender de mentor externo.','risks':['Hipótese local; validar no compilador/runtime.']}

def next_task(con,cfg):
    row=con.execute("SELECT * FROM tasks WHERE status='queued' AND COALESCE(next_retry_at,0)<=? ORDER BY priority DESC,id ASC LIMIT 1",(now(),)).fetchone()
    if row: return dict(row)
    if not cfg['learning'].get('self_curriculum',True): return None
    strategy=get_strategy(con); focus=strategy.get('focus_tags',[])
    weighted=[x for x in CURRICULUM if x[0] in focus] or CURRICULUM
    tag,prompt=random.choice(weighted)
    return {'id':None,'prompt':prompt,'source':'self-curriculum','priority':0,'retry_count':0,'tag':tag}

def context_for(con,task,cfg):
    strategy=get_strategy(con); k=int(strategy.get('retrieval_top_k',cfg['learning'].get('top_knowledge',8)))
    kr=retrieve_knowledge(con,task,k); er=retrieve_examples(con,task,int(cfg['learning'].get('top_examples',5)))
    knowledge='\n'.join(f"- [{r['status']} {r['confidence']:.2f}] {r['title']}: {r['content'][:700]}" for r in kr)
    examples='\n\n'.join(f"TASK: {r['task']}\nCODE:\n{r['code'][:1200]}" for r in er)
    return knowledge,examples

def query_mentor(con,task,cfg):
    knowledge,examples=context_for(con,task,cfg)
    sys='''Você é mentor técnico do Black Numbers, uma linguagem relacional em evolução. Responda SOMENTE JSON com: lesson_title, lesson, candidate_code, confidence (0..1), self_note, risks[]. O candidato deve usar apenas blocos node, relate, screen; nunca JavaScript arbitrário. Prefira algo pequeno, executável e testável.'''
    user=f"TAREFA:\n{task}\n\nCONHECIMENTO:\n{knowledge or '(vazio)'}\n\nEXEMPLOS:\n{examples or '(vazio)'}"
    for m in discover_mentors(cfg,con):
        try:
            raw=model_call(m['base_url'],[{'role':'system','content':sys},{'role':'user','content':user}],cfg,m.get('model'))
            data=None
            try: data=json.loads(re.sub(r'^```(?:json)?\s*|\s*```$','',raw.strip(),flags=re.I|re.S))
            except Exception:
                mm=re.search(r'\{[\s\S]*\}',raw)
                if mm:
                    try:data=json.loads(mm.group(0))
                    except Exception: pass
            if data and isinstance(data,dict):
                mentor_mark(con,m['base_url'],m.get('name','mentor'),True,cfg=cfg); return data,m.get('name','mentor')
            raise ValueError('mentor retornou JSON inválido')
        except Exception as e:
            mentor_mark(con,m['base_url'],m.get('name','mentor'),False,str(e),cfg)
            event(con,'mentor_error',m.get('name','mentor'),{'error':str(e)[:500]})
    return local_hypothesis(task),'local'

def evolve_strategy(con,cfg,cycles):
    every=max(1,int(cfg['learning'].get('evolve_strategy_every',8)))
    if not cfg['learning'].get('self_evolution',True) or cycles%every: return
    s=get_strategy(con); recent=con.execute('SELECT score,passed,tested,task FROM attempts ORDER BY id DESC LIMIT 40').fetchall()
    if recent:
        avg=sum(float(r['score']) for r in recent)/len(recent); fail=sum(1 for r in recent if r['tested'] and not r['passed'])/len(recent)
    else: avg=.5; fail=0
    # Real adaptation: retrieval and promotion thresholds change based on evidence quality
    if avg<.65 or fail>.25:
        s['retrieval_top_k']=min(14,int(s.get('retrieval_top_k',8))+1); s['promotion_threshold']=min(.92,float(s.get('promotion_threshold',.82))+.02); s['exploration']=max(.2,float(s.get('exploration',.45))-.05)
    elif avg>.88 and fail<.1:
        s['retrieval_top_k']=max(5,int(s.get('retrieval_top_k',8))-1); s['promotion_threshold']=max(.78,float(s.get('promotion_threshold',.82))-.01); s['exploration']=min(.7,float(s.get('exploration',.45))+.03)
    # focus on keywords from failed tasks
    failed=' '.join(r['task'] for r in recent if r['tested'] and not r['passed']).lower()
    tags=[]
    for tag in ('runtime','language','animation','layout','vision','input','state','app'):
        if tag in failed: tags.append(tag)
    if tags: s['focus_tags']=(tags+s.get('focus_tags',[]))[:5]
    s['last_evolved_cycle']=cycles; s['last_avg_score']=round(avg,3); s['last_fail_rate']=round(fail,3); set_strategy(con,s)
    EVOLUTION.mkdir(exist_ok=True); (EVOLUTION/f'strategy_{cycles:06d}.json').write_text(json.dumps(s,indent=2,ensure_ascii=False),encoding='utf-8')
    con.execute('INSERT INTO identity_journal(note,source,created_at) VALUES(?,?,?)',(f"Estratégia adaptada no ciclo {cycles}: avg={avg:.2f} fail={fail:.2f} top_k={s['retrieval_top_k']} gate={s['promotion_threshold']:.2f}",'self-evolution',now())); con.commit()

def schedule_retry(con,row,error,cfg):
    if not row.get('id'): return
    rc=int(row.get('retry_count',0))+1; maxr=int(cfg['learning'].get('max_task_retries',4)); backs=cfg['learning'].get('retry_backoff_seconds',[30,120,600,1800]); delay=int(backs[min(rc-1,len(backs)-1)])
    status='failed' if rc>=maxr else 'queued'; next_at=0 if status=='failed' else now()+delay
    con.execute('UPDATE tasks SET status=?,retry_count=?,next_retry_at=?,last_error=?,updated_at=? WHERE id=?',(status,rc,next_at,error[:1000],now(),row['id'])); con.commit()

def process_cycle(cfg):
    con=db(); row=next_task(con,cfg)
    if not row: con.close(); return None
    task=row['prompt'];
    if row.get('id'): con.execute("UPDATE tasks SET status='running',stage='observed',updated_at=? WHERE id=?",(now(),row['id'])); con.commit()
    event(con,'cycle_start',task,{'source':row.get('source','')})
    try:
        data,source=query_mentor(con,task,cfg)
        lesson=str(data.get('lesson','')).strip(); code=str(data.get('candidate_code','')).strip(); conf=max(.05,min(.95,float(data.get('confidence',.45) or .45)))
        kid=upsert_knowledge(con,'design',str(data.get('lesson_title',task[:100])),lesson,conf,source,conf,status='hypothesis')
        comp=compile_bn(code,allow_legacy_js=bool(cfg.get('security',{}).get('allow_legacy_js',False))) if code else None
        tested=bool(comp); passed=bool(comp and comp.ok); score=float(comp.score if comp else conf); stage='compiled' if comp else 'hypothesis'
        if comp:
            con.execute('INSERT INTO attempts(task,code,stage,passed,tested,score,test_output,source,created_at) VALUES(?,?,?,?,?,?,?,?,?)',(task,code,stage,1 if comp.ok else 0,1,score,comp.output,source,now()))
            if comp.ok:
                # Compile proves syntax/runtime constraints, not semantic truth. Promotion beyond
                # tested requires repeated evidence and the adaptive gate.
                kr=con.execute('SELECT confirmations FROM knowledge WHERE id=?',(kid,)).fetchone()
                confirms=int(kr['confirmations']) if kr else 1
                gate=float(get_strategy(con).get('promotion_threshold',cfg['learning'].get('promotion_threshold',.82)))
                kstatus='tested'
                if confirms>=2 and score>=gate: kstatus='validated'
                if confirms>=3 and score>=max(.94,gate): kstatus='consolidated'
                con.execute('UPDATE knowledge SET status=?,confidence=MAX(confidence,?),score=?,updated_at=? WHERE id=?',(kstatus,max(.72,conf),score,now(),kid))
                con.execute('INSERT INTO examples(task,code,notes,verified,source,created_at) VALUES(?,?,?,?,?,?)',(task,code,f'compiler score={score:.2f}',1,source,now()))
        note=str(data.get('self_note','')).strip()
        if note: con.execute('INSERT INTO identity_journal(note,source,created_at) VALUES(?,?,?)',(note,'learning-cycle',now()))
        if row.get('id'):
            result={'knowledge_id':kid,'source':source,'compile_ok':bool(comp and comp.ok),'score':score,'stage':'tested' if passed else stage,'risks':data.get('risks',[])}
            con.execute("UPDATE tasks SET status='done',stage=?,result=?,last_error='',updated_at=? WHERE id=?",(result['stage'],json.dumps(result,ensure_ascii=False),now(),row['id']))
        cycles=int((con.execute("SELECT value FROM meta WHERE key='cycles'").fetchone() or {'value':'0'})['value'])+1; con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('cycles',?)",(str(cycles),)); con.commit()
        if cycles%max(1,int(cfg['learning'].get('export_dataset_every',10)))==0: export_dataset(con)
        evolve_strategy(con,cfg,cycles); event(con,'cycle_done',task,{'source':source,'score':score,'compile_ok':passed}); con.close(); return {'task':task,'score':score,'source':source,'compile_ok':passed}
    except Exception as e:
        schedule_retry(con,row,str(e),cfg); event(con,'cycle_error',task,{'error':str(e)}); con.close(); return {'task':task,'error':str(e)}
