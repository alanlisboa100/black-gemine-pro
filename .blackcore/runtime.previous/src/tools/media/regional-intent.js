const TARGETS=[
  {id:"eyes",scope:"detail",terms:["olho","olhos","eye","eyes","iris","irises","pupila","pupilas"]},
  {id:"window",scope:"detail",terms:["janela","janelas","window","windows","vidro da janela","window glass"]},
  {id:"face",scope:"detail",terms:["rosto","face","facial","pele do rosto","skin on the face"]},
  {id:"hair",scope:"detail",terms:["cabelo","cabelos","hair"]},
  {id:"clothing",scope:"detail",terms:["roupa","roupas","camisa","camiseta","vestido","casaco","calca","short","clothes","clothing","shirt","dress","jacket","pants"]},
  {id:"sky",scope:"detail",terms:["ceu","sky"]},
  {id:"water",scope:"detail",terms:["agua","mar","rio","lago","piscina","water","sea","river","lake","pool"]},
  {id:"grass",scope:"detail",terms:["grama","gramado","vegetacao","folhagem","grass","vegetation","foliage"]},
  {id:"mountain",scope:"detail",terms:["morro","montanha","serra","mountain","hill"]},
  {id:"background",scope:"background",terms:["fundo","background","segundo plano"]},
  {id:"subject",scope:"subject",terms:["pessoa","personagem","sujeito","assunto principal","primeiro plano","person","subject","foreground"]}
];

const OPERATION_WORDS=["ajust","aplic","aument","baix","bot","coloc","corrig","clare","contraste","deix","diminu","destac","escure","expos","efeito","edit","ilumin","luz","melhor","nitid","realc","recuper","reduz","satur","brilho","bright","dark","edit","enhanc","exposure","highlight","light","sharpen","contrast","color","colour"];
const LOCAL_CUES=["so ","somente ","apenas ","exclusivamente ","unicamente ","nessa ","nesse ","nesta ","neste ","na parte ","no detalhe ","only ","just ","exclusively ","inside ","around "];
const FULL_CUES=["foto inteira","imagem inteira","imagem toda","foto toda","quadro inteiro","video inteiro","video todo","cena inteira","tela inteira","everything","entire photo","whole photo","entire image","whole image","entire video","whole video","full frame","globally","global"];

export function normalizeRegionalText(value=""){
  return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

function includesTerm(text,term){
  const normalized=normalizeRegionalText(term);return (` ${text} `).includes(` ${normalized} `);
}

function nearbyOperation(text,term){
  const at=text.indexOf(normalizeRegionalText(term));if(at<0)return false;const from=Math.max(0,at-64),to=Math.min(text.length,at+normalizeRegionalText(term).length+64),window=text.slice(from,to);return OPERATION_WORDS.some(word=>window.includes(word));
}

export function detectRegionalIntent(request=""){
  const text=normalizeRegionalText(request);if(!text)return {localized:false,target:null,targets:[],scope:null,reason:"no natural-language request supplied",text};
  const foundAll=TARGETS.filter(row=>row.terms.some(term=>includesTerm(text,term))),found=foundAll[0];
  const localCue=LOCAL_CUES.some(cue=>includesTerm(text,cue)),fullCue=FULL_CUES.some(cue=>text.includes(normalizeRegionalText(cue)));
  const targetOperation=found?.terms.some(term=>includesTerm(text,term)&&nearbyOperation(text,term))||false;
  const targetGrammar=found?.terms.some(term=>{
    const normalized=normalizeRegionalText(term);return [" na "," no "," nos "," nas "," da "," do "," dos "," das "," em "," on "," in "," of the "].some(prefix=>` ${text} `.includes(`${prefix}${normalized} `));
  })||false;
  const genericMatch=!found&&localCue?text.match(/(?:^| )(?:so|somente|apenas|exclusivamente|unicamente)(?: na| no| nas| nos| em| dentro da| dentro do)? ([a-z0-9][a-z0-9 ]{1,79})$/):null,genericPrompt=genericMatch?.[1]?.trim()||null,localized=Boolean((found&&(localCue||targetGrammar||targetOperation)||genericPrompt)&&!(fullCue&&!localCue));
  const targets=foundAll.map(row=>row.id);if(genericPrompt)targets.push("custom");return {localized,target:found?.id||genericPrompt&&"custom"||null,targets,regionPrompt:genericPrompt,scope:found?.scope||genericPrompt&&"detail"||null,reason:localized?`localized request targets ${genericPrompt||targets.join(", ")}`:fullCue?"explicit full-frame request":found?"target mentioned without a clear localized instruction":"no regional target detected",text};
}

function hasShapes(args={}){return Boolean(args.mask||(Array.isArray(args.regionBoxes)&&args.regionBoxes.length)||(Array.isArray(args.regionPolygons)&&args.regionPolygons.length));}
function bounded(value,min,max){const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):value;}

