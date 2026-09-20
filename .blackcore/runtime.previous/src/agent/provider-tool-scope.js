const GOOGLE_DEFAULT_LIMIT=20;
const GOOGLE_CORE=[
  "read","write","edit","patch","ls","find","grep","bash",
  "verify","todo","agent_control","process_list","package_manager",
  "task_graph","delegate","delegate_ready"
];
const TOPIC_TOOLS=[
  [/\b(?:browser|navegador|chrome|chromium|pagina\s+web|conta\s+logada|sessao\s+logada|fazer\s+login|entrar\s+na\s+conta)\b/i,["browser"]],
  [/\b(?:websites?|web\s*sites?|sites?|html5?|css3?|javascript|typescript|frontend|react|next\.?js|vite|landings?|anima(?:tion|tions|cao|coes))\b/i,["process_start","process_poll","browser","media","mkdir","stat","patch_set","file_transaction","ecosystem","code_intel"]],
  [/\b(?:ui|ux)\b/i,["process_start","process_poll","browser","media"]],
  [/\b(?:game|games|jogo|jogos|cobrinha|snake|tetris|puzzle|canvas)\b/i,["process_start","process_poll","browser","media","mkdir"]],
  [/\b(?:search|research|pesquisas?|pesquisar|procura|procurar|busca|buscar|investiga|investigar|noticia|noticias|news|fonte|fontes|internet|online|web)\b/i,["web_search","web_research","news_research","credibility_check","web_fetch","download"]],
  [/\b(?:git|github|branch|commit|pull request|push|repo)\b/i,["git","github","worktree"]],
  [/\b(?:database|banco|sql|sqlite|postgres|supabase|rls|row\s+level\s+security|migracao|migration|tabela|schema|policy|politica)\b/i,["sqlite","postgres","supabase"]],
  [/\b(?:android|apk|gradle|expo|eas|react\s*native|flutter|mobile|celular|aplicativo|application|app)\b/i,["android_device","gradle","expo","eas"]],
  [/\b(?:deploy|publish|publicar|vercel|netlify|production|producao)\b/i,["deploy_preflight","vercel","netlify"]],
  [/\b(?:api|http|endpoint|rota|backend|integracao|request|curl|webhook)\b/i,["http_request","api_lab","web_fetch","port_check"]],
  [/\b(?:pdf|document|docx|relatorio|report|markdown)\b/i,["document","document_reader"]],
  [/\b(?:roupa|roupas|vestido|camisa|calca|figurino|look|outfit|wardrobe|virtual\s*try.?on|trocar?\s+roupa|mudar\s+roupa)\b/i,["outfit_editor","photo_editor","video_editor","media"]],
  [/\b(?:image|images|imagem|imagens|photo|photos|foto|fotos|retrato|paisagem|rosto|olhos|janela|fundo|nitidez|detalhes|recorte|clarear|escurecer|contraste|saturacao|cor|luz|sombras|melhorar|aprimorar|video|videos|audio|media|ffmpeg|editar|edicao|editor|cortar|recortar|legenda|legendas|musica|trilha|watermark|marca.?d.?agua|transicao|transicoes|montagem|batida|bpm|pico|estabilizar|ruido|reenquadrar|zoom|sobreposicao|overlay|efeito|effects|pacote)\b/i,["photo_editor","video_editor","outfit_editor","media","document_reader"]],
  [/\b(?:zip|archive|compact|compactar|empacotar|pacote|tar)\b/i,["archive"]],
  [/\b(?:security|seguranca|secret|credential|credencial|vulnerabilidade|falha|varredura|auditoria|audit|revisao\s+completa)\b/i,["security_scan","sensitive_path_check","env_names","audit_report"]]
];
const HIGH_PRECISION_TOOLS=[
  [/\b(?:browser|navegador|chrome|chromium|conta\s+logada|sessao\s+logada|fazer\s+login)\b/i,["browser"]],
  [/\bgithub\b/i,["github","git"]],
  [/\b(?:supabase|rls|row\s+level\s+security)\b/i,["supabase","postgres","sqlite"]],
  [/\b(?:android|apk|gradle|expo|eas|react\s*native|flutter|aplicativo(?!\s+web)|app(?!\s+web))\b/i,["android_device","gradle","expo","eas"]],
  [/\b(?:roupa|roupas|vestido|camisa|calca|figurino|look|outfit|wardrobe)\b/i,["outfit_editor","photo_editor","video_editor","media"]],
  [/\b(?:foto|fotos|photo|photos|imagem|imagens|image|images)\b/i,["photo_editor","media"]],
  [/\b(?:video|videos|filmagem)\b/i,["video_editor","media"]],
  [/\b(?:auditoria|audit|varredura|vulnerabilidade)\b/i,["audit_report","security_scan","sensitive_path_check","env_names"]],
  [/\b(?:api|endpoint|webhook)\b/i,["http_request","api_lab","web_fetch","port_check"]]
];
const SYNONYMS={
  site:["website","browser"],sites:["website","browser"],
  animacao:["animation","media","browser"],animacoes:["animation","media","browser"],
  video:["video_editor","outfit_editor","media"],videos:["video_editor","outfit_editor","media"],edicao:["video_editor"],editar:["video_editor"],legenda:["video_editor"],legendas:["video_editor"],
  roupa:["outfit_editor","wardrobe"],roupas:["outfit_editor","wardrobe"],vestido:["outfit_editor","garment"],camisa:["outfit_editor","garment"],figurino:["outfit_editor","wardrobe"],
  foto:["photo_editor","image"],fotos:["photo_editor","image"],imagem:["photo_editor","image"],imagens:["photo_editor","image"],nitidez:["photo_editor","detail"],recorte:["photo_editor","crop"],
  jogo:["game","browser"],jogos:["game","browser"],
  pesquisa:["search","research"],noticia:["news"],noticias:["news"],
  auditoria:["audit","security"],relatorio:["report","document"],
  desfaz:["undo","agent"],desfazer:["undo","agent"]
};

