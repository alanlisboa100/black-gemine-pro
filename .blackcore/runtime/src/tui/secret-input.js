import readline from "node:readline/promises";
import {stdin as input,stdout as output} from "node:process";

export async function askSecret(prompt="Secret: ",{allowEmpty=true}={}){
  // Non-interactive fallback (CI/pipes). In a real terminal, input is hidden.
  if(!input.isTTY||!output.isTTY||typeof input.setRawMode!=="function"){
    const rl=readline.createInterface({input,output});
    try{const value=await rl.question(prompt);if(!allowEmpty&&!value.trim())throw new Error("A non-empty secret is required");return value.trim();}
    finally{rl.close();}
  }
  return await new Promise((resolve,reject)=>{
    let value="",settled=false,wasRaw=!!input.isRaw;
    const cleanup=()=>{input.off("data",onData);try{input.setRawMode(wasRaw);}catch{};if(!wasRaw)input.pause();};
    const finish=(err,result)=>{if(settled)return;settled=true;cleanup();output.write("\n");err?reject(err):resolve(result);};
    const onData=chunk=>{
      const s=chunk.toString("utf8");
      for(const ch of s){
        if(ch==="\u0003")return finish(Object.assign(new Error("Interrupted"),{code:"SIGINT"}));
        if(ch==="\r"||ch==="\n"){
          const result=value.trim();if(!allowEmpty&&!result){output.write("\nValue required. ");value="";continue;}return finish(null,result);
        }
        if(ch==="\u007f"||ch==="\b"){value=value.slice(0,-1);continue;}
        if(ch==="\u001b")continue;
        if(ch>=" ")value+=ch;
      }
    };
    output.write(prompt);input.setEncoding("utf8");input.setRawMode(true);input.resume();input.on("data",onData);
  });
}
