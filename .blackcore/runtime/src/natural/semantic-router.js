import {getSecret} from "../config/loader.js";

const ROUTES=[
  {id:"index_only",examples:["crie um site so com index", "quero um unico index html com css e javascript dentro", "single file index only animation"]},
  {id:"full_website",examples:["crie um site completo com todos os arquivos", "quero uma landing page profissional completa", "build the whole website with source styles tests and readme"]},
  {id:"full_app",examples:["crie um aplicativo completo para android", "faz um app expo react native de verdade", "build a complete mobile application not a website"]},
  {id:"continue_work",examples:["continua de onde parou", "aplica isso no mesmo projeto", "keep working on the existing project"]},
  {id:"analysis_only",examples:["so analisa e nao altera nada", "me diga o que aconteceu sem aplicar", "inspect and explain only"]},
  {id:"apply_changes",examples:["pode aplicar as melhorias", "corrige tudo e testa ate passar", "implement the changes and verify everything"]},
  {id:"photo_region",examples:["diminua a luz somente da janela", "coloque brilho apenas nos olhos", "edit only the selected part of the photo"]},
  {id:"video_region",examples:["melhore somente a agua durante o video", "ajuste a roupa da pessoa no video sem mexer no resto", "track and edit only one region across the video"]},
  {id:"video_audio_preserve",examples:["edite o video mas nao corte nem altere a musica", "preserve a musica inteira e corte so a imagem", "keep the soundtrack continuous while editing the picture"]},
  {id:"local_model",examples:["use o modelo local offline", "roda sem token usando llama cpp", "switch to the local on device model"]}
];

