import fs from "node:fs";
export class SessionState{
  constructor(session){this.file=session.ephemeral?null:session.file+".state.json";this.data={todos:[],activeSkills:[],toolSettings:{}};if(this.file&&fs.existsSync(this.file))try{this.data={...this.data,...JSON.parse(fs.readFileSync(this.file,"utf8"))};}catch{}}
  save(){if(this.file)fs.writeFileSync(this.file,JSON.stringify(this.data,null,2)+"\n","utf8");}
}
