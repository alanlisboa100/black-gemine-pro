function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

export const OUTFIT_PROGRESS_LABELS={
  loading:"SOURCE",garment:"GARMENT IQ",safety:"CLOTHED SAFETY",masking:"MASK + TRACK",
  composition:"COMPOSITION LOCK",identity:"IDENTITY LOCK",submitting:"GPU BACKEND",generating:"AI TRY-ON",audio:"AUDIO LOCK",exporting:"MOBILE MP4",photo_export:"PHOTO EXPORT",verifying:"QUALITY CHECK"
};

export function reportOutfitProgress(ctx,update={}){
  if(typeof ctx?.reportProgress!=="function")return;
  const stage=String(update.stage||"generating"),raw=Number(update.percent),percent=Number.isFinite(raw)?Number(clamp(raw,0,100).toFixed(1)):null;
  try{ctx.reportProgress({...update,kind:"outfit",stage,label:OUTFIT_PROGRESS_LABELS[stage]||stage.replace(/_/g," ").toUpperCase(),percent});}catch{}
}
