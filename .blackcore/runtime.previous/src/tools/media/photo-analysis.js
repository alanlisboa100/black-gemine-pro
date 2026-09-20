import {analyzeEnvironmentFrame} from "./video-environment.js";
import {resolvePhotoEffectPreset} from "./photo-effects.js";

function clamp(value,min=0,max=1){return Math.min(max,Math.max(min,value));}
function round(value,digits=4){return Number((Number(value)||0).toFixed(digits));}

function percentile(sorted,ratio){
  if(!sorted.length)return 0;
  const index=Math.max(0,Math.min(sorted.length-1,Math.round((sorted.length-1)*ratio)));
  return sorted[index];
}

function focusMap(frame,width,height){
  const cells=Array.from({length:9},()=>({detail:0,saturation:0,luma:0,count:0}));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const offset=(y*width+x)*3,r=frame[offset],g=frame[offset+1],b=frame[offset+2],maximum=Math.max(r,g,b),minimum=Math.min(r,g,b),luma=0.2126*r+0.7152*g+0.0722*b,saturation=maximum?(maximum-minimum)/maximum:0;
    let detail=0;
    if(x>0){const left=offset-3;detail+=Math.abs(luma-(0.2126*frame[left]+0.7152*frame[left+1]+0.0722*frame[left+2]));}
    if(y>0){const above=offset-width*3;detail+=Math.abs(luma-(0.2126*frame[above]+0.7152*frame[above+1]+0.0722*frame[above+2]));}
    const column=Math.min(2,Math.floor(x*3/Math.max(1,width))),row=Math.min(2,Math.floor(y*3/Math.max(1,height))),cell=cells[row*3+column];
    cell.detail+=detail;cell.saturation+=saturation;cell.luma+=luma;cell.count++;
  }
  const scored=cells.map((cell,index)=>{
    const row=Math.floor(index/3),column=index%3,count=Math.max(1,cell.count),center=row===1&&column===1?0.08:row===1||column===1?0.025:0;
    return {index,row,column,score:round((cell.detail/count)/52+(cell.saturation/count)*0.42+center,4),meanLuma:round(cell.luma/count,2)};
  }).sort((a,b)=>b.score-a.score||a.index-b.index),best=scored[0]||{row:1,column:1,score:0};
  return {x:round((best.column+0.5)/3,3),y:round((best.row+0.5)/3,3),confidence:round(clamp((best.score-(scored[1]?.score||0))*3+0.35),3),grid:scored.sort((a,b)=>a.index-b.index).map(({index,row,column,...cell})=>cell)};
}

export function analyzePhotoFrame(frame,width,height){
  const pixels=Math.max(0,Math.floor(Math.min(frame?.length||0,width*height*3)/3));
  if(!pixels)return {environment:{primary:"neutral",tags:[],confidence:0,metrics:{}},light:{},color:{},detail:{},focus:{x:0.5,y:0.5,confidence:0,grid:[]}};
  const lumas=[],channels=[0,0,0];let saturation=0,gradient=0,gradientChecks=0,darkChromaNoise=0,darkNoiseChecks=0,laplacian=0,laplacianChecks=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const index=y*width+x,offset=index*3,r=frame[offset],g=frame[offset+1],b=frame[offset+2],maximum=Math.max(r,g,b),minimum=Math.min(r,g,b),luma=0.2126*r+0.7152*g+0.0722*b;
    lumas.push(luma);channels[0]+=r;channels[1]+=g;channels[2]+=b;saturation+=maximum?(maximum-minimum)/maximum:0;
    if(x>0){const left=offset-3,leftLuma=0.2126*frame[left]+0.7152*frame[left+1]+0.0722*frame[left+2];gradient+=Math.abs(luma-leftLuma);gradientChecks++;if(luma<105&&leftLuma<105){darkChromaNoise+=Math.abs((r-g)-(frame[left]-frame[left+1]))+Math.abs((b-g)-(frame[left+2]-frame[left+1]));darkNoiseChecks+=2;}}
    if(x>0&&x<width-1&&y>0&&y<height-1){const left=offset-3,right=offset+3,above=offset-width*3,below=offset+width*3,neighborLuma=(0.2126*(frame[left]+frame[right]+frame[above]+frame[below])+0.7152*(frame[left+1]+frame[right+1]+frame[above+1]+frame[below+1])+0.0722*(frame[left+2]+frame[right+2]+frame[above+2]+frame[below+2]))/4;const delta=luma-neighborLuma;laplacian+=delta*delta;laplacianChecks++;}
  }
  lumas.sort((a,b)=>a-b);const mean=lumas.reduce((sum,value)=>sum+value,0)/pixels,variance=lumas.reduce((sum,value)=>sum+(value-mean)**2,0)/pixels,stdDev=Math.sqrt(variance),p05=percentile(lumas,0.05),p95=percentile(lumas,0.95),red=channels[0]/pixels,green=channels[1]/pixels,blue=channels[2]/pixels,channelMean=(red+green+blue)/3,environment=analyzeEnvironmentFrame(frame,width,height,0);
  const exposure=mean<72?"underexposed":mean>205?"overexposed":environment.tags.includes("harsh-light")?"highlights-at-risk":"balanced",contrast=stdDev<38?"flat":stdDev>78?"strong":"balanced",noiseScore=clamp((darkChromaNoise/Math.max(1,darkNoiseChecks)-4)/34),sharpness=laplacian/Math.max(1,laplacianChecks),detailLevel=sharpness<80?"soft":sharpness>900?"crisp":"balanced";
  return {
    environment,
    light:{meanLuma:round(mean,2),stdDev:round(stdDev,2),p05:round(p05,2),p95:round(p95,2),dynamicRange:round(p95-p05,2),exposure,contrast,shadowClipRatio:environment.metrics.darkRatio||0,highlightClipRatio:environment.metrics.highlightRatio||0},
    color:{meanSaturation:round(saturation/pixels,4),redMean:round(red,2),greenMean:round(green,2),blueMean:round(blue,2),cast:{red:round((red-channelMean)/255,4),green:round((green-channelMean)/255,4),blue:round((blue-channelMean)/255,4)}},
    detail:{meanGradient:round(gradient/Math.max(1,gradientChecks),3),laplacianVariance:round(sharpness,2),noiseScore:round(noiseScore,4),level:detailLevel},
    focus:focusMap(frame,width,height)
  };
}

