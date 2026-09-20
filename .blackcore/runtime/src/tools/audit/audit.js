import fs from "node:fs/promises";
import {createReadStream} from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import {defineTool} from "../registry.js";
import {readable,writable,capture} from "../fs/common.js";
import {walk,readText,writeTextAtomic} from "../../utils/fs.js";
import {detectProject} from "../../context/project/index.js";
import {inspectGitReview} from "../git/review.js";
import {redactSecrets,isSensitivePath} from "../../security/secrets.js";
import {execCapture,which} from "../../utils/exec.js";
import {VERSION} from "../../config/defaults.js";

const CODE_EXT=new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".py",".go",".rs",".java",".kt",".dart",".php",".rb",".swift",".c",".cc",".cpp",".h",".hpp",".cs",".sh",".sql",".css",".html",".vue",".svelte"]);
const DOC_NAMES=/^(?:readme|security|contributing|changelog|roadmap|license)(?:\.|$)/i;
const TEST_PATH=/(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|$)|(?:\.test|\.spec)\.[^.]+$/i;
const FIXTURE_PATH=/(?:^|\/)(?:test|tests|__tests__|spec|fixtures?)(?:\/|$)|(?:^|\/)qa-[^/]+\.(?:[cm]?js|ts)$|(?:\.test|\.spec)\.[^.]+$/i;
const CI_PATH=/(?:^|\/)\.github\/workflows\/|(?:^|\/)(?:\.gitlab-ci\.yml|Jenkinsfile|azure-pipelines\.yml)$/i;
const LOCKFILES=new Set(["package-lock.json","npm-shrinkwrap.json","pnpm-lock.yaml","yarn.lock","bun.lock","bun.lockb","Cargo.lock","poetry.lock","Pipfile.lock","composer.lock","pubspec.lock","go.sum","gradle.lockfile"]);
const SECRET_PATTERNS=[
  {type:"chave OpenAI",re:/\bsk-[A-Za-z0-9_-]{16,}\b/g},
  {type:"token GitHub",re:/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g},
  {type:"chave privada",re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
  {type:"atribuição de credencial",re:/(?:api[_-]?key|access[_-]?token|secret|password|passwd)\s*[:=]\s*["']?[A-Za-z0-9_\-\/+\=.]{12,}/ig}
];
const REVIEW_SIGNALS=[
  {name:"execução dinâmica de código",re:/\b(?:eval\s*\(|new\s+Function\s*\()/g},
  {name:"execução de processo",re:/\b(?:child_process|execSync\s*\(|spawnSync\s*\(|execFileSync\s*\()/g},
  {name:"TODO/FIXME pendente",re:/\b(?:TODO|FIXME|HACK)\b/g},
  {name:"sink HTML inseguro",re:/\b(?:innerHTML|dangerouslySetInnerHTML)\b/g}
];
const SEVERITY={p0:{label:"P0 · CRÍTICA",weight:25,rank:0},p1:{label:"P1 · ALTA",weight:12,rank:1},p2:{label:"P2 · MÉDIA",weight:6,rank:2},p3:{label:"P3 · BAIXA",weight:2,rank:3},info:{label:"INFO",weight:0,rank:4}};

function clean(value,max=4000){return redactSecrets(String(value??"").replace(/\r/g,"").trim()).slice(0,max);}
function slug(value="audit"){return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"audit";}
function md(value=""){return clean(value).replace(/\|/g,"\\|").replace(/\n+/g," ");}
function code(value=""){return `\`${String(value??"").replace(/`/g,"'")}\``;}
function severity(value="p2"){
  const key=String(value).toLowerCase().replace(/[^a-z0-9]/g,"");
  return ({critical:"p0",critica:"p0",p0:"p0",high:"p1",alta:"p1",p1:"p1",medium:"p2",moderate:"p2",media:"p2",p2:"p2",low:"p3",baixa:"p3",p3:"p3",info:"info"})[key]||"p2";
}
function shortNumber(n=0){return n>=1e6?`${(n/1e6).toFixed(1)} MB`:n>=1e3?`${(n/1e3).toFixed(1)} KB`:`${n} B`;}
function quoteArg(value){const s=String(value);return /^[A-Za-z0-9_./:@%+=,-]+$/.test(s)?s:JSON.stringify(s);}
function commandText(command,args=[]){return [command,...args].map(quoteArg).join(" ");}
function lastUsefulLine(text=""){return clean(text,20000).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).at(-1)||"";}
function normalizePath(root,file){const rel=path.relative(root,file).replace(/\\/g,"/");return rel||path.basename(file);}

async function fileHash(file){
  return await new Promise((resolve,reject)=>{const hash=crypto.createHash("sha256"),stream=createReadStream(file);stream.on("data",chunk=>hash.update(chunk));stream.on("error",reject);stream.on("end",()=>resolve(hash.digest("hex")));});
}

async function inventory(target,{maxFiles=12000,maxReadBytes=1_000_000}={}){
  const st=await fs.stat(target),root=st.isDirectory()?target:path.dirname(target),files=st.isDirectory()?await walk(target,{maxFiles,ignorePatterns:[".blackcore/artifacts/**"]}):[target];
  let bytes=0,codeFiles=0,codeLines=0,testFiles=0,docFiles=0,ciFiles=0;const extensions=new Map(),largest=[],sensitive=[],lockfiles=[],npmProjects=[],signals=new Map();
  for(const file of files){
    let stat;try{stat=await fs.stat(file);}catch{continue;}bytes+=stat.size;const rel=normalizePath(root,file),ext=path.extname(file).toLowerCase()||"[none]";extensions.set(ext,(extensions.get(ext)||0)+1);largest.push({path:rel,bytes:stat.size});
    if(TEST_PATH.test(rel))testFiles++;if(DOC_NAMES.test(path.basename(rel)))docFiles++;if(CI_PATH.test(rel))ciFiles++;if(LOCKFILES.has(path.basename(rel)))lockfiles.push(rel);if(path.basename(rel)==="package.json")npmProjects.push(path.dirname(file));if(isSensitivePath(file)&&!/(?:example|sample|template)/i.test(path.basename(file)))sensitive.push(rel);
    if(!CODE_EXT.has(ext))continue;codeFiles++;let text;try{text=await readText(file,maxReadBytes);}catch{continue;}codeLines+=text.split(/\r?\n/).length;
    for(const signal of REVIEW_SIGNALS){const matches=[...text.matchAll(signal.re)];signal.re.lastIndex=0;if(!matches.length)continue;const row=signals.get(signal.name)||{name:signal.name,count:0,locations:[]};row.count+=matches.length;for(const match of matches.slice(0,3)){const line=text.slice(0,match.index).split(/\r?\n/).length;row.locations.push(`${rel}:${line}`);}signals.set(signal.name,row);}
  }
  largest.sort((a,b)=>b.bytes-a.bytes);const extensionRows=[...extensions].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([extension,count])=>({extension,count}));
  const fingerprint=crypto.createHash("sha256").update(files.map(file=>normalizePath(root,file)).sort().join("\n")+`\n${bytes}`).digest("hex");
  return {target,root,singleFile:st.isFile(),files:files.length,truncated:files.length>=maxFiles,bytes,codeFiles,codeLines,testFiles,docFiles,ciFiles,lockfiles:[...new Set(lockfiles)],npmProjects:[...new Set(npmProjects)].slice(0,12),extensions:extensionRows,largest:largest.slice(0,8),sensitive:[...new Set(sensitive)].slice(0,40),signals:[...signals.values()],fingerprint,artifactSha256:st.isFile()?await fileHash(target):null};
}

async function scanSecrets(inv,{maxReadBytes=1_000_000,limit=300}={}){
  const files=inv.singleFile?[inv.target]:await walk(inv.target,{maxFiles:Math.max(inv.files,1),ignorePatterns:[".blackcore/artifacts/**"]}),out=[];
  for(const file of files){let text;try{text=await readText(file,maxReadBytes);}catch{continue;}const relative=normalizePath(inv.root,file),fixture=FIXTURE_PATH.test(relative);for(const pattern of SECRET_PATTERNS){for(const match of text.matchAll(pattern.re)){if(pattern.type==="atribuição de credencial"&&CODE_EXT.has(path.extname(file).toLowerCase())&&!/[:=]\s*["']/.test(match[0]))continue;out.push({type:pattern.type,path:relative,line:text.slice(0,match.index).split(/\r?\n/).length,fixture});if(out.length>=limit)return out;}pattern.re.lastIndex=0;}}
  return out;
}

async function authorizedExec(ctx,cwd,command,args,{timeoutMs=600000,maxChars=80000,shell=false}={}){
  const shown=shell?String(args[1]||args.at(-1)||command):commandText(command,args),auth=await ctx.security.authorizeShell(shown,ctx);if(!auth.allow)return {command:shown,ok:false,skipped:true,exitCode:null,durationMs:0,summary:auth.reason||"blocked by policy",output:""};
  const started=Date.now();try{const r=await execCapture(command,args,{cwd,signal:ctx.signal,timeoutMs,maxChars});return {command:shown,ok:r.code===0,exitCode:r.code,durationMs:Date.now()-started,summary:lastUsefulLine(r.stdout)||lastUsefulLine(r.stderr)||(r.code===0?"completed":"failed"),output:clean(r.combined,80000),stdout:clean(r.stdout,2_000_000),stderr:clean(r.stderr,80000)};}catch(e){return {command:shown,ok:false,exitCode:null,durationMs:Date.now()-started,summary:clean(e.message||e),output:"",stdout:"",stderr:""};}
}

async function verificationGates(ctx,root,project,level="none"){
  if(level==="none")return [];
  let commands=[...(project.verification||[])];if(level==="safe")commands=commands.filter(x=>/\b(?:lint|typecheck|check|test|fmt|vet)\b/i.test(x));commands=[...new Set(commands)].slice(0,12);
  const gates=[];for(const command of commands)gates.push(await authorizedExec(ctx,root,process.env.SHELL||"sh",["-c",command],{shell:true,timeoutMs:600000,maxChars:100000}));return gates;
}

function parseNpmAudit(raw=""){
  try{const data=JSON.parse(raw),v=data.metadata?.vulnerabilities||{};return {ok:true,vulnerabilities:{info:v.info||0,low:v.low||0,moderate:v.moderate||0,high:v.high||0,critical:v.critical||0,total:v.total||0}};}catch{return {ok:false,vulnerabilities:null};}
}

async function dependencyGate(ctx,root,label="."){
  const packageFile=path.join(root,"package.json");try{await fs.access(packageFile);}catch{return {status:"skipped",reason:"package.json not found",audit:null,gate:null};}
  if(!(await which("npm")))return {status:"skipped",reason:"npm not installed",audit:null,gate:null};
  const gate=await authorizedExec(ctx,root,"npm",["audit","--omit=dev","--json"],{timeoutMs:600000,maxChars:2_000_000}),parsed=parseNpmAudit(gate.stdout);
  return {path:label,status:parsed.ok?"completed":"failed",reason:parsed.ok?"":"npm audit did not return valid JSON",audit:parsed.vulnerabilities,gate:{...gate,command:`${label}: ${gate.command}`,ok:parsed.ok&&(parsed.vulnerabilities?.total||0)===0,summary:parsed.ok?`${parsed.vulnerabilities.total} known vulnerabilities`:gate.summary}};
}

async function dependencyGates(ctx,inv){
  if(!inv.npmProjects.length)return {status:"skipped",reason:"package.json not found",audit:null,gates:[],projects:[]};
  const projects=[];for(const root of inv.npmProjects){const relative=path.relative(inv.root,root).replace(/\\/g,"/"),label=relative||"root";projects.push(await dependencyGate(ctx,root,label));}
  const audits=projects.filter(x=>x.audit),keys=["info","low","moderate","high","critical","total"],audit=audits.length?Object.fromEntries(keys.map(key=>[key,audits.reduce((sum,x)=>sum+(x.audit[key]||0),0)])):null;
  return {status:audits.length===projects.length?"completed":audits.length?"partial":"failed",reason:projects.filter(x=>!x.audit).map(x=>`${x.path}: ${x.reason}`).join("; "),audit,gates:projects.map(x=>x.gate).filter(Boolean),projects};
}

function sessionWorklog(session){
  if(!session?.activePath)return {available:false,requests:0,responses:0,toolCalls:[],usage:{}};const entries=session.activePath(),counts=new Map();let requests=0,responses=0,results=0,errors=0;
  for(const entry of entries){if(entry.type!=="message")continue;if(entry.role==="user"&&!String(entry.content||"").startsWith("[BLACKCORE COMPACTED CONTEXT]"))requests++;if(entry.role==="assistant"){responses++;for(const call of entry.tool_calls||[]){const name=call.function?.name||"tool",row=counts.get(name)||{name,calls:0};row.calls++;counts.set(name,row);}}if(entry.role==="tool"){results++;if(/^\s*(?:ERROR|BLOCKED|UNAVAILABLE):/i.test(String(entry.content||"")))errors++;}}
  return {available:true,requests,responses,results,errors,toolCalls:[...counts.values()].sort((a,b)=>b.calls-a.calls||a.name.localeCompare(b.name)),usage:session.usageTotals?.()||{}};
}

function normalizeFinding(item,index){
  const sev=severity(item.severity),references=(item.references||[]).map(ref=>typeof ref==="string"?{path:clean(ref,500),line:null,note:""}:{path:clean(ref.path,500),line:Number.isInteger(ref.line)?ref.line:null,note:clean(ref.note,1000)}).filter(x=>x.path);
  return {id:item.id||`F-${String(index+1).padStart(2,"0")}`,severity:sev,category:clean(item.category||"General",100),title:clean(item.title||"Finding",300),summary:clean(item.summary||item.evidence||"",6000),impact:clean(item.impact||"",4000),recommendation:clean(item.recommendation||"",5000),confidence:clean(item.confidence||"confirmed",40),references};
}
function confidenceLabel(value){return ({confirmed:"confirmado",likely:"provável","manual-review":"revisão manual"})[value]||value;}

function automatedFindings({secretFindings,dependency,verification,inv,project}){
  const out=[],productionSecrets=secretFindings.filter(x=>!x.fixture),fixtureSecrets=secretFindings.filter(x=>x.fixture);
  if(productionSecrets.length)out.push({severity:"p1",category:"Segredos",title:`${productionSecrets.length} padrão(ões) de possível segredo fora de fixtures exigem revisão`,summary:"Somente as localizações foram registradas; os valores encontrados foram redigidos e não aparecem neste relatório.",impact:"Uma credencial real versionada pode expor contas ou infraestrutura externa.",recommendation:"Confirme cada localização, revogue qualquer credencial real, remova-a do histórico e mantenha uma varredura de regressão.",confidence:"manual-review",references:productionSecrets.slice(0,20).map(x=>({path:x.path,line:x.line,note:x.type}))});
  if(fixtureSecrets.length)out.push({severity:"p2",category:"Segredos em testes",title:`${fixtureSecrets.length} padrão(ões) de possível segredo estão restritos a testes/fixtures`,summary:"Os candidatos aparecem somente em testes, QA ou fixtures. Isso reduz a probabilidade de exposição operacional, mas não prova que os valores sejam fictícios; todos permanecem redigidos.",impact:"Fixtures com formato real podem gerar falso positivo e, se alguém inserir uma credencial verdadeira em teste, ainda podem vazar.",recommendation:"Confirme que todos são valores sintéticos e mantenha os exemplos claramente marcados como fixtures.",confidence:"manual-review",references:fixtureSecrets.slice(0,20).map(x=>({path:x.path,line:x.line,note:`${x.type} · fixture`}))});
  const v=dependency.audit,affected=(dependency.projects||[]).filter(x=>x.audit?.total).map(x=>`${x.path}: ${x.audit.total}`).join(", "),depSummary=`O npm audit encontrou ${v?.total||0} vulnerabilidades conhecidas nos grafos de produção${affected?` (${affected})`:""}.`;if(v?.critical)out.push({severity:"p0",category:"Dependências",title:`${v.critical} vulnerabilidade(s) crítica(s) em dependências`,summary:depSummary,impact:"Avisos críticos podem permitir comprometimento, conforme a alcançabilidade do código.",recommendation:"Revise as cadeias dos avisos, atualize de forma compatível e repita testes e auditoria."});
  if(v?.high)out.push({severity:"p1",category:"Dependências",title:`${v.high} vulnerabilidade(s) alta(s) em dependências`,summary:depSummary,impact:"Pacotes diretos ou transitivos com severidade alta reduzem a confiança da entrega.",recommendation:"Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade."});
  if(v?.moderate)out.push({severity:"p2",category:"Dependências",title:`${v.moderate} vulnerabilidade(s) moderada(s) em dependências`,summary:depSummary,impact:"Avisos moderados exigem revisão de alcançabilidade e compatibilidade.",recommendation:"Planeje uma atualização controlada e mantenha o lockfile monitorado."});
  if(v?.low)out.push({severity:"p3",category:"Dependências",title:`${v.low} vulnerabilidade(s) baixa(s) em dependências`,summary:depSummary,recommendation:"Atualize durante a manutenção normal das dependências."});
  const failed=verification.filter(x=>!x.ok&&!x.skipped);if(failed.length)out.push({severity:"p1",category:"Verificação",title:`${failed.length} gate(s) de verificação falharam`,summary:failed.map(x=>`${x.command}: ${x.summary}`).join("\n"),impact:"Uma entrega com checks declarados falhando não está reproduzivelmente verde.",recommendation:"Corrija a primeira causa, repita o check restrito e depois a auditoria completa."});
  if(!inv.testFiles&&!project.ecosystems.some(x=>Object.keys(x.scripts||{}).some(k=>/test/i.test(k))))out.push({severity:"p2",category:"Qualidade",title:"Nenhuma superfície de teste automatizado foi detectada",summary:"Não foram encontrados arquivos de teste convencionais nem script de teste declarado.",impact:"Regressões podem chegar aos usuários sem um gate executável.",recommendation:"Adicione uma suíte pequena e determinística para o comportamento central e execute-a no CI."});
  if(project.primary==="node"&&!inv.lockfiles.some(file=>/^(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/i.test(path.basename(file))))out.push({severity:"p2",category:"Cadeia de suprimentos",title:"Manifesto Node detectado sem lockfile",summary:"A resolução de dependências pode variar entre máquinas e datas.",impact:"A reprodutibilidade do build e a correlação da auditoria ficam mais fracas.",recommendation:"Versione o lockfile do gerenciador e use instalações congeladas/limpas no CI."});
  return out;
}

function scores(findings,inv,project,gates,dependency){
  const penalty=findings.reduce((sum,f)=>sum+(SEVERITY[f.severity]?.weight||0),0),security=Math.max(0,100-penalty),ran=gates.length,passed=gates.filter(x=>x.ok).length,quality=ran?Math.round(45+50*(passed/ran)):inv.testFiles?78:62;
  let maintainability=55;if(inv.docFiles)maintainability+=12;if(inv.testFiles)maintainability+=15;if(inv.ciFiles)maintainability+=10;if(project.primary!=="unknown")maintainability+=8;maintainability=Math.min(100,maintainability);
  let readiness=55;if(ran&&passed===ran)readiness+=25;if(dependency.audit?.total===0)readiness+=10;if(inv.ciFiles)readiness+=10;if(findings.some(x=>x.severity==="p0"))readiness=Math.min(readiness,35);else if(findings.some(x=>x.severity==="p1"))readiness=Math.min(readiness,60);readiness=Math.min(100,readiness);
  const overall=Math.round(security*.35+quality*.25+maintainability*.2+readiness*.2);return {overall,security,quality,maintainability,readiness};
}

function verdict(findings,gates){
  if(findings.some(x=>x.severity==="p0"))return {icon:"🔴",label:"NÃO APROVADA",detail:"Há achado crítico confirmado ou que exige contenção imediata."};
  if(findings.some(x=>x.severity==="p1")||gates.some(x=>!x.ok&&!x.skipped))return {icon:"🟠",label:"PILOTO CONTROLADO",detail:"Não publicar amplamente antes de corrigir os achados altos e deixar os gates verdes."};
  if(findings.some(x=>x.severity==="p2"))return {icon:"🟡",label:"APROVADA COM RESSALVAS",detail:"O uso é viável, com correções médias registradas e limites explícitos."};
  return {icon:"🟢",label:"APROVADA",detail:"Nenhum bloqueador foi encontrado nos checks executados; os limites declarados continuam válidos."};
}

function renderReport(data,a){
  const {inv,project,git,secretFindings,dependency,gates,worklog,findings,score,result}=data,date=new Date().toISOString(),baseTitle=a.title||`Auditoria completa — ${a.artifactName||path.basename(inv.target)}`,title=a.author?`${baseTitle} · responsável: ${clean(a.author,200)}`:baseTitle;
  const gateRows=[...gates,...(dependency.gates||[])];
  const refs=[];for(const finding of findings)for(const ref of finding.references){const id=`R${refs.length+1}`;refs.push({id,...ref});ref.id=id;}
  const scopeHash=inv.artifactSha256||inv.fingerprint,ecosystems=project.ecosystems.map(x=>[x.ecosystem,...(x.frameworks||[])].join("/")).join(", ")||"unknown";
  const extensionTable=inv.extensions.length?inv.extensions.map(x=>`| ${code(x.extension)} | ${x.count} |`).join("\n"):"| — | 0 |";
  let gateTable=gateRows.length?gateRows.map(x=>`| ${md(x.command)} | ${x.skipped?"⏭ SKIP":x.ok?"✅ PASS":"❌ FAIL"} | ${x.durationMs?`${x.durationMs} ms`:"—"} | ${md(x.summary||"")} |`).join("\n"):"| Coleta estática | ✅ PASS | — | Nenhum comando dinâmico solicitado |";
  gateTable+=git.ok?`\n| Estado Git (${md(git.branch)}) | ${git.checkOk?"✅ PASS":"❌ FAIL"} | — | ${git.files.length} alterado(s), ${git.untracked.length} não rastreado(s), +${git.added}/-${git.removed} |`:`\n| Estado Git | ⏭ SKIP | — | ${md(git.reason||"repositório indisponível")} |`;
  if(a.products?.length)gateTable+=`\n\n### Notas por produto/componente\n\n| Produto/componente | Nota | Estado | Evidência | Limitação principal |\n| --- | ---: | --- | --- | --- |\n${a.products.map(p=>`| ${md(p.name)} | **${Number(p.score).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}/10** | ${md(p.status||"avaliado")} | ${md(p.evidence||"")} | ${md(p.limitation||"")} |`).join("\n")}`;
  const findingIndex=findings.length?findings.map(f=>`| ${f.id} | **${SEVERITY[f.severity].label}** | ${md(f.category)} | ${md(f.title)} | ${md(confidenceLabel(f.confidence))} |`).join("\n"):"| — | INFO | — | Nenhum achado automático ou adicional | — |";
  const findingSections=findings.length?findings.map(f=>`### ${f.id} — ${SEVERITY[f.severity].label}: ${f.title}\n\n**Categoria:** ${f.category}  \n**Confiança:** ${confidenceLabel(f.confidence)}\n\n${f.summary||"Sem resumo adicional."}${f.impact?`\n\n**Impacto**\n\n${f.impact}`:""}${f.recommendation?`\n\n**Correção recomendada**\n\n${f.recommendation}`:""}${f.references.length?`\n\n**Evidências:** ${f.references.map(r=>`[${r.id}]`).join(", ")}`:""}`).join("\n\n"):"Nenhum achado foi registrado nos checks executados.";
  const positives=[],dynamicGates=[...gates,...(dependency.gates||[])];if(dynamicGates.length&&dynamicGates.every(x=>x.ok))positives.push("Todos os gates dinâmicos executados passaram.");if(dependency.audit?.total===0)positives.push("O audit de dependências de produção retornou zero vulnerabilidades conhecidas.");if(!secretFindings.length)positives.push("A varredura local não encontrou padrões de segredo nos arquivos legíveis.");if(inv.testFiles)positives.push(`${inv.testFiles} arquivo(s) de teste foram detectados.`);if(inv.ciFiles)positives.push(`${inv.ciFiles} arquivo(s) de integração contínua foram detectados.`);if(inv.docFiles)positives.push(`${inv.docFiles} documento(s) principal(is) de projeto foram detectados.`);if(!positives.length)positives.push("O inventário foi concluído e os limites da análise foram registrados.");
  const signalRows=inv.signals.length?inv.signals.map(x=>`| ${md(x.name)} | ${x.count} | ${md(x.locations.slice(0,5).join(", "))} |`).join("\n"):"| Nenhum sinal heurístico | 0 | — |";
  const tools=worklog.toolCalls.length?worklog.toolCalls.map(x=>`| ${code(x.name)} | ${x.calls} |`).join("\n"):"| — | 0 |";
  const limitations=[...(a.limitations||[]).map(x=>clean(x)),...(inv.truncated?[`O inventário atingiu o limite de ${inv.files} arquivos; parte do escopo pode não ter sido lida.`]:[]),...(a.verification==="none"?["Os testes/builds declarados não foram executados nesta auditoria."]:[]),...(!dependency.audit?[`O audit automatizado de dependências não produziu dados utilizáveis: ${dependency.reason||"não solicitado"}.`]:[]),"A análise automatizada e assistida não é certificação formal, pentest externo nem prova de exploração.","Serviços pagos, contas remotas, dispositivos físicos e produção só são comprovados quando executados explicitamente e registrados como gate."];
  return `# ${title}\n\n> **BLACKCORE AUDIT REPORT · v${VERSION}**  \n> Gerado em ${date} · evidências sensíveis redigidas\n\n| Resultado | Nota geral | Escopo | Impressão SHA-256 |\n| --- | ---: | --- | --- |\n| ${result.icon} **${result.label}** | **${score.overall}/100** | ${md(ecosystems)} | ${code(scopeHash.slice(0,16)+"…")} |\n\n> [!IMPORTANT]\n> ${result.detail}\n\n## 1. Resumo executivo\n\nForam inventariados **${inv.files} arquivos** (${shortNumber(inv.bytes)}), incluindo **${inv.codeFiles} arquivos de código** e aproximadamente **${inv.codeLines.toLocaleString("pt-BR")} linhas legíveis**. A auditoria registrou **${findings.length} achados**, executou **${gateRows.length} gates** e preservou apenas localizações de possíveis segredos — nunca os valores encontrados.\n\n| Dimensão | Nota | Leitura |\n| --- | ---: | --- |\n| Segurança | ${score.security}/100 | Achados ponderados por P0–P3 |\n| Qualidade verificável | ${score.quality}/100 | Testes, lint, typecheck e build executados |\n| Manutenibilidade | ${score.maintainability}/100 | Documentação, testes, CI e estrutura |\n| Prontidão de entrega | ${score.readiness}/100 | Gates, dependências e bloqueadores |\n\n## 2. Escopo, método e preservação\n\n- **Alvo:** ${code(inv.target)}\n- **Tipo:** ${inv.singleFile?"arquivo único":"diretório/projeto"}\n- **Ecossistema primário:** ${code(project.primary)}\n- **Ecossistemas/frameworks:** ${md(ecosystems)}\n- **Método:** inventário, leitura estática limitada, padrões de segredo redigidos, estado Git, dependências, gates selecionados e achados adicionais com referências.\n- **Preservação:** o gerador não edita o código auditado. Comandos de verificação podem criar caches ou artefatos normais do próprio projeto; isso é indicado pelos gates.\n\n| Extensão | Arquivos |\n| --- | ---: |\n${extensionTable}\n\n## 3. Evidência e gates executados\n\n| Gate/comando | Estado | Tempo | Evidência resumida |\n| --- | --- | ---: | --- |\n${gateTable}\n\n${dependency.audit?`**Dependências npm:** ${dependency.audit.total} total · ${dependency.audit.critical} críticas · ${dependency.audit.high} altas · ${dependency.audit.moderate} moderadas · ${dependency.audit.low} baixas.`:"**Dependências:** sem resultado automatizado conclusivo."}\n\n## 4. Índice de achados\n\n| ID | Prioridade | Categoria | Achado | Confiança |\n| --- | --- | --- | --- | --- |\n${findingIndex}\n\n## 5. Achados detalhados\n\n${findingSections}\n\n## 6. Sinais para revisão manual\n\nEstes sinais **não são vulnerabilidades por si só**. Eles priorizam pontos que merecem leitura humana.\n\n| Sinal | Ocorrências | Primeiras localizações |\n| --- | ---: | --- |\n${signalRows}\n\n## 7. Pontos positivos confirmados\n\n${positives.map(x=>`- ${x}`).join("\n")}\n\n## 8. Histórico auditável desta sessão\n\n| Métrica | Valor |\n| --- | ---: |\n| Pedidos do usuário | ${worklog.requests} |\n| Respostas do agente | ${worklog.responses} |\n| Resultados de ferramentas | ${worklog.results} |\n| Resultados com erro/bloqueio | ${worklog.errors} |\n| Tokens registrados | ${worklog.usage?.total||0} |\n\n| Ferramenta | Chamadas |\n| --- | ---: |\n${tools}\n\n## 9. Limitações e itens não comprovados\n\n${[...new Set(limitations.filter(Boolean))].map(x=>`- ${x}`).join("\n")}\n\n## 10. Ordem recomendada de correção\n\n${findings.length?findings.slice().sort((a,b)=>SEVERITY[a.severity].rank-SEVERITY[b.severity].rank).map((f,i)=>`${i+1}. **${f.id} · ${SEVERITY[f.severity].label}:** ${f.recommendation||f.title}`).join("\n"):"1. Manter os gates automatizados e repetir a auditoria antes da próxima release."}\n\n## 11. Referências de evidência\n\n${refs.length?refs.map(r=>`[${r.id}]: ${code(r.path)}${r.line?` linha ${r.line}`:""}${r.note?` — ${md(r.note)}`:""}`).join("\n"):"Nenhuma referência de arquivo adicional foi registrada."}\n\n---\n\n**Veredito:** ${result.icon} **${result.label}** · **${score.overall}/100**  \n**Relatório:** gerado pelo BLACKCORE Native ${VERSION}; valores sensíveis foram redigidos.\n`;
}

export function resolveAuditOutput({cwd,target,output=null,destination="workspace",env=process.env,home=os.homedir(),downloadsExists=false}={}){
  if(output)return path.resolve(cwd,output);const name=`AUDITORIA-${slug(path.basename(target||cwd))}-${new Date().toISOString().slice(0,10)}.md`;
  if(destination==="downloads"&&downloadsExists){const root=env.TERMUX_VERSION||String(env.PREFIX||"").includes("com.termux")?path.join(home,"storage","downloads"):path.join(home,"Downloads");return path.join(root,name);}
  return path.join(cwd,"reports",name);
}

export async function buildAudit(a,ctx){
  const target=await readable(ctx,a.target||"."),inv=await inventory(target,{maxFiles:a.maxFiles||12000}),project=detectProject(inv.root),secretFindings=await scanSecrets(inv),git=await inspectGitReview(inv.root,{scope:"all",maxPatchChars:0}),verification=a.verification||((a.depth||"standard")==="full"?"full":(a.depth||"standard")==="quick"?"none":"safe"),gates=await verificationGates(ctx,inv.root,project,verification);
  const dependency=a.dependencyAudit===false?{status:"skipped",reason:"disabled by request",audit:null,gates:[],projects:[]}:await dependencyGates(ctx,inv),worklog=a.includeSession===false?{available:false,requests:0,responses:0,results:0,errors:0,toolCalls:[],usage:{}}:sessionWorklog(ctx.session);
  const raw=[...automatedFindings({secretFindings,dependency,verification:gates,inv,project}),...(a.findings||[])],findings=raw.map(normalizeFinding).sort((x,y)=>SEVERITY[x.severity].rank-SEVERITY[y.severity].rank),score=scores(findings,inv,project,gates,dependency),result=verdict(findings,gates);
  return {inv,project,git,secretFindings,dependency,gates,worklog,findings,score,result,verification};
}

export const auditReportTool=defineTool({
  name:"audit_report",description:"Run an evidence-backed project/artifact audit and create a polished downloadable Markdown report. Inventories files, redacts secret matches, checks root and nested npm dependency graphs, optionally runs declared verification, includes Git/session evidence, scores readiness, adds per-product ratings, records P0-P3 findings and honest limitations. For archives, extract a preserved copy first and audit that directory.",mutates:true,
  parameters:{type:"object",properties:{target:{type:"string"},output:{type:"string"},destination:{type:"string",enum:["workspace","downloads"]},title:{type:"string",maxLength:300},artifactName:{type:"string",maxLength:300},author:{type:"string",maxLength:200},language:{type:"string",maxLength:30},depth:{type:"string",enum:["quick","standard","full"]},verification:{type:"string",enum:["none","safe","full"]},dependencyAudit:{type:"boolean"},includeSession:{type:"boolean"},maxFiles:{type:"integer",minimum:10,maximum:50000},limitations:{type:"array",maxItems:40,items:{type:"string",maxLength:2000}},products:{type:"array",maxItems:30,items:{type:"object",properties:{name:{type:"string",maxLength:200},score:{type:"number",minimum:0,maximum:10},status:{type:"string",maxLength:120},evidence:{type:"string",maxLength:2000},limitation:{type:"string",maxLength:2000}},required:["name","score"],additionalProperties:false}},findings:{type:"array",maxItems:80,items:{type:"object",properties:{id:{type:"string",maxLength:40},severity:{type:"string",enum:["p0","p1","p2","p3","info","critical","high","medium","moderate","low"]},category:{type:"string",maxLength:120},title:{type:"string",maxLength:300},summary:{type:"string",maxLength:8000},impact:{type:"string",maxLength:5000},recommendation:{type:"string",maxLength:6000},confidence:{type:"string",enum:["confirmed","likely","manual-review"]},references:{type:"array",maxItems:30,items:{type:"object",properties:{path:{type:"string",maxLength:800},line:{type:"integer",minimum:1},note:{type:"string",maxLength:1500}},required:["path"],additionalProperties:false}}},required:["severity","title","summary"],additionalProperties:false}}},additionalProperties:false},
  async execute(a,ctx){
    const data=await buildAudit(a,ctx),termux=!!(process.env.TERMUX_VERSION||String(process.env.PREFIX||"").includes("com.termux")),downloadRoot=termux?path.join(os.homedir(),"storage","downloads"):path.join(os.homedir(),"Downloads"),downloadsExists=await fs.stat(downloadRoot).then(x=>x.isDirectory()).catch(()=>false),chosen=resolveAuditOutput({cwd:ctx.cwd,target:data.inv.target,output:a.output,destination:a.destination,downloadsExists}),output=await writable(ctx,chosen);await capture(ctx,output);const report=renderReport(data,a);await writeTextAtomic(output,report);const st=await fs.stat(output),downloadReady=a.destination==="downloads"&&!a.output&&downloadsExists&&path.dirname(output)===downloadRoot;return JSON.stringify({ok:true,format:"md",path:output,bytes:st.size,verdict:data.result.label,score:data.score.overall,findings:data.findings.length,gates:data.gates.length+(data.dependency.gates?.length||0),requestedDestination:a.destination||"workspace",destination:downloadReady?"downloads":"workspace",downloadReady,...(a.destination==="downloads"&&!downloadReady?{notice:"Downloads was unavailable or an explicit output path was used; report saved in the workspace."}: {})},null,2);
  }
});
