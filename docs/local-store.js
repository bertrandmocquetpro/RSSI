import {phases,costs,assert,availableCards,applyAction,advance,reportStatus} from './engine.js';
export const storageKey='valmont.pages.v1';
const copy=x=>JSON.parse(JSON.stringify(x));
export function createLocalGame(storage,cards){
 let session=null;
 try{const raw=storage.getItem(storageKey);if(raw)session=validate(JSON.parse(raw));}catch{}
 function validate(s){assert(s?.format==='valmont-pages-v1'&&Number.isInteger(s.phase)&&s.phase>=0&&s.phase<=6,'Format de partie invalide.');assert(typeof s.code==='string'&&/^[A-F0-9]{6}$/.test(s.code),'Code de partie invalide.');assert(typeof s.name==='string'&&s.name.length<=100,'Nom invalide.');assert(s.teams&&Object.keys(s.teams).length===1,'Une seule équipe par partie locale.');const t=Object.values(s.teams)[0];assert(t&&typeof t.name==='string'&&t.name.length<=100,'Équipe invalide.');for(const k of ['actions','results','events','answers'])assert(Array.isArray(t[k])&&t[k].length<5000,'Historique invalide.');for(const k of ['done','roles','notes','decisions'])assert(t[k]&&typeof t[k]==='object'&&!Array.isArray(t[k]),'Données de partie invalides.');assert(Number.isInteger(t.budget)&&t.budget>=0&&t.budget<=6,'Capacité invalide.');assert(Array.isArray(s.log)&&s.log.length<10000,'Journal invalide.');assert(JSON.stringify(s).length<2000000,'Fichier trop volumineux.');return copy(s);}
 function persist(s){try{storage.setItem(storageKey,JSON.stringify(s));}catch{throw new Error('Sauvegarde impossible dans ce navigateur. Exportez votre bilan avant de fermer la page.');}session=s;}
 function view(){assert(session,'Commencez ou importez une partie.');const s=copy(session),t=Object.values(s.teams)[0];return {code:s.code,name:s.name,phase:s.phase,phases,paused:s.paused,revision:s.revision,host:false,costs,cards:cards.filter(c=>availableCards(s.phase).includes(c.id)||t.events.includes(c.id)),team:{...t,reportStatus:reportStatus(t)},log:s.log};}
 const clean=(v,max=6000)=>{assert(typeof v==='string'&&v.length<=max,'Texte absent ou trop long.');return v.trim();};
 return {hasSession:()=>!!session,view,exportSession:()=>copy(session),importSession(raw){const s=validate(raw);persist(s);return view();},
 async api(route,b){
 if(route==='create'){
 const name=clean(b.name,100);assert(name,'Nommez votre équipe.');const bytes=new Uint8Array(3);globalThis.crypto.getRandomValues(bytes);const code=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
 const s={format:'valmont-pages-v1',code,name,phase:0,paused:false,revision:0,log:[],teams:{local:{id:'local',name,roles:{},notes:{},decisions:{initial:{},final:{}},done:{},actions:[],events:[],results:[],answers:[],budget:0,reportDecision:false}}};persist(s);return {code};}
 if(!b)return view();assert(session,'Commencez une partie.');const s=copy(session),t=s.teams.local||Object.values(s.teams)[0];const op=route.split('/').at(-1);let message='';
 if(op==='advance'){advance(s);for(const r of t.results){if(r.id==='A12')r.text='Question à poser oralement à l’animateur ; la réponse peut rester inconnue.';if(r.id==='A10')r.text='Avis externe à recueillir auprès de l’animateur, sans capacité supplémentaire.';}message='Étape : '+phases[s.phase];}
 else if(op==='pause'){s.paused=!s.paused;message=s.paused?'Partie suspendue.':'Partie reprise.';}
 else{assert(!s.paused,'La partie est suspendue.');
 if(op==='action'){applyAction(t,b.id,s.phase-2,{reason:clean(b.reason,3000),owner:clean(b.owner,100),question:clean(b.question||'',3000)});message=`Action ${b.id} : ${b.reason}`;}
 else if(op==='notes'){assert(['facts','hypotheses','questions','deferred','review'].includes(b.key),'Rubrique inconnue.');t.notes[b.key]=clean(b.value);message='Plateau mis à jour.';}
 else if(op==='roles'){assert(s.phase>=2&&/^R0[1-6]$/.test(b.id),'Rôle indisponible.');t.roles[b.id]=clean(b.name,100);message='Rôles mis à jour.';}
 else if(op==='decision'){assert(s.phase>=3,'Décision disponible à partir du premier arbitrage.');const d={};for(const f of ['priorities','prerequisites','risks','objection','authority','review'])d[f]=clean(b[f]||'');assert(d.priorities.length>=15,'Précisez vos trois priorités.');d.at=new Date().toISOString();t.decisions[s.phase<=4?'initial':'final']=d;t.reportDecision=!!b.reportDecision;message='Décision enregistrée.';}
 else assert(false,'Commande inconnue.');}
 s.revision++;s.log.push({at:new Date().toISOString(),message});persist(s);return view();
 }};
}
