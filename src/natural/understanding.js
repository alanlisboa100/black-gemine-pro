import {redactSecrets} from "../security/secrets.js";

const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const clip=(value,max=420)=>redactSecrets(String(value||"").replace(/\s+/g," ").trim()).slice(0,max);
const ACTION=/\b(?:da\s+um\s+(?:trato|talento|jeito)|quebra\s+um\s+galho|cria|crie|criar|faz|faca|fazer|quero|queria|gostaria|preciso|necessito|pode|poderia|consegue|tenta|tente|manda|mande|bota|bote|coloca|coloque|taca|deixa|deixe|mete|capricha|mexe|mexer|aplica|aplique|reduz|reduza|aumenta|aumente|ajusta|ajuste|equilibra|equilibre|destaca|destaque|corta|corte|recorta|recorte|sincroniza|sincronize|masteriza|masterize|estabiliza|estabilize|troca|troque|implementa|implemente|implementar|corrige|corrija|corrigir|arruma|arrume|conserta|conserte|resolve|resolva|resolver|melhora|melhore|melhorar|aprimora|aprimore|analisa|analise|analisar|testa|teste|testar|confere|confira|verifica|verifique|valida|valide|roda|rode|executa|execute|adiciona|adicione|adicionar|remove|remova|remover|apaga|apague|deleta|delete|muda|altera|edita|refatora|otimiza|configura|instala|publica|deploy|migra|gera|gere|gerar|monta|prepara|prepare|transforma|transforme|converte|converta|integra|integre|conecta|conecte|sobe|suba|hospeda|hospede|continua|continue|prossiga|segue|finaliza|finalize|termina|termine|desenvolve|documenta|documente|revisa|revise|build|run|fix|make|create|want|need|please|setup|implement|improve|review|analyze|test|check|verify|add|remove|delete|change|edit|refactor|configure|install|deploy|migrate|continue|finish|convert|connect|host)\w*/i;
const QUESTION=/^(?:qual|quais|quem|onde|quando|como|porque|por que|o que|que |me diz|me fale|da pra|tem como|sera que|pode |poderia |consegue |explique |existe |what|which|who|where|when|how|why|can |could |is |are |do |does |is there|tell me|explain )\b/i;
const VAGUE=/\b(?:isso|isto|aquilo|esse|essa|esses|essas|esse ai|essa ai|ele|ela|nele|nela|nisso|disso|daquilo|naquilo|nesse|nessa|daquele|daquela|ai|dai|la|essa parte|esse trecho|esse negocio|essa parada|onde parou|de onde parou|a partir dai|o mesmo|a mesma|como antes|do jeito anterior|o que a gente tava fazendo|faz tudo|tudo ai|tudo isso|melhora ai|resolve ai|ve ai|da um jeito)\b/i;
const AUTONOMY=/\b(?:decide|decida|escolhe|escolha|escolha o melhor|fica a seu criterio|a seu criterio|como achar melhor|como voce achar melhor|do jeito que preferir|pode fazer o que quiser|pode aplicar tudo|tudo que precisar|se tiver mais|toma a decisao|voce decide|de seu melhor|da seu melhor|faca o melhor|capricha|manda ver|mete bronca|bota pra quebrar|faz bonito|deixa profissional|vai fundo|pode tocar|me surpreenda|use seu julgamento|your call|you decide|choose the best|do your best|use your judgment|whatever works best|go for it)\b/i;
const CONSTRAINT=/\b(?:nao|nunca|sem |somente|apenas|so |preserva|preserve|mantem|mantenha|deixa.{0,24}intact\w*|nao mex|nao encost|sem perder|sem quebrar|sem alterar|do jeito que esta|evita|evite|limita|limite|trava em|precisa|deve|tem que|no maximo|pelo menos|ate 2k|compativel|acessivel|seguro|offline|local|without|never|only|keep|preserve|avoid|must|should|at least|at most|compatible|accessible|secure|unchanged)\b/i;
const ACCEPTANCE=/\b(?:pronto quando|termina quando|so termina|so acaba|nao par(?:a|e) ate|vai ate o fim|depois testa|testa depois|roda os testes|rode os testes|execute os testes|passa em tudo|deixa tudo verde|garante que|garanta que|confirma que|confirme que|confirm(?:a|e|ar)\s+(?:a\s+)?resposta|status\s+200|responde\s+200|confere tudo|verifica tudo|nao deixa passar nada|nao (?:me )?entrega pela metade|precisa funcionar|tem que funcionar|precisa passar|tem que passar|resultado esperado|done when|do not stop until|run the tests|make sure|must pass|expected result|acceptance|finish the whole thing|nothing missing)\b/i;
const RISK=/\b(?:producao|production|deploy|publicar|publique|publicacao|publish|push|drop|truncate|delete|deleta|apaga|remove tudo|reset|force|migra|migration|migracao|sql|rls|row level security|banco remoto|remote database|pagamento|payment|billing|cobranca|email em massa|credencial|credential|secret|token|chave|api key|permissao|permission|chmod|dominio|domain|release|submit)\b/i;
const ALTERNATIVE=/\b(?:ou|versus|vs\.?|either|or)\b/i;
const INPUT_ALTERNATIVE=/\b(?:dedo\s+ou\s+mouse|mouse\s+ou\s+(?:toque|teclado)|toque\s+ou\s+(?:mouse|teclado)|teclado\s+ou\s+mouse|um lado\s+e?\s*(?:para\s+)?o outro)\b/i;
const REFERENT=/\b(?:isso|isto|aquilo|esse|essa|esses|essas|esse ai|essa ai|ele|ela|nele|nela|nisso|disso|daquilo|naquilo|nesse|nessa|daquele|daquela|dai|la|essa parte|esse trecho|esse negocio|essa parada|onde parou|de onde parou|a partir dai|o mesmo|a mesma|como antes|anterior|o que a gente tava fazendo)\b/i;

