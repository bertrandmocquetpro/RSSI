import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createLocalGame,storageKey} from '../docs/local-store.js';
const cards=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url)));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('partie navigateur complète, export et reprise sans serveur',async()=>{
 const st=storage(),g=createLocalGame(st,cards);assert.equal(g.hasSession(),false);const auth=await g.api('create',{name:'Table locale'});const route='sessions/'+auth.code;
 assert.equal(g.view().cards.some(c=>c.id==='E06'),false);for(let i=0;i<3;i++)await g.api(route+'/advance',{});
 const d={reason:'Vérification nécessaire avant la reprise selon I04.',owner:'Numérique'};
 await g.api(route+'/action',{id:'A01',...d});await g.api(route+'/action',{id:'A02',...d});assert.equal(g.view().team.budget,2);
 await g.api(route+'/advance',{});assert.equal(g.view().team.results.length,2);await g.api(route+'/action',{id:'A04',...d});
 await g.api(route+'/decision',{priorities:'1. Scolarité 2. Recherche 3. Portail'});await g.api(route+'/advance',{});assert.equal(g.view().team.budget,5);
 const g2=createLocalGame(st,cards);assert.equal(g2.view().phase,5);assert.equal(g2.view().team.actions.length,3);
 const g3=createLocalGame(storage(),cards);g3.importSession(g2.exportSession());assert.equal(g3.view().team.results.length,3);await g3.api(route+'/advance',{});assert.equal(g3.view().phase,6);
 assert.equal(g3.view().team.decisions.initial.priorities,'1. Scolarité 2. Recherche 3. Portail');assert.match(st.getItem(storageKey),/valmont-pages-v1/);
});
test('import invalide refusé et échec de sauvegarde sans mutation',async()=>{
 const st=storage(),g=createLocalGame(st,cards);await g.api('create',{name:'Test'});assert.throws(()=>g.importSession({format:'wrong'}),/invalide/);const before=g.view().phase;
 st.setItem=()=>{throw new Error('quota');};await assert.rejects(g.api('sessions/test/advance',{}),/Sauvegarde impossible/);assert.equal(g.view().phase,before);
});
test('les ressources statiques fonctionnent sous un sous-répertoire',()=>{
 const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');assert.match(html,/src="\.\/app.js"/);assert.match(html,/href="\.\/style.css"/);
 const app=readFileSync(new URL('../docs/app.js',import.meta.url),'utf8');assert.equal(app.includes("fetch('/api/"),false);assert.equal(app.includes('Synchronisation active'),false);
 assert.equal(readFileSync(new URL('../docs/engine.js',import.meta.url),'utf8'),readFileSync(new URL('../engine.js',import.meta.url),'utf8'));
});
