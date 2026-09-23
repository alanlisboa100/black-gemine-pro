import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {BC_HOME} from "../utils/paths.js";

const CREATE=/\b(?:cria|crie|criar|faz|faca|fazer|monte|monta|montar|gera|gere|gerar|desenvolve|desenvolva|desenvolver|construa|construir|bota|bote|manda|mande|prepara|prepare|make|create|build|generate|develop|prepare)\w*/i;
const DESIRE=/\b(?:quero|queria|gostaria|preciso|necessito|want|need)\b/i;
const PROJECT_KIND=/\b(anima(?:ção|cao)|animation|jogo|game|app|aplicativo|application|site|website|web\s+app|landing(?:\s+page)?|pagina|p[aá]gina|dashboard|painel|portal|pwa|demo|visual|experiencia|experi[eê]ncia|projeto|project|sistema|ferramenta|bot)\b/i;
const MODIFY_ONLY=/\b(?:corrige|corrija|corrigir|arruma|arrume|conserta|conserte|edita|edite|editar|modifica|modifique|modificar|alterar|altera|melhora|melhore|melhorar|refatora|refatore|refatorar|analisa|analise|analisar|testa|teste|testar|revisa|revise|revisar|fix|repair|edit|modify|improve|refactor|analyze|test|review)\b/i;
const ARCHIVE=/\b(?:zip|\.zip\b|tar(?:\.gz)?|arquivo\s+compactado|compacta|compactar|comprimi|comprimir|empacota|empacotar|archive|compress|package\s+(?:it|this|project))\b/i;
const EXPLICIT_NEW=/\b(?:outro|outra|novo|nova|diferente|separad[oa]|do\s+zero|another|new|different|separate|from\s+scratch)\b/i;
const NAMED=/(?:chamad[oa]|nome(?:ad[oa])?|called|named)\s+["“”']?([^"“”'.,;:!?\n]{2,70}?)(?=\s+(?:para|com|que|e|for|with|and)\b|[.,;:!?\n]|$)/i;
const QUOTED=/["“”']([^"“”']{2,70})["“”']/;
const STOP=new Set(["a","o","as","os","um","uma","uns","umas","de","da","do","das","dos","para","pra","por","com","sem","em","no","na","nos","nas","e","ou","que","bem","muito","mais","legal","bonita","bonito","top","massa","incrivel","incrível","simples","toda","todo","inteira","inteiro","ai","aí","the","a","an","of","for","with","without","in","on","and","or","very","cool","nice","beautiful","simple"]);
const GENERIC=new Set(["animação","animacao","animation","jogo","game","app","aplicativo","application","site","website","landing","page","pagina","página","dashboard","demo","visual","experiencia","experiência","projeto","project","bot"]);

function ascii(value=""){
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function slug(value=""){
  return ascii(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64);
}
function kindName(match=""){
  const k=slug(match);
  if(k.startsWith("anim"))return "animacao";
  if(k==="aplicativo"||k==="application")return "app";
  if(k==="website")return "site";
  if(k==="pagina"||k==="landing-page"||k==="landing")return "site";
  if(k==="game")return "jogo";
  if(k==="project")return "projeto";
  return k||"projeto";
}
function words(value=""){
  return String(value).split(/\s+/).map(x=>x.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"")).filter(Boolean);
}
function usefulTail(text,kindMatch){
  const i=text.toLowerCase().indexOf(String(kindMatch||"").toLowerCase());
  if(i<0)return [];
  let tail=text.slice(i+String(kindMatch).length);
  tail=tail.replace(/^\s+(?:de|do|da|dos|das|com|para|em|called|named)\s+/i," ");
  tail=tail.split(/(?:\b(?:e|mas|que|com|para|depois|then|and|but)\b\s+(?:faz|faca|cria|adicione|adiciona|coloca|use|usa|tenha|precisa|deve|with|make|add|include|use|needs?)\b|[.!?;:\n])/i)[0]||tail;
  const out=[];
  for(const raw of words(tail)){
    const n=raw.toLowerCase();
    if(STOP.has(n))continue;
    if(/^(?:html|css|js|javascript|typescript|react|next|expo|android|3d|2d|neon|pixel|finance|financas|finanças|musica|música|coracao|coração|carro|space|espaco|espaço|loja|chat|todo|notas|clima|portfolio|portfólio|quiz|timer|relogio|relógio|particles?|particulas?|partículas?)$/i.test(raw)||out.length<3)out.push(raw);
    if(out.length>=4)break;
  }
  return out;
}
export function projectFolderName(text=""){
  const source=String(text||"").trim(),kindMatch=source.match(PROJECT_KIND)?.[0]||"projeto",kind=kindName(kindMatch);
  const named=source.match(NAMED)?.[1]||source.match(QUOTED)?.[1]||"";
  if(named){const s=slug(named);if(s)return s;}
  const tail=usefulTail(source,kindMatch).filter(x=>!GENERIC.has(x.toLowerCase()));
  const suffix=slug(tail.join(" "));
  return suffix?`${kind}-${suffix}`:kind;
}
export function isNewStandaloneProjectRequest(text=""){
  const source=ascii(text).toLowerCase();
  return PROJECT_KIND.test(source)&&(CREATE.test(source)||(DESIRE.test(source)&&!MODIFY_ONLY.test(source)));
}
export function isExplicitSeparateProjectRequest(text=""){const source=ascii(text).toLowerCase();return isNewStandaloneProjectRequest(source)&&EXPLICIT_NEW.test(source);}
export function archiveCreationExplicit(text=""){return ARCHIVE.test(ascii(text).toLowerCase());}

function hasUserProjectMarkers(cwd){
  const markers=[".git","pyproject.toml","requirements.txt","Cargo.toml","go.mod","pubspec.yaml","pom.xml","build.gradle","settings.gradle","composer.json","index.html"];
  for(const marker of markers)if(fs.existsSync(path.join(cwd,marker)))return true;
  const pkg=path.join(cwd,"package.json");
  if(fs.existsSync(pkg)){
    try{const data=JSON.parse(fs.readFileSync(pkg,"utf8"));if(data?.name!=="blackcore-native")return true;}catch{return true;}
  }
  return false;
}
export function isBlackcoreWorkspace(cwd){
  const root=path.resolve(cwd),base=path.basename(root);
  if(/^BLACKCORE-NATIVE(?:-|$)/i.test(base))return true;
  const runtime=path.join(path.resolve(BC_HOME),"runtime");
  if(root===runtime||root.startsWith(runtime+path.sep))return true;
  const pkg=path.join(root,"package.json");
  try{return JSON.parse(fs.readFileSync(pkg,"utf8"))?.name==="blackcore-native";}catch{return false;}
}
export function isNeutralLauncherWorkspace(cwd,{home=os.homedir()}={}){
  const root=path.resolve(cwd),h=path.resolve(home);
  if(isBlackcoreWorkspace(root))return true;
  if(hasUserProjectMarkers(root))return false;
  const neutral=[h,path.join(h,"storage","downloads"),path.join(h,"storage","shared"),path.join(h,"Downloads")].map(x=>path.resolve(x));
  return neutral.includes(root);
}
export function defaultProjectsRoot({env=process.env,home=os.homedir()}={}){
  if(env.BLACKCORE_PROJECTS_DIR)return path.resolve(env.BLACKCORE_PROJECTS_DIR);
  return path.join(home,"BLACKCORE-Projects");
}
function uniqueProjectDir(root,name){
  let candidate=path.join(root,name),n=2;
  while(fs.existsSync(candidate)){candidate=path.join(root,`${name}-${n++}`);}
  return candidate;
}
export function resolveTurnWorkspace({cwd,text,state={},understanding=null,env=process.env,home=os.homedir(),mkdir=true,allowCreate=true}={}){
  const base=path.resolve(cwd||process.cwd()),neutral=isNeutralLauncherWorkspace(base,{home}),active=state.activeProject;
  const activeHere=neutral&&active?.root&&path.resolve(active.sourceCwd||base)===base&&fs.existsSync(active.root);
  if(activeHere&&!isExplicitSeparateProjectRequest(text))return {...active,created:false,baseCwd:base,isolated:true,continued:true};
  if(neutral&&allowCreate&&!understanding?.clarification?.required&&isNewStandaloneProjectRequest(text)){
    const projectsRoot=defaultProjectsRoot({env,home}),name=projectFolderName(text),root=uniqueProjectDir(projectsRoot,name);
    if(mkdir)fs.mkdirSync(root,{recursive:true});
    const next={root,name:path.basename(root),sourceCwd:base,createdAt:new Date().toISOString(),isolated:true};
    state.activeProject=next;
    return {...next,created:true,baseCwd:base};
  }
  return {root:base,name:path.basename(base),sourceCwd:base,baseCwd:base,isolated:false,created:false};
}
