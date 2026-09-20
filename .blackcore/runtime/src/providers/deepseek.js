import {OpenAIProvider} from "./openai.js";
import {deepSeekReasoningBody} from "../config/reasoning.js";

export class DeepSeekProvider extends OpenAIProvider{
  async chat(opts){
    const body={...(opts.extraBody||{}),...deepSeekReasoningBody(this.cfg,this.provider,this.model)};
    // DeepSeek V4 thinking mode rejects tool_choice. BLACKCORE never sends it.
    return super.chat({...opts,extraBody:body});
  }
  static normalizeHistory(messages){
    return messages.map(m=>{
      if(m.role==="assistant"&&m.tool_calls?.length){
        return {...m,content:m.content??"",...(m.reasoning_content?{reasoning_content:m.reasoning_content}:{})};
      }return m;
    });
  }
}
