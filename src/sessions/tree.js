export class SessionTree{
  constructor(entries=[]){this.entries=[...entries];this.byId=new Map(entries.filter(x=>x.id).map(x=>[x.id,x]));this.children=new Map();for(const e of entries){if(!e.id)continue;const p=e.parentId||null;const a=this.children.get(p)||[];a.push(e);this.children.set(p,a);}}
  add(e){this.entries.push(e);if(e.id)this.byId.set(e.id,e);const p=e.parentId||null;const a=this.children.get(p)||[];a.push(e);this.children.set(p,a);}
  get(id){return this.byId.get(id)||null;}
  ancestors(id){const out=[];let cur=this.get(id);const seen=new Set();while(cur&&cur.id&&!seen.has(cur.id)){seen.add(cur.id);out.push(cur);cur=cur.parentId?this.get(cur.parentId):null;}return out.reverse();}
  leaves(){return this.entries.filter(e=>e.id && !(this.children.get(e.id)?.length));}
  depth(id){let d=0,cur=this.get(id),seen=new Set();while(cur?.parentId&&!seen.has(cur.id)){seen.add(cur.id);d++;cur=this.get(cur.parentId);}return d;}
  render({activeId,max=200}={}){
    const roots=(this.children.get(null)||[]).filter(x=>x.type!=="session_header");const lines=[];let count=0;
    const walk=(e,prefix,last)=>{if(count++>=max)return;const mark=e.id===activeId?"●":"○";const label=e.label?` [${e.label}]`:"";const preview=String(e.content??e.data?.summary??e.type).replace(/\s+/g," ").slice(0,74);lines.push(`${prefix}${last?"└─":"├─"}${mark} ${e.id.slice(0,10)} ${e.type}${e.role?`/${e.role}`:""}${label} ${preview}`);const kids=this.children.get(e.id)||[];kids.forEach((k,i)=>walk(k,prefix+(last?"  ":"│ "),i===kids.length-1));};
    roots.forEach((r,i)=>walk(r,"",i===roots.length-1));return lines.join("\n");
  }
}
