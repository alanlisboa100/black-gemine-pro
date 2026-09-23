import json,urllib.request
BASE='http://127.0.0.1:8117'
def _req(method,path,payload=None,timeout=5):
    data=None if payload is None else json.dumps(payload).encode(); req=urllib.request.Request(BASE+path,data=data,method=method,headers={'Content-Type':'application/json'} if data else {})
    with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode())
def status(): return _req('GET','/v1/status')
def heartbeat(): return _req('POST','/v1/core/heartbeat',{})
def task(prompt,source='blackcore',priority=0): return _req('POST','/v1/task',{'prompt':prompt,'source':source,'priority':priority})
def observe(task,content,source='blackcore-ai',confidence=.42): return _req('POST','/v1/observe',{'task':task,'content':content,'source':source,'confidence':confidence})
def compile_bn(code): return _req('POST','/v1/compile',{'code':code})
