import readline from "node:readline/promises";
export async function choose(rl,title,items,{format=x=>String(x),allowCancel=true}={}){
  if(!items.length)return null;process.stdout.write(`\n${title}\n`);items.forEach((x,i)=>process.stdout.write(`${String(i+1).padStart(2)}. ${format(x)}\n`));
  const ans=(await rl.question(allowCancel?"Select (Enter cancels): ":"Select: ")).trim();if(!ans&&allowCancel)return null;const n=Number(ans);return Number.isInteger(n)&&n>=1&&n<=items.length?items[n-1]:null;
}
