function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

export const PHOTO_PROGRESS_LABELS={
  loading:"SOURCE",analyzing:"PHOTO IQ",scope:"EDIT SCOPE",composition:"FRAME LOCK",light:"BLACK LEVEL",color:"CINEMA COLOR",noise:"DENOISE",detail:"DETAIL LOCK",masking:"MASK EDGE",cropping:"SMART CROP",branding:"WATERMARK",text:"TEXT",exporting:"EXPORT",verifying:"QUALITY CHECK"
};

export function reportPhotoProgress(ctx,update={}){
  if(typeof ctx?.reportProgress!=="function")return;
  const stage=String(update.stage||"exporting"),raw=Number(update.percent),percent=Number.isFinite(raw)?Number(clamp(raw,0,100).toFixed(1)):null;
  try{ctx.reportProgress({...update,kind:"photo",stage,label:PHOTO_PROGRESS_LABELS[stage]||stage.replace(/_/g," ").toUpperCase(),percent});}catch{}
}
