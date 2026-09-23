const PRESETS=Object.freeze([
  {id:"clean-natural",aliases:["natural","clean","clean-natural"],label:"Natural limpo",visualStyle:"natural",strength:0.58,contrastOffset:0,saturationOffset:0,temperature:0,tint:0,detailBoost:0,description:"corrige luz e cor com acabamento discreto, sem recorte ou marca d’água"},
  {id:"cinematic-balanced",aliases:["cinematic","cinematografico","cinematográfico","film"],label:"Cinematográfico equilibrado",visualStyle:"cinematic",strength:0.78,contrastOffset:0,saturationOffset:0,temperature:0.08,tint:0,detailBoost:0.06,description:"separa sombras e realces com cor cinematográfica controlada"},
  {id:"blackcore-dark",aliases:["blackcore","dark","dramatico","dramático","noir"],label:"BLACKCORE Dark",visualStyle:"blackcore-dark",strength:1,contrastOffset:0,saturationOffset:0,temperature:0.04,tint:0,detailBoost:0.08,description:"contraste forte, pretos profundos e textura protegida"},
  {id:"warm-vintage",aliases:["vintage","warm","quente"],label:"Vintage quente",visualStyle:"cinematic",strength:0.68,contrastOffset:-0.5,saturationOffset:-3,temperature:0.7,tint:0.12,detailBoost:-0.02,description:"calor suave e contraste envelhecido sem aplicar filtro destrutivo"},
  {id:"social-pop",aliases:["social","pop","instagram","vibrante"],label:"Social Pop",visualStyle:"natural",strength:0.74,contrastOffset:2,saturationOffset:9,temperature:0.05,tint:0,detailBoost:0.12,description:"cor e separação mais vivas para publicação em redes sociais"},
  {id:"mono-noir",aliases:["monochrome","monocromatico","monocromático","preto e branco","p&b"],label:"Mono Noir",visualStyle:"blackcore-dark",strength:0.9,contrastOffset:2,saturationOffset:-100,temperature:0,tint:0,detailBoost:0.1,monochrome:true,description:"preto e branco de alto contraste com detalhe preservado"},
  {id:"studio-neutral",aliases:["studio","estudio","estúdio","produto","product"],label:"Studio neutro",visualStyle:"natural",strength:0.64,contrastOffset:1,saturationOffset:1,temperature:0,tint:0,detailBoost:0.16,description:"acabamento limpo para produto, catálogo e retrato bem iluminado"}
]);

function normalize(value=""){return String(value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[._]+/g,"-").replace(/\s+/g,"-");}

export function resolvePhotoEffectPreset(value){
  const needle=normalize(value);if(!needle)return null;
  return PRESETS.find(row=>normalize(row.id)===needle||row.aliases.some(alias=>normalize(alias)===needle))||null;
}

export function listPhotoEffectPresets(){
  return PRESETS.map(({aliases,...preset})=>({...preset,aliases:[...aliases]}));
}

export function photoEffectPack(){
  return {id:"blackcore-photo-studio",title:"BLACKCORE Photo Studio",version:"1.0.0",engine:"ImageMagick local",presets:listPhotoEffectPresets(),notes:["Presets alteram pixels de forma reproduzível no telefone.","Nenhum preset faz reconhecimento facial ou segmentação sem um backend real.","O original permanece intacto e o resultado passa pelo quality gate."]};
}
