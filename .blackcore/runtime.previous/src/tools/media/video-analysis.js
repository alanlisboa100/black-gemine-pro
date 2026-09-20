function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

export function median(values=[]){
  const rows=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!rows.length)return 0;
  const middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]:(rows[middle-1]+rows[middle])/2;
}

export function parseSilenceLog(text="",duration=0){
  const events=[];
  for(const match of String(text).matchAll(/silence_(start|end):\s*(-?[0-9.]+)/g))events.push({kind:match[1],time:Number(match[2]),index:match.index});
  events.sort((a,b)=>a.index-b.index);
  const ranges=[];let start=null;
  for(const event of events){
    if(!Number.isFinite(event.time))continue;
    if(event.kind==="start"){start=Math.max(0,event.time);continue;}
    const end=Math.max(0,event.time);
    if(start===null)start=0;
    if(end>start)ranges.push({start,end,duration:end-start});
    start=null;
  }
  if(start!==null&&duration>start)ranges.push({start,end:duration,duration:duration-start});
  return mergeRanges(ranges,duration);
}

export function parseBlackLog(text="",duration=0){
  const ranges=[];
  for(const match of String(text).matchAll(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g)){
    const start=Number(match[1]),end=Number(match[2]);
    if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)ranges.push({start,end,duration:end-start});
  }
  return mergeRanges(ranges,duration);
}

export function parseSceneLog(text=""){
  const times=[];
  for(const match of String(text).matchAll(/pts_time:([0-9.]+)/g)){
    const value=Number(match[1]);
    if(Number.isFinite(value)&&(times.at(-1)===undefined||Math.abs(value-times.at(-1))>0.04))times.push(value);
  }
  return times;
}

