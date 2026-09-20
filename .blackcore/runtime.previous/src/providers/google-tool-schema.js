const SAFE_KEYS=new Set(["type","description","properties","required","enum","items"]);

function normalizedType(value){
  if(Array.isArray(value))return value.map(String).find(x=>x!=="null")||"string";
  return typeof value==="string"?value:undefined;
}

function cleanNode(schema){
  if(!schema||typeof schema!=="object")return null;
  if(Array.isArray(schema))return null;
  if(Array.isArray(schema.anyOf)){
    const picked=schema.anyOf.find(x=>x&&typeof x==="object"&&normalizedType(x.type)!=="null")||schema.anyOf[0];
    return cleanNode({...picked,description:schema.description||picked?.description});
  }
  if(Array.isArray(schema.oneOf)){
    const picked=schema.oneOf.find(x=>x&&typeof x==="object"&&normalizedType(x.type)!=="null")||schema.oneOf[0];
    return cleanNode({...picked,description:schema.description||picked?.description});
  }
  const out={};
  const type=normalizedType(schema.type);
  if(type)out.type=type;
  if(typeof schema.description==="string"&&schema.description.trim())out.description=schema.description.trim().slice(0,4000);
  if(Array.isArray(schema.enum)&&schema.enum.length)out.enum=schema.enum.filter(x=>["string","number","boolean"].includes(typeof x)).slice(0,200);
  if(schema.properties&&typeof schema.properties==="object"&&!Array.isArray(schema.properties)){
    const properties={};
    for(const [name,value] of Object.entries(schema.properties)){
      const cleaned=cleanNode(value)||{type:"string"};
      properties[name]=cleaned;
    }
    out.properties=properties;
    if(!out.type)out.type="object";
    if(Array.isArray(schema.required)){
      const required=schema.required.filter(x=>typeof x==="string"&&Object.hasOwn(properties,x));
      if(required.length)out.required=required;
    }
  }
  if(schema.items&&typeof schema.items==="object"){
    out.items=cleanNode(schema.items)||{type:"string"};
    if(!out.type)out.type="array";
  }
  if(out.type==="object"&&!out.properties)out.properties={};
  if(!Object.keys(out).length)return {type:"object",properties:{}};
  for(const key of Object.keys(out))if(!SAFE_KEYS.has(key))delete out[key];
  if(out.type==="object"&&!out.properties)out.properties={};
  return out;
}

export function googleCompatibleSchema(schema){
  const out=cleanNode(schema||{type:"object",properties:{}})||{type:"object",properties:{}};
  if(out.type==="object"&&!out.properties)out.properties={};
  return out;
}

export function googleToolHasArguments(tool){
  const props=tool?.parameters?.properties;
  return !!(props&&typeof props==="object"&&!Array.isArray(props)&&Object.keys(props).length);
}
