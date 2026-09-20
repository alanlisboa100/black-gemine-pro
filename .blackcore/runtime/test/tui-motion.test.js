import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {c,esc} from '../src/tui/ansi.js';
import {Spinner} from '../src/tui/spinner.js';
import {motionEnabled} from '../src/tui/motion.js';
import {menuFrame,selectMenu} from '../src/tui/select-menu.js';
import {FixedComposer} from '../src/tui/fixed-composer.js';
import {LiveComposer} from '../src/tui/live-composer.js';
import {stripAnsi,visibleWidth} from '../src/utils/text.js';

function terminal(columns=54,rows=24){
  const out=new EventEmitter();Object.assign(out,{isTTY:true,columns,rows,writes:[],write(s){this.writes.push(s);return true;}});return out;
}
function controller(columns=54,rows=24){
  const input=new PassThrough();input.isTTY=true;input.setRawMode=function(v){this.isRaw=v;};
  return {rl:{input,pause(){},resume(){},history:[]},output:terminal(columns,rows),env:{TERM:'xterm-256color'},queue:[],remember(){}};
}
const items=Array.from({length:40},(_,i)=>({label:`Model ${i+1}`,description:'A long model description for small terminals',badge:'API'}));

test('palette shorthand emits real foreground colors without changing SGR styles',()=>{
  assert.equal(c(51,'x'),'\x1b[38;5;51mx\x1b[0m');
  assert.equal(c('1;255','x'),'\x1b[1;38;5;255mx\x1b[0m');
  assert.equal(c('1;38;5;51','x'),'\x1b[1;38;5;51mx\x1b[0m');
  assert.equal(c(3,'x'),'\x1b[3mx\x1b[0m');
  assert.equal(c(95,'x'),'\x1b[95mx\x1b[0m');
});
test('animation preference and reduced motion environment agree',()=>{
  assert.equal(motionEnabled(false,{}),false);
  assert.equal(motionEnabled(true,{BLACKCORE_REDUCED_MOTION:'1'}),false);
  assert.equal(motionEnabled(true,{TERM:'dumb'}),false);
  assert.equal(motionEnabled(true,{}),true);
});
test('spinner truncates within one row and always cleans up',()=>{
  const out=terminal(30),before=process.listenerCount('exit');
  const spinner=new Spinner('x'.repeat(150),{output:out,env:{}}).start();
  try{
    assert.ok(visibleWidth(out.writes.at(-1).replace(/\r/g,''))<30);
    assert.equal(process.listenerCount('exit'),before+1);
  }finally{spinner.stop('done');}
  assert.equal(spinner.timer,null);assert.equal(process.listenerCount('exit'),before);
  assert.ok(out.writes.at(-1).endsWith(esc.showCursor));
});
test('disabled animation still shows activity without changing glyphs',()=>{
  const out=terminal(),spinner=new Spinner('working',{enabled:false,output:out,env:{},showElapsed:false}).start();
  try{const n=out.writes.length;spinner.draw();spinner.draw();assert.equal(out.writes.length,n);assert.match(stripAnsi(out.writes.at(-1)),/◆ working/);}
  finally{spinner.stop();}
});
test('spinner does not emit terminal controls into pipes',()=>{
  const out=terminal();out.isTTY=false;const spinner=new Spinner('working',{output:out}).start();spinner.stop();assert.deepEqual(out.writes,[]);
});
test('explicit spinner color overrides its cycling palette',()=>{
  const out=terminal(),spinner=new Spinner('working',{output:out,env:{}}).setFrames([],196).start();
  try{assert.match(out.writes.at(-1),/\x1b\[38;5;196m/);}finally{spinner.stop();}
});
test('every menu selection fits phone, keyboard-open and desktop viewports',()=>{
  for(const [columns,rows] of [[30,14],[42,18],[54,24],[80,24],[100,40]])for(let index=0;index<items.length;index++){
    const frame=menuFrame('Choose a model',items,index,{columns,rows,subtitle:'Provider'});
    assert.ok(frame.length<rows);assert.ok(frame.every(x=>visibleWidth(x)<columns));
    assert.ok(frame.some(x=>stripAnsi(x).includes(`› ${String(index+1).padStart(2)}  Model ${index+1}`)));
  }
});
test('menu handles end, resize, selection and restores listeners/raw mode',async()=>{
  const ctl=controller(),stdin=ctl.rl.input,out=ctl.output;
  const promise=selectMenu(ctl,'Models',items);
  stdin.emit('keypress','',{name:'end'});out.columns=30;out.rows=14;out.emit('resize');
  stdin.emit('keypress','',{name:'return'});
  const result=await promise;assert.equal(result.index,39);assert.equal(stdin.isRaw,false);
  assert.equal(stdin.listenerCount('keypress'),0);assert.equal(out.listenerCount('resize'),0);
  assert.equal(ctl.questionActive,false);stdin.destroy();
});
test('numeric fallback remains suspended until answer resolves',async()=>{
  let answer,resumed=false;const ctl=controller();ctl.output.isTTY=false;
  ctl.suspendWorkComposer=()=>()=>{resumed=true;};ctl.rl.question=()=>new Promise(resolve=>{answer=resolve;});
  const promise=selectMenu(ctl,'Models',items);assert.equal(resumed,false);
  answer('12');assert.equal((await promise).index,11);assert.equal(resumed,true);ctl.rl.input.destroy();
});
test('fixed output skips identical frames and patches a changed row in one write',()=>{
  const ctl=controller(),composer=new FixedComposer(ctl);composer.active=true;
  composer.recordOutput('first\n');composer.renderOutput();ctl.output.writes=[];
  composer.renderOutput();assert.equal(ctl.output.writes.length,0);
  composer.recordOutput('second\n');composer.renderOutput();
  assert.equal(ctl.output.writes.length,1);assert.ok(ctl.output.writes[0].includes('second'));
  assert.ok(!ctl.output.writes[0].includes('first'));ctl.rl.input.destroy();
});
test('fixed work state is not labeled ready and timer stops when idle',()=>{
  const ctl=controller(),composer=new FixedComposer(ctl,{animation:false});composer.active=true;
  try{composer.beginWork();assert.match(stripAnsi(composer.phaseLine()),/WORK/);assert.ok(composer.timer);
    composer.tick=9;composer.syncMotion();assert.equal(composer.tick,0);
    composer.endWork();assert.equal(composer.timer,null);assert.match(stripAnsi(composer.phaseLine()),/READY/);
  }finally{composer.stop();ctl.rl.input.destroy();}
});
test('fixed composer restores viewport and raw input after suspend/resume',()=>{
  const ctl=controller(),composer=new FixedComposer(ctl);composer.start();composer.beginWork();composer.setText('draft');
  const started=composer.started,resume=composer.suspend();assert.equal(composer.timer,null);assert.equal(ctl.rl.input.isRaw,false);
  resume();assert.equal(composer.chars.join(''),'draft');assert.equal(composer.started,started);assert.equal(composer.working,true);
  composer.stop();assert.equal(ctl.output.listenerCount('resize'),0);assert.equal(ctl.rl.input.listenerCount('data'),0);ctl.rl.input.destroy();
});
test('live status avoids duplicate writes and respects reduced motion',()=>{
  const ctl=controller(80),composer=new LiveComposer(ctl,{animation:false});composer.start();
  try{assert.equal(composer.tick,0);composer.setPhase('waiting','approval');ctl.output.writes=[];composer.render({full:false});assert.equal(ctl.output.writes.length,0);}
  finally{composer.stop();ctl.rl.input.destroy();}
});
