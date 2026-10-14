const PRESETS=Object.freeze([
  {id:"clean-natural",aliases:["natural","clean","clean-natural"],label:"Natural limpo",visualStyle:"natural",strength:0.58,contrastOffset:0,saturationOffset:0,temperature:0,tint:0,detailBoost:0,description:"corrige luz e cor com acabamento discreto, sem recorte ou marca d’água"},
  {id:"cinematic-balanced",aliases:["cinematic","cinematografico","cinematográfico","film"],label:"Cinematográfico equilibrado",visualStyle:"cinematic",strength:0.78,contrastOffset:0,saturationOffset:0,temperature:0.08,tint:0,detailBoost:0.06,description:"separa sombras e realces com cor cinematográfica controlada"},
  {id:"blackcore-dark",aliases:["blackcore","dark","dramatico","dramático","noir"],label:"BLACKCORE Dark",visualStyle:"blackcore-dark",strength:1,contrastOffset:0,saturationOffset:0,temperature:0.04,tint:0,detailBoost:0.08,description:"contraste forte, pretos profundos e textura protegida"},
  {id:"warm-vintage",aliases:["vintage","warm","quente"],label:"Vintage quente",visualStyle:"cinematic",strength:0.68,contrastOffset:-0.5,saturationOffset:-3,temperature:0.7,tint:0.12,detailBoost:-0.02,description:"calor suave e contraste envelhecido sem aplicar filtro destrutivo"},
  {id:"social-pop",aliases:["social","pop","instagram","vibrante"],label:"Social Pop",visualStyle:"natural",strength:0.74,contrastOffset:2,saturationOffset:9,temperature:0.05,tint:0,detailBoost:0.12,description:"cor e separação mais vivas para publicação em redes sociais"},
  {id:"mono-noir",aliases:["monochrome","monocromatico","monocromático","preto e branco","p&b"],label:"Mono Noir",visualStyle:"blackcore-dark",strength:0.9,contrastOffset:2,saturationOffset:-100,temperature:0,tint:0,detailBoost:0.1,monochrome:true,description:"preto e branco de alto contraste com detalhe preservado"},
  {id:"studio-neutral",aliases:["studio","estudio","estúdio","produto","product"],label:"Studio neutro",visualStyle:"natural",strength:0.64,contrastOffset:1,saturationOffset:1,temperature:0,tint:0,detailBoost:0.16,description:"acabamento limpo para produto, catálogo e retrato bem iluminado"},

  // Polish: strong, clearly visible finishing passes tuned for phone screens.
  {id:"polish-vibrant",aliases:["polish vibrante","vibrant polish","polish-vibrant"],label:"Polish Vibrant",visualStyle:"natural",strength:0.86,contrastOffset:3,saturationOffset:12,temperature:0.05,tint:0,detailBoost:0.14,supreme:{vibrance:34,clarity:26,shadows:22,highlights:-18,toneCurve:"s-curve",filmGrain:0},description:"cor viva, contraste limpo e detalhe recuperado sem queimar a pele"},
  {id:"polish-teal-orange",aliases:["teal orange","teal-orange","polish teal","blocbuster"],label:"Polish Teal & Orange",visualStyle:"cinematic",strength:0.88,contrastOffset:3,saturationOffset:8,temperature:0.12,tint:0,detailBoost:0.1,supreme:{vibrance:26,clarity:22,shadows:18,highlights:-22,toneCurve:"cinematic",vignette:26,hsl:{hue:{red:8,orange:6,blue:-10,cyan:-8},saturation:{red:14,orange:18,blue:16},lightness:{blue:-8}}},description:"separação complementar quente/fria com profundidade cinematográfica"},
  {id:"polish-cyberpunk",aliases:["cyberpunk","neon","polish neon"],label:"Polish Cyberpunk",visualStyle:"blackcore-dark",strength:0.92,contrastOffset:4,saturationOffset:16,temperature:-0.1,tint:0.06,detailBoost:0.12,supreme:{vibrance:44,clarity:30,shadows:14,highlights:-12,toneCurve:"punchy",neonGlow:38,vignette:34,duotone:null,hsl:{saturation:{magenta:34,blue:26,cyan:18},hue:{blue:-8,magenta:6}}},description:"magenta e ciano intensos com bloom neon controlado nas luzes"},
  {id:"polish-vintage-film",aliases:["film vintage","vintage film","kodak","polish vintage"],label:"Polish Vintage Film",visualStyle:"cinematic",strength:0.74,contrastOffset:-1,saturationOffset:-4,temperature:0.42,tint:0.06,detailBoost:-0.02,supreme:{toneCurve:"matte",shadows:26,highlights:-14,vibrance:14,clarity:10,filmGrain:34,grainSize:"medium",vignette:22,whiteBalance:"cloudy"},description:"curva fosca de filme 35mm com grão real e sombras abertas"},
  {id:"polish-warm-aesthetic",aliases:["warm aesthetic","aesthetic","cozy","polish warm"],label:"Polish Warm Aesthetic",visualStyle:"cinematic",strength:0.8,contrastOffset:1,saturationOffset:6,temperature:0.34,tint:0.02,detailBoost:0.06,supreme:{toneCurve:"elevated",shadows:30,highlights:-10,vibrance:26,clarity:14,studioRelight:22,lightLeak:{direction:"top-right",intensity:26,color:"#ffb46b"},vignette:16,skinToneProtection:70},description:"luz quente de fim de tarde com halo suave e pele protegida"},
  {id:"polish-glow",aliases:["glow","soft glow","dreamy","bloom","polish glow"],label:"Polish Glow",visualStyle:"cinematic",strength:0.78,contrastOffset:0,saturationOffset:5,temperature:0.06,tint:0.01,detailBoost:0.04,supreme:{toneCurve:"cinematic",shadows:24,highlights:-8,vibrance:22,neonGlow:44,clarity:-8,studioRelight:26,vignette:18,skinToneProtection:80},description:"pele luminosa com bloom difuso e microcontraste reduzido"},

  // Supreme: flagship passes that combine every engine stage.
  {id:"supremo-studio",aliases:["supremo","supreme","studio supremo","supremo-studio"],label:"Supremo Studio",visualStyle:"cinematic",strength:0.95,contrastOffset:2,saturationOffset:6,temperature:0.02,tint:0,detailBoost:0.12,supreme:{autoWhiteBalance:true,toneCurve:"cinematic",shadows:34,highlights:-26,clarity:30,vibrance:30,skinToneProtection:85,studioRelight:26,vignette:26,filmGrain:12,grainSize:"fine"},description:"pós-produção completa de estúdio: curva, zonas tonais, claridade, luz e pele protegida"},
  {id:"supremo-noir",aliases:["supremo noir","noir supremo","dark supremo","supremo-noir"],label:"Supremo Noir",visualStyle:"blackcore-dark",strength:1,contrastOffset:4,saturationOffset:2,temperature:-0.02,tint:0,detailBoost:0.14,supreme:{toneCurve:"crushed",blacks:-24,shadows:-14,highlights:-30,clarity:42,vibrance:8,skinToneProtection:70,vignette:48,filmGrain:26,grainSize:"medium"},description:"pretos absolutos, contraste escultural e grão de filme denso"},
  {id:"supremo-portrait",aliases:["portrait supremo","retrato supremo","supremo-portrait"],label:"Supremo Retrato",visualStyle:"cinematic",strength:0.9,contrastOffset:1,saturationOffset:4,temperature:0.08,tint:0,detailBoost:0.08,supreme:{toneCurve:"filmic",exposure:0.12,shadows:40,highlights:-20,clarity:16,vibrance:28,skinToneProtection:95,studioRelight:34,vignette:30,filmGrain:10,grainSize:"fine",whiteBalance:"auto"},description:"retrato de capa: luz de estúdio, pele protegida por croma e fundo separado"},
  {id:"supremo-neon",aliases:["neon supremo","supremo neon","cyber supremo","supremo-neon"],label:"Supremo Neon",visualStyle:"blackcore-dark",strength:1,contrastOffset:4,saturationOffset:14,temperature:-0.06,tint:0.04,detailBoost:0.12,supreme:{toneCurve:"punchy",clarity:34,vibrance:48,skinToneProtection:80,neonGlow:52,vignette:40,lightLeak:{direction:"top-left",intensity:22,color:"#22d3ee"},filmGrain:16,hsl:{saturation:{magenta:38,blue:24,cyan:20},hue:{blue:-10}}},description:"glitch estético, bloom neon e ciano/magenta de altíssima presença"},
  {id:"supremo-film",aliases:["film supremo","supremo filme","supremo-film"],label:"Supremo Film",visualStyle:"cinematic",strength:0.88,contrastOffset:0,saturationOffset:2,temperature:0.24,tint:0.02,detailBoost:0.04,supreme:{toneCurve:"matte",whiteBalance:"cloudy",shadows:30,highlights:-16,vibrance:20,clarity:14,skinToneProtection:75,vignette:24,filmGrain:42,grainSize:"coarse"},description:"formato 120mm: curva fosca, grão grosso e calor de película"}
]);

