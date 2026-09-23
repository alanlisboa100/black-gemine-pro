#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib
from pathlib import Path
from bnlib import *

def chunks(text,n,overlap):
    text=text.replace('\x00',''); i=0
    while i<len(text):
        end=min(len(text),i+n); piece=text[i:end].strip()
        if piece: yield piece
        if end>=len(text): break
        i=max(i+1,end-overlap)

def ingest_path(root:Path,limit=None):
    cfg=load_cfg(); kcfg=cfg['knowledge']; exts={e.lower() for e in kcfg['extensions']}; maxb=int(kcfg['max_file_bytes']); budget=int(limit or kcfg.get('max_chunks_per_run',500)); con=db(); added=0; files_done=0; skipped=0
    paths=[root] if root.is_file() else sorted(p for p in root.rglob('*') if p.is_file())
    for p in paths:
        if added>=budget: break
        try: size=p.stat().st_size
        except OSError: skipped+=1; continue
        if p.suffix.lower() not in exts or size>maxb: skipped+=1; continue
        raw=p.read_bytes(); h=hashlib.sha256(raw).hexdigest(); prev=con.execute('SELECT * FROM knowledge_files WHERE path=?',(str(p),)).fetchone()
        if prev and prev['sha256']==h and int(prev['complete'] or 0)==1: skipped+=1; continue
        start_idx=int(prev['next_chunk'] or 0) if prev and prev['sha256']==h else 0
        try:text=raw.decode('utf-8')
        except UnicodeDecodeError:
            try:text=raw.decode('latin-1')
            except Exception: skipped+=1; continue
        all_chunks=list(chunks(text,int(kcfg['chunk_chars']),int(kcfg['chunk_overlap'])))
        if start_idx>=len(all_chunks):
            con.execute('INSERT OR REPLACE INTO knowledge_files(path,sha256,mtime,size,chunks,next_chunk,complete,ingested_at) VALUES(?,?,?,?,?,?,?,?)',(str(p),h,int(p.stat().st_mtime),size,len(all_chunks),len(all_chunks),1,now())); con.commit(); files_done+=1; continue
        idx=start_idx
        while idx<len(all_chunks) and added<budget:
            piece=all_chunks[idx]
            upsert_knowledge(con,'source_chunk',f'{p.name} · chunk {idx+1}',piece,0.52,f'file:{p}',0.52,status='observed')
            idx+=1; added+=1
            con.execute('INSERT OR REPLACE INTO knowledge_files(path,sha256,mtime,size,chunks,next_chunk,complete,ingested_at) VALUES(?,?,?,?,?,?,?,?)',(str(p),h,int(p.stat().st_mtime),size,len(all_chunks),idx,1 if idx>=len(all_chunks) else 0,now())); con.commit()
        if idx>=len(all_chunks): files_done+=1
    pending=con.execute('SELECT COUNT(*) c FROM knowledge_files WHERE complete=0').fetchone()['c']
    event(con,'knowledge_ingest','ingestão concluída',{'root':str(root),'chunks_processed':added,'files_completed':files_done,'skipped':skipped,'pending_files':pending}); con.close(); return {'chunks_processed':added,'files_completed':files_done,'skipped':skipped,'pending_files':pending}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('path',nargs='?',default=str(KNOWLEDGE_REPO)); ap.add_argument('--limit',type=int); a=ap.parse_args(); print(ingest_path(Path(a.path).expanduser().resolve(),a.limit))
if __name__=='__main__': main()
