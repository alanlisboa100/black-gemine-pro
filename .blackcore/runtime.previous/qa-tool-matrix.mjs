import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {BlackcoreAgent} from './src/agent/agent.js';
import {SessionStore} from './src/sessions/store.js';
import {ToolRegistry} from './src/tools/registry.js';
import {registerBuiltins} from './src/tools/builtins.js';
import {HookBus} from './src/plugins/hooks.js';
import {ToolExecutor} from './src/tools/executor.js';
import {TurnContext} from './src/agent/turn.js';
import {DEFAULT_CONFIG} from './src/config/defaults.js';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'bc-matrix-'));
const stubBin=path.join(root,'bin'); fs.mkdirSync(stubBin,{recursive:true});
function stub(name,body){const p=path.join(stubBin,name);fs.writeFileSync(p,`#!/usr/bin/env bash\nset -e\n${body}\n`);fs.chmodSync(p,0o755);}
stub('vercel','echo "VERCEL_STUB $*"; [ "$1" = "whoami" ] && echo "blackcore-test"; exit 0');
stub('netlify','echo "NETLIFY_STUB $*"; [ "$1" = "status" ] && echo "blackcore-test"; exit 0');
stub('supabase','echo "SUPABASE_STUB $*"; exit 0');
stub('resend','echo "RESEND_STUB $*"; exit 0');
stub('eas','echo "EAS_STUB $*"; [ "$1" = "whoami" ] && echo "blackcore-test"; exit 0');
stub('gh','echo "GH_STUB $*"; exit 0');
stub('npx','echo "NPX_STUB $*"; exit 0');
stub('chromium',"printf '%s\\n' '<html lang=\"en\"><head><title>QA App</title><meta name=\"viewport\" content=\"width=device-width\"></head><body><main><h1>QA</h1></main></body></html>'");
stub('adb','echo "ADB_STUB $*"; [ "$1" = "devices" ] && echo "emulator-5554 device"');
stub('psql','echo "database,user"; echo "qa,blackcore"');
stub('docker','echo "DOCKER_STUB $*"');
stub('ffprobe','echo "{\\"streams\\":[],\\"format\\":{\\"format_name\\":\\"stub\\"}}"');
process.env.PATH=`${stubBin}:${process.env.PATH}`;

// Workspace seed
fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'qa',scripts:{test:'node -e "console.log(\\\"TEST_OK\\\")"',lint:'node -e "console.log(\\\"LINT_OK\\\")"',build:'node -e "console.log(\\\"BUILD_OK\\\")"',typecheck:'node -e "console.log(\\\"TYPE_OK\\\")"'}},null,2));
fs.mkdirSync(path.join(root,'src')); fs.writeFileSync(path.join(root,'src','a.js'),'export const a = 1;\n');
fs.mkdirSync(path.join(root,'.gitignore.dummy'),{recursive:true});
fs.writeFileSync(path.join(root,'.env'),'SECRET=do-not-read\n');
fs.writeFileSync(path.join(root,'app.json'),JSON.stringify({expo:{name:'QA',slug:'qa'}}));
fs.writeFileSync(path.join(root,'eas.json'),JSON.stringify({build:{preview:{}}}));
fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({version:2}));
fs.writeFileSync(path.join(root,'netlify.toml'),'[build]\ncommand = "npm run build"\n');
fs.writeFileSync(path.join(root,'site.html'),'<!doctype html><title>source</title>');
// Assemble the synthetic credential at runtime so repository scanners do not
// mistake this QA fixture for a committed credential.
fs.writeFileSync(path.join(root,'unsafe.txt'),`token=${'ghp_'}${'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'}\n`);
fs.writeFileSync(path.join(root,'media.mp4'),'stub media\n');
fs.mkdirSync(path.join(root,'supabase'));fs.writeFileSync(path.join(root,'supabase','config.toml'),'project_id = "qa"\n');
fs.writeFileSync(path.join(root,'gradlew'),'#!/usr/bin/env bash\necho "GRADLE_STUB $*"\nexit 0\n');fs.chmodSync(path.join(root,'gradlew'),0o755);

// git repo
await new Promise((resolve,reject)=>{import('node:child_process').then(({execFile})=>execFile('git',['init','-q'],{cwd:root},e=>e?reject(e):resolve()));});
await new Promise((resolve,reject)=>{import('node:child_process').then(({execFile})=>execFile('git',['config','user.email','qa@example.com'],{cwd:root},e=>e?reject(e):resolve()));});
await new Promise((resolve,reject)=>{import('node:child_process').then(({execFile})=>execFile('git',['config','user.name','QA'],{cwd:root},e=>e?reject(e):resolve()));});

