import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
import {authorizeUrl} from "../../security/network.js";
import {redactSecrets} from "../../security/secrets.js";
import {readable,writable,capture} from "../fs/common.js";

const interactiveSessions=new Map();
const profileSessions=new Map();
let playwrightPromise=null;

const RISKY_CONTROL_RE=/\b(?:submit|send|post|publish|share|buy|purchase|order|pay|checkout|subscribe|unsubscribe|delete|remove|erase|confirm|save|update|upload|sign\s*out|log\s*out|enviar|mandar|publicar|compartilhar|comprar|pagar|finalizar|assinar|cancelar\s+assinatura|excluir|apagar|remover|confirmar|salvar|atualizar|sair)\b/i;
const PRIVATE_INPUT_RE=/\b(?:password|passcode|one.?time.?code|verification.?code|security.?answer|senha|codigo.?de.?verificacao|resposta.?de.?seguranca|mfa|otp|2fa)\b/i;
const PRIVATE_URL_FIELD_RE=/^(?:access_?token|auth|authorization|code|credential|id_?token|key|password|refresh_?token|secret|session|signature|token)$/i;
function browserHome(){return path.join(path.resolve(process.env.BLACKCORE_HOME||path.join(os.homedir(),".blackcore")),"browser");}
export function normalizeBrowserProfileName(value="default"){
  const name=String(value||"default").trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name))throw new Error("Invalid browser profile name. Use 1-64 lowercase letters, numbers, _ or -; paths are not accepted.");
  return name;
}
export function browserProfilePath(value="default",root=browserHome()){return path.join(path.resolve(root),"profiles",normalizeBrowserProfileName(value));}
export function safeBrowserUrl(value=""){
  try{const u=new URL(String(value));u.username="";u.password="";for(const key of [...u.searchParams.keys()])if(PRIVATE_URL_FIELD_RE.test(key))u.searchParams.set(key,"[REDACTED]");if(PRIVATE_INPUT_RE.test(u.hash)||/(?:access_?token|refresh_?token|id_?token|code|credential|session|signature)=/i.test(u.hash))u.hash="#REDACTED";return u.href;}catch{return redactSecrets(String(value));}
}
export function classifyBrowserControl(info={}){
  const label=[info.text,info.ariaLabel,info.name,info.title,info.autocomplete,info.value,info.formAction].filter(Boolean).join(" ").slice(0,600);
  const password=String(info.type||"").toLowerCase()==="password";
  const credential=password||PRIVATE_INPUT_RE.test(label);
  const submit=String(info.type||"").toLowerCase()==="submit"||String(info.tag||"").toLowerCase()==="button"&&String(info.formMethod||"").toLowerCase()==="post";
  return {password,credential,risky:credential||submit||RISKY_CONTROL_RE.test(label),label:label.replace(/\s+/g," ").trim().slice(0,120)||String(info.tag||"control")};
}
async function listPersistentProfiles(){
  const root=path.join(browserHome(),"profiles"),profiles=[];let entries=[];try{entries=await fs.readdir(root,{withFileTypes:true});}catch(e){if(e.code!=="ENOENT")throw e;}
  for(const entry of entries){if(!entry.isDirectory()||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(entry.name))continue;const stat=await fs.stat(path.join(root,entry.name)).catch(()=>null);profiles.push({name:entry.name,active:profileSessions.has(path.join(root,entry.name)),modifiedAt:stat?.mtime?.toISOString()||null});}
  return profiles.sort((a,b)=>a.name.localeCompare(b.name));
}

