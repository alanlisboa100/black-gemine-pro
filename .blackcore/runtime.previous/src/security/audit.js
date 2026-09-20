import path from "node:path";
import {appendJsonl} from "../utils/jsonl.js";
import {LOG_DIR,ensureHome} from "../utils/paths.js";
import {redactSecrets} from "./secrets.js";

export class AuditLog{
  constructor(){ensureHome();this.file=path.join(LOG_DIR,`audit-${new Date().toISOString().slice(0,10)}.jsonl`);}
  record(type,data={}){appendJsonl(this.file,{ts:new Date().toISOString(),type,...JSON.parse(redactSecrets(JSON.stringify(data)))});}
}
