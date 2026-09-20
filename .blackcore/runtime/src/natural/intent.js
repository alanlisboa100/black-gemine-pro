import {listModels} from "../config/models.js";
import {SessionStore} from "../sessions/store.js";
import {resolveReasoning,setReasoning,syncReasoningToCurrent,currentReasoning} from "../config/reasoning.js";

const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const hasTask=t=>/\b(cri|faz|implement|corrig|arrum|resolv|anal|test|build|deploy|sub|public|edita|altera|muda o codigo|instal|rode|execut|verific|procura|busca|leia|abre|desenvolv|monta|gera|prepara|conserta|finaliza|adicion|remove|apaga|deleta|refator|otimiz|configur|integra|document|melhor)\w*/.test(t);
const pure=(t,re)=>re.test(t)&&t.length<140&&!(/\b(e depois|depois|tambem|e faz|e corr|e cria|nesse projeto|neste projeto)\b/.test(t));

function modelMatch(cfg,t){
  const models=listModels(cfg);
  // Match a named Gemini variant as a whole, before broad flash/provider aliases.
  const named=t.match(/\bgemini[\s-]+(\d+[.,]\d+)[\s-]+(pro|flash(?:[\s-]+lite)?)(?:[\s-]+(preview(?:[\s-]+[\d-]+)?))?\b/);
  if(named){
    const id=["gemini",named[1].replace(",","."),named[2].replace(/\s+/g,"-"),named[3]?.replace(/\s+/g,"-")].filter(Boolean).join("-");
    return models.find(x=>x.provider==="google"&&x.id===id)||{unavailable:true,id};
  }
  const aliases=[
    [/\b(?:openai\s+)?(?:gpt[\s-]*5[.,]?6\s+)?sol\b|\bgpt[\s-]*5[.,]?6[\s-]*sol\b/,"gpt-5.6-sol","openai"],
    [/\b(?:openai\s+)?(?:gpt[\s-]*5[.,]?6\s+)?terra\b|\bgpt[\s-]*5[.,]?6[\s-]*terra\b/,"gpt-5.6-terra","openai"],
    [/\b(?:openai\s+)?gpt[\s-]*5[.,]?6[\s-]*luna\b|\bopenai\s+luna\b|\bluna\b/,"gpt-5.6-luna","openai"],
    [/\b(?:google\s+)?(?:supremo|trio\s+supremo|model\s+supremo|modelo\s+supremo|elite\s+pool|free\s+pool|pool\s+gratuito|pool\s+free|os\s+3|eles\s+3)\b|\b(?:gratuitos|modelos gratuitos)\s+(?:do|da)\s+google\b/,"google-free-pool","google"],
    [/\bgemini[\s-]*3[.,]?5[\s-]*flash[\s-]*lite\b/,"gemini-3.5-flash-lite","google"],
    [/\bgemini[\s-]*3[.,]?1[\s-]*flash[\s-]*lite\b|\bgemini\s+flash\s+lite\b/,"gemini-3.1-flash-lite","google"],
    [/\bgemma[\s-]*4[\s-]*31b(?:[\s-]*it)?\b/,"gemma-4-31b-it","google"],
    [/\bgemma[\s-]*4[\s-]*26b(?:[\s-]*a4b)?(?:[\s-]*it)?\b/,"gemma-4-26b-a4b-it","google"],
    [/\bgemini[\s-]*3[.,]?8[\s-]*flash\b/,"gemini-3.8-flash","google"],
    [/\bgemini[\s-]*3[.,]?7[\s-]*flash\b/,"gemini-3.7-flash","google"],
    [/\bgemini[\s-]*3[.,]?6[\s-]*flash\b/,"gemini-3.6-flash","google"],
    [/\bgemini[\s-]*2[.,]?5[\s-]*flash\b/,"gemini-3.6-flash","google"],
    [/\b(?:deepseek\s*)?(?:v4\s*)?flash\b|\bmodelo flash\b/,"deepseek-v4-flash","deepseek"],
    [/\bdeepseek\s*(?:v4\s*)?pro\b|\bv4\s*pro\b|\bmodelo\s+pro\b|\b(?:usa|use|bota|coloca|quero|vai de|escolhe|escolha)\s+(?:o\s+)?pro\b/,"deepseek-v4-pro","deepseek"]
    ,[/\b(?:blackcore\s+)?(?:modelo|model)\s+(?:local|offline)\b|\bllama[.\s-]*cpp\b/,"blackcore-local","local"]
  ];
  for(const [re,id,provider] of aliases)if(re.test(t)){const m=models.find(x=>x.id===id&&x.provider===provider);if(m)return m;}
  if(/\bgoogle ai studio\b|\baistudio\b|\bgemini api\b|\bgoogle\b/.test(t))return models.find(x=>x.provider==="google")||null;
  if(/\bdeepseek\b/.test(t))return models.find(x=>x.provider==="deepseek")||null;
  if(/\bopenai\b/.test(t))return models.find(x=>x.provider==="openai")||null;
  if(/\b(?:modelo|model)\s+(?:local|offline)\b|\bllama[.\s-]*cpp\b/.test(t))return models.find(x=>x.provider==="local")||null;
  return null;
}

