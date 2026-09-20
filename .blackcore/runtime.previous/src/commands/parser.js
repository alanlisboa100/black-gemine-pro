export function parseSlash(input){
  if(!input.startsWith("/"))return null;const body=input.slice(1).trim(),m=body.match(/^(\S+)(?:\s+([\s\S]*))?$/);return m?{name:m[1].toLowerCase(),arg:m[2]||"",raw:body}:null;
}
export function parseCli(argv){
  const out={_:[],images:[]};for(let i=0;i<argv.length;i++){const a=argv[i];if(a==="-p"||a==="--print")out.print=argv[++i]||"";else if(a==="--image"||a==="-i")out.images.push(argv[++i]||"");else if(a==="--rpc")out.rpc=true;else if(a==="--events")out.events=true;else if(a==="-c"||a==="--continue")out.cont=true;else if(a==="-r"||a==="--resume")out.resume=true;else if(a==="--session")out.session=argv[++i];else if(a==="--model")out.model=argv[++i];else if(a==="--provider")out.provider=argv[++i];else if(a==="--mode")out.mode=(argv[++i]||"").toUpperCase();else if(a==="--no-session")out.noSession=true;else if(a==="--name")out.name=argv[++i];else out._.push(a);}out.images=out.images.filter(Boolean);return out;
}
