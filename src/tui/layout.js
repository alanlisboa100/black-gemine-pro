import {truncateToWidth,visibleWidth} from "../utils/text.js";
export function width(){return Math.max(30,process.stdout.columns||80);}
export function fit(line,padding=0){return truncateToWidth(line,Math.max(1,width()-padding));}
export function hr(char="─"){return char.repeat(Math.max(1,width()));}
export function box(lines,{title="",min=20,max=100}={}){
  const w=Math.max(min,Math.min(max,width(),Math.max(...lines.map(visibleWidth),visibleWidth(title))+4)),inner=w-2;const top=title?`┌─ ${truncateToWidth(title,inner-3)} ${"─".repeat(Math.max(0,inner-visibleWidth(title)-3))}┐`:`┌${"─".repeat(inner)}┐`;
  const body=lines.map(x=>`│${truncateToWidth(x,inner-2).padEnd(inner-2)}  │`);return [top,...body,`└${"─".repeat(inner)}┘`].join("\n");
}
