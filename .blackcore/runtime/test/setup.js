// Isolate all QA configuration and checkpoints from the installed BLACKCORE.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'blackcore-test-'));
process.env.BLACKCORE_HOME=home;
process.on('exit',()=>fs.rmSync(home,{recursive:true,force:true}));