export function preparePhotoRegionalArgs(args={}){
  const detected=detectRegionalIntent(args.request),readOnly=["list_images","inspect","analyze"].includes(args.action);if(readOnly)return {args,intent:{...detected,selectorRequested:false}};
  const explicitScope=Object.prototype.hasOwnProperty.call(args,"editScope"),explicitTarget=String(args.regionTarget||"").trim(),multipleTargets=!explicitTarget&&detected.targets?.length>1,target=explicitTarget||(multipleTargets?"custom":detected.target)||null,regionPrompt=String(args.regionPrompt||detected.regionPrompt||(multipleTargets?detected.targets.join(", "):target)||"").trim();
  if(["auto_edit","adjust_light","adjust_color","enhance_details","denoise","blur"].includes(args.action)&&!String(args.request||"").trim()&&!explicitScope&&!hasShapes(args)&&!regionPrompt)throw new Error("photo edit requires the original request or an explicit editScope; an omitted scope is not allowed to default silently to the full photo");
  const selectorRequested=Boolean(regionPrompt||hasShapes(args)||explicitTarget),localized=detected.localized||selectorRequested||(explicitScope&&args.editScope&&args.editScope!=="full");
  if(localized&&explicitScope&&args.editScope==="full")throw new Error(`localized photo edit blocked: '${target||regionPrompt||"selected area"}' cannot use editScope=full; use detail/subject/background/mask with a real selection`);
  let editScope=args.editScope||"full";
  if(localized&&editScope==="full")editScope=target==="background"?"background":target==="subject"?"subject":"detail";
  if((Array.isArray(args.regionBoxes)&&args.regionBoxes.length)||(Array.isArray(args.regionPolygons)&&args.regionPolygons.length))editScope="detail";
  const prepared={...args,editScope,...(regionPrompt?{regionPrompt}:{}),...(target?{regionTarget:target}:{})};
  if(target==="window"&&prepared.action==="auto_edit")Object.assign(prepared,{editLevel:"basic",visualStyle:"natural",strength:Math.min(Number(prepared.strength??0.35),0.45),enhanceColor:false,enhanceDetails:false,denoise:false});
  if(target==="eyes"&&prepared.action==="auto_edit")Object.assign(prepared,{editLevel:"medium",visualStyle:"cinematic",strength:Math.min(Number(prepared.strength??0.4),0.55),denoise:false});
  if(target==="face"&&prepared.action==="auto_edit")prepared.strength=Math.min(Number(prepared.strength??0.5),0.65);
  if(target==="window"){prepared.brightness=bounded(prepared.brightness,-60,15);prepared.contrast=bounded(prepared.contrast,-40,30);prepared.exposure=bounded(prepared.exposure,-2,0.3);prepared.gamma=bounded(prepared.gamma,0.65,1.8);}
  if(target==="eyes"){prepared.brightness=bounded(prepared.brightness,-12,24);prepared.contrast=bounded(prepared.contrast,-18,25);prepared.exposure=bounded(prepared.exposure,-0.2,0.45);prepared.saturation=bounded(prepared.saturation,-20,30);prepared.detailAmount=bounded(prepared.detailAmount,0.1,1.6);prepared.maskFeather=bounded(prepared.maskFeather??2,1,8);}
  if(target==="face"){prepared.brightness=bounded(prepared.brightness,-30,30);prepared.contrast=bounded(prepared.contrast,-30,30);prepared.exposure=bounded(prepared.exposure,-0.7,0.7);prepared.saturation=bounded(prepared.saturation,-35,35);prepared.detailAmount=bounded(prepared.detailAmount,0.1,1.8);}
  return {args:prepared,intent:{...detected,localized,target,scope:editScope,selectorRequested}};
}

