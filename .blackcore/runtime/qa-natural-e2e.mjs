import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG} from './src/config/defaults.js';
import {saveConfig,initConfig} from './src/config/loader.js';
import {BlackcoreApp} from './src/app.js';
import {applyNaturalIntent} from './src/natural/intent.js';

const base=fs.mkdtempSync(path.join(os.tmpdir(),'bc-natural-e2e-'));
const site=path.join(base,'site'); const cube=path.join(base,'cube'); fs.mkdirSync(site); fs.mkdirSync(cube);
const counts={site:0,cube:0}; const requestBodies=[];
const tc=(id,name,args)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});

const siteFiles={
'index.html':`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NovaForge Studio</title><link rel="stylesheet" href="styles.css"></head><body><header><a class="brand" href="#">NovaForge</a><button id="theme" aria-label="Alternar tema">◐</button></header><main><section class="hero"><p class="eyebrow">DIGITAL PRODUCT STUDIO</p><h1>Produtos digitais que parecem do futuro.</h1><p>Criamos sites e experiências rápidas, acessíveis e memoráveis.</p><a class="cta" href="#contato">Começar projeto</a></section><section class="grid" id="servicos"><article><h2>Sites</h2><p>Experiências responsivas de alta conversão.</p></article><article><h2>Apps</h2><p>Produtos mobile com UX consistente.</p></article><article><h2>IA</h2><p>Automação integrada ao seu produto.</p></article></section><section class="cases"><h2>Projetos selecionados</h2><div class="case">Orbit Commerce <span>+37% conversão</span></div><div class="case">Atlas AI <span>-42% tempo operacional</span></div></section><section id="contato" class="contact"><h2>Vamos construir algo forte?</h2><a class="cta" href="mailto:hello@example.com">hello@example.com</a></section></main><footer>© 2026 NovaForge Studio</footer><script type="module" src="app.js"></script></body></html>`,
'styles.css':`:root{--bg:#07080b;--fg:#f7f7f8;--muted:#9ca3af;--card:#11141a;--accent:#7c5cff}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.5}body.light{--bg:#f6f7fb;--fg:#12141a;--muted:#525866;--card:#fff}header,main,footer{width:min(1120px,calc(100% - 32px));margin:auto}header{display:flex;justify-content:space-between;align-items:center;padding:24px 0}.brand{color:inherit;text-decoration:none;font-weight:900;letter-spacing:.08em}button{background:var(--card);color:var(--fg);border:1px solid #ffffff22;border-radius:999px;padding:10px 14px}.hero{min-height:62vh;display:grid;align-content:center;gap:18px}.hero h1{font-size:clamp(3rem,8vw,7rem);line-height:.9;letter-spacing:-.06em;max-width:900px;margin:0}.eyebrow{color:var(--accent);font-weight:800}.cta{display:inline-block;width:max-content;background:var(--fg);color:var(--bg);padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:800}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.grid article,.case,.contact{background:var(--card);padding:28px;border-radius:22px}.cases{padding:96px 0;display:grid;gap:14px}.case{display:flex;justify-content:space-between}.case span{color:var(--accent)}.contact{margin-bottom:80px}footer{color:var(--muted);padding:32px 0}@media(max-width:720px){.grid{grid-template-columns:1fr}.hero{min-height:70vh}.case{display:grid;gap:8px}}`,
'app.js':`const root=document.body;const btn=document.querySelector('#theme');const saved=localStorage.getItem('theme');if(saved==='light')root.classList.add('light');btn?.addEventListener('click',()=>{root.classList.toggle('light');localStorage.setItem('theme',root.classList.contains('light')?'light':'dark')});console.log('__BROKEN__');`,
'package.json':JSON.stringify({name:'novaforge-site',type:'module',scripts:{test:'node check.mjs',lint:'node --check app.js',build:'node check.mjs'}},null,2),
'check.mjs':`import fs from 'node:fs';const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8'),js=fs.readFileSync('app.js','utf8');if(!html.includes('viewport')||!html.includes('servicos'))throw new Error('site incomplete');if(js.includes('__BROKEN__')){console.error('BUILD ERROR: debug marker __BROKEN__ found');process.exit(1)}if(!css.includes('@media'))throw new Error('responsive CSS missing');console.log('SITE_CHECK_OK');`,
'server.mjs':`import http from 'node:http';import fs from 'node:fs';import path from 'node:path';const types={'.html':'text/html','.css':'text/css','.js':'text/javascript'};http.createServer((req,res)=>{const p=req.url==='/'?'index.html':req.url.slice(1);try{const data=fs.readFileSync(p);res.setHeader('content-type',types[path.extname(p)]||'text/plain');res.end(data)}catch{res.statusCode=404;res.end('not found')}}).listen(4178,'127.0.0.1',()=>console.log('READY 4178'));`
};
const cubeFiles={
'index.html':`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLACKCORE Cube Lab</title><link rel="stylesheet" href="style.css"></head><body><main><h1>Cubo 3D</h1><p>Arraste com o dedo ou mouse.</p><div id="stage" class="stage" aria-label="Cubo 3D interativo"><div id="cube" class="cube"><div class="face front">★</div><div class="face back">●</div><div class="face right">◆</div><div class="face left">▲</div><div class="face top">■</div><div class="face bottom">♥</div></div></div><div class="actions"><button id="scramble">Girar</button><button id="reset">Resetar</button></div><output id="status">x=-24 y=34</output></main><script type="module" src="app.js"></script></body></html>`,
'style.css':`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#20284c,#090b13 60%);color:white;font-family:system-ui,sans-serif;overflow:hidden}main{text-align:center}.stage{width:min(76vw,380px);height:min(76vw,380px);display:grid;place-items:center;perspective:900px;touch-action:none;cursor:grab}.stage:active{cursor:grabbing}.cube{width:150px;height:150px;position:relative;transform-style:preserve-3d;transition:transform .12s ease-out}.face{position:absolute;inset:0;border:7px solid #10131d;border-radius:22px;display:grid;place-items:center;font-size:56px;font-weight:900;box-shadow:inset 0 0 30px #0005}.front{background:#ff3b4f;transform:translateZ(75px)}.back{background:#ff9f1c;transform:rotateY(180deg) translateZ(75px)}.right{background:#24c8ff;transform:rotateY(90deg) translateZ(75px)}.left{background:#7d5cff;transform:rotateY(-90deg) translateZ(75px)}.top{background:#36d17c;transform:rotateX(90deg) translateZ(75px)}.bottom{background:#ffe14a;color:#171717;transform:rotateX(-90deg) translateZ(75px)}.actions{display:flex;justify-content:center;gap:10px}button{border:0;border-radius:999px;padding:12px 18px;font-weight:800}output{display:block;margin-top:15px;color:#aeb7d4}@media(max-width:480px){.cube{width:120px;height:120px}.front{transform:translateZ(60px)}.back{transform:rotateY(180deg) translateZ(60px)}.right{transform:rotateY(90deg) translateZ(60px)}.left{transform:rotateY(-90deg) translateZ(60px)}.top{transform:rotateX(90deg) translateZ(60px)}.bottom{transform:rotateX(-90deg) translateZ(60px)}}`,
'cube-core.js':`export const INITIAL={x:-24,y:34};export function dragRotation(start,dx,dy){return{x:Math.max(-88,Math.min(88,start.x-dy*.45)),y:start.y+dx*.55}}export function randomRotation(rand=Math.random){return{x:-55+rand()*110,y:rand()*360}}export function transform(r){return\`rotateX(\${r.x.toFixed(1)}deg) rotateY(\${r.y.toFixed(1)}deg)\`}`,
'app.js':`import{INITIAL,dragRotation,randomRotation,transform}from'./cube-core.js';const stage=document.querySelector('#stage'),cube=document.querySelector('#cube'),status=document.querySelector('#status');let rot={...INITIAL},start=null;function render(){cube.style.transform=transform(rot);status.value=\`x=\${rot.x.toFixed(1)} y=\${rot.y.toFixed(1)}\`}stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);start={px:e.clientX,py:e.clientY,rot:{...rot}}});stage.addEventListener('pointermove',e=>{if(!start)return;rot=dragRotation(start.rot,e.clientX-start.px,e.clientY-start.py);render()});stage.addEventListener('pointerup',()=>start=null);stage.addEventListener('pointercancel',()=>start=null);document.querySelector('#scramble').addEventListener('click',()=>{rot=randomRotation();render()});document.querySelector('#reset').addEventListener('click',()=>{rot={...INITIAL};render()});render();`,
'package.json':JSON.stringify({name:'blackcore-cube',type:'module',scripts:{test:'node test-cube.mjs',lint:'node --check app.js && node --check cube-core.js',build:'node test-cube.mjs'}},null,2),
'test-cube.mjs':`import assert from 'node:assert/strict';import{INITIAL,dragRotation,randomRotation,transform}from'./cube-core.js';const moved=dragRotation(INITIAL,100,-50);assert.equal(moved.x,-1.5);assert.equal(moved.y,89);assert.match(transform(moved),/rotateX\\(-1\\.5deg\\) rotateY\\(89\\.0deg\\)/);const r=randomRotation(()=>.5);assert.deepEqual(r,{x:0,y:180});console.log('CUBE_INTERACTION_OK',transform(moved));`
};

