import {defineTool} from "../registry.js";
import {runCli} from "../common/cli.js";

function readOnly(sql=""){return /^\s*(select|show|explain|with\b[\s\S]*\bselect|table)\b/i.test(sql);}
function connection(a){
  const name=a.connectionEnv||"DATABASE_URL",value=process.env[name];
  if(!value)throw new Error(`database connection environment variable not configured: ${name}`);
  const u=new URL(value),database=u.pathname.replace(/^\//,"");
  if(!/^postgres(?:ql)?:$/.test(u.protocol)||!u.hostname||!database)throw new Error(`${name} must contain a PostgreSQL URL`);
  return {args:["-h",u.hostname,"-p",u.port||"5432","-U",decodeURIComponent(u.username),"-d",decodeURIComponent(database)],env:{...process.env,PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:u.searchParams.get("sslmode")||process.env.PGSSLMODE||"prefer",PGCONNECT_TIMEOUT:"10"}};
}
export const postgresTool=defineTool({
  name:"postgres",description:"Inspect or query PostgreSQL using psql and a named connection environment variable. Connection secrets never enter model-visible command text.",parallelSafe:false,planSafe:a=>["ping","tables","schema","query"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["ping","tables","schema","query","exec"]},connectionEnv:{type:"string",pattern:"^[A-Za-z_][A-Za-z0-9_]{0,127}$"},sql:{type:"string",maxLength:500000},table:{type:"string",maxLength:300},limit:{type:"integer",minimum:1,maximum:10000}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const c=connection(a);let sql;
    if(a.action==="ping")sql="SELECT current_database() AS database, current_user AS user, version();";
    else if(a.action==="tables")sql="SELECT table_schema,table_name,table_type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;";
    else if(a.action==="schema"){if(!a.table)throw new Error("table required");sql=`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_name='${a.table.replace(/'/g,"''")}' ORDER BY ordinal_position;`;}
    else {if(!a.sql)throw new Error("sql required");sql=a.sql;}
    if(a.action==="query"&&!readOnly(sql))throw new Error("query accepts read-only SQL; use exec for mutations");
    if(a.action==="exec"&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Execute mutating PostgreSQL statement using ${a.connectionEnv||"DATABASE_URL"}?`,false);if(!ok)return"PostgreSQL mutation denied";}
    const result=await runCli(ctx,"psql",[...c.args,"--no-psqlrc","--set","ON_ERROR_STOP=1","--csv","-c",sql],{env:c.env,timeoutMs:300000});return result.output;
  }
});