const TONE_CURVE_LABELS=["s-curve","cinematic","matte","punchy","elevated","crushed","reverse-s","filmic"];

function normalize(value=""){return String(value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[._]+/g,"-").replace(/\s+/g,"-");}

export function resolvePhotoEffectPreset(value){
  const needle=normalize(value);if(!needle)return null;
  return PRESETS.find(row=>normalize(row.id)===needle||row.aliases.some(alias=>normalize(alias)===needle))||null;
}

export function listPhotoEffectPresets(){
  return PRESETS.map(({aliases,...preset})=>({...preset,aliases:[...aliases]}));
}

export function photoEffectPresetIds(){return PRESETS.map(row=>row.id);}

export function photoEffectPresetTokens(){return [...new Set(PRESETS.flatMap(row=>[row.id,...row.aliases]))];}

export function photoEffectCatalog(){
  return {
    presets:listPhotoEffectPresets(),
    toneCurves:TONE_CURVE_LABELS,
    grainSizes:["fine","medium","coarse"],
    whiteBalance:["auto","tungsten","fluorescent","daylight","cloudy","shade","custom"]
  };
}

export function photoEffectPack(){
  return {id:"blackcore-photo-studio",title:"BLACKCORE Supremo Photo Studio",version:"4.0.0",engine:"ImageMagick local + BLACKCORE pixel engine",presets:listPhotoEffectPresets(),toneCurves:TONE_CURVE_LABELS,notes:["O motor de pixels roda no telefone, sem nuvem: curvas de tom, zonas tonais, claridade local, HSL por faixa de matiz, proteção de pele por croma, duotone, vignette, grão de filme, relight, neon glow, light leak e glitch.","Nenhum preset faz reconhecimento facial. A proteção e a seleção de pele usam a faixa cromática real Cb/Cr da imagem (seleção por cor, como no Photoshop).","Cada render passa pelo quality gate de delta de pixels e é comparado com o original, que nunca é sobrescrito."]};
}
