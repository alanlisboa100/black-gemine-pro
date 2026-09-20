#!/usr/bin/env node
import {main} from "../src/main.js";
main().catch(e=>{console.error(`BLACKCORE FATAL: ${e.stack||e.message||e}`);process.exitCode=1;});
