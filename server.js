import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {phases,costs,assert,availableCards,applyAction,advance,reportStatus} from './engine.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const cards=JSON.parse(readFileSync(path.join(root,'cards.json')));
const dataDir=path.resolve(process.env.DATA_DIR||path.join(root,'data'));mkdirSync(dataDir,{recursive:true});
const dbFile=path.join(dataDir,'sessions.json');let db=existsSync(dbFile)?JSON.parse(readFileSync(dbFile,'utf8')):{};
const save=()=>{writeFileSync(dbFile+'.tmp',JSON.stringify(db),{mode:0o600});renameSync(dbFile+'.tmp',dbFile);};
const token=()=>randomBytes(24).toString('hex');const hash=(s,salt)=>scryptSync(s,salt,32).toString('hex');
const safe=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const limits=new Map();
function limited(ip){const now=Date.now();if(limits.size>10000)for(const [k,v] of limits)if(v.reset<now)limits.delete(k);let t=limits.get(ip);if(!t||t.reset<now){t={n:0,reset:now+60000};limits.set(ip,t);}return ++t.n>120;}
function text(v,max=3000){assert(typeof v==='string'&&v.length<=max,'Texte absent ou trop long.');return v.trim();}
function auth(req,s){const t=(req.headers.authorization||'').replace(/^Bearer /,'');if(safe(t,s.hostToken))return {host:true};const team=Object.values(s.teams).find(x=>safe(t,x.token));if(team)return {team};throw Object.assign(new Error('Accès non autorisé.'),{status:401});}
function view(s,a){const teamView=t=>({id:t.id,name:t.name,roles:t.roles,notes:t.notes,decisions:t.decisions,budget:t.budget,actions:t.actions,events:t.events,results:t.results,answers:t.answers,reportDecision:t.reportDecision,reportStatus:reportStatus(t)});
 const visible=availableCards(s.phase);const events=a.host?cards.filter(c=>c.id[0]==='E').map(c=>c.id):a.team.events;
 return {code:s.code,name:s.name,phase:s.phase,phases,paused:s.paused,revision:s.revision,host:!!a.host,costs,cards:cards.filter(c=>visible.includes(c.id)||events.includes(c.id)),teams:a.host?Object.values(s.teams).map(teamView):undefined,team:a.team?teamView(a.team):undefined,log:a.host?s.log:s.log.filter(l=>!l.teamId||l.teamId===a.team.id)};
}
async function body(req){let s='';for await(const chunk of req){s+=chunk;assert(Buffer.byteLength(s)<=32000,'Requête trop volumineuse.');}try{return JSON.parse(s||'{}');}catch{throw Object.assign(new Error('JSON invalide.'),{status:400});}}
function event(s,message,teamId){s.log.push({at:new Date().toISOString(),message,...(teamId?{teamId}:{})});s.revision++;}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export const server=http.createServer(async(req,res)=>{try{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(p==='/health'){reply(res,200,{ok:true});return;}
 if(p.startsWith('/api/')){
 if(req.headers.origin&&req.headers.origin!==`${process.env.PUBLIC_ORIGIN||url.protocol+'//'+req.headers.host}`){throw Object.assign(new Error('Origine refusée.'),{status:403});}
 if(limited(req.socket.remoteAddress+':'+(req.method==='GET'?(req.headers.authorization||'read'):'write')))throw Object.assign(new Error('Trop de requêtes. Réessayez dans une minute.'),{status:429});
 const method=req.method;const b=method==='POST'?await body(req):{};
 if(p==='/api/create'&&method==='POST'){
 if(process.env.CREATE_KEY&&!safe(b.createKey,process.env.CREATE_KEY))throw Object.assign(new Error('Clé de création incorrecte.'),{status:403});
 assert(Object.keys(db).length<1000,'Limite de sessions atteinte.');const name=text(b.name,100);assert(name,'Nommez la formation.');const pin=text(b.pin,100);assert(pin.length>=8,'La clé d’équipe doit contenir au moins huit caractères.');
 let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(db[code]);const salt=token();const hostToken=token();
 db[code]={code,name,salt,pinHash:hash(pin,salt),hostToken,phase:0,paused:false,teams:{},log:[],revision:0,createdAt:new Date().toISOString()};event(db[code],'Session créée.');save();reply(res,201,{code,token:hostToken});return;
 }
 if(p==='/api/join'&&method==='POST'){
 const s=db[text(b.code,12).toUpperCase()];assert(s,'Session introuvable.');const name=text(b.name,80);assert(name,'Nommez votre équipe.');
 assert(safe(hash(text(b.pin,100),s.salt),s.pinHash),'Code ou clé d’équipe incorrect.');assert(s.phase<3,'Les équipes doivent rejoindre avant le premier arbitrage.');assert(Object.keys(s.teams).length<30,'La session accueille déjà 30 équipes.');assert(!Object.values(s.teams).some(t=>t.name.toLowerCase()===name.toLowerCase()),'Ce nom d’équipe est déjà utilisé.');
 const id=randomBytes(5).toString('hex'),tt=token();s.teams[id]={id,name,token:tt,roles:{},notes:{},decisions:{initial:{},final:{}},done:{},actions:[],events:[],results:[],answers:[],budget:0,reportDecision:false};event(s,`Équipe ${name} inscrite.`,id);save();reply(res,201,{code:s.code,token:tt});return;
 }
 const match=p.match(/^\/api\/sessions\/([A-F0-9]{6})(?:\/(\w+))?$/);assert(match,'Route inconnue.');const s=db[match[1]];assert(s,'Session introuvable.');const a=auth(req,s),op=match[2];
 if(method==='GET'&&!op){reply(res,200,view(s,a));return;}
 assert(method==='POST','Méthode non autorisée.');
 if(['advance','pause','answer','reveal'].includes(op))assert(a.host,'Commande réservée à l’animateur.');
 if(op==='advance'){assert(Object.keys(s.teams).length>0,'Attendez au moins une équipe.');advance(s);event(s,`Étape : ${phases[s.phase]}.`);}
 else if(op==='pause'){s.paused=!s.paused;event(s,s.paused?'Partie suspendue.':'Partie reprise.');}
 else if(op==='answer'){const t=s.teams[b.teamId];assert(t,'Équipe introuvable.');const answer=text(b.answer,3000);assert(answer,'Rédigez la réponse.');t.answers.push({text:answer,at:new Date().toISOString()});event(s,'Réponse de l’animateur.',t.id);}
 else if(op==='reveal'){const t=s.teams[b.teamId];assert(t,'Équipe introuvable.');assert(/^E0[1-8]$/.test(b.id),'Événement inconnu.');assert(!t.events.includes(b.id),'Déjà révélé.');assert(s.phase>=3&&s.phase<=5,'Les événements se révèlent pendant les arbitrages.');assert(b.id==='E05'||b.id==='E08','Seules les variantes E05 et E08 sont manuelles ; les autres suivent les règles.');t.events.push(b.id);event(s,`Événement ${b.id} révélé.`,t.id);}
 else {
 assert(a.team,'Commande réservée à une équipe.');assert(!s.paused,'La partie est suspendue.');const t=a.team;
 if(op==='action'){const detail={reason:text(b.reason),owner:text(b.owner,100),question:text(b.question||'')};applyAction(t,b.id,s.phase-2,detail);event(s,`Action ${b.id} engagée : ${detail.reason}`,t.id);}
 else if(op==='notes'){assert(['facts','hypotheses','questions','deferred','review'].includes(b.key),'Rubrique inconnue.');t.notes[b.key]=text(b.value,6000);event(s,'Plateau mis à jour.',t.id);}
 else if(op==='roles'){assert(s.phase>=2,'Les rôles sont disponibles à l’étape 3.');assert(/^R0[1-6]$/.test(b.id),'Rôle inconnu.');t.roles[b.id]=text(b.name,100);event(s,'Répartition des rôles mise à jour.',t.id);}
 else if(op==='decision'){assert(s.phase>=3,'Les décisions sont ouvertes pendant les arbitrages.');const stage=s.phase<=4?'initial':'final';const fields=['priorities','prerequisites','risks','objection','authority','review'];const d={};for(const f of fields)d[f]=text(b[f]||'',6000);assert(d.priorities.length>=15,'Précisez vos trois priorités.');t.decisions[stage]={...d,at:new Date().toISOString()};t.reportDecision=!!b.reportDecision;event(s,`Décision ${stage==='initial'?'initiale':'révisée'} enregistrée.`,t.id);}
 else assert(false,'Commande inconnue.');
 }
 save();reply(res,200,view(s,a));return;
 }
 assert(req.method==='GET'||req.method==='HEAD','Méthode non autorisée.');const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};const file=files[p];if(!file){res.writeHead(404);res.end('Page introuvable');return;}const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':readFileSync(path.join(root,'public',file)));
 }catch(e){if(!res.headersSent)reply(res,e.status||500,{error:e.status?e.message:'Erreur serveur. Réessayez.'});else res.end();if(!e.status)console.error(e);}});
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT??process.argv[process.argv.indexOf('--port')+1])||3000,process.env.HOST||'0.0.0.0',()=>console.log(`Valmont écoute sur le port ${server.address().port}`));
