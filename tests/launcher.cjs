const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {startServer}=require('../server.js');
const root=path.resolve(__dirname,'..');

function runBatch(file,hideNodeFromPath=false){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','call',file,'--no-open','--port','0'],{
      cwd:process.env.SystemRoot,windowsHide:true,
      env:{...process.env,RPG_LAUNCH_NO_PAUSE:'1',...(hideNodeFromPath?{PATH:path.join(process.env.SystemRoot,'System32')}:{})},
      stdio:['ignore','pipe','pipe']
    });
    let output='',errors='',serverPid,checking=false;
    const timer=setTimeout(()=>{if(serverPid)process.kill(serverPid);child.kill();reject(Error('Launcher timed out: '+output+errors))},12000);
    child.stderr.setEncoding('utf8');child.stderr.on('data',part=>errors+=part);
    child.stdout.setEncoding('utf8');child.stdout.on('data',async part=>{
      output+=part;
      const match=output.match(/http:\/\/127\.0\.0\.1:\d+(?=\r?\n)/);
      if(!match||checking)return;
      checking=true;
      try{
        const response=await fetch(match[0]+'/__rpg_health'),data=await response.json();
        const expected=createHash('sha256').update(path.dirname(file).replace(/\\/g,'/').toLowerCase()).digest('hex');
        assert.equal(data.app,'hundred-year-forest');assert.equal(data.workspaceId,expected);
        assert.ok(Number.isInteger(data.pid)&&data.pid>0&&data.pid!==process.pid);
        serverPid=data.pid;
        assert.equal((await fetch(match[0])).status,200);
        process.kill(serverPid);
      }catch(error){clearTimeout(timer);child.kill();reject(error)}
    });
    child.on('error',error=>{clearTimeout(timer);reject(error)});
    child.on('exit',()=>{
      clearTimeout(timer);
      if(!serverPid)reject(Error('Batch never started the game: '+output+errors));
      else resolve({output,errors});
    });
  });
}

async function main(){
  const batch=fs.readFileSync(path.join(root,'run_game.bat'));
  assert.ok(batch.every(byte=>byte<128),'The batch command text must stay ASCII');
  assert.ok(!/(?<!\r)\n/.test(batch.toString()),'Windows batch files need CRLF line endings');
  const blocker=http.createServer((req,res)=>res.end('another app'));
  await new Promise(resolve=>blocker.listen(0,'127.0.0.1',resolve));
  let server;
  try{
    const result=await startServer({port:blocker.address().port});server=result.server;
    assert.equal(result.reused,false);assert.notEqual(server.address().port,blocker.address().port);
    assert.ok((await (await fetch(result.url)).text()).includes('id="start-button"'));
    assert.equal((await fetch(result.url+'/dist/game.bundle.js')).status,200);
    assert.equal((await fetch(result.url+'/assets/boss-victory.mp3')).headers.get('content-type'),'audio/mpeg');
    assert.equal((await fetch(result.url+'/%')).status,400);
    assert.equal((await fetch(result.url+'/%2e%2e%2foutside.txt')).status,404);
    const second=await startServer({port:server.address().port});
    assert.equal(second.reused,true);assert.equal(second.url,result.url);assert.equal(second.server,null);
    assert.equal((await fetch(result.url+'/__rpg_health')).status,200);
    await assert.rejects(startServer({port:-1}));
    console.log('Server: occupied-port fallback, game assets/audio, malformed URL, root boundary and same-game reuse passed');
  }finally{
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
    await new Promise(resolve=>blocker.close(resolve));
  }
  if(process.platform==='win32'){
    await runBatch(path.join(root,'run_game.bat'),true);
    const fixture=path.join(root,'.playtest','launcher space 한글');fs.mkdirSync(path.join(fixture,'dist'),{recursive:true});
    for(const name of ['run_game.bat','server.js'])fs.copyFileSync(path.join(root,name),path.join(fixture,name));
    fs.writeFileSync(path.join(fixture,'index.html'),'<html>launcher fixture</html>');
    fs.writeFileSync(path.join(fixture,'dist','game.bundle.js'),'// launcher fixture');
    await runBatch(path.join(fixture,'run_game.bat'));
    const incomplete=path.join(root,'.playtest','launcher missing files');fs.mkdirSync(incomplete,{recursive:true});
    fs.copyFileSync(path.join(root,'run_game.bat'),path.join(incomplete,'run_game.bat'));
    const failed=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/c','call',path.join(incomplete,'run_game.bat'),'--no-open'],{
      cwd:process.env.SystemRoot,windowsHide:true,env:{...process.env,RPG_LAUNCH_NO_PAUSE:'1'},encoding:'utf8',timeout:5000
    });
    assert.equal(failed.status,1);assert.ok(failed.stdout.includes('Required game files are missing'));
    console.log('Windows batch: actual cmd launch, Node outside PATH, unrelated working directory, spaces/Korean path and visible missing-file error passed');
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});
