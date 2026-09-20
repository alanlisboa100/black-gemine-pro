function cleanUrl(value=""){return String(value).trim().replace(/\/+$/,"");}
function assertConfig(url,key){if(!/^https?:\/\//.test(url))throw new Error("Informe uma URL Supabase válida.");if(String(key).length<20)throw new Error("Informe a chave publicável/anon do projeto.");}

export class SupabaseWorkspace{
  constructor({url,publishableKey,storage=sessionStorage}={}){this.url=cleanUrl(url);this.key=String(publishableKey||"").trim();this.storage=storage;assertConfig(this.url,this.key);}
  get token(){return this.storage.getItem("blackcore.supabase.accessToken")||"";}
  set token(value){value?this.storage.setItem("blackcore.supabase.accessToken",value):this.storage.removeItem("blackcore.supabase.accessToken");}
  async request(path,{method="GET",body,auth=true,headers={}}={}){
    const response=await fetch(`${this.url}${path}`,{method,headers:{apikey:this.key,"Content-Type":"application/json",...(auth&&this.token?{Authorization:`Bearer ${this.token}`}:{Authorization:`Bearer ${this.key}`}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null;}catch{payload=text;}
    if(!response.ok)throw new Error(payload?.msg||payload?.message||payload?.error_description||`Supabase respondeu ${response.status}.`);return payload;
  }
  async health(){return this.request("/auth/v1/settings",{auth:false});}
  async signIn(email,password){const data=await this.request("/auth/v1/token?grant_type=password",{method:"POST",auth:false,body:{email,password}});this.token=data.access_token;return data.user;}
  async signUp(email,password){const data=await this.request("/auth/v1/signup",{method:"POST",auth:false,body:{email,password}});if(data.access_token)this.token=data.access_token;return data.user;}
  signOut(){this.token="";}
  async user(){if(!this.token)return null;return this.request("/auth/v1/user");}
  async listItems(){if(!this.token)throw new Error("Entre na sua conta antes de sincronizar.");return this.request("/rest/v1/workspace_items?select=*&order=updated_at.desc");}
  async upsertItems(items){if(!this.token)throw new Error("Entre na sua conta antes de sincronizar.");if(!items.length)return[];return this.request("/rest/v1/workspace_items?on_conflict=id",{method:"POST",body:items,headers:{Prefer:"resolution=merge-duplicates,return=representation"}});}
  async deleteItem(id){if(!this.token)throw new Error("Entre na sua conta antes de sincronizar.");return this.request(`/rest/v1/workspace_items?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});}
}