function sse(res,obj){res.write(`data: ${JSON.stringify(obj)}\n\n`)}
function sendToolCalls(res,calls){res.writeHead(200,{'content-type':'text/event-stream'});sse(res,{choices:[{delta:{tool_calls:calls.map((t,i)=>({index:i,...t}))},finish_reason:'tool_calls'}],usage:{prompt_tokens:120,completion_tokens:20}});res.end('data: [DONE]\n\n');}
function sendText(res,text){res.writeHead(200,{'content-type':'text/event-stream'});for(const part of [text.slice(0,Math.ceil(text.length/2)),text.slice(Math.ceil(text.length/2))])sse(res,{choices:[{delta:{content:part},finish_reason:null}]});sse(res,{choices:[{delta:{},finish_reason:'stop'}],usage:{prompt_tokens:130,completion_tokens:30}});res.end('data: [DONE]\n\n');}
function allToolContents(messages){return messages.filter(m=>m.role==='tool').map(m=>m.content||'').join('\n');}

const server=http.createServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw||'{}');requestBodies.push(body);
  const user=[...body.messages].reverse().find(m=>m.role==='user'&&!String(m.content||'').startsWith('[FILE'))?.content||'';
  const task=/cubo|cube/i.test(user)?'cube':'site';const n=++counts[task], tools=allToolContents(body.messages);
  if(task==='site'){
    if(n===1)return sendToolCalls(res,Object.entries(siteFiles).map(([p,c],i)=>tc(`s_w${i}`,'write',{path:p,content:c})));
    if(n===2)return sendToolCalls(res,[tc('s_v1','verify',{level:'full',failFast:true})]);
    if(n===3){assert.match(tools,/BUILD ERROR|__BROKEN__/);return sendToolCalls(res,[tc('s_fix','edit',{path:'app.js',oldText:"console.log('__BROKEN__');",newText:"console.log('NovaForge ready');"})]);}
    if(n===4)return sendToolCalls(res,[tc('s_v2','verify',{level:'full',failFast:true})]);
    if(n===5){assert.match(tools,/SITE_CHECK_OK/);return sendToolCalls(res,[tc('s_proc','process_start',{command:'node server.mjs'})]);}
    if(n===6)return sendToolCalls(res,[tc('s_port','port_check',{host:'127.0.0.1',port:4178,waitMs:3000})]);
    return sendText(res,'Site completo criado, erro de build corrigido, testes/build aprovados e servidor local validado.');
  }
  if(n===1)return sendToolCalls(res,Object.entries(cubeFiles).map(([p,c],i)=>tc(`c_w${i}`,'write',{path:p,content:c})));
  if(n===2)return sendToolCalls(res,[tc('c_v','verify',{level:'full',failFast:true})]);
  if(n===3){assert.match(tools,/CUBE_INTERACTION_OK/);return sendToolCalls(res,[tc('c_map','repo_map',{})]);}
  return sendText(res,'Cubo 3D interativo criado e validado com teste de arrasto, rotação e reset.');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;

