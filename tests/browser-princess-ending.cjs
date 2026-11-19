const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
const root=process.cwd(),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const source=fs.readFileSync(path.join(root,'dist/game.bundle.js'),'utf8'),end=source.lastIndexOf('})();');
  const instrumented=source.slice(0,end)+';globalThis.__snowQA={game,p,scene,camera,renderer,viewSword,hero,enterMesa,spawnDesertMonster,enterSnowfield,enterTaintedForest,enterMeadow,spawnSnowMonster,updateSwordDesign,update,applySwordDesign,SWORD_NAMES,xpNeeded,get castleStage(){return castleStage},castleState,princessEnding,playerShield,input,enemies,bossIntro,bossRoarSound,pauseGame,stageMusic,enterCastle,attack,hurt,revive,snowPanorama,desertPanorama,renderStartPanorama,setPanoramaElapsed:seconds=>{panoramaStartedAt=performance.now()-seconds*1000}};'+source.slice(end);
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
    const key=async(code,keyText=code)=>{const virtual=code==='KeyE'?69:code==='Escape'?27:13;await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyText,windowsVirtualKeyCode:virtual});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyText,windowsVirtualKeyCode:virtual})};
    const capture=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name),Buffer.from(result.data,'base64'))};
    await evaluate('(()=>{const q=__snowQA;q.game.running=true;q.game.modal=false;q.game.cutscene=false;q.p.level=100;q.p.expNeed=q.xpNeeded(100);q.p.maxHp=892;q.p.hp=892;q.p.hasSword=true;q.p.skills.attack=124;q.p.skills.health=1;q.updateSwordDesign();document.querySelector("#start-screen").classList.add("hidden");document.querySelector("#hud").classList.remove("menu-hidden");document.querySelector("#panorama-transition").hidden=true;q.enterMesa();q.update(.016);return true})()');
    await key('Enter','Enter');assert.equal(await evaluate('__snowQA.game.castlePromptOpen'),true);
    await key('Enter','Enter');assert.equal(await evaluate('__snowQA.p.region'),5);
    const gated=await evaluate('(()=>{const q=__snowQA;q.enterCastle(true);q.p.z=-52;q.update(.016);q.bossIntro.advance();q.bossIntro.advance();q.bossIntro.update(10);const princess=q.castleStage.princess;Object.assign(q.p,{x:0,y:170,z:princess.position.z+3,floorY:170,inv:999});q.update(.016);return {dialogue:q.princessEnding.active}})()');
    assert.equal(gated.dialogue,false);
    await evaluate('(()=>{const q=__snowQA,b=q.enemies.find(e=>e.boss);Object.assign(q.p,{x:b.x,y:170,z:b.z+3,floorY:170,lastSwingAt:-Infinity});q.game.yaw=Math.PI;b.hp=1;q.attack();q.p.skills.exp=7;q.p.skillPoints=10;q.playerShield.state.unlocked=true;q.p.x=0;q.p.z=q.castleStage.princess.position.z+5;q.p.inv=999;q.update(.016);return true})()');
    assert.equal(await evaluate('__snowQA.castleState.bossDefeated'),true);assert.equal(await evaluate('__snowQA.princessEnding.active'),false);
    await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w',windowsVirtualKeyCode:87});
    await evaluate('__snowQA.update(.2)');
    await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w',windowsVirtualKeyCode:87});
    const ending=await evaluate('(()=>{const q=__snowQA;return {active:q.princessEnding.active,modal:q.game.modal,text:document.querySelector("#princess-ending-text").textContent,sword:q.viewSword.visible,camera:q.camera.position.toArray(),time:q.game.time}})()');
    assert.equal(ending.active,true);assert.equal(ending.modal,true);assert.equal(ending.sword,false);
    assert.equal(ending.text,'당신은 100년 동안 잠들어 있었군요.');
    await delay(250);await capture('princess-final-dialogue.png');
    await key('Escape','Escape');assert.equal(await evaluate('__snowQA.princessEnding.active'),true);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:100,y:100});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:100,y:100});
    await evaluate('__snowQA.update(30)');assert.equal(await evaluate('__snowQA.game.time'),ending.time);
    assert.equal(await evaluate('document.querySelector("#princess-ending-text").textContent'),ending.text);
    await key('Enter','Enter');
    assert.equal(await evaluate('__snowQA.game.running'),true);assert.equal(await evaluate('__snowQA.princessEnding.active'),true);
    assert.equal(await evaluate('document.querySelector("#princess-ending-text").textContent'),'저는 100년 동안 이 성에 갇혀 있었어요.');
    await capture('princess-dialogue-second.png');
    await key('Enter','Enter');
    assert.equal(await evaluate('__snowQA.game.running'),true);assert.equal(await evaluate('__snowQA.princessEnding.active'),true);
    assert.equal(await evaluate('document.querySelector("#princess-ending-text").textContent'),'구하러 와 줘서 고마워요.');
    assert.equal(await evaluate('document.querySelector("#princess-action-label").textContent'),'홈 화면으로 돌아가기');
    await capture('princess-dialogue-third.png');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await delay(200);await capture('princess-final-dialogue-mobile.png');
    const mobile=await evaluate('(()=>{const p=document.querySelector(".princess-ending-card").getBoundingClientRect(),b=document.querySelector("#princess-return").getBoundingClientRect();return {left:p.left,right:p.right,top:p.top,bottom:b.bottom,width:innerWidth,height:innerHeight}})()');
    assert.ok(mobile.left>=0&&mobile.right<=mobile.width&&mobile.top>=0&&mobile.bottom<=mobile.height);
    await key('Enter','Enter');
    let title;
    for(let i=0;i<60;i++){
      try{
        title=await evaluate('typeof __snowQA==="undefined"?null:({running:__snowQA.game.running,level:__snowQA.p.level,experienceRank:__snowQA.p.skills.exp,points:__snowQA.p.skillPoints,sword:__snowQA.p.hasSword,shield:__snowQA.playerShield?.state?.unlocked??false,startVisible:!document.querySelector("#start-screen").classList.contains("hidden"),endingHidden:document.querySelector("#princess-ending").classList.contains("hidden"),allMusicPaused:[...document.querySelectorAll("audio[loop]")].every(a=>a.paused)})');
        if(title&&!title.running&&title.startVisible&&title.endingHidden)break;
      }catch{}
      if(i===59)throw Error('Enter did not return to a fresh start screen');await delay(200);
    }
    assert.equal(title.level,1);assert.equal(title.experienceRank,0);assert.equal(title.points,0);assert.equal(title.sword,false);assert.equal(title.shield,false);assert.equal(title.allMusicPaused,true);
    await delay(200);await capture('princess-returned-to-title.png');
    const start=await evaluate('(()=>{const r=document.querySelector("#start-button").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...start});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...start});
    assert.equal(await evaluate('__snowQA.game.cutscene'),true);
    await evaluate('document.querySelector("#cutscene-skip").click()');
    assert.equal(await evaluate('__snowQA.game.running'),true);assert.equal(await evaluate('__snowQA.game.cutscene'),false);assert.equal(await evaluate('__snowQA.p.level'),1);
    console.log(JSON.stringify({gated,ending,mobile,title,errors,checks:'real boss kill and walking approach, three single-sentence dialogue steps, Enter advancement and final-line-only home return, Escape/backdrop ignored, mobile and working new-game start'}));
    if(errors.length)throw Error(errors.join('\n'));
  }finally{if(socket)socket.close();chrome.kill();server.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
