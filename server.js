const http=require('http'),fs=require('fs'),path=require('path');
const TIP={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.css':'text/css; charset=utf-8'};
http.createServer((q,s)=>{
  let f=q.url==='/'?'/index.html':q.url.split('?')[0];
  const p=path.join(__dirname,decodeURIComponent(f));
  fs.readFile(p,(e,d)=>{
    if(e){s.writeHead(404);s.end('nu exista');return;}
    s.writeHead(200,{'Content-Type':TIP[path.extname(p).toLowerCase()]||'application/octet-stream'});
    s.end(d);
  });
}).listen(8791,()=>console.log('gata pe 8791'));
