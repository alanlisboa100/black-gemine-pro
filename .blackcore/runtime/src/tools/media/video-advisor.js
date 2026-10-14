function round(value,digits=3){return Number((Number(value)||0).toFixed(digits));}
function totalDuration(rows=[]){return rows.reduce((sum,row)=>sum+Math.max(0,Number(row?.duration)||(Number(row?.end)-Number(row?.start))||0),0);}
function issue(id,severity,area,title,evidence,change,changeId){return {id,severity,area,title,evidence,change,changeId};}

export function buildVideoAdvice({summary={},analysis={},capabilities={}}={}){
  const duration=Math.max(0,Number(summary.duration)||0),hasVideo=Boolean(summary.video),video=summary.video||{},audio=summary.audio||null,silences=analysis.silences||[],blackFrames=analysis.blackFrames||[],sceneTimes=analysis.sceneTimes||[],loudness=analysis.loudness||null,rhythm=analysis.audioRhythm||null,motion=analysis.motion||{},environment=analysis.environment||{},findings=[];
  const silenceSeconds=totalDuration(silences),silenceRatio=duration?silenceSeconds/duration:0,blackSeconds=totalDuration(blackFrames),blackRatio=duration?blackSeconds/duration:0,sceneRate=duration?sceneTimes.length/(duration/60):0,estimatedDuration=Number(analysis.estimatedEditedDuration)||duration,reduction=duration?Math.max(0,duration-estimatedDuration)/duration:0;

  if(duration>600)findings.push(issue("very-long-mobile-render","high","export","Long phone render",`Source duration is ${round(duration/60,1)} minutes.`,`Use 720p, a fast preset and a checkpointed render; avoid stacking unnecessary effects.`,`export`));
  else if(duration>180)findings.push(issue("long-mobile-render","medium","export","Longer phone render",`Source duration is ${round(duration/60,1)} minutes.`,`Prefer 720p mobile HD and only the selected passes to reduce heat and timeout risk.`,`export`));
  if(!hasVideo)findings.push(issue("no-video","high","source","No picture stream",`The source has no detected video stream.`,`Choose another source before requesting a video edit.`,`source`));
  if(!audio)findings.push(issue("no-audio","medium","audio","No embedded soundtrack",`No audio stream was detected.`,`Keep the result silent or choose a music file before editing.`,`music`));
  if(silenceRatio>0.12)findings.push(issue("long-pauses","high","timeline",`${round(silenceSeconds,1)} seconds of low audio activity`,`${round(silenceRatio*100,1)}% of the timeline was detected as silence or very low audio.`,`Offer joint picture-and-sound trimming while protecting active movement.`,`cuts`));
  else if(silenceRatio>0.035)findings.push(issue("some-pauses","medium","timeline","Removable pauses detected",`${round(silenceSeconds,1)} seconds of low audio activity were detected.`,`Use conservative joint A/V cuts only where picture and sound are inactive.`,`cuts`));
  if(blackRatio>0.003)findings.push(issue("black-frames","medium","timeline","Blank picture intervals",`${round(blackSeconds,2)} seconds of black frames were measured.`,`Remove blank starts, endings or unusable gaps without touching good scenes.`,`cuts`));
  if(reduction>0.05)findings.push(issue("timeline-reduction","medium","timeline","A shorter coherent version is possible",`The measured active timeline is about ${round(estimatedDuration,1)} of ${round(duration,1)} seconds.`,`Let the user choose whether to shorten the story or preserve the full duration.`,`cuts`));

  if(duration>20&&sceneRate<1.5)findings.push(issue("long-takes","medium","picture","Long continuous takes",`${sceneTimes.length} strong scene changes were detected (${round(sceneRate,1)} per minute).`,`Use a few beat-aware cuts or restrained punch-ins; do not accelerate the video.`,`transitions`));
  else if(sceneRate>18)findings.push(issue("fast-source","medium","picture","Source is already rapidly cut",`${sceneTimes.length} scene changes were detected (${round(sceneRate,1)} per minute).`,`Preserve the existing rhythm and use clean cuts or very sparse transitions.`,`transitions`));
  else if(sceneTimes.length)findings.push(issue("usable-scenes","low","picture","Usable scene structure",`${sceneTimes.length} strong scene changes provide natural edit points.`,`Snap only suitable boundaries near beats and movement peaks.`,`transitions`));

  if(loudness){
    if(Number(loudness.integratedLufs)<-18)findings.push(issue("quiet-audio","medium","audio","Audio level is low",`Integrated loudness is ${round(loudness.integratedLufs,1)} LUFS.`,`Offer controlled mastering without changing the song speed.`,`audio-master`));
    else if(Number(loudness.integratedLufs)>-10||Number(loudness.truePeakDb)>-1)findings.push(issue("hot-audio","high","audio","Audio is close to clipping",`Measured ${round(loudness.integratedLufs,1)} LUFS and ${round(loudness.truePeakDb,1)} dBTP.`,`Lower peaks and normalize dynamics before export.`,`audio-master`));
    if(Number(loudness.loudnessRange)>14)findings.push(issue("wide-dynamics","medium","audio","Large loudness swings",`Loudness range is ${round(loudness.loudnessRange,1)} LU.`,`Use gentle compression and true-peak limiting.`,`audio-master`));
  }

  if(rhythm?.bpm&&Number(rhythm.confidence)>=0.12)findings.push(issue("rhythm-map","low","music",`Rhythm near ${round(rhythm.bpm,0)} BPM`,`Beat confidence is ${round(rhythm.confidence,2)}; genre remains an estimate unless named by the user.`,`Offer sparse beat-aware cuts while preserving musical phrases.`,`rhythm`));
  else if(audio)findings.push(issue("rhythm-uncertain","low","music","Rhythm classification is uncertain","The beat scan did not reach a confident BPM estimate.","Use neutral pacing and scene boundaries instead of forcing cuts on weak beats.","rhythm"));

  if(Number(motion.strongFraction)>0.16)findings.push(issue("strong-motion","high","picture","Dance or action-like movement",`${round(Number(motion.strongFraction)*100,1)}% of motion samples are strong.`,`Protect these moments from trimming, reverse and artificial zoom.`,`cuts`));
  if(Number(motion.lowFraction)>0.48)findings.push(issue("low-motion","medium","picture","Many low-motion intervals",`${round(Number(motion.lowFraction)*100,1)}% of motion samples are low.`,`Use sound plus motion together before removing any interval.`,`cuts`));

  const environmentNames=Object.entries(environment.summary||{}).filter(([,count])=>Number(count)>0).map(([name,count])=>`${name} ${count}`);
  if(environmentNames.length)findings.push(issue("scene-environments","medium","color","Scene-specific light and environments",`Detected samples: ${environmentNames.join(", ")}.`,`Apply capped color, light and detail correction per scene instead of one global filter.`,`environment`));
  const width=Number(video.width)||0,height=Number(video.height)||0;if(Math.max(width,height)>2560)findings.push(issue("over-2k-source","medium","export","Source exceeds the phone editing ceiling",`Detected frame size is ${width}×${height}.`,`Scale to 1080p or 720p; keep 2K as the hard maximum.`,`export`));
  if(!findings.length)findings.push(issue("balanced-source","low","source","Technically balanced source","No strong timeline, picture or audio defect crossed the recommendation thresholds.","Choose a creative style only if a visible change is wanted.","style"));

  const changes=new Set(findings.map(row=>row.changeId)),hasAudio=Boolean(audio),whisperReady=Boolean(capabilities.localWhisper?.ready),stabilizationReady=Boolean(capabilities.stabilization?.ready),suggestedChanges=[
    {id:"cuts",label:"Smart chronological picture-and-sound cuts",recommended:changes.has("cuts"),ready:true,mapsTo:{removeSilence:true,removeBlackFrames:true,editMethod:"audio-or-motion"}},
    {id:"transitions",label:"Sparse intelligent transitions",recommended:changes.has("transitions")||sceneTimes.length>1,ready:true,mapsTo:{transition:"auto"}},
    {id:"rhythm",label:"Beat and movement-aware pacing",recommended:changes.has("rhythm")&&Boolean(rhythm?.bpm),ready:hasAudio,mapsTo:{syncToBeats:true,musicGenre:"auto"}},
    {id:"environment",label:"Adaptive light, water, sky, green and landscape grade",recommended:changes.has("environment"),ready:true,mapsTo:{environmentEnhancement:true}},
    {id:"color",label:"Studio or cinematic color treatment",recommended:true,ready:true,mapsTo:{colorGrade:"choose-style"}},
    {id:"capcut-style",label:"CapCut dynamic beat transitions, white flash and punch-in",recommended:false,ready:true,mapsTo:{style:"capcut",colorGrade:"capcut-teal-orange"}},
    {id:"audio-master",label:"Audio mastering and peak control",recommended:changes.has("audio-master"),ready:hasAudio,mapsTo:{masterAudio:true}},
    {id:"audio-denoise",label:"Audio noise reduction",recommended:false,ready:hasAudio,mapsTo:{denoiseAudio:true}},
    {id:"stabilize",label:"Camera stabilization",recommended:false,ready:stabilizationReady,requires:stabilizationReady?null:"FFmpeg vidstabdetect and vidstabtransform filters",mapsTo:{action:"stabilize"}},
    {id:"captions",label:"Automatic local captions",recommended:false,ready:whisperReady,requires:whisperReady?null:"Whisper/whisper.cpp command plus a local model",mapsTo:{autoCaptions:true}},
    {id:"music",label:"Add or replace music",recommended:!hasAudio,ready:true,requires:"music file chosen by the user",mapsTo:{music:"ask-user"}},
    {id:"reframe",label:"Reframe for 9:16, 1:1 or 16:9",recommended:false,ready:true,mapsTo:{aspectRatio:"ask-user"}},
    {id:"text",label:"Text overlay",recommended:false,ready:true,mapsTo:{text:"ask-user"}},
    {id:"watermark",label:"BLACKCORE video signature",recommended:false,ready:true,mapsTo:{brandWatermark:true}},
    {id:"outfit",label:"Safe outfit replacement",recommended:false,ready:false,requires:"garment image plus a configured temporal outfit GPU backend",separateTool:"outfit_editor"}
  ];
  const common={action:"auto_edit",transition:"auto",editMethod:"audio-or-motion",environmentEnhancement:true,mobileHd:true,maxResolution:"720p"},presets=[
    {id:"basic",label:"Basic conservative edit",recommended:false,ready:true,arguments:{...common,editLevel:"basic",colorGrade:"natural",masterAudio:false,denoiseAudio:false}},
    {id:"medium",label:"Balanced professional edit",recommended:true,ready:true,arguments:{...common,editLevel:"medium",colorGrade:"studio",masterAudio:false,denoiseAudio:false}},
    {id:"high",label:"High cinematic BLACKCORE edit",recommended:false,ready:true,arguments:{...common,editLevel:"high",colorGrade:"cinematic",masterAudio:true,denoiseAudio:true}},
    {id:"capcut-viral",label:"CapCut/TikTok viral edit (dynamic cuts, white flash, teal-orange grade and bold captions)",recommended:false,ready:true,arguments:{...common,editLevel:"high",style:"capcut",colorGrade:"capcut-teal-orange",captionStyle:"capcut",aspectRatio:"vertical",reframeMode:"blur"}},
    {id:"music-locked",label:"Visual edit with the original song continuous",recommended:false,ready:hasAudio,requires:hasAudio?null:"embedded source audio",arguments:{...common,editLevel:"medium",colorGrade:"studio",preserveSourceAudio:true,removeSilence:false,masterAudio:false,denoiseAudio:false}},
    {id:"visual-polish",label:"Picture and color only, full duration",recommended:false,ready:true,arguments:{...common,editLevel:"medium",colorGrade:"studio",removeSilence:false,removeBlackFrames:false,transition:"none",preserveSourceAudio:hasAudio}},
    {id:"social-vertical",label:"Vertical social version",recommended:false,ready:true,requires:"approval to change framing",arguments:{...common,editLevel:"medium",colorGrade:"studio",aspectRatio:"vertical",reframeMode:"blur"}}
  ],audioPolicies=[
    {id:"joint-av",label:"Cut picture and embedded sound together",recommended:hasAudio,ready:hasAudio,arguments:{preserveSourceAudio:false}},
    {id:"preserve-song",label:"Keep the original song continuous",recommended:false,ready:hasAudio,arguments:{preserveSourceAudio:true,removeSilence:false,masterAudio:false,denoiseAudio:false}},
    {id:"new-music",label:"Use a chosen music file",recommended:!hasAudio,ready:true,requires:"music path",arguments:{music:"ask-user",syncToBeats:true}}
  ],outputOptions=[
    {id:"720p",label:"720p mobile HD",recommended:true,ready:true,arguments:{mobileHd:true,maxResolution:"720p"}},
    {id:"1080p",label:"1080p",recommended:false,ready:true,arguments:{mobileHd:true,maxResolution:"1080p"}},
    {id:"2k",label:"2K maximum",recommended:false,ready:true,arguments:{mobileHd:true,maxResolution:"2k"}}
  ];
  const high=findings.filter(row=>row.severity==="high").length,medium=findings.filter(row=>row.severity==="medium").length;
  return {noChangesApplied:true,summary:high?`${high} high-priority and ${medium} medium-priority video opportunities detected.`:medium?`${medium} medium-priority video opportunities detected.`:"The source is technically balanced; creative changes are optional.",metrics:{durationSeconds:round(duration,3),silenceSeconds:round(silenceSeconds,3),blackFrameSeconds:round(blackSeconds,3),sceneChanges:sceneTimes.length,sceneChangesPerMinute:round(sceneRate,2),estimatedEditedDuration:round(estimatedDuration,3)},findings,suggestedChanges,presets,audioPolicies,outputOptions,aiCapabilities:capabilities,choicePrompt:"Choose one preset, one audio policy, one output option and any optional change IDs. BLACKCORE must not render or mutate the video until the choice is confirmed.",limitations:["Music genre is an estimate unless the user names it.","rembg is not used frame-by-frame because independent masks can flicker; temporal subject/object work requires a compatible video backend.","The active language model plans the approved edit; FFmpeg and verified optional local backends execute it."]};
}