export async function findBrowser(){
  for(const name of ["chromium","chromium-browser","google-chrome","google-chrome-stable","chrome"]){const p=await which(name);if(p)return {name,path:p};}
  return null;
}
async function targetUrl(a,ctx){
  if(a.path){const p=await readable(ctx,a.path);return pathToFileURL(p).href;}
  if(!a.url)throw new Error("url or path required");
  return (await authorizeUrl(ctx,a.url)).href;
}
function baseArgs(width=1280,height=720){return ["--headless=new","--no-sandbox","--disable-setuid-sandbox","--disable-gpu","--disable-dev-shm-usage","--disable-background-networking","--disable-extensions","--no-first-run","--no-default-browser-check","--hide-scrollbars",`--window-size=${width},${height}`];}
function needsLegacyHeadless(result){return /(?:unknown|unrecognized|invalid|unsupported).{0,50}(?:headless|headless=new)|headless=new.{0,50}(?:unknown|unrecognized|invalid|unsupported)/i.test(result?.combined||"");}
export async function runBrowser(browser,args,ctx,timeoutMs=45000){
  let r=await execCapture(browser.path,args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs,maxChars:ctx.cfg.maxToolOutputChars});
  // Retry only when Chromium explicitly rejects the new headless flag. A
  // generic retry doubled every crash/timeout and was especially painful on
  // Termux, where a failed visual check could hold the turn for minutes.
  if(r.code!==0&&args.includes("--headless=new")&&needsLegacyHeadless(r)){const retry=args.map(x=>x==="--headless=new"?"--headless":x);r=await execCapture(browser.path,retry,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs,maxChars:ctx.cfg.maxToolOutputChars});}
  if(r.code!==0)throw new Error(r.combined||`${browser.name} exited ${r.code}`);return r;
}
async function playwright(){playwrightPromise??=import("playwright-core").catch(()=>null);const mod=await playwrightPromise;return mod?.chromium?mod:null;}
export function setBrowserAutomationForTest(value){playwrightPromise=value===undefined?null:Promise.resolve(value);}
function sessionKey(ctx,id="default"){return `${path.resolve(ctx.cwd)}::${id}`;}
function requireSession(ctx,id){const key=sessionKey(ctx,id),session=interactiveSessions.get(key);if(!session)throw new Error(`Browser session not found: ${id||"default"}. Use action=open first.`);return {key,session};}
async function closeSession(key){
  const session=interactiveSessions.get(key);if(!session)return false;interactiveSessions.delete(key);
  if(session.profilePath&&profileSessions.get(session.profilePath)===key)profileSessions.delete(session.profilePath);
  if(session.context?.close)await session.context.close().catch(()=>{});
  if(session.browser?.close)await session.browser.close().catch(()=>{});
  return true;
}
async function oneShotDom(browser,url,ctx,{width=1280,height=720,waitMs=300,timeoutMs=45000,maxChars=180000}={}){
  const args=baseArgs(width,height),wait=Math.max(0,Math.min(waitMs,30000));if(wait)args.push(`--virtual-time-budget=${wait}`);args.push("--dump-dom",url);
  const r=await runBrowser(browser,args,ctx,timeoutMs),dom=(r.stdout||r.combined||"").slice(0,maxChars);return {dom,...summarizeDom(dom)};
}
async function openOneShotSession(a,ctx,browser,key,id){
  if(a.persistent||a.profile||a.action==="login")throw new Error("CAPABILITY_UNAVAILABLE: persistent logged-in profiles require playwright-core. Install the BLACKCORE web profile; one-shot Chromium cannot retain an account session.");
  const url=await targetUrl(a,ctx),rendered=await oneShotDom(browser,url,ctx,{width:a.width||1280,height:a.height||720,waitMs:a.waitMs||300,timeoutMs:a.timeoutMs||45000,maxChars:a.maxChars||180000});
  interactiveSessions.set(key,{oneShot:true,browserInfo:browser,url,logs:[]});
  return {ok:true,session:id,url:safeBrowserUrl(url),title:rendered.title,browser:browser.name,interactive:false,mode:"one-shot",notice:"Static open/snapshot is available. Install playwright-core for click, type, key and animation timing."};
}
async function authorizeProfileUse(a,ctx,profile,url){
  if(ctx.cfg.browser?.persistentProfiles===false)throw new Error("Persistent browser profiles are disabled in BLACKCORE settings.");
  if(ctx.cfg.permissionProfile==="safe")throw new Error("Logged-in browser profiles are blocked by the safe permission profile. Use balanced mode to approve access explicitly.");
  if(ctx.cfg.permissionProfile==="yolo"||ctx.cfg.confirmExternalReads===false)return;
  const origin=new URL(url).protocol==="file:"?"local file":new URL(url).origin,key=`${profile}:${origin}`;
  if(ctx.agent?.approvals?.get("browser-profile",key))return;
  const ok=await ctx.confirm(`Use private browser profile "${profile}" with ${origin}?\nPage content may be shared with the selected AI, but cookies and stored credentials will never be returned.`,false);
  if(!ok)throw new Error("logged-in browser profile access denied");
  ctx.agent?.approvals?.grant("browser-profile",key,"turn");
}
async function confirmAccountAction(ctx,session,summary){
  if(!session.persistent||ctx.cfg.browser?.requireAuthenticatedActionConfirmation===false||ctx.cfg.permissionProfile==="yolo")return;
  if(ctx.cfg.permissionProfile==="safe")throw new Error(`Authenticated browser action blocked by safe mode: ${summary}`);
  const ok=await ctx.confirm(`Allow authenticated browser action?\n${summary}\nThis may send, publish, purchase, delete, save or change account data.`,false);
  if(!ok)throw new Error("authenticated browser action denied");
}
function ensureHeadedLoginAvailable(ctx){
  if(ctx.cfg.browser?.allowHeadedLogin===false)throw new Error("Visible browser login is disabled in BLACKCORE settings.");
  if(process.platform==="linux"&&!process.env.DISPLAY&&!process.env.WAYLAND_DISPLAY)throw new Error("Visible login needs a display. On Termux, start Termux:X11 and export DISPLAY=:1, then ask BLACKCORE to open the login again.");
}
async function locatorInfo(locator){
  return locator.evaluate(el=>({tag:el.tagName?.toLowerCase()||"",type:el.getAttribute?.("type")||"",text:(el.innerText||el.textContent||"").trim().slice(0,240),ariaLabel:el.getAttribute?.("aria-label")||"",name:el.getAttribute?.("name")||"",title:el.getAttribute?.("title")||"",autocomplete:el.getAttribute?.("autocomplete")||"",value:["button","submit"].includes(String(el.getAttribute?.("type")||"").toLowerCase())?el.getAttribute?.("value")||"":"",formMethod:el.form?.method||"",formAction:el.form?.action||"",contentEditable:!!el.isContentEditable}));
}
async function openSession(a,ctx,browser){
  const id=a.session||"default",key=sessionKey(ctx,id);await closeSession(key);const pw=await playwright(),logs=[];
  if(!pw)return openOneShotSession(a,ctx,browser,key,id);
  const persistent=a.action==="login"||a.persistent===true||a.profile!=null,profile=persistent?normalizeBrowserProfileName(a.profile||ctx.cfg.browser?.defaultProfile||"default"):null,headed=a.action==="login"||a.headed===true;
  if(headed)ensureHeadedLoginAvailable(ctx);
  const url=await targetUrl(a,ctx);if(persistent)await authorizeProfileUse(a,ctx,profile,url);
  let instance,context,profilePath=null;
  if(persistent){
    profilePath=browserProfilePath(profile);await fs.mkdir(profilePath,{recursive:true,mode:0o700});await fs.chmod(path.dirname(profilePath),0o700).catch(()=>{});await fs.chmod(profilePath,0o700).catch(()=>{});
    const other=profileSessions.get(profilePath);if(other&&other!==key)await closeSession(other);
    context=await pw.chromium.launchPersistentContext(profilePath,{executablePath:browser.path,headless:!headed,viewport:{width:a.width||1280,height:a.height||720},args:["--no-sandbox","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check"]});instance=context.browser();
  }else {instance=await pw.chromium.launch({executablePath:browser.path,headless:!headed,args:["--no-sandbox","--disable-dev-shm-usage"]});context=await instance.newContext({viewport:{width:a.width||1280,height:a.height||720}});}
  const abort=()=>context?.close?.().catch(()=>instance?.close?.().catch(()=>{}));if(ctx.signal?.aborted){await abort();throw ctx.signal.reason||new Error("cancelled by user");}ctx.signal?.addEventListener("abort",abort,{once:true});
  const pages=context.pages(),page=pages[0]||await context.newPage();
  page.on("console",m=>logs.push({type:m.type(),text:redactSecrets(m.text()),at:new Date().toISOString()}));page.on("pageerror",e=>logs.push({type:"pageerror",text:redactSecrets(e.message),at:new Date().toISOString()}));
  try{await page.goto(url,{waitUntil:"domcontentloaded",timeout:a.timeoutMs||45000});if(a.waitMs)await page.waitForTimeout(a.waitMs);}catch(e){await context.close().catch(()=>{});throw e;}finally{ctx.signal?.removeEventListener("abort",abort);}
  const session={browser:instance,context,page,logs,persistent,profile,profilePath,headed};interactiveSessions.set(key,session);if(profilePath)profileSessions.set(profilePath,key);
  return {ok:true,session:id,url:safeBrowserUrl(page.url()),title:await page.title(),browser:browser.name,interactive:true,persistent,profile,headed,notice:a.action==="login"?"Visible private login window opened. Enter passwords and MFA only in that window; BLACKCORE does not receive them. Close the browser or use action=close after login is complete.":persistent?"Private profile loaded. Cookies remain inside Chromium and are never included in tool output.":null};
}
async function interactiveAction(a,ctx,browser){
  if(a.action==="open"||a.action==="login")return openSession(a,ctx,browser);const {key,session}=requireSession(ctx,a.session||"default"),{page}=session,timeout=a.timeoutMs||30000;
  if(a.action==="close")return {ok:await closeSession(key),session:a.session||"default"};
  if(session.oneShot){
    if(a.action==="console")return {ok:true,session:a.session||"default",entries:[],interactive:false,notice:"Console capture requires playwright-core."};
    if(a.action==="snapshot"){
      const rendered=await oneShotDom(session.browserInfo,session.url,ctx,{width:a.width||1280,height:a.height||720,waitMs:a.waitMs||300,timeoutMs:a.timeoutMs||45000,maxChars:a.maxChars||180000});
      return {ok:true,session:a.session||"default",url:safeBrowserUrl(session.url),title:rendered.title,aria:null,interactive:false,...summarizeDom(rendered.dom)};
    }
    if(a.action==="responsive"){
      const widths=a.widths?.length?a.widths:[360,768,1280],results=[];
      for(const width of widths){const rendered=await oneShotDom(session.browserInfo,session.url,ctx,{width,height:a.height||720,waitMs:a.waitMs||150,timeoutMs:a.timeoutMs||45000,maxChars:a.maxChars||180000});results.push({width,height:a.height||720,...summarizeDom(rendered.dom)});}
      return {ok:true,session:a.session||"default",url:safeBrowserUrl(session.url),interactive:false,results};
    }
    throw new Error(`CAPABILITY_UNAVAILABLE: browser ${a.action} requires playwright-core. The one-shot actions screenshot, audit, dump_dom, open, snapshot and responsive remain available; do not bypass this with Chromium through bash.`);
  }
  if(a.action==="console")return {ok:true,session:a.session||"default",entries:session.logs.slice(-(a.maxEntries||100))};
  if(a.action==="navigate"){
    const url=await targetUrl(a,ctx);if(session.persistent)await authorizeProfileUse(a,ctx,session.profile,url);
    await page.goto(url,{waitUntil:"domcontentloaded",timeout});if(a.waitMs)await page.waitForTimeout(a.waitMs);
    return {ok:true,session:a.session||"default",action:a.action,url:safeBrowserUrl(page.url()),title:await page.title(),persistent:session.persistent,profile:session.profile};
  }
  if(a.action==="snapshot"){
    const dom=await page.content(),aria=typeof page.locator("body").ariaSnapshot==="function"?await page.locator("body").ariaSnapshot({timeout}).catch(()=>null):null;
    return {ok:true,session:a.session||"default",url:safeBrowserUrl(page.url()),title:await page.title(),aria,...summarizeDom(dom)};
  }
  if(a.action==="animation"){
    const report=await page.evaluate(async ({selector,durationMs})=>{
      const element=selector?document.querySelector(selector):document.querySelector("main")||document.body;
      if(!element)throw new Error(`selector not found: ${selector}`);
      const samples=[],started=performance.now();let previous=started;
      while(performance.now()-started<durationMs){await new Promise(requestAnimationFrame);const now=performance.now(),box=element.getBoundingClientRect(),style=getComputedStyle(element);samples.push({at:+(now-started).toFixed(1),frame:+(now-previous).toFixed(1),x:+box.x.toFixed(2),y:+box.y.toFixed(2),width:+box.width.toFixed(2),height:+box.height.toFixed(2),opacity:style.opacity,transform:style.transform});previous=now;}
      const frames=samples.map(x=>x.frame),longFrames=frames.filter(x=>x>34).length,animations=document.getAnimations().map(x=>({playState:x.playState,currentTime:x.currentTime,effect:!!x.effect}));
      return {selector:selector||"main/body",durationMs:+(performance.now()-started).toFixed(1),frames:frames.length,averageFrameMs:frames.length?+(frames.reduce((x,y)=>x+y,0)/frames.length).toFixed(2):null,maxFrameMs:frames.length?+Math.max(...frames).toFixed(2):null,longFrames,activeAnimations:animations.length,animations,samples:samples.filter((_,i)=>i%Math.max(1,Math.floor(samples.length/20))===0).slice(0,20)};
    },{selector:a.selector||null,durationMs:a.durationMs||1200});
    return {ok:true,session:a.session||"default",url:safeBrowserUrl(page.url()),...report};
  }
  if(a.action==="responsive"){
    const widths=a.widths?.length?a.widths:[360,768,1280],results=[];
    for(const width of widths){await page.setViewportSize({width,height:a.height||720});await page.waitForTimeout(Math.min(a.waitMs||150,2000));const dom=await page.content();results.push({width,height:a.height||720,...summarizeDom(dom)});}
    return {ok:true,session:a.session||"default",url:safeBrowserUrl(page.url()),results};
  }
  if(a.action==="click"){
    if(!a.selector)throw new Error("selector required");const locator=page.locator(a.selector).first(),control=classifyBrowserControl(await locatorInfo(locator));
    if(control.risky)await confirmAccountAction(ctx,session,`${control.label} · ${new URL(page.url()).origin}`);
    await locator.click({timeout});
  }
  else if(a.action==="type"){
    if(!a.selector)throw new Error("selector required");const locator=page.locator(a.selector).first(),control=classifyBrowserControl(await locatorInfo(locator));
    if(control.credential)throw new Error("PRIVATE_CREDENTIAL_INPUT_BLOCKED: BLACKCORE will not receive or type passwords, MFA codes or security answers. Use action=login and enter them directly in the visible private browser window.");
    await locator.fill(String(a.text||""),{timeout});
  }
  else if(a.action==="upload"){
    if(!a.selector)throw new Error("selector required");if(!a.files?.length)throw new Error("files required");const files=[];for(const file of a.files)files.push(await readable(ctx,file));
    await confirmAccountAction(ctx,session,`Attach ${files.map(file=>path.basename(file)).join(", ")} · ${new URL(page.url()).origin}`);await page.locator(a.selector).first().setInputFiles(files,{timeout});
  }
  else if(a.action==="select"){
    if(!a.selector)throw new Error("selector required");if(!a.values?.length)throw new Error("values required");await page.locator(a.selector).first().selectOption(a.values,{timeout});
  }
  else if(a.action==="check"){
    if(!a.selector)throw new Error("selector required");const locator=page.locator(a.selector).first(),control=classifyBrowserControl(await locatorInfo(locator));if(control.risky)await confirmAccountAction(ctx,session,`${control.label} · ${new URL(page.url()).origin}`);if(a.checked===false)await locator.uncheck({timeout});else await locator.check({timeout});
  }
  else if(a.action==="key"){
    if(!a.key)throw new Error("key required");
    if(/^(?:Enter|NumpadEnter)$/i.test(a.key)){
      const info=await page.evaluate(()=>{const el=document.activeElement;return el?{tag:el.tagName?.toLowerCase()||"",type:el.getAttribute?.("type")||"",text:(el.getAttribute?.("aria-label")||el.getAttribute?.("name")||"").slice(0,240),formMethod:el.form?.method||"",formAction:el.form?.action||"",contentEditable:!!el.isContentEditable}:{}}),control=classifyBrowserControl(info);
      if(control.risky||info.contentEditable)await confirmAccountAction(ctx,session,`Press Enter on ${control.label} · ${new URL(page.url()).origin}`);
    }
    await page.keyboard.press(a.key);
  }
  else throw new Error(`Unsupported interactive browser action: ${a.action}`);
  if(a.waitMs)await page.waitForTimeout(a.waitMs);return {ok:true,session:a.session||"default",action:a.action,url:safeBrowserUrl(page.url()),title:await page.title()};
}
async function abortableInteractiveAction(a,ctx,browser){
  const signal=ctx.signal;if(!signal)return interactiveAction(a,ctx,browser);
  if(signal.aborted){await closeSession(sessionKey(ctx,a.session||"default"));throw signal.reason||new Error("cancelled by user");}
  const operation=interactiveAction(a,ctx,browser);
  return new Promise((resolve,reject)=>{
    let settled=false;const finish=(fn,value)=>{if(settled)return;settled=true;signal.removeEventListener("abort",abort);fn(value);};
    const abort=()=>{closeSession(sessionKey(ctx,a.session||"default")).catch(()=>{});finish(reject,signal.reason||new Error("cancelled by user"));};
    signal.addEventListener("abort",abort,{once:true});operation.then(value=>finish(resolve,value),error=>finish(reject,error));
  });
}
function count(re,text){return [...text.matchAll(re)].length;}
function textContent(markup){return markup.replace(/<script\b[\s\S]*?<\/script\s*>/gi,"").replace(/<style\b[\s\S]*?<\/style\s*>/gi,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}

// Intentionally lightweight: Chromium renders the page first, then this
// reports portable, deterministic web-quality signals without a new package.
export function summarizeDom(markup=""){
  const html=String(markup),title=(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)||[])[1]?.replace(/\s+/g," ").trim()||"";
  const lang=(html.match(/<html\b[^>]*\blang\s*=\s*["']?([^\s"'>]+)/i)||[])[1]||null;
  const viewport=/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.test(html);
  const headings=count(/<h[1-6]\b/gi,html),h1=count(/<h1\b/gi,html),main=/<main\b/i.test(html),nav=/<nav\b/i.test(html),forms=count(/<form\b/gi,html),controls=count(/<(?:button|input|select|textarea)\b/gi,html),images=[...html.matchAll(/<img\b[^>]*>/gi)],imagesWithoutAlt=images.filter(x=>!(/\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(x[0]))).length;
  const links=count(/<a\b/gi,html),landmarks=count(/<(?:header|main|nav|footer|aside)\b/gi,html),textChars=textContent(html).length;
  const issues=[];
  if(!title)issues.push({severity:"error",code:"missing-title",message:"Document has no <title>."});
  if(!lang)issues.push({severity:"warn",code:"missing-lang",message:"Document has no html[lang]."});
  if(!viewport)issues.push({severity:"warn",code:"missing-viewport",message:"Document has no responsive viewport meta tag."});
  if(!h1)issues.push({severity:"warn",code:"missing-h1",message:"Document has no <h1>."});
  if(!main)issues.push({severity:"warn",code:"missing-main",message:"Document has no <main> landmark."});
  if(imagesWithoutAlt)issues.push({severity:"warn",code:"images-without-alt",message:`${imagesWithoutAlt} image(s) have no alt attribute.`});
  if(controls&&!/(?:aria-label|aria-labelledby|<label\b)/i.test(html))issues.push({severity:"warn",code:"unlabeled-controls",message:"Interactive controls exist but no label/ARIA evidence was found."});
  return {title,lang,viewport,metrics:{textChars,headings,h1,landmarks,main,nav,forms,controls,links,images:images.length,imagesWithoutAlt},issues};
}

export const browserTool=defineTool({
  name:"browser",description:"Inspect or interact with Chromium. Supports private persistent profiles, visible manual login, account-safe click/type/upload/select/check/key controls, navigation, animation timing, responsive audits, snapshots, console errors, DOM dumps and screenshots. Never request passwords, MFA codes, cookies or tokens; use action=login so the user enters credentials only in the visible browser.",planSafe:a=>["detect","profiles","dump_dom","audit","snapshot","console","animation","responsive","navigate"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["detect","profiles","login","open","navigate","snapshot","animation","responsive","click","type","upload","select","check","key","console","close","dump_dom","audit","screenshot"]},url:{type:"string"},path:{type:"string"},output:{type:"string"},session:{type:"string",maxLength:80},profile:{type:"string",maxLength:64},persistent:{type:"boolean"},headed:{type:"boolean"},selector:{type:"string",maxLength:2000},text:{type:"string",maxLength:100000},files:{type:"array",items:{type:"string",maxLength:4096},minItems:1,maxItems:10},values:{type:"array",items:{type:"string",maxLength:1000},minItems:1,maxItems:20},checked:{type:"boolean"},key:{type:"string",maxLength:100},width:{type:"integer",minimum:320,maximum:3840},widths:{type:"array",items:{type:"integer",minimum:320,maximum:3840},minItems:1,maxItems:8},height:{type:"integer",minimum:240,maximum:2160},durationMs:{type:"integer",minimum:100,maximum:30000},waitMs:{type:"integer",minimum:0,maximum:30000},timeoutMs:{type:"integer",minimum:1000,maximum:180000},maxEntries:{type:"integer",minimum:1,maximum:1000},maxChars:{type:"integer",minimum:1000,maximum:300000}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const browser=await findBrowser();
    if(a.action==="profiles")return JSON.stringify({ok:true,profiles:await listPersistentProfiles(),privacy:"Profile names only. Cookies, tokens, history and stored credentials are never returned."},null,2);
    if(a.action==="detect"){const pw=!!await playwright();return JSON.stringify({available:!!browser,browser:browser?.name||null,path:browser?.path||null,interactive:!!browser&&pw,persistentProfiles:!!browser&&pw,visibleLogin:!!browser&&pw&&!!(process.env.DISPLAY||process.env.WAYLAND_DISPLAY),oneShot:!!browser,playwrightCore:pw,hint:!browser?"Install a Chromium-compatible browser if visual browser work is needed.":pw?"Persistent profiles are ready. Visible login additionally needs Termux:X11 or another display.":"One-shot screenshot/audit/open/snapshot is ready; install playwright-core for interaction and persistent profiles."},null,2);}
    if(!browser)throw new Error("Chromium-compatible browser is not installed. Use browser detect first; do not retry screenshot/dump_dom until a browser is installed.");
    if(["login","open","navigate","snapshot","animation","responsive","click","type","upload","select","check","key","console","close"].includes(a.action))return JSON.stringify(await abortableInteractiveAction(a,ctx,browser),null,2);
    const url=await targetUrl(a,ctx),w=a.width||1280,h=a.height||720,wait=Math.max(0,a.waitMs||800),args=baseArgs(w,h);if(wait)args.push(`--virtual-time-budget=${wait}`);
    if(a.action==="dump_dom"||a.action==="audit"){
      args.push("--dump-dom",url);const r=await runBrowser(browser,args,ctx,a.timeoutMs||45000),dom=(r.stdout||r.combined||"").slice(0,a.maxChars||180000);
      if(a.action==="audit")return JSON.stringify({ok:true,url:safeBrowserUrl(url),browser:browser.name,width:w,height:h,...summarizeDom(dom)},null,2);
      return dom;
    }
    const out=await writable(ctx,a.output||path.join(".blackcore","artifacts",`screenshot-${Date.now()}.png`));await capture(ctx,out);await fs.mkdir(path.dirname(out),{recursive:true});args.push(`--screenshot=${out}`,url);await runBrowser(browser,args,ctx,a.timeoutMs||45000);const st=await fs.stat(out);return JSON.stringify({ok:true,path:out,bytes:st.size,width:w,height:h,browser:browser.name,url:safeBrowserUrl(url)},null,2);
  }
});