export function photoCropGeometry(width,height,aspectRatio="original",focus={x:0.5,y:0.5}){
  const ratios={square:1,portrait:4/5,story:9/16,landscape:16/9,"classic-landscape":4/3};const ratio=ratios[aspectRatio];
  if(!ratio||!(width>0&&height>0))return null;
  let cropWidth=width,cropHeight=Math.round(width/ratio);
  if(cropHeight>height){cropHeight=height;cropWidth=Math.round(height*ratio);}
  const maxX=Math.max(0,width-cropWidth),maxY=Math.max(0,height-cropHeight),centerX=clamp(Number(focus.x)||0.5),centerY=clamp(Number(focus.y)||0.5),x=Math.round(clamp(width*centerX-cropWidth/2,0,maxX)),y=Math.round(clamp(height*centerY-cropHeight/2,0,maxY));
  return {width:cropWidth,height:cropHeight,x,y,aspectRatio,focus:{x:centerX,y:centerY}};
}

function scaledMultiplier(value,strength){return round(1+(value-1)*strength,4);}

export function buildAutoPhotoPlan(analysis={},options={}){
  const level=String(options.editLevel||"medium").toLowerCase(),preset=resolvePhotoEffectPreset(options.photoPreset||options.lookPreset),style=String(options.visualStyle||preset?.visualStyle||"blackcore-dark").toLowerCase(),base={basic:0.5,medium:0.75,high:1}[level]||0.75,strength=clamp(Number(options.strength??preset?.strength??base)),light=analysis.light||{},color=analysis.color||{},detail=analysis.detail||{},environment=analysis.environment||{},stylePreset={
    natural:{black:1.1,white:0.7,sigmoid:2.7,midpoint:49,saturation:7,cool:0},
    cinematic:{black:2.2,white:1.2,sigmoid:4.1,midpoint:48,saturation:13,cool:0.008},
    "blackcore-dark":{black:3.4,white:1.8,sigmoid:5.4,midpoint:46.5,saturation:18,cool:0.014}
  }[style]||{black:3.4,white:1.8,sigmoid:5.4,midpoint:46.5,saturation:18,cool:0.014},shadowRisk=clamp(Math.max(Number(light.shadowClipRatio)||0,Number(light.p05)<7?0.72:0)),highlightRisk=clamp(Math.max(Number(light.highlightClipRatio)||0,Number(light.p95)>248?0.72:0)),plan={style,strength,brightness:0,contrast:0,gamma:1,saturation:options.enhanceColor===false?100:round(100+stylePreset.saturation*strength+(preset?.saturationOffset||0),2),red:1,green:1,blue:1,blackPoint:options.enhanceLight===false?0:round(Math.max(0.35,stylePreset.black*strength*(1-shadowRisk*0.68)),2),whitePoint:options.enhanceLight===false?100:round(100-Math.max(0.35,stylePreset.white*strength*(1-highlightRisk*0.68)),2),sigmoidContrast:options.enhanceLight===false?0:round(1.25+stylePreset.sigmoid*strength,2),sigmoidMidpoint:round(stylePreset.midpoint+(1-strength)*1.5,2),denoise:0,unsharp:null,monochrome:Boolean(preset?.monochrome),presetId:preset?.id||null,reasons:[]};
  if(preset){
    if(preset.temperature){plan.red=round(clamp(1+Number(preset.temperature)*0.018,0.96,1.05),4);plan.blue=round(clamp(1-Number(preset.temperature)*0.022,0.95,1.04),4);}
    if(preset.tint)plan.green=round(clamp(1+Number(preset.tint)*0.012,0.97,1.04),4);
    plan.reasons.push(`applied the ${preset.label} photo finish`);
  }
  if(options.enhanceLight!==false){
    if(light.exposure==="underexposed"){plan.brightness=round(1.2+1.8*strength,2);plan.gamma=round(1+0.075*strength,4);plan.blackPoint=round(Math.min(plan.blackPoint,0.7+0.75*strength),2);plan.reasons.push("lifted underexposed midtones while retaining deep blacks");}
    else if(light.exposure==="overexposed"||light.exposure==="highlights-at-risk"){plan.brightness=round(-0.8-1.2*strength,2);plan.gamma=round(1-0.04*strength,4);plan.whitePoint=round(Math.max(plan.whitePoint,98.6),2);plan.reasons.push("shaped strong highlights without flattening the image");}
    plan.contrast=round((light.contrast==="strong"?2.5:4.5)+5.5*strength+(preset?.contrastOffset||0),2);plan.reasons.push(`built a ${style.replace(/-/g," ")} tonal curve with deeper blacks and stronger separation`);
  }
  if(options.enhanceColor!==false){
    const meanSaturation=Number(color.meanSaturation)||0;
    if(meanSaturation<0.24){plan.saturation=round(plan.saturation+3+3*strength,2);plan.reasons.push("restored muted color with cinematic intensity");}
    else if(meanSaturation>0.68){plan.saturation=round(Math.min(plan.saturation,105+7*strength),2);plan.reasons.push("kept already-strong colors below clipping");}
    const cast=color.cast||{},correction=0.26*strength;
    plan.red=scaledMultiplier(clamp(1-Number(cast.red||0)*correction,0.97,1.03),1);
    plan.green=scaledMultiplier(clamp(1-Number(cast.green||0)*correction,0.97,1.03),1);
    plan.blue=scaledMultiplier(clamp(1-Number(cast.blue||0)*correction,0.97,1.03),1);
    if(Math.max(Math.abs(Number(cast.red)||0),Math.abs(Number(cast.green)||0),Math.abs(Number(cast.blue)||0))>0.055)plan.reasons.push("softened the detected color cast");
    if(stylePreset.cool){plan.green=round(clamp(plan.green*(1-stylePreset.cool*0.45*strength),0.96,1.04),4);plan.blue=round(clamp(plan.blue*(1+stylePreset.cool*strength),0.96,1.045),4);plan.reasons.push("added a restrained cool BLACKCORE color separation while protecting natural skin color");}
    if(environment.primary==="water"||environment.primary==="sky"){plan.blue=round(clamp(plan.blue*(1+0.018*strength),0.96,1.05),4);plan.saturation=Math.max(plan.saturation,round(106+7*strength,2));plan.reasons.push(`strengthened ${environment.primary} depth and color`);}
    else if(environment.primary==="grass"||environment.primary==="vegetation"){plan.green=round(clamp(plan.green*(1+0.016*strength),0.96,1.05),4);plan.saturation=Math.max(plan.saturation,round(106+6*strength,2));plan.reasons.push("strengthened vegetation while keeping green tones controlled");}
    else if(environment.primary==="mountain"){plan.contrast=Math.max(plan.contrast,round(5+6*strength,2));plan.reasons.push("added pronounced landscape depth and microcontrast");}
  }
  if(options.denoise!==false&&Number(detail.noiseScore)>0.1){plan.denoise=Number(detail.noiseScore)>0.35?2:1;plan.reasons.push("reduced detected chroma noise");}
  if(options.enhanceDetails!==false){const soft=detail.level==="soft",amount=soft?0.88+0.4*strength:0.55+0.3*strength;plan.unsharp={sigma:round(0.66+0.3*strength,2),amount:round(clamp(amount+(preset?.detailBoost||0),0.2,1.8),2),threshold:round(plan.denoise?0.026:0.014,3)};plan.reasons.push(soft?"recovered facial, hair and clothing detail without halos":"protected fine facial, hair and clothing detail through the stronger grade");}
  if(plan.monochrome){plan.saturation=0;plan.reasons.push("converted the finish to controlled monochrome while preserving tonal detail");}
  if(!plan.reasons.length){plan.contrast=round(4+5*strength,2);plan.unsharp={sigma:0.75,amount:round(0.5+0.25*strength,2),threshold:0.014};plan.reasons.push("applied a visibly stronger professional BLACKCORE finish");}
  return plan;
}
