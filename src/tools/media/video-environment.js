function clamp(value,min=0,max=1){return Math.min(max,Math.max(min,value));}
function round(value,digits=4){return Number((Number(value)||0).toFixed(digits));}

function classifyMetrics(metrics={}){
  const tags=[];
  if(metrics.meanLuma<70||metrics.darkRatio>0.5)tags.push("low-light");
  else if(metrics.highlightRatio>0.1||metrics.meanLuma>205)tags.push("harsh-light");
  if(metrics.lowerBlueRatio>0.16&&metrics.blueRatio>0.14&&metrics.lowerBlueRatio>=metrics.topBlueRatio*0.72)tags.push("water");
  if(metrics.topBlueRatio>0.17&&metrics.topBlueRatio>metrics.lowerBlueRatio*1.08)tags.push("sky");
  if(metrics.lowerGreenRatio>0.17&&metrics.greenRatio>0.15&&metrics.lowerGreenRatio>metrics.topGreenRatio*1.08)tags.push("grass");
  else if(metrics.greenRatio>0.15)tags.push("vegetation");
  if((metrics.earthRatio>0.13||metrics.greenRatio>0.08)&&metrics.edgeRatio>0.105&&metrics.meanLuma>55)tags.push("mountain");
  const priority=["water","grass","vegetation","mountain","sky"],primary=priority.find(tag=>tags.includes(tag))||"neutral",signal={water:metrics.lowerBlueRatio,grass:metrics.lowerGreenRatio,vegetation:metrics.greenRatio,mountain:metrics.edgeRatio,sky:metrics.topBlueRatio,neutral:0.25}[primary]||0;
  return {primary,tags,confidence:round(clamp((signal-0.08)*2.4+0.32),3)};
}

export function analyzeEnvironmentFrame(frame,width,height,time=0){
  const pixels=Math.max(0,Math.floor(Math.min(frame?.length||0,width*height*3)/3));
  if(!pixels)return {time,primary:"neutral",tags:[],confidence:0,metrics:{}};
  let lumaSum=0,saturationSum=0,dark=0,highlight=0,green=0,blue=0,topBlue=0,lowerBlue=0,topGreen=0,lowerGreen=0,earth=0,edges=0,edgeChecks=0;
  const topLimit=Math.floor(height*0.42),lowerStart=Math.floor(height*0.5);
  for(let index=0;index<pixels;index++){
    const offset=index*3,r=frame[offset],g=frame[offset+1],b=frame[offset+2],x=index%width,y=Math.floor(index/width),max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?((max-min)/max):0,luma=0.2126*r+0.7152*g+0.0722*b;
    lumaSum+=luma;saturationSum+=sat;if(luma<50)dark++;if(luma>235)highlight++;
    const greenPixel=g>52&&g>r*1.1&&g>b*1.06&&sat>0.13,bluePixel=b>58&&b>r*1.1&&b>=g*0.92&&sat>0.14,earthPixel=r>55&&g>36&&r>=g*0.94&&r<=g*1.72&&b<r*0.82&&sat>0.12;
    if(greenPixel){green++;if(y<topLimit)topGreen++;if(y>=lowerStart)lowerGreen++;}
    if(bluePixel){blue++;if(y<topLimit)topBlue++;if(y>=lowerStart)lowerBlue++;}
    if(earthPixel)earth++;
    if(x>0){const previous=offset-3,previousLuma=0.2126*frame[previous]+0.7152*frame[previous+1]+0.0722*frame[previous+2];if(Math.abs(luma-previousLuma)>24)edges++;edgeChecks++;}
    if(y>0){const previous=offset-width*3,previousLuma=0.2126*frame[previous]+0.7152*frame[previous+1]+0.0722*frame[previous+2];if(Math.abs(luma-previousLuma)>24)edges++;edgeChecks++;}
  }
  const topPixels=Math.max(1,width*topLimit),lowerPixels=Math.max(1,width*(height-lowerStart)),metrics={meanLuma:round(lumaSum/pixels,2),meanSaturation:round(saturationSum/pixels),darkRatio:round(dark/pixels),highlightRatio:round(highlight/pixels),greenRatio:round(green/pixels),blueRatio:round(blue/pixels),topBlueRatio:round(topBlue/topPixels),lowerBlueRatio:round(lowerBlue/lowerPixels),topGreenRatio:round(topGreen/topPixels),lowerGreenRatio:round(lowerGreen/lowerPixels),earthRatio:round(earth/pixels),edgeRatio:round(edges/Math.max(1,edgeChecks))},classification=classifyMetrics(metrics);
  return {time:round(time,3),...classification,metrics};
}

