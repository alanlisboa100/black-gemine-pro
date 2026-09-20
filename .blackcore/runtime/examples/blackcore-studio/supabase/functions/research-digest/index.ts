const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
type ResearchItem={title?:string;content?:string;source_url?:string|null;tags?:string[]};

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(request.method!=="POST")return Response.json({error:"method_not_allowed"},{status:405,headers:cors});
  if(!request.headers.get("authorization"))return Response.json({error:"authentication_required"},{status:401,headers:cors});
  try{
    const body=await request.json(),items=(Array.isArray(body?.items)?body.items:[]).slice(0,30) as ResearchItem[],research=items.filter(item=>item&&typeof item==="object"),domains=[...new Set(research.map(item=>{try{return item.source_url?new URL(item.source_url).hostname:null;}catch{return null;}}).filter(Boolean))];
    const highlights=research.slice(0,8).map(item=>({title:String(item.title||"Sem título").slice(0,120),summary:String(item.content||"").replace(/\s+/g," ").slice(0,240),source:item.source_url||null}));
    return Response.json({generated_at:new Date().toISOString(),items:research.length,sources:research.filter(item=>item.source_url).length,unique_domains:domains.length,domains,highlights,note:"Digest estrutural; valide as fontes antes de concluir."},{headers:{...cors,"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:"invalid_request",message:error instanceof Error?error.message:"unknown error"},{status:400,headers:cors});}
});
