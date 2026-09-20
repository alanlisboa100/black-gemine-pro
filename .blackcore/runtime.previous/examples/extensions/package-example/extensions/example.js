export default function(api){
  api.registerTool({name:"hello_blackcore",description:"Return a greeting from a BLACKCORE extension.",parameters:{type:"object",properties:{name:{type:"string"}},additionalProperties:false},readOnly:true,parallelSafe:true,async execute(a){return `Olá ${a.name||"mundo"} — extensão BLACKCORE ativa.`;}});
  api.registerCommand("hello",async({ui,arg})=>ui.notify(`hello ${arg||"BLACKCORE"}`),{description:"extension hello"});
}
