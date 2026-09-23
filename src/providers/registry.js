import {OpenAIProvider} from "./openai.js";
import {DeepSeekProvider} from "./deepseek.js";
import {GoogleProvider} from "./google.js";
import {ResponsesProvider} from "./responses.js";
import {WaveSpeedProvider} from "./wavespeed.js";

export class ProviderRegistry{
  constructor(cfg){
    this.cfg=cfg;this.factories=new Map();
    this.register("openai",(p,m)=>new OpenAIProvider(cfg,p,m));
    this.register("llama-cpp",(p,m)=>new OpenAIProvider(cfg,p,m));
    this.register("openai-responses",(p,m)=>new ResponsesProvider(cfg,p,m));
    this.register("deepseek",(p,m)=>new DeepSeekProvider(cfg,p,m));
    this.register("google",(p,m)=>new GoogleProvider(cfg,p,m));
    this.register("wavespeed",(p,m)=>new WaveSpeedProvider(cfg,p,m));
  }
  register(type,factory){this.factories.set(type,factory);return factory;}
  unregister(type){return this.factories.delete(type);}
  create(provider,model){
    const pcfg=this.cfg.providers?.[provider];if(!pcfg)throw new Error(`Provider not configured: ${provider}`);
    const type=pcfg.type||"openai";const f=this.factories.get(type)||this.factories.get("openai");return f(provider,model);
  }
}
