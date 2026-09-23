import path from "node:path";

const REDACTED="[REDACTED]";
const SENSITIVE_BASENAMES=new Set([
  ".env",".npmrc",".netrc",".pypirc",".dockercfg",
  "id_rsa","id_dsa","id_ecdsa","id_ed25519","credentials",
  "credentials.json","secrets.json","secret.json","auth.json",
  "login data","cookies","web data"
]);

function normPath(input){
  return String(input??"").replace(/\\/g,"/").replace(/\/{2,}/g,"/").toLowerCase();
}

export function isSensitivePath(input){
  const p=normPath(input);if(!p)return false;
  const base=path.posix.basename(p);
  if(SENSITIVE_BASENAMES.has(base))return true;
  if(/^\.env(?:\..+)?$/.test(base))return true;
  if(/(?:^|[-_.])(?:secret|secrets|credential|credentials)(?:[-_.]|$)/i.test(base))return true;
  if(/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(base))return true;
  if(/^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.pub)?$/i.test(base))return true;
  if(/\/(?:\.ssh|\.gnupg|\.aws|\.azure|\.config\/gcloud)(?:\/|$)/i.test(p))return true;
  if(/\/\.blackcore\/config\/secrets\.json$/i.test(p))return true;
  if(/\/browser\/profiles\/.*\/(?:login data|cookies|web data|local state)$/i.test(p))return true;
  return false;
}

function sensitiveKeyName(key){
  const k=String(key||"");
  return /^(?:authorization|proxy-authorization|cookie|set-cookie|password|passwd|pwd|token|access_token|refresh_token|id_token|api_key|apikey|client_secret|private_key)$/i.test(k)
    || /(?:^|_)(?:api_?key|access_?token|refresh_?token|auth_?token|secret|password|passwd|private_?key)$/i.test(k);
}

function redactText(input){
  let s=String(input??"");
  // PEM / private key blocks.
  s=s.replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/g,REDACTED);
  // Authorization headers and common key=value forms.
  s=s.replace(/\b(authorization\s*:\s*(?:bearer|basic)\s+)[^\s,;"']+/gi,`$1${REDACTED}`);
  s=s.replace(/\b((?:openai|deepseek|gemini|google|anthropic|github|gitlab|slack|supabase|vercel|netlify|aws)?[_-]?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\s*[=:]\s*)(["']?)[^\s,;"']+\2/gi,`$1${REDACTED}`);
  // Provider/token shapes. Keep this conservative enough to avoid redacting normal prose.
  s=s.replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g,REDACTED);
  s=s.replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g,REDACTED);
  s=s.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,REDACTED);
  s=s.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,REDACTED);
  s=s.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,REDACTED);
  s=s.replace(/\bAKIA[0-9A-Z]{16}\b/g,REDACTED);
  // JWTs and obvious credentials embedded in URLs.
  s=s.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,REDACTED);
  s=s.replace(/(\b[a-z][a-z0-9+.-]{0,31}:\/\/[^\s/:@]+:)[^\s/@]+(@)/gi,`$1${REDACTED}$2`);
  // OAuth/session query parameters in returned URLs.
  s=s.replace(/([?&](?:code|access_token|refresh_token|id_token|session|token)=)[^&#\s]+/gi,`$1${REDACTED}`);
  return s;
}

function redactValue(value,key=""){
  if(sensitiveKeyName(key))return REDACTED;
  if(typeof value==="string")return redactText(value);
  if(Array.isArray(value))return value.map(v=>redactValue(v));
  if(value&&typeof value==="object"){
    const out={};for(const [k,v] of Object.entries(value))out[k]=redactValue(v,k);return out;
  }
  return value;
}

export function redactSecrets(input){
  if(input===null||input===undefined)return String(input??"");
  const text=typeof input==="string"?input:String(input);
  try{return JSON.stringify(redactValue(JSON.parse(text)));}catch{return redactText(text);}
}
