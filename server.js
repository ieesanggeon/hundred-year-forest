const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {spawn}=require('node:child_process');

const root=__dirname;
const workspaceId=createHash('sha256').update(root.replace(/\\/g,'/').toLowerCase()).digest('hex');
const identity={app:'hundred-year-forest',workspaceId,pid:process.pid};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};

function request(req,res){
  let requested;
  try{requested=decodeURIComponent(req.url.split('?')[0])}catch{res.writeHead(400);res.end('Invalid URL');return}
  if(requested==='/__rpg_health'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(identity));return;
  }
  const relative=requested==='/'?'index.html':requested.replace(/^\/+/,''),file=path.resolve(root,relative);
  try{
    if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('not a game file');
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('파일을 찾을 수 없습니다.');return}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
}
function sameGame(port){
  return new Promise(resolve=>{
    const req=http.get({hostname:'127.0.0.1',port,path:'/__rpg_health',timeout:600},res=>{
      let text='';res.setEncoding('utf8');
      res.on('data',part=>{text+=part;if(text.length>4096)req.destroy()});
      res.on('end',()=>{try{const data=JSON.parse(text);resolve(data.app===identity.app&&data.workspaceId===workspaceId)}catch{resolve(false)}});
      res.on('error',()=>resolve(false));
    });
    req.on('timeout',()=>req.destroy());req.on('error',()=>resolve(false));
  });
}
function openBrowser(url){
  const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','start','""',url],{detached:true,stdio:'ignore',windowsHide:true,windowsVerbatimArguments:true});
  child.on('error',()=>console.log('브라우저가 열리지 않으면 위 주소를 직접 열어 주세요.'));child.unref();
}
async function startServer({port=8000,open=false}={}){
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('포트 번호는 0~65535 사이여야 합니다.');
  for(const file of ['index.html','dist/game.bundle.js'])if(!fs.existsSync(path.join(root,file)))throw Error('필수 게임 파일이 없습니다: '+file);
  const ports=port===0?[0]:[...Array.from({length:10},(_,i)=>port+i).filter(value=>value<=65535),0];
  for(const candidate of ports){
    const server=http.createServer(request);
    try{
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(candidate,'127.0.0.1',resolve)});
      const url='http://127.0.0.1:'+server.address().port;
      console.log('백년의 숲 실행 중: '+url);console.log('게임을 끝내려면 이 창에서 Ctrl+C를 누르세요.');
      if(open)openBrowser(url);
      return {server,url,reused:false};
    }catch(error){
      if(!['EADDRINUSE','EACCES'].includes(error.code))throw error;
      if(candidate&&await sameGame(candidate)){
        const url='http://127.0.0.1:'+candidate;
        console.log('이미 실행 중인 백년의 숲을 엽니다: '+url);
        if(open)openBrowser(url);
        return {server:null,url,reused:true};
      }
    }
  }
  throw Error('게임 서버를 시작할 수 없습니다.');
}
if(require.main===module){
  const args=process.argv.slice(2),index=args.indexOf('--port');
  const port=index<0?8000:Number(args[index+1]);
  startServer({port,open:args.includes('--open')&&!args.includes('--no-open')}).catch(error=>{
    console.error('게임 실행 실패: '+error.message);process.exitCode=1;
  });
}
module.exports={startServer};