function normalize(value=""){
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
function trigrams(value){
  const text=`  ${normalize(value)}  `,out=new Map();for(let i=0;i<text.length-2;i++){const gram=text.slice(i,i+3);out.set(gram,(out.get(gram)||0)+1);}return out;
}
function cosineMaps(a,b){
  let dot=0,aa=0,bb=0;for(const value of a.values())aa+=value*value;for(const value of b.values())bb+=value*value;for(const [key,value] of a)dot+=value*(b.get(key)||0);return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
function cosineVectors(a=[],b=[]){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){const x=Number(a[i])||0,y=Number(b[i])||0;dot+=x*y;aa+=x*x;bb+=y*y;}return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
function lexicalScores(text){
  const normalized=normalize(text),input=trigrams(text),cues={
    index_only:/\b(?:so|somente|apenas|unico|single)\b.{0,28}\bindex(?: html)?\b|\bindex\b.{0,20}\b(?:so|only)\b/,
    full_website:/\bsite\b.{0,35}\b(?:completo|profissional|inteiro|full|complete)\b|\b(?:complete|full)\b.{0,24}\bwebsite\b/,
    full_app:/\b(?:aplicativo|app)\b.{0,30}\b(?:completo|profissional|android|ios|expo|flutter)\b|\b(?:complete|real)\b.{0,20}\b(?:mobile )?app\b/,
    continue_work:/\b(?:continua|continue|retoma|resume|prossiga|segue)\b.{0,45}\b(?:parou|projeto|trabalho|mesmo|onde|dai|daqui)\b/,
    analysis_only:/\b(?:so|somente|apenas|only|just)\b.{0,25}\b(?:analisa|analise|inspect|analyze)\b|\b(?:nao|sem|do not|without)\b.{0,22}\b(?:alter|aplic|edit|mutat|mex)\w*/,
    photo_region:/\b(?:foto|imagem|janela|olhos?|rosto|cabelo|fundo)\b.{0,45}\b(?:so|somente|apenas|only|just)\b|\b(?:so|somente|apenas|only|just)\b.{0,45}\b(?:janela|olhos?|rosto|cabelo|fundo)\b/,
    video_region:/\bvideo\b.{0,50}\b(?:so|somente|apenas|rastre|track)\w*\b.{0,25}\b(?:agua|roupa|janela|olhos?|area|regiao|region)\b/,
    video_audio_preserve:/\b(?:video|imagem)\b.{0,55}\b(?:nao|sem|preserv|mant)\w*\b.{0,28}\b(?:musica|audio|trilha|song|soundtrack)\b|\b(?:preserv|mant|keep)\w*\b.{0,28}\b(?:musica|audio|trilha|song|soundtrack)\b/,
    local_model:/\b(?:modelo|model)\b.{0,20}\b(?:local|offline)\b|\bllama ?cpp\b/
  },cueWeights={video_audio_preserve:.98,video_region:.97,photo_region:.97};return ROUTES.map(route=>({id:route.id,score:Math.max(cues[route.id]?.test(normalized)?cueWeights[route.id]||0.92:0,...route.examples.map(example=>cosineMaps(input,trigrams(example))))})).sort((a,b)=>b.score-a.score);
}
function loopback(url){return ["localhost","127.0.0.1","::1"].includes(url.hostname.toLowerCase())||url.hostname.toLowerCase().endsWith(".localhost");}
function embeddingUrl(base){const url=new URL(String(base||""));if(!["http:","https:"].includes(url.protocol))throw new Error("embedding endpoint must use http or https");url.pathname=`${url.pathname.replace(/\/+$/,"")}/embeddings`;url.search="";url.hash="";return url;}
async function embeddingScores(text,cfg,signal){
  const ecfg=cfg?.semanticRouting?.embedding||{};if(ecfg.enabled!==true||!ecfg.baseUrl)return {rows:null,reason:"embedding backend disabled"};
  let url;try{url=embeddingUrl(ecfg.baseUrl);}catch(e){return {rows:null,reason:e.message};}
  if(!loopback(url)&&ecfg.allowRemote!==true)return {rows:null,reason:"remote embedding endpoint blocked unless allowRemote=true"};
  const inputs=[text,...ROUTES.map(route=>route.examples.join(". "))],headers={"content-type":"application/json"},key=ecfg.apiKeyEnv?getSecret(ecfg.apiKeyEnv):null;if(key)headers.authorization=`Bearer ${key}`;
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("embedding timeout")),Math.max(1000,Number(ecfg.timeoutMs)||12000)),abort=()=>ac.abort(signal?.reason||new Error("aborted"));if(signal){if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true});}
  try{
    const response=await fetch(url,{method:"POST",headers,body:JSON.stringify({model:ecfg.model||"Qwen3-Embedding-0.6B",input:inputs}),signal:ac.signal});if(!response.ok)return {rows:null,reason:`embedding backend HTTP ${response.status}`};
    const payload=await response.json(),vectors=(payload.data||[]).sort((a,b)=>(a.index||0)-(b.index||0)).map(row=>row.embedding);if(vectors.length!==inputs.length)return {rows:null,reason:"embedding backend returned an incomplete vector batch"};
    return {rows:ROUTES.map((route,index)=>({id:route.id,score:cosineVectors(vectors[0],vectors[index+1])})).sort((a,b)=>b.score-a.score),reason:null};
  }catch(e){return {rows:null,reason:String(e?.message||e).slice(0,180)};}finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
}

export async function routeTaskSemantics(text,cfg={}, {signal}={}){
  if(cfg?.semanticRouting?.enabled===false)return {route:null,confidence:0,backend:"disabled",model:null,ranked:[],reason:"semantic routing disabled"};
  const lexical=lexicalScores(text),embedded=await embeddingScores(text,cfg,signal),combined=new Map(lexical.map(row=>[row.id,row.score]));
  if(embedded.rows)for(const row of embedded.rows)combined.set(row.id,(combined.get(row.id)||0)*0.35+row.score*0.65);
  const ranked=[...combined].map(([id,score])=>({id,score:Number(score.toFixed(4))})).sort((a,b)=>b.score-a.score),top=ranked[0]||{id:"unknown",score:0},threshold=Number(cfg?.semanticRouting?.minScore??(embedded.rows?0.54:0.64));
  return {route:top.score>=threshold?top.id:null,confidence:top.score,backend:embedded.rows?"embeddings+lexical":"local-semantic",model:embedded.rows?(cfg.semanticRouting.embedding.model||"Qwen3-Embedding-0.6B"):null,ranked:ranked.slice(0,3),reason:embedded.reason};
}

export const SEMANTIC_ROUTES=Object.freeze(ROUTES.map(route=>route.id));
