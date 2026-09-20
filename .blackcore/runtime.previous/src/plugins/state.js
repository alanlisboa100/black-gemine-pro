import fs from "node:fs";
import path from "node:path";
import {BC_HOME,ensureHome} from "../utils/paths.js";
import {writeTextAtomic} from "../utils/fs.js";

export class ExtensionStateStore{
  constructor(file=path.join(BC_HOME,"config","extension-state.json")){ensureHome();this.file=file;this.data={};try{this.data=JSON.parse(fs.readFileSync(file,"utf8"));}catch{}}
  get(owner,key,fallback=null){return this.data?.[owner]?.[key]??fallback;}
  async set(owner,key,value){this.data[owner]??={};if(value===undefined)delete this.data[owner][key];else this.data[owner][key]=value;await writeTextAtomic(this.file,JSON.stringify(this.data,null,2)+"\n");return value;}
  namespace(owner){return {...(this.data[owner]||{})};}
}