export function assertVideoRegionalRouting(args={}){
  const detected=detectRegionalIntent(args.request);if(["list_media","inspect","analyze","detect_silence","detect_scenes","detect_black","detect_beats"].includes(args.action))return {...detected,localized:detected.localized,target:args.regionTarget||detected.target||null};
  if(["auto_edit","denoise","color_grade"].includes(args.action)&&!String(args.request||"").trim())throw new Error(`${args.action} requires the original natural-language request; BLACKCORE will not guess whether a whole-frame effect was intended`);
  const cameraFocus=detected.target==="face"&&/(?:zoom|aproxim|aproxime|foco|focar|close.?up|punch.?in|ida e volta|in.?out)/i.test(detected.text||"");
  const selectorRequested=Boolean(args.regionPrompt||args.regionTarget||args.maskVideo||args.temporalSegmentationEndpoint),localized=(detected.localized&&!cameraFocus)||selectorRequested;
  if(localized&&args.action!=="regional_edit")throw new Error(`localized video edit blocked: '${args.regionTarget||detected.target||args.regionPrompt||"selected area"}' requires action=regional_edit with a temporal mask; BLACKCORE will not apply it to every frame`);
  if(args.action==="regional_edit"&&!args.maskVideo&&!args.temporalSegmentationEndpoint&&!process.env.BLACKCORE_VIDEO_SEGMENT_ENDPOINT)throw new Error("regional video editing requires maskVideo or BLACKCORE_VIDEO_SEGMENT_ENDPOINT for temporal tracking; a global fallback is forbidden");
  return {...detected,localized,cameraFocus,target:args.regionTarget||detected.target||null};
}

export function regionalVideoFilter(args={}){
  const target=String(args.regionTarget||detectRegionalIntent(args.request).target||args.regionPrompt||"custom"),filters=[];
  let brightness=Math.max(-1,Math.min(1,Number(args.brightness||0)/100)),contrast=Math.max(0.2,Math.min(3,1+Number(args.contrast||0)/100)),saturation=Math.max(0,Math.min(3,1+Number(args.saturation||0)/100)),gamma=Math.max(0.2,Math.min(3,Number(args.gamma||1))),exposure=Math.max(-2,Math.min(2,Number(args.exposure||0)));
  if(target==="eyes"){brightness=Math.max(-0.06,Math.min(0.18,brightness));contrast=Math.max(0.85,Math.min(1.22,contrast));saturation=Math.max(0.8,Math.min(1.28,saturation));exposure=Math.max(-0.15,Math.min(0.35,exposure));}
  if(target==="window"){brightness=Math.max(-0.45,Math.min(0.08,brightness));contrast=Math.max(0.72,Math.min(1.25,contrast));exposure=Math.max(-1.6,Math.min(0.15,exposure));}
  const eqBrightness=Math.max(-1,Math.min(1,brightness+(2**exposure-1)*0.22));if(Math.abs(eqBrightness)>0.0001||Math.abs(contrast-1)>0.0001||Math.abs(saturation-1)>0.0001||Math.abs(gamma-1)>0.0001)filters.push(`eq=brightness=${eqBrightness.toFixed(4)}:contrast=${contrast.toFixed(4)}:saturation=${saturation.toFixed(4)}:gamma=${gamma.toFixed(4)}`);
  const detail=Math.max(0,Math.min(target==="eyes"?1.4:2.5,Number(args.detailAmount||0)));if(detail>0)filters.push(`unsharp=5:5:${detail.toFixed(3)}:3:3:0`);
  const blur=Math.max(0,Math.min(30,Number(args.blurRadius||0)));if(blur>0)filters.push(`gblur=sigma=${blur.toFixed(3)}`);
  if(!filters.length)throw new Error("regional_edit requires at least one visible light, color, detail or blur adjustment");return {filter:filters.join(","),target};
}
