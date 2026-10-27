import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('docs',{recursive:true});
copyFileSync('engine.js','docs/engine.js');copyFileSync('cards.json','docs/cards.json');copyFileSync('public/style.css','docs/style.css');
writeFileSync('docs/.nojekyll','');
writeFileSync('docs/index.html',readFileSync('public/index.html','utf8').replace('href="/style.css"','href="./style.css"').replace('src="/app.js"','src="./app.js"').replace('<title>Valmont sous tension — Cellule de décision</title>','<title>Valmont sous tension — Jeu de formation</title>'));
let s=readFileSync('public/app.js','utf8');
function replace(a,b){if(!s.includes(a))throw new Error('Transformation introuvable : '+a.slice(0,80));s=s.replace(a,b);}
replace("const $=s=>",`import {createLocalGame} from './local-store.js';
const cardsResponse=await fetch(new URL('./cards.json',import.meta.url));
if(!cardsResponse.ok)throw new Error('Le dossier des cartes est indisponible.');
const localGame=createLocalGame(localStorage,await cardsResponse.json());
const $=s=>`);
replace("let auth;try{auth=JSON.parse(localStorage.getItem('valmont.auth'));}catch{auth=null;}","let auth=localGame.hasSession()?{code:localGame.view().code}:null;");
const apiStart=s.indexOf('async function api('),apiEnd=s.indexOf('function top()',apiStart);
s=s.slice(0,apiStart)+`async function api(path,data){return localGame.api(path,data);}
function setAuth(v){auth=v;}
`+s.slice(apiEnd);
replace('Version pilote 0.1','Version navigateur 0.2');
replace('Sauvegarder mon accès','Sauvegarder ma partie');
const homeStart=s.indexOf('function home()'),homeEnd=s.indexOf('const cardHTML=',homeStart);
s=s.slice(0,homeStart)+`function home(){state=null;app.innerHTML=top()+\`<main id="main" class="wrap"><div class="hero"><section><div class="eyebrow">Un jeu pour décider ensemble</div><h1>Valmont<br>sous tension.</h1><p class="lead muted">Préservez les missions d’une université confrontée à un incident numérique. Examinez les pièces, confrontez les points de vue et assumez vos arbitrages.</p><div class="quote"><p>Les inscriptions ferment dans 36 heures. Un calcul scientifique doit aboutir dans 48 heures. Une seule chaîne peut être restaurée à la fois.</p></div><span class="badge">Formation animée · 3 heures</span></section><section class="panel"><h2>Votre table de décision</h2><div class="notice">Une partie indépendante par navigateur, sans compte ni serveur. L’animateur annonce oralement les changements d’étape. Les réponses restent sur cet appareil.</div><form id="entryForm"><label>Nom de l’équipe<input name="name" required maxlength="100" placeholder="Ex. Table des possibles"></label><button>Démarrer une nouvelle partie →</button></form><p><small>Une nouvelle partie remplace celle enregistrée dans ce navigateur. Exportez-la avant de recommencer.</small></p>\${localGame.hasSession()?'<button class="ghost" data-do="resume">Reprendre la partie enregistrée</button>':''}<label>Importer une sauvegarde<input id="recover" type="file" accept="application/json,.json"></label></section></div><div class="stats"><div class="stat"><strong>Comprendre</strong>Relier missions et dépendances.</div><div class="stat"><strong>Arbitrer</strong>Choisir avec des moyens limités.</div><div class="stat"><strong>Réviser</strong>Apprendre des conséquences.</div></div></main>\`+footer;
$('#entryForm').onsubmit=async e=>{e.preventDefault();if(localGame.hasSession()&&!confirm('Remplacer la partie locale ? Exportez-la d’abord si nécessaire.'))return;try{setAuth(await api('create',Object.fromEntries(new FormData(e.target))));tab='situation';await refresh(true);}catch(err){toast(err.message);}};
$('#recover').onchange=async e=>{try{const file=e.target.files[0];if(!file||file.size>2000000)throw new Error('Fichier absent ou trop volumineux.');if(localGame.hasSession()&&!confirm('Remplacer la partie locale par cette sauvegarde ?'))return;const v=localGame.importSession(JSON.parse(await file.text()));auth={code:v.code};tab='situation';await refresh(true);}catch(err){toast(err.message);}};
}
`+s.slice(homeEnd);
replace("['journal','Journal'],...(s.phase===6?", "['journal','Journal'],['guide','Guide'],...(s.phase===6?");
replace("Synchronisation active · ${s.paused?'Partie suspendue':'Étape '+(s.phase+1)+' sur 7'}", "Sauvegarde sur cet appareil · ${s.paused?'Partie suspendue':'Étape '+(s.phase+1)+' sur 7'}");
replace("line.textContent='Synchronisation active · '", "line.textContent='Sauvegarde sur cet appareil · '");
replace("Connexion interrompue · nouvelle tentative automatique", "Sauvegarde locale indisponible");
replace('Connexion à votre session…','Ouverture de votre partie locale…');
replace("localStorage.removeItem('valmont.auth');auth=null;home();", "auth=null;home();");
replace("Quitter cet écran ? Sauvegardez votre accès avec le bouton en haut avant de quitter si vous souhaitez revenir.","Revenir à l’accueil ? La partie enregistrée restera disponible sur cet appareil.");
replace("JSON.stringify(auth)","JSON.stringify(localGame.exportSession())");
replace("'valmont-acces-'+auth.code+'.json'","'valmont-partie-'+auth.code+'.json'");
replace('Fichier privé : il donne accès à votre écran. Ne le partagez pas.','Partie exportée. Ce fichier permet de reprendre sur un autre appareil.');
replace("Passer à l’étape suivante pour toutes les équipes ? Les résultats du tour seront validés.","L’animateur a-t-il annoncé la prochaine étape ? La progression de cette table est définitive et clôt le tour en cours.");
replace("Vous pouvez consulter le dossier.</div>","Vous pouvez consulter le dossier.</div>");
replace("${t?results(t):''}","${t?results(t):''}<div class=\"panel\"><h3>Progression de cette table</h3><p>Attendez la consigne orale de l’animateur. Ce bouton fait avancer uniquement cette partie.</p><div class=\"actions\"><button data-do=\"advance\" ${s.phase===6||s.paused?'disabled':''}>${s.phase>=3&&s.phase<=5?'Clore le tour et avancer':'Étape suivante'} →</button><button class=\"ghost\" data-do=\"pause\">${s.paused?'Reprendre':'Faire une pause'}</button></div></div>");
replace(" if(b.dataset.do==='access')", " if(b.dataset.do==='resume'){auth={code:localGame.view().code};tab='situation';await refresh(true);}\n if(b.dataset.do==='access')");
s=s.replaceAll('La progression est commandée par l’animateur.','La progression suit les consignes orales de l’animateur.');
s=s.replaceAll('pour toutes les équipes','pour cette table');
s=s.replaceAll('Les variantes E05 et E08 sont optionnelles.','Les variantes E05 et E08 ne sont pas déclenchables dans cette version navigateur.');
writeFileSync('docs/app.js',s);
