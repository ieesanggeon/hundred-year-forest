const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
const root=process.cwd(),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const source=fs.readFileSync(path.join(root,'dist/game.bundle.js'),'utf8'),end=source.lastIndexOf('})();');
  const instrumented=source.slice(0,end)+';globalThis.__snowQA={game,p,scene,camera,renderer,viewSword,hero,enterMesa,spawnDesertMonster,enterSnowfield,enterTaintedForest,enterMeadow,spawnSnowMonster,updateSwordDesign,update,applySwordDesign,SWORD_NAMES,xpNeeded,get castleStage(){return castleStage},castleState,hud,updateAttackGauge,playerShield,bossCombat,combatFeedback,input,enemies,bossIntro,bossRoarSound,pauseGame,stageMusic,enterCastle,attack,hurt,revive,snowPanorama,desertPanorama,renderStartPanorama,setPanoramaElapsed:seconds=>{panoramaStartedAt=performance.now()-seconds*1000}};'+source.slice(end);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp3':'audio/mpeg'};
  const server=http.createServer((request,response)=>{
    const relative=decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    if(relative==='dist/game.bundle.js'){response.writeHead(200,{'Content-Type':types['.js']});response.end(instrumented);return}
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){response.writeHead(404);response.end();return}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rpg-snow-browser-'));
  const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    '--user-data-dir='+profile,'--window-size=1440,900','--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'
  ],{windowsHide:true,stdio:'ignore'});
  let socket;
  try{
    const activePort=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<50&&!fs.existsSync(activePort);i++)await delay(200);
    if(!fs.existsSync(activePort))throw Error('Chrome debugging endpoint did not start');
    const port=fs.readFileSync(activePort,'utf8').split(/\r?\n/)[0];
    const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
    let id=0;const pending=new Map(),errors=[];
    socket.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params.args.map(arg=>arg.value||arg.description||'').join(' '));
      if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
      if(message.id&&pending.has(message.id)){
        const entry=pending.get(message.id);pending.delete(message.id);clearTimeout(entry.timer);
        if(message.error)entry.reject(Error(JSON.stringify(message.error)));else entry.resolve(message.result);
      }
    });
    function send(method,params={}){
      return new Promise((resolve,reject)=>{
        const messageId=++id,timer=setTimeout(()=>{pending.delete(messageId);reject(Error(method+' timed out'))},20000);
        pending.set(messageId,{resolve,reject,timer});socket.send(JSON.stringify({id:messageId,method,params}));
      });
    }
    const evaluate=async expression=>{
      const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
      return result.result.value;
    };
    await send('Page.enable');await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
    for(let i=0;i<50;i++){
      if(await evaluate('typeof __snowQA!=="undefined"'))break;
      if(i===49)throw Error('Game did not initialize: '+errors.join('\n'));
      await delay(300);
    }
    const assert=require('node:assert/strict');
    const output=path.join(root,'.playtest');fs.mkdirSync(output,{recursive:true});
    const key=async(code,keyText=code)=>{const virtual=code==='KeyE'?69:13;await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyText,windowsVirtualKeyCode:virtual});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyText,windowsVirtualKeyCode:virtual})};
    const capture=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name),Buffer.from(result.data,'base64'))};
    await evaluate('(()=>{const q=__snowQA;q.game.running=true;q.game.modal=false;q.game.cutscene=false;q.p.level=100;q.p.expNeed=q.xpNeeded(100);q.p.maxHp=892;q.p.hp=892;q.p.hasSword=true;q.p.skills.attack=124;q.p.skills.health=1;q.updateSwordDesign();document.querySelector("#start-screen").classList.add("hidden");document.querySelector("#hud").classList.remove("menu-hidden");document.querySelector("#panorama-transition").hidden=true;q.enterMesa();q.update(.016);return true})()');
    await key('Enter','Enter');assert.equal(await evaluate('__snowQA.game.castlePromptOpen'),true);
    await key('Enter','Enter');assert.equal(await evaluate('__snowQA.p.region'),5);
    await evaluate('window.requestAnimationFrame=()=>0');await delay(150);await evaluate('(()=>{const c=document.querySelector("#game");globalThis.qaPointerLocked=false;Object.defineProperty(document,"pointerLockElement",{configurable:true,get:()=>qaPointerLocked?c:null});c.requestPointerLock=()=>{qaPointerLocked=true;document.dispatchEvent(new Event("pointerlockchange"));return Promise.resolve()};document.exitPointerLock=()=>{qaPointerLocked=false;document.dispatchEvent(new Event("pointerlockchange"))};return true})()');
    await evaluate('(()=>{const q=__snowQA,g=q.enemies.find(e=>e.castlePost);Object.assign(q.p,{x:g.x,y:g.y,z:g.z+3,floorY:g.y,grounded:true,inv:999,hasSword:true});q.game.yaw=Math.PI;q.game.pitch=0;g.hp=1;q.update(.016);q.renderer.render(q.scene,q.camera);return true})()');
    const mouse=async(type,button='left')=>send('Input.dispatchMouseEvent',{type,button,buttons:type==='mousePressed'?(button==='right'?2:1):0,clickCount:1,x:720,y:450});
    if(!await evaluate('document.pointerLockElement===document.querySelector("#game")')){await mouse('mousePressed');await mouse('mouseReleased');await delay(80)}
    assert.equal(await evaluate('document.pointerLockElement===document.querySelector("#game")'),true);
    await mouse('mousePressed');await mouse('mouseReleased');
    assert.equal(await evaluate('__snowQA.playerShield.state.unlocked'),true);assert.equal(await evaluate('__snowQA.playerShield.state.tutorial'),true);
    await capture('shield-unlock-tutorial.png');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await delay(100);await capture('shield-unlock-mobile.png');
    const tutorialMobile=await evaluate('(()=>{const r=document.querySelector(".shield-tutorial-card").getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()');
    assert.ok(tutorialMobile.left>=0&&tutorialMobile.right<=tutorialMobile.width&&tutorialMobile.top>=0&&tutorialMobile.bottom<=tutorialMobile.height);
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await key('Enter','Enter');await delay(80);
    assert.equal(await evaluate('__snowQA.game.shieldTutorial'),false);
    await mouse('mousePressed','right');
    assert.equal(await evaluate('__snowQA.playerShield.state.active'),true,'Real right mouse input must start defense');
    const guard=await evaluate('(()=>{const q=__snowQA;q.p.inv=0;const hp=q.p.hp;const result=q.hurt(70,0);q.playerShield.update(.015,true,true);q.update(.016);q.updateAttackGauge(performance.now());q.renderer.render(q.scene,q.camera);return {result,hp:q.p.hp,before:hp,visible:q.playerShield.root.visible}})()');
    assert.equal(guard.result,'blocked');assert.equal(guard.hp,guard.before);assert.equal(guard.visible,true);
    await capture('shield-first-person-block.png');
    await evaluate('__snowQA.playerShield.update(3.1,true,true);__snowQA.renderer.render(__snowQA.scene,__snowQA.camera)');
    assert.equal(await evaluate('__snowQA.playerShield.state.active'),false);assert.equal(await evaluate('__snowQA.playerShield.state.exhausted'),true);
    await mouse('mouseReleased','right');await mouse('mousePressed','right');assert.equal(await evaluate('__snowQA.playerShield.state.active'),true);await mouse('mouseReleased','right');
    await evaluate('(()=>{const q=__snowQA;globalThis.qaBoss=(skill,distance=12)=>{q.enterCastle(true);q.p.z=-52;q.update(.016);q.bossIntro.advance();q.bossIntro.advance();q.bossIntro.update(10);for(const e of q.enemies)if(!e.boss){e.dead=true;e.sniper.visual.laser.visible=false}const b=q.enemies.find(e=>e.boss);Object.assign(q.p,{x:0,y:170,z:-91+distance,floorY:170,grounded:true,vy:0,inv:999,hp:10000,maxHp:10000});q.game.yaw=Math.PI;q.game.pitch=.08;q.game.firstPerson=true;Object.assign(b,{x:0,z:-91,phase:"idle",cd:999});q.bossCombat.start(b,skill);q.hud();q.update(0);document.querySelector("#toast").classList.add("hidden");document.querySelectorAll("#game-shell > div[style]").forEach(el=>{if(el.style.zIndex==="12")el.remove()});return b};globalThis.qaSim=seconds=>{const n=Math.ceil(seconds*120),dt=seconds/n;for(let i=0;i<n;i++){q.playerShield.update(dt,!q.game.modal,true);q.update(dt);q.combatFeedback.update(dt)}q.updateAttackGauge(performance.now());q.renderer.render(q.scene,q.camera)};return true})()');
    await evaluate('qaBoss("combo",14);qaSim(.85)');await capture('boss-combo-warning.png');
    await evaluate('qaSim(.28)');await capture('boss-combo-slash.png');
    const combo=await evaluate('({step:__snowQA.enemies.find(e=>e.boss).step,objects:__snowQA.bossCombat.root.children.length,action:document.querySelector("#boss-action").textContent})');assert.equal(combo.step,1);
    await evaluate('(()=>{const q=__snowQA;qaBoss("judgment",15);qaSim(1.25);q.viewSword.visible=false;q.hero.visible=true;q.camera.position.set(19,187,-58);q.camera.lookAt(0,172,-82);q.renderer.render(q.scene,q.camera);return true})()');await capture('boss-judgment-warning.png');
    await evaluate('(()=>{const q=__snowQA;qaSim(.55);q.viewSword.visible=false;q.camera.position.set(19,187,-58);q.camera.lookAt(0,172,-82);q.renderer.render(q.scene,q.camera);return true})()');await capture('boss-judgment-pillars.png');
    const judgment=await evaluate('({step:__snowQA.enemies.find(e=>e.boss).step,objects:__snowQA.bossCombat.root.children.length,action:document.querySelector("#boss-action").textContent})');assert.equal(judgment.step,1);
    await evaluate('qaBoss("meteor",24);qaSim(.85)');await capture('boss-meteor-charge.png');
    await evaluate('(()=>{const q=__snowQA;qaSim(.85);q.viewSword.visible=false;q.camera.position.set(12,177,-76);q.camera.lookAt(0,173,-83);q.renderer.render(q.scene,q.camera);return true})()');assert.equal(await evaluate('__snowQA.bossCombat.projectiles.length'),3);await capture('boss-meteor-flight.png');
    const meteor=await evaluate('({projectiles:__snowQA.bossCombat.projectiles.length,objects:__snowQA.bossCombat.root.children.length})');
    if(!await evaluate('document.pointerLockElement===document.querySelector("#game")')){await mouse('mousePressed');await mouse('mouseReleased');await delay(60)}
    await mouse('mousePressed','right');assert.equal(await evaluate('__snowQA.playerShield.state.active'),true);
    const meteorBlock=await evaluate('(()=>{const q=__snowQA;q.p.inv=0;const before=q.p.hp;let hit=false;for(let i=0;i<180;i++){qaSim(1/120);if(q.playerShield.state.hit>0){hit=true;break}}q.renderer.render(q.scene,q.camera);return {hit,hp:q.p.hp,before,shield:q.playerShield.root.visible}})()');
    assert.equal(meteorBlock.hit,true);assert.equal(meteorBlock.hp,meteorBlock.before);await capture('boss-meteor-shield-impact.png');await mouse('mouseReleased','right');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await evaluate('(()=>{const q=__snowQA;q.playerShield.begin();q.playerShield.update(.01,true,true);q.update(0);q.renderer.render(q.scene,q.camera);return true})()');await capture('shield-block-mobile.png');
    const mobile=await evaluate('(()=>{const r=document.querySelector("#shield-status").getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}})()');assert.ok(mobile.left>=0&&mobile.right<=mobile.width);
    await evaluate('__snowQA.enterMesa()');assert.equal(await evaluate('__snowQA.bossCombat.root.children.length'),0);assert.equal(await evaluate('__snowQA.playerShield.state.active'),false);
    console.log(JSON.stringify({pointerLockEmulated:true,guard,tutorialMobile,combo,judgment,meteor,meteorBlock,mobile,errors,checks:'real left-click kill and first-guard tutorial, real right-click guard and release, forced expiration, all three individual boss telegraphs/impacts, real projectile block, mobile tutorial/shield and stage cleanup'}));
    if(errors.length)throw Error(errors.join('\n'));
  }finally{if(socket)socket.close();chrome.kill();server.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
