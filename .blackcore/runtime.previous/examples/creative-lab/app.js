(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const cubeCanvas = $("#cube-canvas");
  const villageCanvas = $("#village-canvas");
  const heartCanvas = $("#heart-canvas");
  const gameCanvas = $("#game-canvas");
  const cube = cubeCanvas.getContext("2d");
  const village = villageCanvas.getContext("2d");
  const hearts = heartCanvas.getContext("2d");
  const game = gameCanvas.getContext("2d");
  const motionToggle = $("#motion-toggle");
  const motionReset = $("#motion-reset");
  const motionStatus = $("#motion-status");
  const frameHealth = $("#frame-health");
  const codeStream = $("#code-stream");
  const cubeSpeed = $("#cube-speed");
  const cubeSpeedValue = $("#cube-speed-value");
  const heartBurst = $("#heart-burst");
  const villageTime = $("#village-time");
  const villageCycle = $("#village-cycle");
  const fireflyCount = $("#firefly-count");
  const gameStart = $("#game-start");
  const gameReset = $("#game-reset");
  const gameOverlay = $("#game-overlay");
  const scoreText = $("#score");
  const livesText = $("#lives");
  const levelText = $("#level");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let motionRunning = !reducedMotion;
  const cubeRotation = {x: .38, y: .62};
  let cubeDrag = null;
  let lastFrame = performance.now();
  let cubeMultiplier = 1;
  let streamElapsed = 0;
  let streamIndex = 0;
  let healthElapsed = 0;
  let measuredFps = 0;
  const frameTimes = [];
  const particles = [];
  const villageState = {night:0,targetNight:0,elapsed:0,traveler:0,clouds:[90,430,850],fireflies:Array.from({length:24},(_,index)=>({x:(index*197)%1120+30,y:310+(index*83)%180,phase:index*.71}))};
  const pressed = new Set();
  const streamEvents = [
    ["read", "▣", "read", "src/animation.js · 184 lines"],
    ["edit", "✎", "edit", "animation.js · +18 −4"],
    ["patch", "✦", "patch", "responsive timing + reduced motion"],
    ["test", "✓", "test", "motion suite · 12/12 passed"],
    ["scan", "⌕", "scan", "accessibility · zero critical findings"],
    ["done", "◆", "done", "visual checkpoint ready · 842ms"]
  ];

  function mix(a,b,t){return a+(b-a)*t;}
  function mixColor(day,night,t){const parse=value=>value.match(/\w\w/g).map(item=>parseInt(item,16)),a=parse(day),b=parse(night);return `rgb(${a.map((value,index)=>Math.round(mix(value,b[index],t))).join(",")})`;}
  function villageHouse(x,y,scale,hue,night){
    const width=118*scale,height=92*scale;village.save();village.translate(x,y);
    village.fillStyle=`hsl(${hue} 24% ${mix(48,25,night)}%)`;village.fillRect(-width/2,-height,width,height);
    village.beginPath();village.moveTo(-width*.62,-height);village.lineTo(0,-height-62*scale);village.lineTo(width*.62,-height);village.closePath();village.fillStyle=`hsl(${hue} 31% ${mix(31,15,night)}%)`;village.fill();
    village.fillStyle=mixColor("#594437","#211b2c",night);village.fillRect(-13*scale,-45*scale,26*scale,45*scale);
    for(const dx of [-34,34]){village.fillStyle=`rgba(255,${Math.round(mix(232,196,night))},${Math.round(mix(173,89,night))},${mix(.18,.92,night)})`;village.fillRect((dx-10)*scale,-70*scale,20*scale,22*scale);}
    village.strokeStyle="rgba(255,255,255,.16)";village.strokeRect(-width/2,-height,width,height);village.restore();
  }
  function villageTree(x,y,scale,night){
    village.fillStyle=mixColor("#49372d","#1c1726",night);village.fillRect(x-7*scale,y-55*scale,14*scale,55*scale);
    village.fillStyle=mixColor("#2f7659","#163b3c",night);for(const [dx,dy,r] of [[0,-88,34],[-24,-60,28],[25,-62,30]]){village.beginPath();village.arc(x+dx*scale,y+dy*scale,r*scale,0,Math.PI*2);village.fill();}
  }
  function drawVillage(dt){
    const {width,height}=canvasSize(villageCanvas),state=villageState;state.elapsed+=dt;if(motionRunning){state.night+=Math.sign(state.targetNight-state.night)*Math.min(Math.abs(state.targetNight-state.night),dt*.0016);state.traveler=(state.traveler+dt*.055)%1260;state.clouds=state.clouds.map((x,index)=>((x+120+dt*(.008+index*.002))%(width+250))-120);}
    const night=state.night,sky=village.createLinearGradient(0,0,0,height);sky.addColorStop(0,mixColor("#6ec8e8","#11132d",night));sky.addColorStop(1,mixColor("#f4c98a","#50375f",night));village.fillStyle=sky;village.fillRect(0,0,width,height);
    village.fillStyle=`rgba(255,246,190,${1-night})`;village.beginPath();village.arc(990,92,42,0,Math.PI*2);village.fill();village.fillStyle=`rgba(225,230,255,${night})`;village.beginPath();village.arc(990,92,34,0,Math.PI*2);village.fill();
    village.fillStyle=`rgba(255,255,255,${mix(.7,.11,night)})`;for(const [index,x] of state.clouds.entries()){const y=72+index*38;for(let part=0;part<4;part++){village.beginPath();village.arc(x+part*31,y+Math.sin(part)*8,24-part*2,0,Math.PI*2);village.fill();}}
    village.fillStyle=mixColor("#73936b","#243a45",night);village.beginPath();village.moveTo(0,310);for(let x=0;x<=width;x+=90)village.lineTo(x,245+Math.sin(x*.013)*42);village.lineTo(width,height);village.lineTo(0,height);village.fill();
    village.fillStyle=mixColor("#637d4b","#172b32",night);village.fillRect(0,365,width,height-365);village.strokeStyle=`rgba(239,211,164,${mix(.55,.17,night)})`;village.lineWidth=42;village.beginPath();village.moveTo(-20,548);village.bezierCurveTo(310,410,690,520,1200,385);village.stroke();
    const homes=[[105,407,.72,18],[260,385,.9,38],[435,420,.66,210],[610,385,.92,330],[795,420,.7,275],[955,380,.88,46],[1100,415,.65,190]];for(const home of homes)villageHouse(...home,night);
    for(const tree of [[30,430,.8],[350,450,.7],[520,440,.85],[720,450,.72],[875,445,.8],[1160,445,.86]])villageTree(...tree,night);
    village.fillStyle=`rgba(226,231,255,${night*.85})`;for(const fly of state.fireflies){const alpha=(.32+.68*Math.abs(Math.sin(state.elapsed*.002+fly.phase)))*night;village.save();village.globalAlpha=alpha;village.shadowBlur=12;village.shadowColor="#fef08a";village.beginPath();village.arc(fly.x,fly.y+Math.sin(state.elapsed*.0015+fly.phase)*14,2.4,0,Math.PI*2);village.fill();village.restore();}
    const tx=state.traveler-40,ty=465-Math.sin(tx*.008)*18;village.fillStyle=mixColor("#5eead4","#a78bfa",night);village.beginPath();village.arc(tx,ty-18,8,0,Math.PI*2);village.fill();village.fillRect(tx-5,ty-10,10,24);
    const visible=Math.round(state.fireflies.length*night);fireflyCount.textContent=String(visible);villageCycle.textContent=night>.5?"NIGHT":"DAY";
  }

  function canvasSize(canvas) {
    return {width: canvas.width, height: canvas.height};
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function project(vertex) {
    const [x, y, z] = vertex;
    const ay = cubeRotation.y;
    const ax = cubeRotation.x;
    const x1 = x * Math.cos(ay) - z * Math.sin(ay);
    const z1 = x * Math.sin(ay) + z * Math.cos(ay);
    const y1 = y * Math.cos(ax) - z1 * Math.sin(ax);
    const depth = y * Math.sin(ax) + z1 * Math.cos(ax);
    const perspective = 450 / (560 - depth);
    return [380 + x1 * perspective, 230 + y1 * perspective, depth];
  }

  function drawCube() {
    const {width, height} = canvasSize(cubeCanvas);
    cube.clearRect(0, 0, width, height);
    const glow = cube.createRadialGradient(380, 230, 15, 380, 230, 330);
    glow.addColorStop(0, "rgba(94, 234, 212, .14)");
    glow.addColorStop(1, "rgba(12, 13, 25, 0)");
    cube.fillStyle = glow;
    cube.fillRect(0, 0, width, height);
    cube.strokeStyle = "rgba(255,255,255,.055)";
    cube.lineWidth = 1;
    for (let x = 0; x < width; x += 38) { cube.beginPath(); cube.moveTo(x, 0); cube.lineTo(x, height); cube.stroke(); }
    for (let y = 0; y < height; y += 38) { cube.beginPath(); cube.moveTo(0, y); cube.lineTo(width, y); cube.stroke(); }

    const size = 158;
    const vertices = [[-size,-size,-size],[size,-size,-size],[size,size,-size],[-size,size,-size],[-size,-size,size],[size,-size,size],[size,size,size],[-size,size,size]].map(project);
    const faces = [
      {indices:[0,1,2,3], color:"rgba(124,58,237,.35)"},
      {indices:[1,5,6,2], color:"rgba(94,234,212,.26)"},
      {indices:[5,4,7,6], color:"rgba(251,113,133,.24)"},
      {indices:[4,0,3,7], color:"rgba(99,102,241,.2)"},
      {indices:[3,2,6,7], color:"rgba(167,139,250,.38)"},
      {indices:[4,5,1,0], color:"rgba(45,212,191,.2)"}
    ].sort((a, b) => Math.min(...a.indices.map(index => vertices[index][2])) - Math.min(...b.indices.map(index => vertices[index][2])));
    cube.save();
    cube.shadowBlur = 28;
    cube.shadowColor = "rgba(167,139,250,.32)";
    faces.forEach(face => {
      cube.beginPath();
      face.indices.forEach((index, position) => {
        const [x, y] = vertices[index];
        position ? cube.lineTo(x, y) : cube.moveTo(x, y);
      });
      cube.closePath();
      cube.fillStyle = face.color;
      cube.fill();
      cube.strokeStyle = "rgba(234, 244, 255, .72)";
      cube.lineWidth = 1.4;
      cube.stroke();
    });
    cube.restore();
    cube.fillStyle = "rgba(246,244,255,.92)";
    cube.font = "700 19px ui-monospace, SFMono-Regular, Menlo, monospace";
    cube.textAlign = "center";
    cube.fillText("BLACKCORE", 380, 236);
  }

  function addHeart(x, y, burst = false) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * (burst ? 3.6 : .65),
      vy: burst ? -1.5 - Math.random() * 3.4 : -.18 - Math.random() * .35,
      size: burst ? 12 + Math.random() * 18 : 9 + Math.random() * 11,
      life: 0,
      maxLife: burst ? 90 + Math.random() * 38 : 150 + Math.random() * 100,
      hue: 326 + Math.random() * 30,
      drift: Math.random() * Math.PI * 2
    });
  }

  function heartPath(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * .25);
    ctx.bezierCurveTo(x - size, y - size * .45, x - size * .7, y - size, x, y - size * .32);
    ctx.bezierCurveTo(x + size * .7, y - size, x + size, y - size * .45, x, y + size * .25);
  }

  function seedHearts() {
    particles.length = 0;
    for (let index = 0; index < 22; index += 1) addHeart(80 + Math.random() * 600, 110 + Math.random() * 270);
  }

  function drawHearts(dt) {
    const {width, height} = canvasSize(heartCanvas);
    const background = hearts.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#171127");
    background.addColorStop(1, "#0c1724");
    hearts.fillStyle = background;
    hearts.fillRect(0, 0, width, height);
    particles.forEach(particle => {
      if (motionRunning) {
        particle.life += dt / 16.67;
        particle.x += particle.vx * dt / 16.67 + Math.sin(particle.life / 16 + particle.drift) * .28;
        particle.y += particle.vy * dt / 16.67;
      }
      const fade = Math.max(0, 1 - particle.life / particle.maxLife);
      hearts.save();
      hearts.globalAlpha = Math.min(1, fade * 1.3);
      hearts.shadowBlur = 18;
      hearts.shadowColor = `hsla(${particle.hue}, 90%, 68%, .75)`;
      hearts.fillStyle = `hsl(${particle.hue}, 90%, 68%)`;
      heartPath(hearts, particle.x, particle.y, particle.size * (.86 + Math.sin(particle.life / 10) * .08));
      hearts.fill();
      hearts.restore();
    });
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      if (particles[index].life >= particles[index].maxLife || particles[index].y < -35) {
        particles.splice(index, 1);
        addHeart(80 + Math.random() * 600, height + 28);
      }
    }
  }

  const state = {running: false, score: 0, lives: 3, level: 1, spawnElapsed: 0, player: {x: 480, y: 470, radius: 23}, cores: [], streak: 0};

  function resetGame() {
    state.running = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.spawnElapsed = 0;
    state.player = {x: 480, y: 470, radius: 23};
    state.cores = [];
    state.streak = 0;
    pressed.clear();
    gameOverlay.hidden = false;
    $(".overlay-title").textContent = "Catch the glowing cores.";
    gameStart.textContent = "Start game";
    updateStats();
    drawGame();
  }

  function startGame() {
    state.running = true;
    gameOverlay.hidden = true;
    gameCanvas.focus({preventScroll: true});
  }

  function updateStats() {
    scoreText.textContent = String(state.score);
    livesText.textContent = String(state.lives);
    levelText.textContent = String(state.level);
  }

  function spawnCore() {
    state.cores.push({x: 48 + Math.random() * 864, y: -24, radius: 15 + Math.random() * 6, speed: 1.45 + Math.random() * .65 + state.level * .2, phase: Math.random() * Math.PI * 2});
  }

  function finishGame() {
    state.running = false;
    gameOverlay.hidden = false;
    $(".overlay-title").textContent = `Run complete — score ${state.score}.`;
    gameStart.textContent = "Play again";
  }

  function updateGame(dt) {
    if (!state.running || !motionRunning) return;
    const factor = dt / 16.67;
    let dx = 0;
    let dy = 0;
    if (pressed.has("left")) dx -= 1;
    if (pressed.has("right")) dx += 1;
    if (pressed.has("up")) dy -= 1;
    if (pressed.has("down")) dy += 1;
    if (dx || dy) {
      const length = Math.hypot(dx, dy) || 1;
      state.player.x += dx / length * 6.2 * factor;
      state.player.y += dy / length * 6.2 * factor;
    }
    state.player.x = Math.max(state.player.radius, Math.min(960 - state.player.radius, state.player.x));
    state.player.y = Math.max(state.player.radius, Math.min(540 - state.player.radius, state.player.y));
    state.spawnElapsed += dt;
    const spawnEvery = Math.max(390, 970 - state.level * 82);
    if (state.spawnElapsed >= spawnEvery) { state.spawnElapsed = 0; spawnCore(); }
    for (let index = state.cores.length - 1; index >= 0; index -= 1) {
      const core = state.cores[index];
      core.y += core.speed * factor;
      core.x += Math.sin(core.y / 48 + core.phase) * .9 * factor;
      if (Math.hypot(core.x - state.player.x, core.y - state.player.y) < core.radius + state.player.radius) {
        state.cores.splice(index, 1);
        state.streak += 1;
        state.score += 10 + state.level * 2;
        if (state.streak % 6 === 0) state.level += 1;
        updateStats();
      } else if (core.y > 570) {
        state.cores.splice(index, 1);
        state.streak = 0;
        state.lives -= 1;
        updateStats();
        if (state.lives <= 0) finishGame();
      }
    }
  }

  function drawGame() {
    const {width, height} = canvasSize(gameCanvas);
    const sky = game.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#10112a");
    sky.addColorStop(1, "#07151d");
    game.fillStyle = sky;
    game.fillRect(0, 0, width, height);
    game.fillStyle = "rgba(167,139,250,.22)";
    for (let index = 0; index < 46; index += 1) {
      const x = (index * 83) % width;
      const y = (index * 47) % height;
      game.fillRect(x, y, 2, 2);
    }
    game.strokeStyle = "rgba(94,234,212,.08)";
    game.lineWidth = 1;
    for (let y = 65; y < height; y += 62) { game.beginPath(); game.moveTo(0, y); game.lineTo(width, y); game.stroke(); }
    state.cores.forEach(core => {
      const pulse = 1 + Math.sin(performance.now() / 120 + core.phase) * .12;
      game.save();
      game.shadowBlur = 26;
      game.shadowColor = "rgba(251,113,133,.95)";
      game.fillStyle = "#fb7185";
      heartPath(game, core.x, core.y, core.radius * pulse);
      game.fill();
      game.restore();
    });
    game.save();
    game.translate(state.player.x, state.player.y);
    game.shadowBlur = 24;
    game.shadowColor = "rgba(94,234,212,.85)";
    game.fillStyle = "#5eead4";
    game.beginPath();
    game.moveTo(0, -state.player.radius - 8);
    game.lineTo(state.player.radius, state.player.radius);
    game.lineTo(0, state.player.radius - 6);
    game.lineTo(-state.player.radius, state.player.radius);
    game.closePath();
    game.fill();
    game.fillStyle = "#17213a";
    game.fillRect(-4, 3, 8, 13);
    game.restore();
  }

  function pushCodeEvent(){
    const [kind,glyph,label,detail]=streamEvents[streamIndex++%streamEvents.length],line=document.createElement("div"),icon=document.createElement("span"),name=document.createElement("strong"),text=document.createElement("span");
    line.className=`code-line code-${kind}`;icon.className="code-icon";icon.textContent=glyph;name.textContent=label;text.textContent=detail;
    line.append(icon,name,text);codeStream.append(line);
    while(codeStream.children.length>7)codeStream.firstElementChild.remove();
  }

  function updateFrameHealth(dt){
    if(dt>0&&dt<250)frameTimes.push(dt);if(frameTimes.length>90)frameTimes.shift();healthElapsed+=dt;
    if(healthElapsed<1000||!frameTimes.length)return;
    healthElapsed=0;const average=frameTimes.reduce((sum,value)=>sum+value,0)/frameTimes.length;measuredFps=Math.round(1000/average);
    const state=measuredFps>=50?"smooth":measuredFps>=30?"stable":"limited";
    frameHealth.textContent=`${measuredFps} FPS · ${state}`;frameHealth.dataset.health=state;
  }

  function frame(now) {
    const dt = Math.min(48, Math.max(0, now - lastFrame));
    lastFrame = now;
    if (motionRunning) {
      cubeRotation.y += dt * .00072 * cubeMultiplier;
      cubeRotation.x += dt * .00016 * cubeMultiplier;
      streamElapsed += dt;
      if(streamElapsed>=720){streamElapsed=0;pushCodeEvent();}
    }
    updateFrameHealth(dt);
    drawCube();
    drawVillage(dt);
    drawHearts(dt);
    updateGame(dt);
    drawGame();
    requestAnimationFrame(frame);
  }

  function setMotion(running) {
    motionRunning = running;
    motionToggle.textContent = running ? "Pause motion" : "Resume motion";
    motionToggle.setAttribute("aria-pressed", String(!running));
    motionStatus.textContent = running ? "Motion is running. All demos are local." : "Motion is paused. You can resume whenever you want.";
  }

  function directionForKey(key) {
    const lower = key.toLowerCase();
    return ({arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "up", w: "up", arrowdown: "down", s: "down"})[lower];
  }

  function movePlayerFromPointer(event) {
    const rect = gameCanvas.getBoundingClientRect();
    state.player.x = (event.clientX - rect.left) / rect.width * gameCanvas.width;
    state.player.y = (event.clientY - rect.top) / rect.height * gameCanvas.height;
  }

  motionToggle.addEventListener("click", () => setMotion(!motionRunning));
  motionReset.addEventListener("click", () => { cubeRotation.x=.38;cubeRotation.y=.62;villageState.night=0;villageState.targetNight=0;villageState.traveler=0;villageTime.textContent="Switch to night";villageTime.setAttribute("aria-pressed","false");seedHearts();resetGame();codeStream.replaceChildren();streamIndex=0;for(let index=0;index<4;index+=1)pushCodeEvent();setMotion(!reducedMotion); });
  cubeSpeed.addEventListener("input", () => { cubeMultiplier = Number(cubeSpeed.value); cubeSpeedValue.textContent = `${cubeMultiplier.toFixed(1)}×`; });
  heartBurst.addEventListener("click", () => { for (let index = 0; index < 28; index += 1) addHeart(380, 250, true); });
  villageTime.addEventListener("click",()=>{villageState.targetNight=villageState.targetNight?0:1;const night=!!villageState.targetNight;villageTime.textContent=night?"Switch to day":"Switch to night";villageTime.setAttribute("aria-pressed",String(night));});
  cubeCanvas.addEventListener("pointerdown",event=>{cubeCanvas.setPointerCapture(event.pointerId);cubeDrag={x:event.clientX,y:event.clientY};});
  cubeCanvas.addEventListener("pointermove",event=>{if(!cubeDrag)return;cubeRotation.y+=(event.clientX-cubeDrag.x)*.009;cubeRotation.x=Math.max(-1.35,Math.min(1.35,cubeRotation.x+(event.clientY-cubeDrag.y)*.009));cubeDrag={x:event.clientX,y:event.clientY};});
  const endCubeDrag=()=>{cubeDrag=null;};cubeCanvas.addEventListener("pointerup",endCubeDrag);cubeCanvas.addEventListener("pointercancel",endCubeDrag);
  cubeCanvas.addEventListener("keydown",event=>{const delta=.12;if(!event.key.startsWith("Arrow"))return;event.preventDefault();if(event.key==="ArrowLeft")cubeRotation.y-=delta;if(event.key==="ArrowRight")cubeRotation.y+=delta;if(event.key==="ArrowUp")cubeRotation.x-=delta;if(event.key==="ArrowDown")cubeRotation.x+=delta;});
  gameStart.addEventListener("click", startGame);
  gameReset.addEventListener("click", resetGame);
  window.addEventListener("keydown", event => { const direction = directionForKey(event.key); if (!direction) return; if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault(); pressed.add(direction); });
  window.addEventListener("keyup", event => { const direction = directionForKey(event.key); if (direction) pressed.delete(direction); });
  gameCanvas.addEventListener("pointerdown", event => { if (state.running) { gameCanvas.setPointerCapture(event.pointerId); movePlayerFromPointer(event); } });
  gameCanvas.addEventListener("pointermove", event => { if (state.running && event.buttons) movePlayerFromPointer(event); });
  document.querySelectorAll("[data-direction]").forEach(button => {
    const direction = button.dataset.direction;
    const engage = event => { event.preventDefault(); pressed.add(direction); };
    const release = event => { event.preventDefault(); pressed.delete(direction); };
    button.addEventListener("pointerdown", engage);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pressed.clear(); });

  seedHearts();
  for(let index=0;index<4;index+=1)pushCodeEvent();
  resetGame();
  setMotion(motionRunning);
  requestAnimationFrame(frame);

  // Read-only diagnostic surface for local automated checks; it is not used by the UI.
  window.blackcoreCreativeLab = Object.freeze({
    getState: () => ({motionRunning, cubeRotation:{...cubeRotation}, villageNight:villageState.night,villageTargetNight:villageState.targetNight,villageTraveler:villageState.traveler,fireflies:villageState.fireflies.length,particleCount: particles.length, score: state.score, lives: state.lives, level: state.level, gameRunning: state.running, coreCount: state.cores.length, streamCount:codeStream.children.length, measuredFps}),
    burst: () => heartBurst.click(),
    toggleVillageTime:()=>villageTime.click(),
    startGame: () => gameStart.click()
  });
})();
