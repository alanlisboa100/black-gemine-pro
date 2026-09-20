export class ExtensionAPI{
  constructor({name,registry,commands,hooks,providers,ui,state,cfg,cwd}){
    Object.assign(this,{name,registry,commands,hooks,providers,ui,state,cfg,cwd});this.disposers=[];
  }
  registerTool(tool,{override=false,group=null}={}){
    const previous=this.registry.get(tool.name);this.registry.register(tool,{override,group:group||`extension:${this.name}`});
    this.disposers.push(()=>{this.registry.unregister(tool.name);if(previous)this.registry.register(previous,{override:true,group:"restored"});});return tool;
  }
  unregisterTool(name){return this.registry.unregister(name);}
  registerCommand(name,handler,{description=""}={}){
    if(this.commands.has(name))throw new Error(`command already registered: ${name}`);this.commands.set(name,{handler,description,owner:this.name});this.disposers.push(()=>{if(this.commands.get(name)?.owner===this.name)this.commands.delete(name);});
  }
  on(event,handler,opts={}){const off=this.hooks.on(event,handler,{...opts,owner:this.name});this.disposers.push(off);return off;}
  registerProvider(type,factory){const previous=this.providers.factories.get(type);this.providers.register(type,factory);this.disposers.push(()=>{if(previous)this.providers.register(type,previous);else this.providers.unregister(type);});}
  setStatus(text){this.ui?.setExtensionStatus?.(this.name,text);}
  notify(text,level="info"){this.ui?.notify?.(text,level);}
  getState(key,fallback=null){return this.state.get(this.name,key,fallback);}
  setState(key,value){return this.state.set(this.name,key,value);}
  allState(){return this.state.namespace(this.name);}
  dispose(){for(const fn of this.disposers.splice(0).reverse())try{fn();}catch{}}
}