const cfg=structuredClone(DEFAULT_CONFIG);Object.assign(cfg,{provider:'deepseek',model:'deepseek-v4-flash',permissionProfile:'yolo',confirmDangerous:false,confirmExternalReads:false,confirmExternalWrites:false,animation:false,stream:false,maxToolOutputChars:50000,maxReadChars:50000});
const session=new SessionStore(root,null,{ephemeral:true});
const providers={create(){return{modelInfo(){return{context:128000}},async chat(){return{message:{role:'assistant',content:'noop'},usage:{}}}}}};
const registry=registerBuiltins(new ToolRegistry());
const ui={stream(){},streamEnd(){},assistant(){},toolResult(){},notify(){},turnStart(){},turnDone(){}};
const agent=new BlackcoreAgent({cfg,session,cwd:root,input:{confirm:async()=>true},ui,registry,hooks:new HookBus(),providers,skills:{prompt(){return''}},instructions:{text:''},repoSummary:''});
const ctx=new TurnContext(agent,new AbortController().signal);ctx.confirm=async()=>true;
const ex=new ToolExecutor({registry,cfg,hooks:new HookBus(),audit:agent.audit});
let seq=0;async function call(name,args={}){const r=await ex.one({id:`c${++seq}`,type:'function',function:{name,arguments:JSON.stringify(args)}},ctx);if(!r.ok)throw new Error(`${name}: ${r.result}`);return r.result;}
const results=[];async function check(name,fn){const t=Date.now();try{const detail=await fn();results.push({name,ok:true,ms:Date.now()-t,detail:String(detail??'').slice(0,300)});}catch(e){results.push({name,ok:false,ms:Date.now()-t,detail:e.stack||String(e)});}}

await check('write/read',async()=>{await call('write',{path:'hello.txt',content:'hello world\n'});const x=await call('read',{path:'hello.txt'});if(!x.includes('hello world'))throw new Error('read mismatch');return x;});
await check('edit',async()=>{await call('edit',{path:'hello.txt',oldText:'world',newText:'BLACKCORE'});return fs.readFileSync(path.join(root,'hello.txt'),'utf8');});
await check('patch',async()=>{await call('patch',{path:'hello.txt',patch:'@@ -1,1 +1,1 @@\n-hello BLACKCORE\n+hello BLACKCORE patched'});return fs.readFileSync(path.join(root,'hello.txt'),'utf8');});
await check('patch_set',async()=>{await call('patch_set',{patch:'--- a/hello.txt\n+++ b/hello.txt\n@@ -1,1 +1,1 @@\n-hello BLACKCORE patched\n+hello multi patched\n--- /dev/null\n+++ b/new.txt\n@@ -0,0 +1,1 @@\n+new file'});return fs.readFileSync(path.join(root,'new.txt'),'utf8');});
await check('json_edit',async()=>{await call('json_edit',{path:'data.json',action:'set',jsonPath:'a.b',value:42});return fs.readFileSync(path.join(root,'data.json'),'utf8');});
await check('file_transaction',async()=>{await call('file_transaction',{operations:[{action:'write',path:'tx1.txt',content:'one'},{action:'write',path:'tx2.txt',content:'two'},{action:'edit',path:'tx2.txt',oldText:'two',newText:'TWO'}]});return fs.readFileSync(path.join(root,'tx2.txt'),'utf8');});
await check('ls/stat/mkdir/copy/move/delete',async()=>{await call('mkdir',{path:'ops/sub'});await call('copy',{from:'hello.txt',to:'ops/copy.txt'});await call('move',{from:'ops/copy.txt',to:'ops/moved.txt'});const st=await call('stat',{path:'ops/moved.txt'});const ls=await call('ls',{path:'ops'});await call('delete_file',{path:'ops/moved.txt'});return st+'\n'+ls;});
await check('find/grep/repo_map',async()=>{const a=await call('find',{query:'a.js'}),b=await call('grep',{query:'export const',path:'src'}),c=await call('repo_map',{});if(!a.includes('a.js')||!b.includes('a.js'))throw new Error('search miss');return a+'\n'+b+'\n'+c.slice(0,500);});
await check('bash',async()=>call('bash',{command:'printf BASH_OK'}));
await check('shell_session',async()=>{await call('shell_session',{action:'open',name:'s1'});await call('shell_session',{action:'run',name:'s1',command:'export BCX=abc; cd src'});const r=await call('shell_session',{action:'run',name:'s1',command:'printf "$BCX $(pwd)"'});await call('shell_session',{action:'close',name:'s1'});if(!r.includes('abc'))throw new Error('state not preserved');return r;});
await check('process_start/poll/list/kill',async()=>{const s=await call('process_start',{command:'while true; do echo ping; sleep 1; done'});const id=(s.match(/p_[A-Za-z0-9_-]+/)||[])[0];if(!id)throw new Error('no process id: '+s);await new Promise(r=>setTimeout(r,120));const p=await call('process_poll',{id});const l=await call('process_list',{});await call('process_kill',{id});return s+'\n'+p+'\n'+l;});
await check('git status/add/commit/log/diff/branch/show/remote',async()=>{await call('git',{action:'add',pathspec:'.'});await call('git',{action:'commit',message:'qa initial'});const log=await call('git',{action:'log'});const status=await call('git',{action:'status'});const branch=await call('git',{action:'branch'});const show=await call('git',{action:'show',ref:'HEAD'});const remote=await call('git',{action:'remote'});return [log,status,branch,show,remote].join('\n');});
await check('github structured stub',async()=>call('github',{action:'repo_view'}));