export async function applyNaturalIntent(app,text){
  const t=norm(text),{agent,runtime,session}=app,{cfg,ui}=runtime;const changes=[];

  // Conversational model selection. Apply before sending the task so the requested model handles this turn.
  const modelVerb=/\b(usa|use|troca|troque|muda|mude|coloca|bota|quero|prefiro|escolho|vamos de|vamos com|pode usar|roda com|fica no|trabalha com|vai de|passa pro|passa para|modelo|switch|select|choose|pick)\b/;
  const mm=modelMatch(cfg,t);
  if(mm?.unavailable&&modelVerb.test(t)){
    ui.status(`Model ${mm.id} is not configured. Current model unchanged: ${agent.provider}/${agent.model}. Use /model to select an available model.`);
    return {handled:true,unavailableModel:mm.id};
  }
  if(mm&&modelVerb.test(t)){
    agent.setModel(mm.provider,mm.id);cfg.provider=mm.provider;cfg.model=mm.id;cfg.modelLock=true;cfg.autoRoute=false;cfg.autoFallback=false;agent.routeLockOnce=true;const rl=syncReasoningToCurrent(cfg,mm.provider,mm.id);runtime.saveConfig();changes.push(`model → ${mm.label||mm.id} · reasoning ${rl.label}`);
  }

  // Natural workflow mode. Do not force PLAN when the same sentence explicitly asks to implement afterwards.
  const asksPlan=/\b(so analisa|so analisar|apenas analisa|apenas analisar|so olha|so olhar|so ve|so ver|so da uma olhada|apenas olha|apenas veja|nao mexe|nao altere|nao altera|nao mude|nao muda|nao faz nada|sem editar|sem mudar nada|sem alterar|somente analise|quero entender antes|investiga primeiro|diagnostica primeiro|diagnostica sem alterar|primeiro mapeia|modo plano|modo plan)\b/;
  const asksAct=/\b(pode mexer|pode editar|pode alterar|mete a mao|bota a mao|manda ver|segue em frente|toca do comeco ao fim|faz completo|pode aplicar tudo|pode fazer|faz isso|resolve|resolva|conserta|conserte|aplica|aplique|faz as mudancas|faca as mudancas|corrige|corrija|implementa|implemente|modo acao|modo act)\b/;
  if(asksPlan.test(t)&&!asksAct.test(t)){agent.mode="PLAN";cfg.mode="PLAN";runtime.saveConfig();changes.push("mode → PLAN");}
  else if(asksAct.test(t)&&agent.mode!=="ACT"){agent.mode="ACT";cfg.mode="ACT";runtime.saveConfig();changes.push("mode → ACT");}

  const reasoningOff=/\b(sem raciocinio|sem reasoning|desliga(?:r)? (?:o )?raciocinio|desativa(?:r)? (?:o )?raciocinio|thinking off|reasoning off)\b/.test(t);
  const reasoningOn=/\b(liga(?:r)? (?:o )?raciocinio|ativa(?:r)? (?:o )?raciocinio|thinking on|reasoning on)\b/.test(t);
  const effortMatch=t.match(/\b(?:modo|raciocinio|reasoning|effort)?\s*(ultra|xhigh|extra high|maximo|maxima|max|high|alto|forte|medium|medio|balanced|balanceado|low|baixo|leve|minimal|minimo|minima)\b/);
  const wantsDeep=/\b(pensa mais|pensa bastante|pensa bem|pensa fundo|capricha(?: no raciocinio)?)\b/.test(t);
  if(reasoningOff||reasoningOn||effortMatch||wantsDeep){
    const requested=reasoningOff?"off":reasoningOn?"on":wantsDeep&&!effortMatch?"max":effortMatch?.[1]||"max";const level=resolveReasoning(cfg,agent.provider,agent.model,requested);
    if(level){setReasoning(cfg,agent.provider,agent.model,level.id);syncReasoningToCurrent(cfg,agent.provider,agent.model);runtime.saveConfig();changes.push(`reasoning → ${level.label}${/ultra|xhigh/.test(requested)&&level.id!=="max"?" (model native maximum)":""}`);}
  }
  if(/\b(?:escolhe|escolha|decide|decida) (?:o )?modelo (?:sozinho|automaticamente)|\bdeixa (?:voce|vc|tu) escolher (?:o )?modelo sozinho|\bmodelo automatico\b|\broteamento automatico\b|\bautomatic model(?: routing)?\b/.test(t)){cfg.autoRoute=true;cfg.modelLock=false;runtime.saveConfig();changes.push("model → automatic");}
  if(/\b(desliga|desative|sem|disable)\s+(?:as\s+)?animac|\banimations? off\b/.test(t)){cfg.animation=false;runtime.saveConfig();changes.push("animations → off");}
  if(/\b(liga|ative|com|enable)\s+(?:as\s+)?animac|\banimations? on\b/.test(t)){cfg.animation=true;runtime.saveConfig();changes.push("animations → on");}
  const languageMatch=t.match(/\b(?:responda|responde|fale|fala|reply|respond|speak)\s+(?:em\s+|in\s+)?(portugues|english|ingles|auto)\b/);
  if(languageMatch){const requestedLanguage=languageMatch[1];cfg.responseLanguage=/portugues/.test(requestedLanguage)?"pt-BR":/english|ingles/.test(requestedLanguage)?"en":"auto";runtime.saveConfig();changes.push(`response language → ${cfg.responseLanguage}`);}

  // Crash/interruption recovery is local and must work before any provider call.
  if(pure(t,/^(?:continua|continue|retoma|retome|resume|prossegue|prossiga)(?: exatamente)?(?: de onde| do ponto em que| a partir de onde)? (?:parou|paramos|tava|estava|ficou|interrompeu|interrompemos)(?: a tarefa| o trabalho)?$|^(?:retoma|resume|continua) (?:a )?(?:tarefa|trabalho) interrompid[oa]$/)){
    await app.resumeInterruptedTask(null,{ask:false});return {handled:true};
  }

  // High-confidence local controls should work even if no model/API is reachable.
  if(pure(t,/^(?:qual|que) modelo (?:voce|vc|tu)? ?(?:esta|ta)? usando\??$|^modelo atual\??$/)){
    const r=currentReasoning(cfg,agent.provider,agent.model);ui.status(`Using ${agent.provider}/${agent.model} · reasoning ${r.label}.`);return {handled:true};
  }
  if(pure(t,/^(?:desfaz|desfaca|desfazer|volta|reverte)(?: a| as| isso| ultima| a ultima)?.*$/)){
    try{ui.notify(await agent.checkpoints.undo());}catch(e){ui.notify(e.message,"warn");}return {handled:true};
  }
  if(pure(t,/^(?:nova|outra|abre (?:uma )?(?:nova|outra)|cria (?:uma )?(?:nova|outra)|comeca (?:uma )?(?:nova|outra)|inicia (?:uma )?(?:nova|outra)|zera (?:a )?) (?:conversa|sessao)$/)){
    await app.replaceSession(new SessionStore(runtime.cwd));ui.notify("new conversation started");return {handled:true};
  }
  if(pure(t,/^(?:continua|retoma|volta para) (?:a )?(?:ultima )?(?:conversa|sessao)$/)){
    const files=SessionStore.list(runtime.cwd).filter(f=>f!==app.session.file),file=files[0]||null;if(file){await app.replaceSession(new SessionStore(runtime.cwd,file));ui.notify("previous conversation resumed");}else ui.status("No previous conversation is available to resume.");return {handled:true};
  }
  if(pure(t,/^(?:sai|sair|fecha|fechar|encerra|encerrar)(?: o blackcore| isso| tudo| por aqui)?$/))return {handled:true,exit:true};

  // Pure control sentences should not spend tokens just to acknowledge a local setting change.
  if(changes.length&&!hasTask(t)){ui.status(changes.join(" · "));return {handled:true};}
  if(changes.length)ui.status(changes.join(" · "));
  return {handled:false,text,changes,hasTask:hasTask(t)};
}
