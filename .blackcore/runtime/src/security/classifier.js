const CRITICAL=[
  /\brm\s+-rf\s+\/(?:\s|$)/i,
  /\bmkfs(?:\.\w+)?\b/i,
  /\bdd\s+if=.*\bof=\/dev\//i,
  /\b(?:shutdown|reboot|poweroff|halt)\b/i,
  /\bchmod\s+-R\s+777\s+\/(?:\s|$)/i,
  /\bchown\s+-R\b.*\s+\/(?:\s|$)/i,
  />\s*\/dev\/sd[a-z]\b/i,
  /\b(?:wipefs|fdisk|parted)\b.*\/dev\//i,
  /\bkill\s+-9\s+-1\b/i,
  /\b:>\s*\/etc\/(?:passwd|shadow)\b/i
];
const SENSITIVE=[
  /\b(?:cat|head|tail|less|more|sed|awk|grep)\b[^\n]*(?:\.env(?:\.|\s|$)|id_rsa|id_ed25519|credentials|secrets?\.(?:json|ya?ml|toml)|\.npmrc|\.netrc|\.pem\b)/i,
  /\b(?:printenv)\b/i,
  /\b(?:curl|wget|scp|nc)\b[^\n]*(?:\$[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)|id_rsa|id_ed25519|\.env)/i
];
const DANGER=[
  /\brm\b/i,/\bgit\s+(?:reset\s+--hard|clean\s+-[fdx]+|checkout\s+--\s+\.)/i,
  /\bgit\s+push\b.*(?:--force|-f)\b/i,/\bnpm\s+publish\b/i,/\bpnpm\s+publish\b/i,
  /\bvercel\b.*(?:--prod|deploy)/i,/\bnetlify\b.*(?:--prod|deploy)/i,/\bsupabase\s+(?:functions\s+deploy|db\s+(?:push|reset)|secrets\s+(?:set|unset))\b/i,/\bresend\s+emails\s+send\b/i,/\beas\s+(?:build|submit|update)\b/i,
  /\bexpo\s+(?:publish|export)\b/i,/\bcurl\b.*\|\s*(?:sh|bash)\b/i,
  /\bwget\b.*\|\s*(?:sh|bash)\b/i,/\bsudo\b/i,/\bchmod\b/i,/\bchown\b/i,
  /\b(?:apt|pkg|dnf|yum|pacman)\s+(?:remove|purge|uninstall)\b/i
];
const NETWORK=[/\bcurl\b/i,/\bwget\b/i,/\bssh\b/i,/\bscp\b/i,/\bgh\b/i,/\bvercel\b/i,/\bnetlify\b/i,/\bsupabase\b/i,/\bresend\b/i,/\beas\b/i,/\bnpm\b/i,/\bpnpm\b/i,/\byarn\b/i];
function stripSafeTempCleanup(command=""){
  // Validation commonly creates one temporary file and removes that exact file.
  // This should not interrupt the tool loop with a destructive-action prompt.
  // Recursive deletion, globs, variables and non-temp paths remain protected.
  return String(command).replace(/\brm\s+-f\s+(?:--\s+)?\/?(?:tmp|data\/data\/com\.termux\/files\/usr\/tmp)\/[A-Za-z0-9._-]+\b/g,"true");
}
function criticalRecursiveRemove(command=""){
  const protectedRoots=new Set(["/","/bin","/boot","/dev","/etc","/lib","/lib64","/proc","/root","/sbin","/sys","/usr","/var"]);
  for(const match of String(command).matchAll(/(?:^|[;&|\n]\s*)rm\s+([^;&|\n]+)/gi)){
    const tokens=match[1].match(/"[^"]*"|'[^']*'|\S+/g)||[];let recursive=false,force=false,noPreserve=false;const targets=[];
    for(const raw of tokens){const token=raw.replace(/^['"]|['"]$/g,"");if(token==="--"){continue;}if(token==="--recursive")recursive=true;else if(token==="--force")force=true;else if(token==="--no-preserve-root")noPreserve=true;else if(/^-[^-]/.test(token)){recursive||=/r/.test(token.slice(1));force||=/f/.test(token.slice(1));}else targets.push(token.replace(/\/+$/,"")||"/");}
    if(recursive&&force&&(noPreserve||targets.some(target=>protectedRoots.has(target))))return true;
  }
  return false;
}
export function classifyCommand(command=""){
  if(criticalRecursiveRemove(command))return {level:"critical",reason:"recursive forced removal of a protected system root"};
  for(const r of CRITICAL)if(r.test(command))return {level:"critical",reason:r.toString()};
  for(const r of SENSITIVE)if(r.test(command))return {level:"sensitive",reason:r.toString()};
  const dangerView=stripSafeTempCleanup(command);
  for(const r of DANGER)if(r.test(dangerView))return {level:"danger",reason:r.toString()};
  for(const r of NETWORK)if(r.test(command))return {level:"network",reason:r.toString()};
  return {level:"normal",reason:""};
}