// Local HTTP server
const server=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;res.setHeader('content-type', req.url==='/html'?'text/html':'application/json');if(req.url==='/bin'){res.setHeader('content-type','application/octet-stream');res.end(Buffer.from('DOWNLOAD_OK'));return;}if(req.url==='/html'){res.end('<html><body><h1>FETCH_OK</h1><script>bad()</script></body></html>');return;}res.end(JSON.stringify({method:req.method,body,auth:req.headers.authorization||null}));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
await check('web_fetch local approved',async()=>call('web_fetch',{url:`http://127.0.0.1:${port}/html`}));
await check('download local approved',async()=>{await call('download',{url:`http://127.0.0.1:${port}/bin`,path:'download.bin'});return fs.readFileSync(path.join(root,'download.bin'),'utf8');});
await check('http_request local approved',async()=>call('http_request',{url:`http://127.0.0.1:${port}/api`,method:'POST',json:{ok:true}}));
await check('api_lab local assertion',async()=>{const r=await call('api_lab',{action:'assert',url:`http://127.0.0.1:${port}/api`,expectedStatus:200,contains:'method'});if(!r.includes('"passed": true'))throw new Error('API assertion failed');return r;});
await check('port_check',async()=>call('port_check',{host:'127.0.0.1',port,waitMs:1000}));
await check('scan staged site map',async()=>{const r=await call('scan',{action:'site_map',url:`http://127.0.0.1:${port}/html`,maxPages:10});if(!r.includes('FETCH_OK')||!r.includes('missing-title'))throw new Error('scan evidence missing');return r;});
server.close();

