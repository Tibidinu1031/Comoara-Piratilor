const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((q,s)=>{
  let f=q.url==='/'?'/comoara-piratului.html':q.url.split('?')[0];
  const p=path.join(__dirname,decodeURIComponent(f));
  fs.readFile(p,(e,d)=>{
    if(e){s.writeHead(404);s.end('nu exista');return;}
    s.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':'text/plain'});
    s.end(d);
  });
}).listen(8791,()=>console.log('gata pe 8791'));
