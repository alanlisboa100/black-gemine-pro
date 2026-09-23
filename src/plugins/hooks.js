export class HookBus{
  constructor(){this.handlers=new Map();}
  on(event,fn,{priority=0,owner="anonymous"}={}){
    const arr=this.handlers.get(event)||[];arr.push({fn,priority,owner});arr.sort((a,b)=>b.priority-a.priority);this.handlers.set(event,arr);
    return ()=>this.off(event,fn);
  }
  off(event,fn){const arr=this.handlers.get(event)||[];this.handlers.set(event,arr.filter(x=>x.fn!==fn));}
  async emit(event,payload){for(const h of this.handlers.get(event)||[])await h.fn(payload);}
  async emitCancelable(event,payload){
    for(const h of this.handlers.get(event)||[]){const r=await h.fn(payload);if(r?.cancel)return r;}return null;
  }
  clearOwner(owner){for(const [k,arr] of this.handlers)this.handlers.set(k,arr.filter(x=>x.owner!==owner));}
}
