/*
 * Small JSON-Schema validator used for tool-call arguments.
 * Supported vocabulary intentionally matches what BLACKCORE tool definitions use:
 * type, properties, required, additionalProperties, items, enum, const,
 * anyOf, oneOf, allOf, minimum/maximum, exclusiveMinimum/exclusiveMaximum,
 * minLength/maxLength, pattern, format, minItems/maxItems, uniqueItems,
 * minProperties/maxProperties, dependentRequired.
 */
function typeOf(v){
  if(v===null)return"null";if(Array.isArray(v))return"array";if(Number.isInteger(v))return"integer";return typeof v;
}
function add(errors,path,keyword,message,expected,actual){errors.push({path:path||"$",keyword,message,...(expected!==undefined?{expected}:{}),...(actual!==undefined?{actual}:{})});}
function checkType(expected,value){
  const list=Array.isArray(expected)?expected:[expected],actual=typeOf(value);
  return list.some(t=>t==="number"?(actual==="number"||actual==="integer"):t===actual);
}
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function formatOk(name,value){
  if(typeof value!=="string")return true;
  if(name==="email")return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  if(name==="hostname")return /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(value);
  if(name==="ipv4"){const p=value.split(".");return p.length===4&&p.every(x=>/^\d+$/.test(x)&&+x>=0&&+x<=255);}
  if(name==="uuid")return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if(name==="uri")try{new URL(value);return true;}catch{return false;}
  if(name==="date-time")return !Number.isNaN(Date.parse(value));
  return true;
}
function validateInner(schema,value,path,errors,root){
  if(schema===true)return;if(schema===false){add(errors,path,"falseSchema","value forbidden");return;}if(!schema||typeof schema!=="object")return;
  if(schema.$ref){
    if(!schema.$ref.startsWith("#/")){add(errors,path,"$ref","only local refs supported");return;}
    let cur=root;for(const seg of schema.$ref.slice(2).split("/").map(x=>x.replace(/~1/g,"/").replace(/~0/g,"~"))){cur=cur?.[seg];}if(!cur){add(errors,path,"$ref",`unresolved ${schema.$ref}`);return;}return validateInner(cur,value,path,errors,root);
  }
  if(schema.allOf)for(const s of schema.allOf)validateInner(s,value,path,errors,root);
  if(schema.anyOf){
    const matches=schema.anyOf.filter(s=>{const e=[];validateInner(s,value,path,e,root);return e.length===0;}).length;if(!matches)add(errors,path,"anyOf","must match at least one schema");}
  if(schema.oneOf){
    const matches=schema.oneOf.filter(s=>{const e=[];validateInner(s,value,path,e,root);return e.length===0;}).length;if(matches!==1)add(errors,path,"oneOf",`must match exactly one schema; matched ${matches}`);}
  if("const"in schema&&!eq(value,schema.const))add(errors,path,"const","must equal const",schema.const,value);
  if(schema.enum&&!schema.enum.some(x=>eq(x,value)))add(errors,path,"enum","value not in enum",schema.enum,value);
  if(schema.type&&!checkType(schema.type,value)){add(errors,path,"type",`must be ${Array.isArray(schema.type)?schema.type.join("|"):schema.type}`,schema.type,typeOf(value));return;}
  if(typeof value==="string"){
    if(schema.minLength!=null&&value.length<schema.minLength)add(errors,path,"minLength",`length ${value.length} < ${schema.minLength}`);
    if(schema.maxLength!=null&&value.length>schema.maxLength)add(errors,path,"maxLength",`length ${value.length} > ${schema.maxLength}`);
    if(schema.pattern)try{if(!new RegExp(schema.pattern).test(value))add(errors,path,"pattern",`must match ${schema.pattern}`);}catch{add(errors,path,"pattern","invalid schema pattern");}
    if(schema.format&&!formatOk(schema.format,value))add(errors,path,"format",`invalid ${schema.format}`);
  }
  if(typeof value==="number"){
    if(schema.minimum!=null&&value<schema.minimum)add(errors,path,"minimum",`${value} < ${schema.minimum}`);
    if(schema.maximum!=null&&value>schema.maximum)add(errors,path,"maximum",`${value} > ${schema.maximum}`);
    if(schema.exclusiveMinimum!=null&&value<=schema.exclusiveMinimum)add(errors,path,"exclusiveMinimum",`${value} <= ${schema.exclusiveMinimum}`);
    if(schema.exclusiveMaximum!=null&&value>=schema.exclusiveMaximum)add(errors,path,"exclusiveMaximum",`${value} >= ${schema.exclusiveMaximum}`);
    if(schema.multipleOf!=null&&Math.abs(value/schema.multipleOf-Math.round(value/schema.multipleOf))>1e-9)add(errors,path,"multipleOf",`not multiple of ${schema.multipleOf}`);
  }
  if(Array.isArray(value)){
    if(schema.minItems!=null&&value.length<schema.minItems)add(errors,path,"minItems",`${value.length} < ${schema.minItems}`);
    if(schema.maxItems!=null&&value.length>schema.maxItems)add(errors,path,"maxItems",`${value.length} > ${schema.maxItems}`);
    if(schema.uniqueItems){const seen=new Set();for(const x of value){const k=JSON.stringify(x);if(seen.has(k)){add(errors,path,"uniqueItems","array items must be unique");break;}seen.add(k);}}
    if(schema.items)for(let i=0;i<value.length;i++)validateInner(schema.items,value[i],`${path}[${i}]`,errors,root);
    if(schema.prefixItems)for(let i=0;i<Math.min(value.length,schema.prefixItems.length);i++)validateInner(schema.prefixItems[i],value[i],`${path}[${i}]`,errors,root);
  }
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    const keys=Object.keys(value),props=schema.properties||{};
    if(schema.minProperties!=null&&keys.length<schema.minProperties)add(errors,path,"minProperties",`${keys.length} < ${schema.minProperties}`);
    if(schema.maxProperties!=null&&keys.length>schema.maxProperties)add(errors,path,"maxProperties",`${keys.length} > ${schema.maxProperties}`);
    for(const req of schema.required||[])if(!(req in value))add(errors,`${path}.${req}`,"required","required property missing");
    for(const [k,v] of Object.entries(value)){
      if(props[k])validateInner(props[k],v,`${path}.${k}`,errors,root);
      else if(schema.patternProperties){
        let matched=false;for(const [pat,sub] of Object.entries(schema.patternProperties)){if(new RegExp(pat).test(k)){matched=true;validateInner(sub,v,`${path}.${k}`,errors,root);}}
        if(!matched&&schema.additionalProperties===false)add(errors,`${path}.${k}`,"additionalProperties","unexpected property");
      }else if(schema.additionalProperties===false)add(errors,`${path}.${k}`,"additionalProperties","unexpected property");
      else if(schema.additionalProperties&&typeof schema.additionalProperties==="object")validateInner(schema.additionalProperties,v,`${path}.${k}`,errors,root);
    }
    for(const [k,reqs] of Object.entries(schema.dependentRequired||{}))if(k in value)for(const r of reqs)if(!(r in value))add(errors,`${path}.${r}`,"dependentRequired",`${r} required when ${k} exists`);
  }
  if(schema.not){const e=[];validateInner(schema.not,value,path,e,root);if(e.length===0)add(errors,path,"not","must not match forbidden schema");}
}
export function validateSchema(schema,value){const errors=[];validateInner(schema,value,"$",errors,schema);return {ok:errors.length===0,errors};}
export function assertSchema(schema,value,label="value"){const r=validateSchema(schema,value);if(!r.ok){const text=r.errors.slice(0,8).map(e=>`${e.path}: ${e.message}`).join("; ");throw new Error(`${label} schema validation failed: ${text}`);}return value;}
