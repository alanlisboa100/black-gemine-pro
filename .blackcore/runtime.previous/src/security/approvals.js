export class ApprovalCache{
  constructor(){this.turn=new Map();this.session=new Map();}
  key(kind,value){return `${kind}:${value}`;}
  get(kind,value){return this.turn.get(this.key(kind,value))??this.session.get(this.key(kind,value));}
  grant(kind,value,scope="once"){const k=this.key(kind,value);if(scope==="session")this.session.set(k,true);else if(scope==="turn")this.turn.set(k,true);}
  resetTurn(){this.turn.clear();}
}
