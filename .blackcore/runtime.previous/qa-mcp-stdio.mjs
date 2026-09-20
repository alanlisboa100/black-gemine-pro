import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {MCPClient} from './src/mcp/client.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bc-mcp-stdio-')),server=path.join(dir,'server.mjs');
fs.writeFileSync(server, `
import readline from 'node:readline';
const rl=readline.createInterface({input:process.stdin});
for await (const line of rl) {
  let j; try { j=JSON.parse(line); } catch { continue; }
  let result={};
  if (j.method==='server/discover') result={capabilities:{tools:{}}};
  else if (j.method==='tools/list') result={tools:[{name:'echo',description:'echo',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}}]};
  else if (j.method==='tools/call') result={content:[{type:'text',text:'STDIO:'+j.params.arguments.text}]};
  if (j.id!=null) process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:j.id,result:{...result,_meta:{'io.modelcontextprotocol/serverInfo':{name:'stdio-test',version:'1'}}}})+'\\n');
}
`);
const c=await new MCPClient('stdio',{command:process.execPath,args:[server],legacyFallback:false,onStderr:s=>process.stderr.write(s)}).connect();
assert.equal(c.protocolVersion,'2026-07-28');assert.equal(c.tools.length,1);
const r=await c.callTool('echo',{text:'oi'});assert.equal(r.content[0].text,'STDIO:oi');
console.log(JSON.stringify({protocol:c.protocolVersion,tool:c.tools[0].name,result:r.content[0].text}));c.close();
