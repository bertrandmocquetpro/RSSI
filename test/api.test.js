import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'valmont-test-'));let proc,base;
async function launch(){proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:dir}});base=await new Promise((resolve,reject)=>{proc.once('error',reject);proc.stdout.on('data',d=>{const m=d.toString().match(/port (\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});proc.stderr.on('data',d=>process.stderr.write(d));setTimeout(()=>reject(new Error('Startup timeout')),5000).unref();});}
async function stop(){if(proc){const p=proc;await new Promise(resolve=>{p.once('exit',resolve);p.kill();});proc=null;}}
async function call(p,b,token){const r=await fetch(base+'/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,data:await r.json()};}
test('partie multiéquipes, autorisations et persistance',async()=>{try{await launch();
 const h=await call('create',{name:'Formation pilote',pin:'valmont-demo'});assert.equal(h.status,201);const {code,token:host}=h.data;
 const wrong=await call('join',{code,name:'Intrus',pin:'incorrect'});assert.equal(wrong.status,400);
 const one=await call('join',{code,name:'Scolarité',pin:'valmont-demo'}),two=await call('join',{code,name:'Recherche',pin:'valmont-demo'});const t=one.data.token,t2=two.data.token,p='sessions/'+code;
 assert.equal((await call(p)).status,401);assert.equal((await call(p+'/advance',{},t)).status,400);
 let v=(await call(p,undefined,t)).data;assert.equal(v.teams,undefined);assert.equal(JSON.stringify(v).includes(host),false);assert.equal(v.cards.some(c=>c.id==='E05'),false);
 for(let i=0;i<3;i++)assert.equal((await call(p+'/advance',{},host)).status,200);
 const d={reason:'Préserver les missions à partir de I04.',owner:'Numérique'};
 assert.equal((await call(p+'/action',{id:'A04',...d},t)).status,400);
 await call(p+'/action',{id:'A01',...d},t);await call(p+'/action',{id:'A02',...d},t);await call(p+'/action',{id:'A03',...d},t);
 assert.equal((await call(p,undefined,t2)).data.team.actions.length,0);
 await call(p+'/advance',{},host);v=(await call(p,undefined,t)).data;assert.equal(v.team.results.length,3);
 await call(p+'/action',{id:'A04',...d},t);await call(p+'/action',{id:'A08',...d},t);
 await call(p+'/decision',{priorities:'1. Inscriptions 2. Recherche 3. Enseignement',reportDecision:true},t);
 await call(p+'/advance',{},host);v=(await call(p,undefined,t)).data;assert.deepEqual(v.team.events,['E01','E02','E06']);assert.equal(v.team.budget,5);assert.match(v.team.reportStatus,/validé/);
 await call(p+'/pause',{},host);assert.equal((await call(p+'/notes',{key:'facts',value:'test'},t)).status,400);await call(p+'/pause',{},host);
 await call(p+'/answer',{teamId:v.team.id,answer:'Les durées restent estimatives.'},host);assert.equal((await call(p,undefined,t2)).data.team.answers.length,0);
 await call(p+'/advance',{},host);assert.equal((await call(p,undefined,t)).data.phase,6);
 await stop();await launch();assert.equal((await call(p,undefined,t)).data.team.actions.length,5);assert.equal((await call(p,undefined,host)).data.teams.length,2);
 const bad=await fetch(base+'/api/create',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({name:'x',pin:'abcdefgh'})});assert.equal(bad.status,403);
 const html=await fetch(base);assert.equal(html.status,200);assert.match(html.headers.get('content-security-policy'),/default-src/);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}});
