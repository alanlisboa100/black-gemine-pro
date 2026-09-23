const PT_MARKERS=new Set(["voce","voces","nao","entao","tambem","estao","pra","pro","porque","agora","aqui","isso","isto","quero","precisa","consegue","depois","ainda","obrigado","obrigada","beleza","pois","hoje","amanha","ontem","faz","faca","corrige","analisa","desfaz","desfazer","pesquisa","noticia","noticias","relatorio","celular","tela","conserto","conserta","arruma","monta","brinca","capricha","valeu","projeto","arquivo","chave","chaves","ajusta","ajeitar","conversando","idioma","idiomas"]);
const EN_MARKERS=new Set(["the","this","that","these","those","please","would","could","should","because","however","already","still","maybe","just","dont","didnt","isnt","arent","wont","cant","lets","build","implement","update","create","check","review","refactor","website","animation","animations","fix","fixed","issue","error","errors","hello","hey","thanks","with","from","your","what","when","where","which","about"]);

export function foldLangText(text=""){
  return String(text||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
}

export function stripLanguageNoise(text=""){
  return String(text||"")
    .replace(/```[\s\S]*?```/g," ")
    .replace(/`[^`]+`/g," ")
    .replace(/https?:\/\/\S+/g," ")
    .replace(/\b[\w./-]+\.(js|ts|tsx|jsx|py|go|rs|java|kt|swift|php|rb|json|md|html|css|mjs|cjs)\b/gi," ");
}

function tokens(text=""){
  return foldLangText(stripLanguageNoise(text)).match(/[a-z0-9']+/g)||[];
}

export function detectReplyLanguage(text=""){
  const words=tokens(text);
  if(!words.length)return {id:"unknown",en:0,pt:0};
  let en=0,pt=0;
  for(const word of words){
    if(PT_MARKERS.has(word))pt+=2;
    if(EN_MARKERS.has(word))en+=2;
  }
  if(/[áâãàéêíóôõúç]/i.test(String(text||"")))pt+=2;
  if(/\b(don't|isn't|aren't|won't|can't|let's|it's)\b/i.test(String(text||"")))en+=2;
  if(en>=pt+1&&en>=2)return {id:"en",en,pt};
  if(pt>=en+1&&pt>=2)return {id:"pt-BR",en,pt};
  if(en>pt)return {id:"en",en,pt};
  if(pt>en)return {id:"pt-BR",en,pt};
  return {id:"unknown",en,pt};
}

export function resolveReplyLanguage(configured="auto",latestUserText=""){
  const cfg=configured==="pt-BR"||configured==="en"?configured:"auto";
  const detected=detectReplyLanguage(latestUserText);
  if(cfg==="en"||cfg==="pt-BR")return {id:cfg,source:"config",detected:detected.id,en:detected.en,pt:detected.pt};
  if(detected.id==="en"||detected.id==="pt-BR")return {id:detected.id,source:"latest-user",detected:detected.id,en:detected.en,pt:detected.pt};
  return {id:"auto",source:"auto",detected:detected.id,en:detected.en,pt:detected.pt};
}

export function replyLanguageRule(resolved={id:"auto"}){
  if(resolved.id==="en"){
    return "The latest user message is in English. Reply entirely in English for this turn. Portuguese examples in this prompt, earlier Portuguese turns, or a Brazilian locale must not switch you to Portuguese. Change language only if the latest user message is in another language or the user explicitly asks.";
  }
  if(resolved.id==="pt-BR"){
    return "A última mensagem do usuário está em português. Responda inteiramente em português neste turno. Exemplos em inglês neste prompt ou turnos anteriores em inglês não mudam o idioma. Só troque se a última mensagem estiver em outro idioma ou o usuário pedir.";
  }
  return "Match the language of the latest user message exactly. If that message is English, answer in English. If it is Portuguese, answer in Portuguese. Do not default to Portuguese.";
}
