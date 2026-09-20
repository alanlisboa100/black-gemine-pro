const REMOTE_SERVICE_TOOLS=new Set(["vercel","netlify","supabase","resend","expo","eas","github","deploy_preflight"]);
const REMOTE_TERMS=/\b(?:vercel|netlify|supabase|resend|github|expo|eas|deploy(?:ment|ar|a)?|publish(?:ing)?|publica(?:r|cao)?|publique|hosped(?:ar|agem|e)|coloca(?:r)?.{0,28}\bno\s+ar|poe.{0,28}\bno\s+ar|sub(?:ir|a)\s+(?:para\s+)?producao|manda(?:r)?\s+(?:para|pra)\s+producao|lanca(?:r)?\s+(?:em\s+)?producao|push)\b/i;
const NEGATED_REMOTE=/(?:\bnao\b|\bsem\b|\bnever\b|\bdon'?t\b|\bdo not\b|\bwithout\b).{0,56}\b(?:vercel|netlify|supabase|resend|github|expo|eas|deploy|publish|publica(?:r)?|publique|hospedar|coloca(?:r)?.{0,28}\bno\s+ar|poe.{0,28}\bno\s+ar|subir|producao|push)\b/i;
const REMOTE_SHELL=/\b(?:vercel|netlify|supabase|resend|eas)\b/i;
const ARCHIVE_TERMS=/\b(?:zip|\.zip\b|tar(?:\.gz)?|arquivo\s+compactado|compacta|compactar|comprimi|comprimir|empacota|empacotar|gera(?:r)?\s+(?:um\s+)?pacote|faz(?:er)?\s+(?:um\s+)?pacote|manda(?:r)?\s+(?:em|num)\s+zip|exporta(?:r)?\s+(?:em\s+)?zip|archive|compress|package\s+(?:it|this|project))\b/i;

const fold=value=>String(value||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();

export function createTaskScope(text=""){
  const original=String(text||""),source=fold(original);
  const remoteAllowed=!NEGATED_REMOTE.test(source)&&REMOTE_TERMS.test(source);
  const archiveAllowed=ARCHIVE_TERMS.test(source);
  return {text:original,remoteAllowed,archiveAllowed,kind:remoteAllowed?"remote-explicit":"local-default"};
}

export function toolsForTask(tools=[],text=""){
  const scope=createTaskScope(text);
  return scope.remoteAllowed?tools:tools.filter(tool=>!REMOTE_SERVICE_TOOLS.has(tool.name));
}

export function blockedByTaskScope(name,args={},scope){
  if(!scope)return false;
  if(name==="archive"&&["zip","tar_gz"].includes(args.action)&&!scope.archiveAllowed)return true;
  if(scope.remoteAllowed)return false;
  if(REMOTE_SERVICE_TOOLS.has(name))return true;
  if(name==="git"&&args.action==="push")return true;
  if((name==="bash"||name==="shell_session")&&REMOTE_SHELL.test(String(args.command||args.script||"")))return true;
  return false;
}

export function taskScopeBlockMessage(name,args={},scope={}){
  if(name==="archive"&&["zip","tar_gz"].includes(args.action)&&!scope.archiveAllowed)return "BLOCKED: archive creation was not requested. Keep the user project as a normal folder and create ZIP/TAR files only when the user explicitly asks to compact, package, or archive it.";
  return `BLOCKED: ${name} is a remote/deploy action, but the current request is local. Test or build locally first. Use a remote service only when the user explicitly asks to deploy, publish, or use that service.`;
}
