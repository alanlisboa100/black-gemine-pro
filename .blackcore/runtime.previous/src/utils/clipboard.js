import {spawnSync} from "node:child_process";
import {which} from "./exec.js";

export async function clipboardSet(text){
  const candidates=process.platform==="darwin"?[["pbcopy",[]]]:[["termux-clipboard-set",[]],["wl-copy",[]],["xclip",["-selection","clipboard"]],["xsel",["--clipboard","--input"]]];
  for(const [cmd,args] of candidates)if(await which(cmd)){const r=spawnSync(cmd,args,{input:String(text),encoding:"utf8"});if(r.status===0)return cmd;}
  throw new Error("no clipboard command found (Termux: install Termux:API + pkg install termux-api)");
}
export async function clipboardGet(){
  const candidates=process.platform==="darwin"?[["pbpaste",[]]]:[["termux-clipboard-get",[]],["wl-paste",["--no-newline"]],["xclip",["-selection","clipboard","-o"]],["xsel",["--clipboard","--output"]]];
  for(const [cmd,args] of candidates)if(await which(cmd)){const r=spawnSync(cmd,args,{encoding:"utf8",maxBuffer:10_000_000});if(r.status===0)return r.stdout||"";}
  throw new Error("no clipboard command found");
}
