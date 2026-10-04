// Local QA server only. Not part of the deployment package.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.webm':'video/webm'};
http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/test-fixture'){
    const chunks=[];let length=0;req.on('data',chunk=>{length+=chunk.length;if(length>20*1024*1024){res.writeHead(413).end();req.destroy();return;}chunks.push(chunk);});req.on('end',()=>{fs.writeFileSync(path.join(__dirname,'detector-still-fixture.webm'),Buffer.concat(chunks));res.writeHead(200).end('saved');});return;
  }
  let target;try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  if(target===root)target=path.join(root,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);});
}).listen(8766,'127.0.0.1',()=>console.log('QA server http://127.0.0.1:8766'));