function sentences(text){return String(text||"").split(/(?:[.!?;]+|\n+|\s+e depois\s+|\s+depois\s+)/i).map(x=>x.trim()).filter(Boolean);}
function unique(items,max=8){const out=[];for(const item of items.map(x=>clip(x)).filter(Boolean)){if(!out.some(x=>normalize(x)===normalize(item)))out.push(item);if(out.length>=max)break;}return out;}
function priorUserMessages(messages=[]){return messages.filter(m=>m?.role==="user"&&!String(m.content||"").startsWith("[BLACKCORE COMPACTED CONTEXT]")).map(m=>String(m.content||"")).filter(Boolean);}
function extractTargets(text){
  const source=String(text||""),targets=[];
  for(const match of source.matchAll(/(?:^|\s)([.@~]?[\w./-]+\.(?:js|mjs|cjs|ts|tsx|jsx|json|md|css|html|sql|toml|yaml|yml|py|go|rs|java|kt|dart|sh|zip|png|jpe?g|webp|gif|bmp|tiff?|svg|mp4|mov|mkv|webm|avi|m4v|mp3|wav|flac|aac|m4a|ogg))\b/gi))targets.push(match[1]);
  for(const match of source.matchAll(/[`"“”']([^`"“”']{2,80})[`"“”']/g))targets.push(match[1]);
  for(const match of source.matchAll(/\b(?:app|aplicativo|site|website|pagina|página|api|endpoint|rota|backend|projeto|arquivo|pasta|zip|tela|foto|imagem|video|vídeo|audio|áudio|musica|música|roupa|banco|database|sql|rls|tabela|schema|migration|migracao|migração|supabase|funcao|função|componente|teste|fluxo|terminal|termux|interface|resumo|pesquisa|codigo|código|startup|inicializacao|inicialização|cubo|jogo|dashboard|formulario|formulário|readme)(?:\s+(?:de|do|da|em|para|chamado|chamada))?\s+([\w@./-]{2,50})/gi))targets.push(match[0]);
  for(const match of source.matchAll(/\b(?:app|aplicativo|site|website|api|projeto|arquivo|pasta|foto|imagem|video|vídeo|audio|áudio|musica|música|roupa|banco|database|sql|rls|supabase|terminal|termux|jogo|dashboard|readme)\b/gi))targets.push(match[0]);
  return unique(targets,10);
}
function extractConstraints(text){return unique(sentences(text).filter(s=>CONSTRAINT.test(normalize(s))),8);}
function extractAcceptance(text){return unique(sentences(text).filter(s=>ACCEPTANCE.test(normalize(s))),6);}
function extractGoal(text){
  const clauses=sentences(text),action=clauses.find(s=>ACTION.test(normalize(s)));
  if(action)return clip(action,360);
  if(QUESTION.test(normalize(text)))return clip(text,360);
  return clip(clauses[0]||text,360);
}
function historyFocus(messages=[]){
  const prior=priorUserMessages(messages);
  for(let i=prior.length-1;i>=0;i--){const text=prior[i],targets=extractTargets(text);if(targets.length||ACTION.test(normalize(text)))return {text:clip(text,360),targets};}
  return {text:"",targets:[]};
}

const SEMANTIC_HINTS={
  index_only:{constraints:["deliver one self-contained index.html only"],acceptance:["embedded CSS and JavaScript work without additional local source files"]},
  full_website:{constraints:["do not stop at an index-only scaffold"],acceptance:["deliver and verify the complete linked website project"]},
  full_app:{constraints:["build a real mobile application project, not index.html or a disguised website"],acceptance:["application source, manifest/configuration, run/build commands, checks and README are present"]},
  continue_work:{constraints:["continue in the current project and preserve existing work"],acceptance:["the requested follow-up is integrated instead of creating a replacement project"]},
  analysis_only:{constraints:["read-only analysis; do not mutate files or external state"],acceptance:["report evidence, cause and options without applying changes"]},
  apply_changes:{acceptance:["implement the requested changes and verify the latest revision"]},
  photo_region:{constraints:["edit only the selected photo region and forbid a global fallback"],acceptance:["visible change is inside the verified mask with negligible outside change"]},
  video_region:{constraints:["use temporally tracked regional selection and forbid a whole-frame fallback"],acceptance:["the selected video area is tracked while timing and soundtrack stay preserved"]},
  video_audio_preserve:{constraints:["preserve the soundtrack continuously; edit picture timing only"],acceptance:["audio duration, order and speed remain locked"]},
  local_model:{constraints:["use the configured local provider without requiring a cloud API key"]}
};
function mergeHints(values=[],extra=[]){return [...new Set([...values,...extra])].slice(0,10);}

export function analyzeTaskUnderstanding(text,{messages=[],semantic=null}={}){
  const original=String(text||""),t=normalize(original),history=historyFocus(messages),targets=extractTargets(original),constraints=extractConstraints(original),acceptance=extractAcceptance(original);
  const autonomy=AUTONOMY.test(t),risk=RISK.test(t),question=QUESTION.test(t),hasAction=ACTION.test(t),referent=REFERENT.test(t),vague=VAGUE.test(t),hasHistory=!!history.text;
  const ambiguities=[];
  if(referent&&!hasHistory&&!question&&!targets.length)ambiguities.push("reference has no visible antecedent");
  if(((vague&&!question&&!targets.length)||(!hasAction&&!question&&t.split(" ").length<7))&&!hasHistory)ambiguities.push("goal or target is underspecified");
  if(ALTERNATIVE.test(t)&&!INPUT_ALTERNATIVE.test(t)&&!autonomy&&!/\b(?:compare|compara|comparar|difference|diferenca|diferença)\b/i.test(t))ambiguities.push("multiple alternatives are present without a decision rule");
  if(risk&&!targets.length&&!hasHistory)ambiguities.push("consequential action has no explicit target");
  const resolvedByHistory=(referent||vague)&&hasHistory;
  const materialChoice=ambiguities.some(x=>x.startsWith("multiple alternatives"));
  const clarificationRequired=!autonomy&&ambiguities.length>0&&(risk||materialChoice||!hasAction&&!question||referent&&!hasHistory);
  let confidence=0.9;
  if(!hasAction&&!question)confidence-=0.2;
  if(vague)confidence-=hasHistory?0.08:0.28;
  if(ambiguities.length)confidence-=Math.min(0.35,ambiguities.length*0.12);
  if(targets.length)confidence+=0.04;
  if(autonomy)confidence=Math.max(confidence,0.78);
  confidence=Math.max(0.15,Math.min(0.98,confidence));
  const goal=extractGoal(original),focusTargets=targets.length?targets:history.targets,hints=semantic?.route?SEMANTIC_HINTS[semantic.route]||{}:{};
  return {
    original,goal,targets:focusTargets,constraints:mergeHints(constraints,hints.constraints),acceptance:mergeHints(acceptance,hints.acceptance),autonomy,risk,confidence,
    semantic:semantic?.route?{route:semantic.route,confidence:semantic.confidence,backend:semantic.backend,model:semantic.model||null}:null,
    continuity:{usedHistory:resolvedByHistory,focus:resolvedByHistory?history.text:""},
    ambiguities,
    clarification:{
      required:clarificationRequired,
      reason:clarificationRequired?ambiguities.join("; "):"",
      policy:clarificationRequired
        ?"Inspect read-only context if it can resolve the ambiguity; otherwise ask one concise question before mutation."
        :autonomy
          ?"The user granted discretion. Make a reasonable, reversible choice and explain it briefly."
          :ambiguities.length
            ?"State the smallest safe assumption and proceed; ask only if evidence makes the choice material."
            :"Proceed using the original request and verify an observable outcome."
    }
  };
}

export function renderTaskUnderstanding(brief){
  if(!brief)return "";
  const pct=Math.round((brief.confidence||0)*100),lines=[
    `Likely goal: ${brief.goal||"not yet explicit"}`,
    `Confidence: ${pct}%`,
    `Decision policy: ${brief.clarification?.policy||"proceed conservatively"}`
  ];
  if(brief.targets?.length)lines.push(`Targets/signals: ${brief.targets.join(", ")}`);
  if(brief.constraints?.length)lines.push(`Explicit constraints: ${brief.constraints.join(" | ")}`);
  if(brief.acceptance?.length)lines.push(`Done signals: ${brief.acceptance.join(" | ")}`);
  if(brief.semantic?.route)lines.push(`Meaning route: ${brief.semantic.route} · ${Math.round((brief.semantic.confidence||0)*100)}% · ${brief.semantic.backend}`);
  if(brief.continuity?.usedHistory)lines.push(`Resolved from recent context: ${brief.continuity.focus}`);
  if(brief.ambiguities?.length)lines.push(`Open ambiguity: ${brief.ambiguities.join("; ")}`);
  if(brief.clarification?.required)lines.push("CLARIFICATION GATE: mutating tools are withheld until the missing choice is resolved.");
  return lines.join("\n");
}