function averageMetrics(rows=[]){
  const keys=["meanLuma","meanSaturation","darkRatio","highlightRatio","greenRatio","blueRatio","topBlueRatio","lowerBlueRatio","topGreenRatio","lowerGreenRatio","earthRatio","edgeRatio"],metrics={};
  for(const key of keys)metrics[key]=round(rows.reduce((sum,row)=>sum+(Number(row.metrics?.[key])||0),0)/Math.max(1,rows.length),key==="meanLuma"?2:4);
  return metrics;
}

export function environmentProfileForRange(samples=[],start=0,end=0){
  if(!samples.length)return {primary:"neutral",tags:[],confidence:0,samples:0,metrics:{}};
  const midpoint=(start+end)/2,inside=samples.filter(row=>row.time>=start&&row.time<=end),rows=inside.length?inside:[...samples].sort((a,b)=>Math.abs(a.time-midpoint)-Math.abs(b.time-midpoint)).slice(0,1),metrics=averageMetrics(rows),classification=classifyMetrics(metrics);
  return {...classification,samples:rows.length,metrics};
}

export function summarizeEnvironmentProfiles(profiles=[]){
  const counts={water:0,sky:0,grass:0,vegetation:0,mountain:0,"low-light":0,"harsh-light":0};
  for(const profile of profiles){for(const tag of new Set(profile?.tags||[]))if(Object.hasOwn(counts,tag))counts[tag]++;}
  return counts;
}

export function adaptiveEnvironmentFilter(profile={},strength=0.65){
  const s=clamp(Number(strength)||0,0,1);if(!(s>0)||!profile||profile.primary==="neutral"&&!(profile.tags||[]).some(tag=>tag==="low-light"||tag==="harsh-light"))return null;
  const filters=[],tags=new Set(profile.tags||[]);
  if(tags.has("low-light"))filters.push(`eq=brightness=${round(0.008+0.018*s,4)}:gamma=${round(1+0.045*s,4)}:contrast=${round(1+0.018*s,4)}`);
  else if(tags.has("harsh-light"))filters.push(`eq=brightness=${round(-0.006-0.012*s,4)}:gamma=${round(1-0.025*s,4)}:contrast=${round(1+0.012*s,4)}`);
  if(profile.primary==="water")filters.push(`colorbalance=bs=${round(0.012*s,4)}:gs=${round(0.004*s,4)},eq=saturation=${round(1+0.055*s,4)}:contrast=${round(1+0.016*s,4)}`);
  else if(profile.primary==="grass"||profile.primary==="vegetation")filters.push(`colorbalance=gs=${round(0.013*s,4)}:rs=${round(-0.003*s,4)},eq=saturation=${round(1+0.042*s,4)}:contrast=${round(1+0.012*s,4)}`);
  else if(profile.primary==="mountain")filters.push(`eq=contrast=${round(1+0.028*s,4)}:saturation=${round(1+0.018*s,4)},unsharp=3:3:${round(0.12+0.14*s,3)}`);
  else if(profile.primary==="sky")filters.push(`colorbalance=bs=${round(0.009*s,4)},eq=saturation=${round(1+0.032*s,4)}:contrast=${round(1+0.01*s,4)}`);
  return filters.join(",")||null;
}