export function foldTaskText(text=""){
  return String(text||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
}
function clampLimit(value){const n=Number(value);return Number.isFinite(n)?Math.max(4,Math.min(20,Math.trunc(n))):GOOGLE_DEFAULT_LIMIT;}
function words(text=""){return new Set(foldTaskText(text).split(/[^a-z0-9_\-]+/).filter(x=>x.length>=3));}
function lexicalScore(tool,taskWords){
  const hay=`${tool.name||""} ${tool.description||""}`.toLowerCase();
  let score=0;
  for(const w of taskWords){
    if(hay.includes(w))score+=w.length>=7?3:1;
    for(const alias of SYNONYMS[w]||[])if(hay.includes(alias))score+=2;
  }
  return score;
}
export function googleToolLimit(cfg){return clampLimit(cfg.providers?.google?.maxActiveTools);}
export function toolsForProviderRequest(tools=[],{provider="",taskText="",cfg={}}={}){
  if(provider!=="google"||tools.length<=googleToolLimit(cfg))return tools;
  const limit=googleToolLimit(cfg),byName=new Map(tools.map(t=>[t.name,t])),chosen=[],seen=new Set();
  const add=name=>{const t=byName.get(name);if(t&&!seen.has(name)&&chosen.length<limit){seen.add(name);chosen.push(t);}};
  for(const name of GOOGLE_CORE)add(name);
  const folded=foldTaskText(taskText),topic=[];
  for(const [re,names] of HIGH_PRECISION_TOOLS)if(re.test(folded))for(const name of names)add(name);
  for(const [re,names] of TOPIC_TOOLS)if(re.test(folded))topic.push(...names);
  for(const name of topic)add(name);
  const taskWords=words(taskText),ranked=tools.filter(t=>!seen.has(t.name)).map((t,i)=>({t,i,score:lexicalScore(t,taskWords)})).sort((a,b)=>b.score-a.score||a.i-b.i);
  for(const row of ranked){if(chosen.length>=limit)break;if(row.score<=0&&chosen.length>=Math.min(limit,18))break;add(row.t.name);}
  for(const name of ["project_detect","mkdir","stat","patch_set","file_transaction","todo","memory","tool_output","code_intel","ecosystem","browser","process_start","process_poll"]){if(chosen.length>=limit)break;add(name);}
  return chosen.slice(0,limit);
}