await check('browser audit stub',async()=>{const r=await call('browser',{action:'audit',path:'site.html',width:390,height:844});if(!r.includes('QA App')||!r.includes('"h1": 1'))throw new Error('browser audit evidence missing');return r;});
await check('document markdown',async()=>{const r=await call('document',{format:'md',output:'qa-report.md',title:'BLACKCORE QA',language:'pt-BR',sections:[{heading:'Resultado',content:'**Aprovado** com documento estruturado.'}]});const body=fs.readFileSync(path.join(root,'qa-report.md'),'utf8');if(!body.includes('Sumário')||!body.includes('Aprovado'))throw new Error('document output mismatch');return r+'\n'+body;});
await check('document_reader text',async()=>{const r=await call('document_reader',{action:'extract',path:'qa-report.md'});if(!r.includes('Aprovado'))throw new Error('document extraction mismatch');return r;});
await check('code_intel symbols/references',async()=>{const symbols=await call('code_intel',{action:'symbols',path:'src/a.js'});const refs=await call('code_intel',{action:'references',symbol:'a'});return symbols+'\n'+refs;});
await check('knowledge_index local retrieval',async()=>{await call('knowledge_index',{action:'build',path:'.',maxFiles:100});const r=await call('knowledge_index',{action:'search',query:'export const'});if(!r.includes('src/a.js'))throw new Error('knowledge retrieval miss');return r;});
await check('security_scan redacted locations',async()=>{const r=await call('security_scan',{action:'secrets',path:'.'});if(!r.includes('unsafe.txt')||r.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'))throw new Error('secret scan did not redact');return r;});
await check('media inspect stub',async()=>call('media',{action:'inspect',input:'media.mp4'}));

await check('package_manager test/lint/build/typecheck',async()=>{const outs=[];for(const action of ['test','lint','build','typecheck'])outs.push(await call('package_manager',{action}));return outs.join('\n');});
await check('project_detect',async()=>call('project_detect',{}));
await check('vercel stub',async()=>call('vercel',{action:'build'}));
await check('netlify stub dry build',async()=>call('netlify',{action:'build_dry'}));
await check('supabase stub lint/functions',async()=>{const lint=await call('supabase',{action:'db_lint',scope:'local'});const functions=await call('supabase',{action:'functions_list',projectRef:'qa-123'});return lint+'\n'+functions;});
await check('resend stub domain/email',async()=>{const domains=await call('resend',{action:'domains_list'});const email=await call('resend',{action:'email_send',from:'BLACKCORE <hello@example.com>',to:['qa@example.com'],subject:'QA',text:'BLACKCORE QA'});return domains+'\n'+email;});
await check('expo stub',async()=>call('expo',{action:'doctor'}));
await check('eas stub',async()=>call('eas',{action:'whoami'}));
await check('gradle stub',async()=>call('gradle',{task:'assembleDebug'}));
await check('android_device stub',async()=>call('android_device',{action:'devices'}));
await check('postgres stub',async()=>{process.env.BLACKCORE_QA_DATABASE_URL='postgresql://blackcore:secret@localhost:5432/qa';try{return await call('postgres',{action:'ping',connectionEnv:'BLACKCORE_QA_DATABASE_URL'});}finally{delete process.env.BLACKCORE_QA_DATABASE_URL;}});
await check('ecosystem node test',async()=>call('ecosystem',{action:'test',ecosystem:'node'}));
await check('container detect/ps stub',async()=>{const d=await call('container',{action:'detect'}),p=await call('container',{action:'ps'});return d+'\n'+p;});
await check('system_info',async()=>call('system_info',{}));
await check('env_names+sensitive_path_check',async()=>{const e=await call('env_names',{});const s=await call('sensitive_path_check',{path:'.env'});if(!e.includes('SECRET'))throw new Error('env var name missing');return e+'\n'+s;});
await check('todo',async()=>{await call('todo',{action:'add',text:'qa task'});const l=await call('todo',{action:'list'});return l;});
await check('memory',async()=>{await call('memory',{action:'set',key:'framework',value:'vanilla'});return await call('memory',{action:'get',key:'framework'});});
await check('ollama graceful behavior',async()=>{const r=await ex.one({id:`c${++seq}`,type:'function',function:{name:'ollama',arguments:JSON.stringify({action:'list'})}},ctx);if(r.ok)return r.result;if(!/not installed|ERROR/i.test(r.result))throw new Error(r.result);return r.result;});
await check('verify full',async()=>call('verify',{level:'full',failFast:false}));
await check('deploy_preflight all with stubs',async()=>call('deploy_preflight',{target:'all'}));
await check('archive zip/unzip/tar',async()=>{await call('archive',{action:'zip',source:'src',destination:'src.zip'});const list=await call('archive',{action:'list_zip',source:'src.zip'});await call('archive',{action:'unzip',source:'src.zip',destination:'unz'});await call('archive',{action:'tar_gz',source:'src',destination:'src.tar.gz'});await call('archive',{action:'untar_gz',source:'src.tar.gz',destination:'untar'});return list;});
await check('file_hash',async()=>call('file_hash',{path:'hello.txt',algorithm:'sha256'}));
await check('agent_control status/mode/effort/model',async()=>{let x=await call('agent_control',{action:'status'});await call('agent_control',{action:'set_effort',value:'max'});await call('agent_control',{action:'set_mode',value:'PLAN'});return x;});
await check('tool_output paging/search',async()=>{const huge='BEGIN-'+('x'.repeat(70000))+'-NEEDLE-'+('y'.repeat(70000))+'-END';const id=agent.outputStore.put(huge,{tool:'qa'}).id;const s=await call('tool_output',{handle:id,action:'search',query:'NEEDLE'});const r=await call('tool_output',{handle:id,action:'read',offset:69900,limit:500});return s+'\n'+r;});

agent.close();
const failed=results.filter(x=>!x.ok);
console.log(JSON.stringify({root,total:results.length,passed:results.length-failed.length,failed:failed.length,results},null,2));
if(failed.length)process.exitCode=1;
