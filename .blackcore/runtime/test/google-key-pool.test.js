import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG} from '../src/config/defaults.js';
import {providerAuthCandidates} from '../src/config/models.js';
import {GoogleProvider} from '../src/providers/google.js';
import {googleKeyFailure,googleKeyStats} from '../src/providers/google-keys.js';
import {credentialSpec} from '../src/main.js';
import {sleep} from '../src/providers/retry.js';

function cfgWithEightKeys(){
  const cfg=structuredClone(DEFAULT_CONFIG);
  cfg.provider='google';cfg.model='gemini-3.8-flash';cfg.stream=true;cfg.retry={maxAttempts:1,baseDelayMs:1};cfg.requestTimeoutMs=1000;
  cfg.providers.google.apiKeyEnvs=Array.from({length:8},(_,i)=>i?`GEMINI_API_KEY_${i+1}`:'GEMINI_API_KEY');
  cfg.providers.google.googleKeyPool.maxKeys=8;
  for(let i=0;i<8;i++)process.env[cfg.providers.google.apiKeyEnvs[i]]=`synthetic-google-key-${i+1}`;
  return cfg;
}

test('Google key pool exposes all eight configured slots',()=>{
  const cfg=cfgWithEightKeys(),candidates=providerAuthCandidates(cfg,'google');
  assert.equal(candidates.length,8);
  assert.deepEqual(candidates.map(x=>x.slot),[1,2,3,4,5,6,7,8]);
  assert.equal(credentialSpec('google',8).env,'GEMINI_API_KEY_8');
  assert.equal(credentialSpec('google8').slot,8);
});

test('silent 429 fails over to next key and healthy stream is visible before completion',async()=>{
  const cfg=cfgWithEightKeys(),provider=new GoogleProvider(cfg,'google','gemini-3.8-flash');
  const original=globalThis.fetch;let calls=0,seen='';
  globalThis.fetch=async(_url,init)=>{
    calls++;const auth=init.headers.authorization;
    if(auth.endsWith('synthetic-google-key-1'))return new Response(JSON.stringify({error:{code:429,message:'quota exceeded'}}),{status:429,headers:{'content-type':'application/json'}});
    assert.ok(auth.endsWith('synthetic-google-key-2'));
    const enc=new TextEncoder();
    return new Response(new ReadableStream({start(c){
      c.enqueue(enc.encode(`data: ${JSON.stringify({choices:[{delta:{content:'ok'}}]})}\n\n`));
      setTimeout(()=>{c.enqueue(enc.encode(`data: ${JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`));c.close();},40);
    }}),{status:200,headers:{'content-type':'text/event-stream'}});
  };
  try{
    const pending=provider.chat({messages:[{role:'user',content:'test'}],stream:true,onText:x=>seen+=x});
    await sleep(10);
    assert.equal(seen,'ok','stream should not wait for the whole second-key response');
    const out=await pending;
    assert.equal(out.googleKeySlot,2);assert.equal(out.googleKeyHandoffCount,1);assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});

test('visible partial stream is never replayed on another key',async()=>{
  const cfg=cfgWithEightKeys(),provider=new GoogleProvider(cfg,'google','gemini-3.8-flash');
  const original=globalThis.fetch;let calls=0,seen='';
  globalThis.fetch=async()=>{
    calls++;const enc=new TextEncoder();
    return new Response(new ReadableStream({start(c){
      c.enqueue(enc.encode(`data: ${JSON.stringify({choices:[{delta:{content:'partial'}}]})}\n\n`));
      setTimeout(()=>c.error(new Error('synthetic stream break')),5);
    }}),{status:200,headers:{'content-type':'text/event-stream'}});
  };
  try{
    await assert.rejects(provider.chat({messages:[{role:'user',content:'test'}],stream:true,onText:x=>seen+=x}));
    assert.equal(seen,'partial');assert.equal(calls,1,'a visible partial response must not be duplicated on another credential');
  }finally{globalThis.fetch=original;}
});

test('daily quota marks the affected key unavailable beyond normal 429 cooldown',()=>{
  const cfg=cfgWithEightKeys(),entry=providerAuthCandidates(cfg,'google')[0],now=Date.now();
  const error=Object.assign(new Error('google HTTP 429: quota exceeded'),{status:429,responseBody:'QuotaFailure metric GenerateRequestsPerDay daily quota exhausted'});
  googleKeyFailure(cfg,entry,'gemini-3.8-flash',error);
  const stat=googleKeyStats(cfg,'google').find(x=>x.slot===1);
  assert.equal(stat.cooling,true);
  assert.ok(stat.cooldownUntil-now>=60000);
});
