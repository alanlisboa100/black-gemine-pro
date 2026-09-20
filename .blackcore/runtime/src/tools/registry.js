export class ToolRegistry{
  constructor(){this.tools=new Map();this.groups=new Map();}
  register(tool,{group="custom",override=false}={}){
    if(!tool?.name||typeof tool.execute!=="function")throw new Error("invalid tool");
    if(this.tools.has(tool.name)&&!override)throw new Error(`tool already registered: ${tool.name}`);
    this.tools.set(tool.name,tool);const set=this.groups.get(group)||new Set();set.add(tool.name);this.groups.set(group,set);return tool;
  }
  unregister(name){this.tools.delete(name);for(const s of this.groups.values())s.delete(name);}
  get(name){return this.tools.get(name);}
  list(active=null){
    const arr=[...this.tools.values()];if(!active||!active.length)return arr;const set=new Set(active);return arr.filter(t=>set.has(t.name));
  }
  names(){return [...this.tools.keys()];}
  group(name){return [...(this.groups.get(name)||[])];}
  clone(){const r=new ToolRegistry();for(const [n,t] of this.tools)r.tools.set(n,t);for(const [g,s] of this.groups)r.groups.set(g,new Set(s));return r;}
}
export function defineTool({name,description,parameters,readOnly=false,parallelSafe=readOnly,parallelConflict=null,mutates=false,planSafe=null,resultStatus=null,execute}){
  return {name,description,parameters:parameters||{type:"object",properties:{},additionalProperties:false},readOnly,parallelSafe,parallelConflict,mutates,planSafe,resultStatus,execute};
}
