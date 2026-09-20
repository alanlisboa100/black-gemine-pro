import test from 'node:test';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {spawnSync} from 'node:child_process';
import {ToolExecutor,parseToolArguments} from '../src/tools/executor.js';
import {redactSecrets} from '../src/security/secrets.js';
import {sleep} from '../src/providers/retry.js';
import {parseSSE} from '../src/providers/sse.js';
import {ProcessManager} from '../src/tools/shell/process-manager.js';
import {OpenAIProvider} from '../src/providers/openai.js';
import {ResponsesProvider} from '../src/providers/responses.js';
import {applyNaturalIntent} from '../src/natural/intent.js';
import {DEFAULT_CONFIG} from '../src/config/defaults.js';
const call=(args='{}')=>({id:'c1',function:{name:'read',arguments:args}});
function executor(tool,cfg={}){return new ToolExecutor({registry:{get:()=>tool},cfg});}

test('parallel malformed arguments and negative limits never hang the event loop',()=>{
 const script=`import {ToolExecutor} from './src/tools/executor.js';
 const e=new ToolExecutor({registry:{get:()=>({parallelSafe:true,readOnly:true,execute:async()=> 'ok'})},cfg:{maxParallelReadTools:-2}});
 const r=await e.many([{id:'1',function:{name:'read',arguments:'{'}}],{});
 if(r.length!==1||r[0].ok!==false)process.exit(2);`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),timeout:2000,encoding:'utf8'});
 assert.equal(r.status,0,r.error?.message||r.stderr);
});
test('JSON recovery accepts an emoji before the object',()=>{assert.deepEqual(parseToolArguments('🛠 {"path":"a"}'),{path:'a'});});
test('structured tool failures trip the repeated-failure guard',async()=>{
 let runs=0;const e=executor({readOnly:true,execute:async()=>{runs++;return {ok:false};},resultStatus:()=>false});
 const ctx={failedToolCalls:new Map()};await e.one(call(),ctx);await e.one(call(),ctx);
 assert.match((await e.one(call(),ctx)).result,/BLOCKED/);assert.equal(runs,2);
});
test('tool error messages redact synthetic credentials',async()=>{
 const e=executor({readOnly:true,execute(){throw new Error('password=synthetic-password');}});
 assert.ok(!(await e.one(call(),{})).result.includes('synthetic-password'));
});
test('large single-line output redaction remains responsive and preserves text',()=>{
 const source='BEGIN-'+ 'x'.repeat(140000);const start=performance.now();assert.equal(redactSecrets(source),source);
 assert.ok(performance.now()-start<1500,'redaction should not stall on long lines');
 assert.ok(!redactSecrets('https://user:synthetic-password@example.test').includes('synthetic-password'));
});
test('retry waits remove abort listeners after settling',async()=>{
 const c=new AbortController();for(let i=0;i<15;i++)await sleep(0,c.signal);
 assert.equal(getEventListeners(c.signal,'abort').length,0);
 const pending=sleep(10000,c.signal);c.abort(new Error('stop'));await assert.rejects(pending,/stop/);
 assert.equal(getEventListeners(c.signal,'abort').length,0);
});
test('SSE preserves split UTF-8 and CRLF events',async()=>{
 const bytes=new TextEncoder().encode('data: olá 👋\r\n\r\n');
 const stream=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}});
 const events=[];for await(const event of parseSSE(stream))events.push(event.data);assert.deepEqual(events,['olá 👋']);
});
test('SSE abort unblocks a stalled reader and closes it',async()=>{
 let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}}),c=new AbortController();
 const next=parseSSE(stream,{signal:c.signal}).next();c.abort(new Error('cancelled'));
 await assert.rejects(next,/cancelled/);assert.equal(cancelled,true);assert.equal(stream.locked,false);
});
test('SSE early consumer exit cancels the connection',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: first\n\n'));},cancel(){cancelled=true;}});
 for await(const event of parseSSE(stream)){assert.equal(event.data,'first');break;}
 assert.equal(cancelled,true);assert.equal(stream.locked,false);
});
test('failed process start becomes a pollable error instead of crashing',async()=>{
 const manager=new ProcessManager(),id=manager.start('echo test','/blackcore-nonexistent-test-directory');
 await sleep(30);const state=manager.poll(id);assert.equal(state.running,false);assert.match(state.stderr,/ENOENT/);manager.killAll();
});
function provider(Type){const cfg={providers:{test:{baseUrl:'http://localhost',apiKey:'synthetic-test-key',models:[]}},retry:{maxAttempts:2,baseDelayMs:1},requestTimeoutMs:1000};return new Type(cfg,'test','test-model');}
for(const Type of [OpenAIProvider,ResponsesProvider])test(`${Type.name}: incomplete text cannot be reported as success or replayed`,async()=>{
 const original=globalThis.fetch;let attempts=0,seen='';
 globalThis.fetch=async()=>{attempts++;const event=Type===OpenAIProvider?{choices:[{delta:{content:'partial'}}]}:{type:'response.output_text.delta',delta:'partial'};
 return new Response(`data: ${JSON.stringify(event)}\n\n`,{headers:{'content-type':'text/event-stream'}});};
 try{await assert.rejects(provider(Type).chat({messages:[],stream:true,onText:x=>seen+=x}),/interrupted/);assert.equal(attempts,1);assert.equal(seen,'partial');}
 finally{globalThis.fetch=original;}
});
test('complete chat stream returns both text and a tool call',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('data: '+JSON.stringify({choices:[{delta:{content:'done',tool_calls:[{index:0,id:'t',function:{name:'read',arguments:'{}'}}]},finish_reason:'tool_calls'}]})+'\n\ndata: [DONE]\n\n');
 try{const result=await provider(OpenAIProvider).chat({messages:[],stream:true});assert.equal(result.message.content,'done');assert.equal(result.message.tool_calls[0].function.name,'read');}finally{globalThis.fetch=original;}
});
test('unknown Gemini variant never selects a different model or changes reasoning',async()=>{
 const cfg=structuredClone(DEFAULT_CONFIG),original=cfg.model;let saved=0;
 const app={agent:{provider:cfg.provider,model:cfg.model,setModel(){throw new Error('wrong selection');}},runtime:{cfg,ui:{status(){}},saveConfig(){saved++;}}};
 const result=await applyNaturalIntent(app,'usa gemini 2.5 flash lite sem raciocinio');
 assert.equal(result.unavailableModel,'gemini-3.6-flash-lite');assert.equal(cfg.model,original);assert.equal(saved,0);
});