initConfig();const cfg=structuredClone(DEFAULT_CONFIG);cfg.permissionProfile='yolo';cfg.confirmDangerous=false;cfg.animation=false;cfg.stream=true;cfg.autoRoute=false;cfg.autoFallback=false;cfg.provider='deepseek';cfg.model='deepseek-v4-flash';cfg.providers.deepseek={...cfg.providers.deepseek,baseUrl:`http://127.0.0.1:${port}`,apiKey:'qa-local-key'};saveConfig(cfg);

async function runNatural(cwd,text){const app=await BlackcoreApp.create(cwd);app.input.confirm=async()=>true;try{const intent=await applyNaturalIntent(app,text);assert.equal(intent.handled,false,'task should flow to model');const result=await app.agent.prompt(intent.text||text,{quiet:true});return {result,stats:app.agent.stats(),session:app.session.info()};}finally{await app.close();}}

const siteRun=await runNatural(site,'Cria um site completo profissional nessa pasta, testa tudo, corrige qualquer erro sozinho e deixa funcionando. Não quero ficar dando comando.');
assert.match(siteRun.result,/Site completo/);for(const f of Object.keys(siteFiles))assert.ok(fs.existsSync(path.join(site,f)),`site missing ${f}`);assert.ok(!fs.readFileSync(path.join(site,'app.js'),'utf8').includes('__BROKEN__'));const siteTest=await import('node:child_process').then(({execFileSync})=>execFileSync('npm',['test'],{cwd:site,encoding:'utf8'}));assert.match(siteTest,/SITE_CHECK_OK/);

const cubeRun=await runNatural(cube,'Cria um cubo 3D colorido, tipo brinquedo de criança, que eu consiga mexer para um lado e para o outro com dedo ou mouse. Faz tudo e testa a interação.');
assert.match(cubeRun.result,/Cubo 3D/);for(const f of Object.keys(cubeFiles))assert.ok(fs.existsSync(path.join(cube,f)),`cube missing ${f}`);const cubeTest=await import('node:child_process').then(({execFileSync})=>execFileSync('npm',['test'],{cwd:cube,encoding:'utf8'}));assert.match(cubeTest,/CUBE_INTERACTION_OK/);

// Confirm DeepSeek-compatible body includes tools + thinking and natural prompts reached provider.
assert.ok(requestBodies.length>=10);assert.ok(requestBodies.some(b=>b.thinking?.type==='enabled'));assert.ok(requestBodies.some(b=>Array.isArray(b.tools)&&b.tools.length>20));

server.close();
console.log(JSON.stringify({base,site:{...siteRun,test:siteTest.trim(),files:fs.readdirSync(site)},cube:{...cubeRun,test:cubeTest.trim(),files:fs.readdirSync(cube)},providerRequests:requestBodies.length,siteTurns:counts.site,cubeTurns:counts.cube},null,2));
