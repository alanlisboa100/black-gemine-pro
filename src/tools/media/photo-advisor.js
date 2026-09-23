import {listPhotoEffectPresets} from "./photo-effects.js";

function round(value,digits=3){return Number((Number(value)||0).toFixed(digits));}
function issue(id,severity,area,title,evidence,change,action){return {id,severity,area,title,evidence,change,action};}

function strongestCast(color={}){
  const entries=Object.entries(color.cast||{}).map(([channel,value])=>[channel,Number(value)||0]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));return entries[0]||["neutral",0];
}

export function buildPhotoAdvice(analysis={},metadata={},capabilities={}){
  const light=analysis.light||{},color=analysis.color||{},detail=analysis.detail||{},environment=analysis.environment||{},focus=analysis.focus||{},findings=[];
  if(light.exposure==="underexposed")findings.push(issue("underexposed","high","full","Dark midtones","Average luminance and shadow measurements indicate an underexposed frame.","Lift midtones while protecting black depth.","adjust_light"));
  else if(light.exposure==="overexposed")findings.push(issue("overexposed","high","full","Overexposed frame","Average luminance is high enough to risk lost bright detail.","Reduce exposure and shape highlights.","adjust_light"));
  else if(light.exposure==="highlights-at-risk"||Number(light.highlightClipRatio)>0.08)findings.push(issue("highlight-risk","medium","full","Highlights need protection",`${round(Number(light.highlightClipRatio)*100,1)}% estimated highlight-risk area.`,"Recover bright detail without darkening the entire photo.","adjust_light"));
  if(Number(light.shadowClipRatio)>0.16)findings.push(issue("shadow-clipping","medium","full","Shadow detail is compressed",`${round(Number(light.shadowClipRatio)*100,1)}% estimated deep-shadow area.`,"Separate the darkest tones while keeping the BLACKCORE look.","adjust_light"));
  if(light.contrast==="flat")findings.push(issue("flat-contrast","medium","full","Low tonal separation",`Measured luminance deviation is ${round(light.stdDev,1)}.`,"Add controlled contrast and black/white separation.","adjust_light"));
  else if(light.contrast==="strong")findings.push(issue("strong-contrast","low","full","Already strong contrast",`Measured luminance deviation is ${round(light.stdDev,1)}.`,"Protect highlights and shadows instead of adding blanket contrast.","adjust_light"));

  const saturation=Number(color.meanSaturation)||0;if(saturation<0.2)findings.push(issue("muted-color","medium","full","Muted color",`Mean saturation is ${round(saturation,2)}.`,"Increase vibrance and saturation selectively.","adjust_color"));else if(saturation>0.68)findings.push(issue("strong-color","medium","full","Color is already intense",`Mean saturation is ${round(saturation,2)}.`,"Control saturation to prevent clipped artificial color.","adjust_color"));
  const [castChannel,castValue]=strongestCast(color);if(Math.abs(castValue)>0.055)findings.push(issue("color-cast","medium","full","Visible color cast",`${castChannel} channel deviation is ${round(castValue,3)}.`,"Correct white balance while preserving skin and clothing color.","adjust_color"));
  if(Number(detail.noiseScore)>0.1)findings.push(issue("noise","medium","full","Visible chroma noise",`Noise score is ${round(detail.noiseScore,2)}.`,"Reduce noise before sharpening.","denoise"));
  if(detail.level==="soft")findings.push(issue("soft-detail","high","subject","Fine detail looks soft",`Measured edge variance is ${round(detail.laplacianVariance,1)}.`,"Recover controlled detail in face, hair, clothing or the chosen subject.","enhance_details"));
  else if(detail.level==="crisp")findings.push(issue("crisp-detail","low","full","Detail is already crisp",`Measured edge variance is ${round(detail.laplacianVariance,1)}.`,"Use only restrained sharpening to avoid halos.","enhance_details"));

  const contextual=new Set(["water","sky","grass","vegetation","mountain"]);if(contextual.has(environment.primary))findings.push(issue(`environment-${environment.primary}`,"medium","detail",`Estimated ${environment.primary} region`,`The lightweight visual classifier marked ${environment.primary} as the primary environment with confidence ${round(environment.confidence,2)}.`,`Optionally enhance this region's color, light and texture with a real detail mask.`,"auto_edit"));
  if(Number(focus.confidence)>0.58&&(Math.abs(Number(focus.x)-0.5)>0.2||Math.abs(Number(focus.y)-0.5)>0.2))findings.push(issue("off-center-focus","low","full","Strong off-center visual focus",`Focus estimate is ${round(focus.x,2)}, ${round(focus.y,2)}.`,"Offer a focal crop only if the user wants a new aspect ratio.","crop"));
  if(!findings.length)findings.push(issue("balanced-source","low","full","Technically balanced source","No strong exposure, color, noise or detail defect crossed the recommendation thresholds.","Choose a visual style rather than applying unnecessary correction.","auto_edit"));

  const changeIds=new Set(findings.map(row=>row.action)),suggestedChanges=[
    {id:"light",label:"Light and dynamic range",recommended:changeIds.has("adjust_light"),mapsTo:{enhanceLight:true}},
    {id:"color",label:"Color and cinematic intensity",recommended:changeIds.has("adjust_color")||[...contextual].includes(environment.primary),mapsTo:{enhanceColor:true}},
    {id:"detail",label:"Fine detail and sharpness",recommended:changeIds.has("enhance_details"),mapsTo:{enhanceDetails:true}},
    {id:"noise",label:"Noise reduction",recommended:changeIds.has("denoise"),mapsTo:{denoise:true}},
    {id:"crop",label:"Optional reframing",recommended:changeIds.has("crop"),mapsTo:{aspectRatio:"choose-first"}},
    {id:"text",label:"Text overlay",recommended:false,mapsTo:{text:"ask-user"}},
    {id:"watermark",label:"BLACKCORE photo signature",recommended:false,mapsTo:{brandWatermark:true}}
  ];
  const automatic=Boolean(capabilities.automaticSubjectBackground),semantic=Boolean(capabilities.namedDetail),manual=true,base={action:"auto_edit",enhanceLight:true,enhanceColor:true,enhanceDetails:true,denoise:true},presets=[
    {id:"natural-full",label:"Natural full-photo correction",recommended:false,ready:true,arguments:{...base,editScope:"full",editLevel:"basic",visualStyle:"natural"}},
    {id:"cinematic-full",label:"Balanced cinematic full edit",recommended:true,ready:true,arguments:{...base,editScope:"full",editLevel:"medium",visualStyle:"cinematic"}},
    {id:"blackcore-full",label:"Strong BLACKCORE full edit",recommended:false,ready:true,arguments:{...base,editScope:"full",editLevel:"high",visualStyle:"blackcore-dark"}},
    {id:"subject-only",label:"Edit only the person or main subject",recommended:findings.some(row=>row.area==="subject"),ready:automatic,requires:automatic?null:"meaningful source alpha, rembg or segmentation endpoint",arguments:{...base,editScope:"subject",editLevel:"medium",visualStyle:"cinematic"}},
    {id:"background-only",label:"Edit only the background",recommended:false,ready:automatic,requires:automatic?null:"rembg, source alpha or segmentation endpoint",arguments:{...base,editScope:"background",editLevel:"medium",visualStyle:"cinematic"}},
    {id:"named-detail",label:"Edit a named detail",recommended:findings.some(row=>row.area==="detail"),ready:semantic,requires:semantic?"regionPrompt":"manual mask or semantic segmentation endpoint plus regionPrompt",arguments:{...base,editScope:"detail",editLevel:"medium",visualStyle:"cinematic",regionPrompt:"ask-user"}},
    {id:"manual-area",label:"Edit only a manually marked area",recommended:false,ready:manual,requires:"black-and-white mask; white is edited",arguments:{...base,editScope:"mask",editLevel:"medium",visualStyle:"cinematic",mask:"ask-user"}}
  ];
  const effectPresets=listPhotoEffectPresets(),backgroundTools={removeBackground:Boolean(capabilities.rembgInstalled),replaceBackground:Boolean(capabilities.rembgInstalled),installCommand:capabilities.rembgInstallCommand||"bash scripts/install-photo-ai.sh --mode rembg",defaultModel:"u2netp"};
  const high=findings.filter(row=>row.severity==="high").length,medium=findings.filter(row=>row.severity==="medium").length;
  return {noChangesApplied:true,summary:high?`${high} high-priority and ${medium} medium-priority improvement opportunities detected.`:medium?`${medium} medium-priority improvement opportunities detected.`:"The source is technically balanced; stylistic changes are optional.",findings,suggestedChanges,presets,effectPresets,backgroundTools,selectionCapabilities:capabilities,choicePrompt:"Choose one photo preset and any optional change IDs. BLACKCORE must not edit until the choice is confirmed.",limitations:["Environment labels are lightweight visual estimates, not semantic object recognition.","Named-detail selection needs a supplied mask or a real semantic segmentation backend.","Background removal and replacement need the optional rembg component; the model is downloaded only on first use."]};
}