export function parseLoudnessLog(text=""){
  const blocks=[...String(text).matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  if(!blocks.length)return null;
  try{
    const row=JSON.parse(blocks.at(-1)[0]);
    const number=key=>{const value=Number(row[key]);return Number.isFinite(value)?value:null;};
    return {integratedLufs:number("input_i"),truePeakDb:number("input_tp"),loudnessRange:number("input_lra"),thresholdLufs:number("input_thresh")};
  }catch{return null;}
}

export function parseMotionLog(text=""){
  const rows=[];
  for(const match of String(text).matchAll(/pts_time:([0-9.]+)[\s\S]*?lavfi\.signalstats\.YAVG=([0-9.]+)/g)){
    const time=Number(match[1]),difference=Number(match[2]);
    if(Number.isFinite(time)&&Number.isFinite(difference))rows.push({time,difference,score:Number(clamp(difference/24,0,1).toFixed(3))});
  }
  return rows;
}

export function inferMusicProfile(rhythm={},requested="auto",sourceName=""){
  const normalized=String(requested||"auto").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const aliases={funk:"funk",pagode:"pagode",samba:"pagode",sertanejo:"sertanejo",country:"sertanejo",pop:"pop",other:"other",outro:"other"};
  if(normalized!=="auto"&&aliases[normalized])return {genre:aliases[normalized],confidence:1,source:"requested",bpm:rhythm?.bpm||null,energy:"unknown"};
  const name=String(sourceName||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  for(const [needle,genre] of [["pagode","pagode"],["samba","pagode"],["sertanejo","sertanejo"],["country","sertanejo"],["funk","funk"],["pop","pop"]]){
    if(name.includes(needle))return {genre,confidence:0.92,source:"filename",bpm:rhythm?.bpm||null,energy:"unknown"};
  }
  const bpm=Number(rhythm?.bpm)||null,confidence=Number(rhythm?.confidence)||0,peaks=Array.isArray(rhythm?.peaks)?rhythm.peaks:[],duration=Math.max(1,Number(rhythm?.duration)||1),meanStrength=peaks.length?peaks.reduce((sum,row)=>sum+(Number(row.strength)||0),0)/peaks.length:0,peakRate=peaks.length/duration;
  const energy=meanStrength>=1.4||peakRate>=2.2?"high":meanStrength>=0.55||peakRate>=0.8?"medium":"soft";
  if(!bpm||confidence<0.12)return {genre:"unknown",confidence:Number(Math.min(0.2,confidence).toFixed(3)),source:"insufficient-rhythm",bpm,energy};
  let genre="sertanejo";
  if(bpm>=128)genre="funk";
  else if(bpm>=112)genre="pop";
  else if(bpm>=88)genre="pagode";
  return {genre,confidence:Number(Math.min(0.58,0.24+confidence*0.42).toFixed(3)),source:"rhythm-estimate",bpm,energy};
}

export function motionScoreNear(frames=[],time=0,radius=1.25){
  const nearby=frames.filter(row=>Math.abs((Number(row.time)||0)-time)<=radius);
  if(!nearby.length)return 0;
  return Number((nearby.reduce((sum,row)=>sum+(Number(row.score)||0),0)/nearby.length).toFixed(3));
}

export function motionlessRanges(frames=[],duration=0,{threshold=0.08,minDuration=0.75}={}){
  if(!(duration>0)||!Array.isArray(frames)||!frames.length)return [];
  const rows=frames.map(row=>({time:Number(row.time),score:Number(row.score)})).filter(row=>Number.isFinite(row.time)&&Number.isFinite(row.score)).sort((a,b)=>a.time-b.time);
  if(!rows.length)return [];
  const gaps=[];for(let index=1;index<rows.length;index++){const gap=rows[index].time-rows[index-1].time;if(gap>0&&gap<3)gaps.push(gap);}
  const step=clamp(median(gaps)||0.5,0.1,2),ranges=[];let start=null,end=null;
  for(const row of rows){
    if(row.score<=threshold){if(start===null)start=Math.max(0,row.time-step/2);end=Math.min(duration,row.time+step/2);continue;}
    if(start!==null&&end-start>=minDuration)ranges.push({start,end,duration:end-start});start=null;end=null;
  }
  if(start!==null&&end-start>=minDuration)ranges.push({start,end,duration:end-start});
  return mergeRanges(ranges,duration,step*0.55);
}

export function intersectRanges(left=[],right=[],duration=0){
  const a=mergeRanges(left,duration),b=mergeRanges(right,duration),out=[];let i=0,j=0;
  while(i<a.length&&j<b.length){
    const start=Math.max(a[i].start,b[j].start),end=Math.min(a[i].end,b[j].end);if(end>start)out.push({start,end,duration:end-start});
    if(a[i].end<b[j].end)i++;else j++;
  }
  return mergeRanges(out,duration);
}

export function selectMusicalScenePoints(times=[],duration=0,{rhythm=null,motionFrames=[],maxTransitions=12,minGap=7,beatSnap=0.22}={}){
  if(!(duration>0)||!(maxTransitions>0))return [];
  const beats=Array.isArray(rhythm?.beatTimes)?rhythm.beatTimes:[],candidates=[];
  for(const value of times){
    const sceneTime=Number(value);if(!Number.isFinite(sceneTime)||sceneTime<0.6||sceneTime>duration-0.6)continue;
    let beatDistance=Infinity,nearestBeat=null;
    for(const beat of beats){const distance=Math.abs(Number(beat)-sceneTime);if(distance<beatDistance){beatDistance=distance;nearestBeat=Number(beat);}}
    const snapped=nearestBeat!==null&&beatDistance<=beatSnap?nearestBeat:sceneTime,motion=motionScoreNear(motionFrames,sceneTime),beatStrength=Number.isFinite(beatDistance)?Math.max(0,1-beatDistance/Math.max(beatSnap,0.01)):0;
    candidates.push({time:Number(snapped.toFixed(3)),sceneTime:Number(sceneTime.toFixed(3)),motion,beatDistance:Number.isFinite(beatDistance)?Number(beatDistance.toFixed(3)):null,onBeat:beatDistance<=beatSnap,score:Number((0.55+motion*0.3+beatStrength*0.32).toFixed(3))});
  }
  const chosen=[];
  for(const row of candidates.sort((a,b)=>b.score-a.score||a.time-b.time)){
    if(chosen.some(item=>Math.abs(item.time-row.time)<minGap))continue;
    chosen.push(row);if(chosen.length>=maxTransitions)break;
  }
  return chosen.sort((a,b)=>a.time-b.time);
}

export function mergeRanges(ranges=[],duration=0,gap=0.02){
  const max=duration>0?duration:Number.POSITIVE_INFINITY;
  const sorted=ranges.map(row=>({start:clamp(Number(row.start)||0,0,max),end:clamp(Number(row.end)||0,0,max)})).filter(row=>row.end>row.start).sort((a,b)=>a.start-b.start||a.end-b.end);
  const out=[];
  for(const row of sorted){
    const prev=out.at(-1);
    if(prev&&row.start<=prev.end+gap){prev.end=Math.max(prev.end,row.end);prev.duration=prev.end-prev.start;}
    else out.push({start:row.start,end:row.end,duration:row.end-row.start});
  }
  return out;
}

export function activeSegments(duration,removed=[],{padding=0.12,minSegment=0.45,mergeGap=0.16}={}){
  if(!(duration>0))return [];
  const cuts=mergeRanges(removed,duration),out=[];let cursor=0;
  for(const cut of cuts){
    const end=Math.min(duration,cut.start+padding);
    if(end-cursor>=minSegment)out.push({start:cursor,end,duration:end-cursor});
    cursor=Math.max(cursor,cut.end-padding);
  }
  if(duration-cursor>=minSegment)out.push({start:cursor,end:duration,duration:duration-cursor});
  const merged=[];
  for(const row of out){
    const prev=merged.at(-1);
    if(prev&&row.start-prev.end<=mergeGap){prev.end=row.end;prev.duration=prev.end-prev.start;}
    else merged.push({...row});
  }
  return merged.length?merged:[{start:0,end:duration,duration}];
}

export function limitSegments(segments=[],targetDuration=0,{minSegment=0.75}={}){
  const rows=segments.map(row=>({...row,duration:row.end-row.start})).filter(row=>row.duration>0);
  const total=rows.reduce((sum,row)=>sum+row.duration,0);
  if(!(targetDuration>0)||total<=targetDuration)return rows;
  const budget=Math.max(minSegment,targetDuration),scale=budget/total;
  let used=0;
  return rows.map((row,index)=>{
    const remaining=budget-used,remainingRows=rows.length-index;
    if(remaining<=0)return null;
    const allocation=Math.min(row.duration,Math.max(Math.min(minSegment,remaining/remainingRows),row.duration*scale));
    const center=(row.start+row.end)/2,start=Math.max(row.start,center-allocation/2),end=Math.min(row.end,start+allocation);
    used+=end-start;
    return {start,end,duration:end-start};
  }).filter(Boolean);
}

export function syncSegmentsToBeat(segments=[],bpm=0,{minSegment=0.65}={}){
  if(!(bpm>0))return segments.map(row=>({...row,duration:row.end-row.start}));
  const beat=60/bpm;
  return segments.map(row=>{
    const duration=row.end-row.start,beats=Math.max(1,Math.round(duration/beat)),synced=Math.min(duration,Math.max(minSegment,beats*beat));
    return {...row,end:row.start+synced,duration:synced};
  });
}

function energyFrames(buffer,sampleRate=1000,windowMs=50){
  const samples=Math.max(8,Math.round(sampleRate*windowMs/1000)),frames=[];
  for(let offset=0;offset+1<buffer.length;offset+=samples*2){
    const end=Math.min(buffer.length,offset+samples*2);let sum=0,count=0;
    for(let i=offset;i+1<end;i+=2){const value=buffer.readInt16LE(i)/32768;sum+=value*value;count++;}
    frames.push(Math.sqrt(sum/Math.max(1,count)));
  }
  return {frames,secondsPerFrame:samples/sampleRate};
}

export function analyzePcmBeats(buffer,{sampleRate=1000,windowMs=50,maxPeaks=600}={}){
  const {frames,secondsPerFrame}=energyFrames(buffer,sampleRate,windowMs);
  if(frames.length<6)return {bpm:null,confidence:0,beatTimes:[],peaks:[],duration:frames.length*secondsPerFrame};
  const floor=median(frames),deviations=frames.map(value=>Math.abs(value-floor)),mad=median(deviations),threshold=Math.max(floor*1.35,floor+mad*2.4,0.003);
  const candidates=[];
  for(let i=2;i<frames.length-2;i++){
    const value=frames[i];
    if(value<threshold||value<frames[i-1]||value<frames[i+1]||value<frames[i-2]||value<frames[i+2])continue;
    const strength=clamp((value-threshold)/Math.max(threshold,0.0001),0,20);
    const time=(i+0.5)*secondsPerFrame,prev=candidates.at(-1);
    if(prev&&time-prev.time<0.2){if(value>prev.value)candidates[candidates.length-1]={time,value,strength};}
    else candidates.push({time,value,strength});
  }
  const intervals=[];
  for(let i=1;i<candidates.length;i++){
    let interval=candidates[i].time-candidates[i-1].time;
    if(interval<0.18||interval>2)continue;
    while(interval<0.3)interval*=2;
    while(interval>1)interval/=2;
    if(interval>=0.3&&interval<=1)intervals.push(interval);
  }
  const histogram=new Map();
  for(const interval of intervals){const bpm=Math.round(60/interval),weight=1-Math.min(0.49,Math.abs(60/interval-bpm));histogram.set(bpm,(histogram.get(bpm)||0)+weight);}
  const ranked=[...histogram.entries()].sort((a,b)=>b[1]-a[1]);
  const bpm=ranked[0]?.[0]||null,totalVotes=ranked.reduce((sum,row)=>sum+row[1],0),confidence=bpm?clamp((ranked[0][1]/Math.max(1,totalVotes))*Math.min(1,intervals.length/12),0,1):0;
  const peaks=[...candidates].sort((a,b)=>b.strength-a.strength).slice(0,maxPeaks).sort((a,b)=>a.time-b.time).map(row=>({time:Number(row.time.toFixed(3)),strength:Number(row.strength.toFixed(3))}));
  return {bpm,confidence:Number(confidence.toFixed(3)),beatTimes:candidates.slice(0,maxPeaks).map(row=>Number(row.time.toFixed(3))),peaks,duration:Number((frames.length*secondsPerFrame).toFixed(3)),threshold:Number(threshold.toFixed(6))};
}

export function roundTimeline(segments=[]){
  return segments.map(row=>({start:Number(row.start.toFixed(3)),end:Number(row.end.toFixed(3)),duration:Number((row.end-row.start).toFixed(3))}));
}
