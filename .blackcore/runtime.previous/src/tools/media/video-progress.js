function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

export const VIDEO_PROGRESS_LABELS={
  loading:"SOURCE",analyzing:"ANALYSIS",silence:"SILENCE",black_frames:"BLACK FRAMES",
  scenes:"SCENES",scene_quality:"SCENE IQ",environment:"SCENE COLOR",rhythm:"RHYTHM MAP",music_identity:"MUSIC ID",cutting:"A/V SMART CUT",transitions:"TRANSITION IN/OUT",scaling:"MOBILE HD",
  color:"COLOR",audio:"AUDIO",audio_lock:"AUDIO LOCK",audio_edit:"AUDIO CUT/MIX",watermark:"WATERMARK",mixing:"MIXING",captions:"CAPTIONS",
  stabilizing:"STABILIZING",rendering:"RENDERING",finalizing:"FINALIZING",edit_check:"EDIT DELTA",verifying:"QUALITY CHECK"
};

export function reportVideoProgress(ctx,update={}){
  if(typeof ctx?.reportProgress!=="function")return;
  const stage=String(update.stage||"rendering"),raw=Number(update.percent),percent=Number.isFinite(raw)?Number(clamp(raw,0,100).toFixed(1)):null;
  try{ctx.reportProgress({...update,kind:"video",stage,label:VIDEO_PROGRESS_LABELS[stage]||stage.replace(/_/g," ").toUpperCase(),percent});}catch{}
}

export function parseFfmpegClock(value=""){
  const parts=String(value).trim().split(":").map(Number);
  if(parts.length!==3||parts.some(x=>!Number.isFinite(x)))return null;
  return parts[0]*3600+parts[1]*60+parts[2];
}

export function createFfmpegProgressParser({durationSeconds=0,stage="rendering",from=0,to=100,onProgress=()=>{},now=()=>Date.now(),minIntervalMs=180}={}){
  const total=Number(durationSeconds)||0,start=now(),span=Math.max(0,Number(to)-Number(from));let buffer="",lastEmit=0,lastOverall=-1,position=0,speed=null;
  const emit=(ratio,{force=false}={})=>{
    const at=now(),bounded=clamp(Number(ratio)||0,0,1),overall=clamp(Number(from)+bounded*span,0,100);
    if(!force&&at-lastEmit<minIntervalMs&&overall-lastOverall<0.5)return;
    const elapsedMs=Math.max(0,at-start),etaMs=bounded>0.015&&bounded<1?Math.max(0,elapsedMs*(1-bounded)/bounded):null;
    lastEmit=at;lastOverall=overall;onProgress({stage,percent:Number(overall.toFixed(1)),positionSeconds:Number(position.toFixed(3)),durationSeconds:total||null,etaMs:etaMs==null?null:Math.round(etaMs),speed});
  };
  const consume=line=>{
    const index=line.indexOf("=");if(index<1)return;const key=line.slice(0,index).trim(),value=line.slice(index+1).trim();
    if(key==="speed"){speed=value;return;}
    if(key==="out_time_us"||key==="out_time_ms"){const raw=Number(value);if(Number.isFinite(raw))position=Math.max(position,raw/1_000_000);}
    else if(key==="out_time"){const seconds=parseFfmpegClock(value);if(seconds!=null)position=Math.max(position,seconds);}
    else if(key==="progress"&&value==="end"){position=total||position;emit(1,{force:true});return;}
    else return;
    if(total>0)emit(position/total);
  };
  return chunk=>{buffer+=String(chunk??"");const rows=buffer.split(/\r?\n/);buffer=rows.pop()||"";for(const row of rows)consume(row);};
}
