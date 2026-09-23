export const PRODUCT_SCORES=[
  {id:"understanding",name:"Naturalidade contextual",score:9.1,status:"Pronto para piloto",evidence:"254 casos contextuais/adversariais, continuidade longa, gate de ambiguidade e recuperação por evidência.",limit:"Ainda não houve benchmark pago, humano e comparativo contra Codex em projetos reais."},
  {id:"core",name:"Agente e ferramentas",score:9.8,status:"Pronto",evidence:"67 ferramentas nativas, auditoria em Markdown, schema, cancelamento, checkpoints e suíte automatizada.",limit:"A qualidade final ainda depende do modelo, das credenciais e dos gates realmente executados."},
  {id:"tui",name:"Terminal e código",score:9.7,status:"Pronto",evidence:"Markdown multilinha, código numerado, tabelas, fontes e layout de 54 colunas.",limit:"Highlight é leve e não substitui um parser completo de linguagem."},
  {id:"studio",name:"BLACKCORE Studio",score:9.4,status:"Pronto para piloto",evidence:"PWA responsiva, offline-first, filtros, resumos, pesquisa, código e acessibilidade.",limit:"Não é um IDE completo e não executa código dentro do navegador."},
  {id:"research",name:"Pesquisa web",score:9.2,status:"Pronto com revisão",evidence:"Busca multi-consulta, deduplicação, domínio, tipo de fonte e snippets.",limit:"Resultados de descoberta precisam ser abertos e confrontados antes da conclusão."},
  {id:"supabase",name:"Supabase",score:9.1,status:"Pronto para integração",evidence:"Stack local, link, migrations, lint, testes, tipos, Functions e secrets por arquivo.",limit:"Produção depende de Docker, CLI, login, projeto remoto e confirmação explícita."},
  {id:"mobile",name:"App Android / Expo",score:8.8,status:"Fonte pronta",evidence:"Fixture atualizada para Expo SDK 57, React 19.2 e React Native 0.86.",limit:"APK assinado e teste em aparelho exigem EAS ou toolchain Android externo."},
  {id:"delivery",name:"Deploy e entrega",score:8.9,status:"Pronto com credenciais",evidence:"Preflight e ferramentas Vercel, Netlify, Supabase, Expo/EAS, GitHub e Resend.",limit:"Nenhuma conta externa foi alterada ou validada ao vivo nesta auditoria."}
];

export const SEED_ITEMS=[
  {id:"c0a80101-0000-4000-8000-000000000001",kind:"code",title:"Cliente Supabase seguro",language:"javascript",content:"const api = new SupabaseWorkspace({ url, publishableKey });\nawait api.signIn(email, password);\nconst items = await api.listItems();",source_url:"https://supabase.com/docs",tags:["supabase","auth"],pinned:true,created_at:"2026-08-12T12:00:00.000Z",updated_at:"2026-08-12T12:00:00.000Z"},
  {id:"c0a80101-0000-4000-8000-000000000002",kind:"summary",title:"Resumo da entrega 3.4",language:null,content:"Entendimento contextual agora resolve referências recentes, conserva restrições e bloqueia mutações realmente ambíguas.\nFalhas de ferramentas geram replanejamento por evidência.\nA interface de código, pesquisa e integração Supabase completa da 3.3 continuam incluídas.",source_url:null,tags:["release","resumo","contexto"],pinned:true,created_at:"2026-08-12T12:05:00.000Z",updated_at:"2026-08-12T18:00:00.000Z"},
  {id:"c0a80101-0000-4000-8000-000000000003",kind:"research",title:"Supabase CLI: fluxo local",language:null,content:"A CLI roda a stack local em containers; migrations e políticas RLS ficam versionadas no repositório. O ambiente local é de desenvolvimento e não deve ser exposto à internet.",source_url:"https://supabase.com/docs/guides/local-development/cli/getting-started",tags:["pesquisa","fonte-oficial"],pinned:false,created_at:"2026-08-12T12:10:00.000Z",updated_at:"2026-08-12T12:10:00.000Z"}
];

export function scoreTone(score){return score>=9.5?"excellent":score>=9?"strong":score>=8?"ready":"limited";}
function safeSourceUrl(value){if(!value)return null;try{const url=new URL(String(value));return /^https?:$/.test(url.protocol)?url.href.slice(0,2000):null;}catch{return null;}}
export function normalizeItem(item={}){
  const now=new Date().toISOString(),kind=["code","summary","research"].includes(item.kind)?item.kind:"summary";
  return {id:item.id||crypto.randomUUID(),kind,title:String(item.title||"Sem título").trim().slice(0,120),language:kind==="code"?String(item.language||"text").slice(0,30):null,content:String(item.content||"").slice(0,50000),source_url:safeSourceUrl(item.source_url),tags:[...new Set((item.tags||[]).map(tag=>String(tag).trim().toLowerCase()).filter(Boolean))].slice(0,12),pinned:item.pinned===true,created_at:item.created_at||now,updated_at:item.updated_at||now};
}
export function filterItems(items,{kind="all",query=""}={}){
  const needle=String(query).trim().toLocaleLowerCase("pt-BR");return items.filter(item=>(kind==="all"||item.kind===kind)&&(!needle||[item.title,item.content,item.language,...(item.tags||[])].some(value=>String(value||"").toLocaleLowerCase("pt-BR").includes(needle)))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updated_at).localeCompare(String(a.updated_at)));
}
export function mergeItems(local=[],remote=[]){
  const map=new Map();for(const item of [...local,...remote]){const normalized=normalizeItem(item),prior=map.get(normalized.id);if(!prior||String(normalized.updated_at)>=String(prior.updated_at))map.set(normalized.id,normalized);}return [...map.values()].sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
}
