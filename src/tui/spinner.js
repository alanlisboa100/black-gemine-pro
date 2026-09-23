import {esc,c} from "./ansi.js";
import {MOTION,motionEnabled,motionElapsed} from "./motion.js";
import {truncateToWidth} from "../utils/text.js";

/** One bounded write per frame, with a static reduced-motion mode. */
export class Spinner {
  constructor(text,{
    enabled=true,interval=100,frames=MOTION.think,color=39,
    colors=[39,45,51,87,123],showElapsed=true,prefix="",suffix="",
    output=process.stdout,env=process.env
  }={}){
    this.text=text;this.output=output;this.enabled=!!output.isTTY&&env.TERM!=="dumb";
    this.animated=motionEnabled(enabled,env);
    this.interval=Math.max(80,Number(interval)||100);
    this.frames=frames?.length?frames:MOTION.think;this.color=color;this.colors=colors;
    this.showElapsed=showElapsed;this.prefix=prefix;this.suffix=suffix;
    this.i=0;this.timer=null;this.active=false;this.started=0;this.lastFrame="";
    this.onExit=()=>{if(this.active)this.output.write(esc.showCursor);};
  }
  fit(line){return truncateToWidth(line,Math.max(1,(this.output.columns||80)-1));}
  start(){
    if(!this.enabled||this.active)return this;
    this.active=true;this.started=Date.now();this.lastFrame="";this.i=0;
    process.once("exit",this.onExit);
    this.output.write(esc.hideCursor);this.draw();
    this.timer=setInterval(()=>this.draw(),this.animated?this.interval:1000);
    this.timer.unref?.();return this;
  }
  draw(){
    if(!this.active)return;
    const index=this.animated?this.i++:0;
    const color=this.colors?.length?this.colors[Math.floor(index/4)%this.colors.length]:this.color;
    const frame=c(color,this.animated?this.frames[index%this.frames.length]:"◆");
    const elapsed=this.showElapsed?` ${c(240,"· "+motionElapsed(this.started))}`:"";
    const line=this.fit(`${this.prefix}${frame} ${this.text}${this.suffix}${elapsed}`);
    if(line!==this.lastFrame){this.output.write(`\r${esc.clearLine}${line}`);this.lastFrame=line;}
  }
  update(text){this.text=text;if(this.active)this.draw();return this;}
  setFrames(frames,color){
    if(frames?.length)this.frames=frames;
    if(color!=null){this.color=color;this.colors=null;}
    return this;
  }
  stop(final=""){
    if(!this.active)return this;
    clearInterval(this.timer);this.timer=null;this.active=false;
    process.removeListener("exit",this.onExit);
    this.output.write(`\r${esc.clearLine}${final?this.fit(final)+"\n":""}${esc.showCursor}`);
    return this;
  }
}
