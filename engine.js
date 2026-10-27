export const phases=['Découvrir Valmont','Qualifier la situation','Confronter les responsabilités','Premier arbitrage','Deuxième arbitrage','Réviser la décision','Débriefer'];
export const costs={A01:2,A02:2,A03:1,A04:4,A05:4,A06:4,A07:2,A08:1,A09:1,A10:2,A11:1,A12:1};
export function assert(ok,message){if(!ok)throw Object.assign(new Error(message),{status:400});}
export function availableCards(phase){return ['S','I','R','P','A','E'].flatMap(f=>{
 if(f==='S')return Array.from({length:8},(_,i)=>`S${String(i+1).padStart(2,'0')}`);
 if(f==='I')return Array.from({length:phase>=4?10:phase>=1?8:1},(_,i)=>`I${String(i+1).padStart(2,'0')}`);
 if(f==='R'&&phase>=2)return Array.from({length:6},(_,i)=>`R0${i+1}`);
 if(f==='P'&&phase>=1)return Array.from({length:6},(_,i)=>`P0${i+1}`);
 if(f==='A'&&phase>=3)return Object.keys(costs);return [];
});}
export function applyAction(team,id,turn,detail){
 assert(costs[id]!==undefined,'Action inconnue.');assert(turn>=1&&turn<=3,'Les actions sont ouvertes pendant les trois tours.');
 assert(!team.done[id]||id==='A12','Cette action a déjà été réalisée.');
 const previous=x=>team.done[x]&&team.done[x].turn<turn;
 if(['A04','A05','A06'].includes(id)){
 assert(previous('A01'),'Vérifier les identités lors d’un tour précédent (A01).');
 assert(!team.actions.some(a=>a.turn===turn&&['A04','A05','A06'].includes(a.id)),'Une seule restauration complexe par tour.');
 }
 if(id==='A04')assert(previous('A02'),'Valider la sauvegarde lors d’un tour précédent (A02).');
 assert(team.budget>=costs[id],'Capacité insuffisante pour ce tour.');
 assert(detail.reason?.trim().length>=15,'Justifiez votre choix en au moins 15 caractères.');
 assert(detail.owner?.trim(),'Indiquez le responsable de l’action.');
 if(id==='A12')assert(detail.question?.trim().length>=10,'Formulez une question précise.');
 team.budget-=costs[id];team.done[id]={turn};
 team.actions.push({id,turn,reason:detail.reason,owner:detail.owner,question:detail.question||'',at:new Date().toISOString()});
 if(id==='A11'&&team.fatigue){team.budget++;team.fatigue=false;}
 if(id==='A03'&&!team.events.includes('E01'))team.events.push('E01');
}
const results={A01:'Une cible de reprise isolée est disponible ; l’absence totale de compromission reste non démontrée.',A02:'La sauvegarde scolarité de la veille est exploitable. Les saisies ultérieures devront être rapprochées.',A04:'La chaîne de scolarité est rétablie dans le périmètre isolé ; le rapprochement des saisies reste nécessaire.',A05:'L’accès au calcul et l’export sont sécurisés dans le périmètre traité. Le calcul n’a pas été reproduit.',A06:'Portail et messagerie rétablis dans le périmètre validé ; les autres applications ne sont pas automatiquement restaurées.',A07:'Registre provisoire sécurisé organisé ; prévoir le rapprochement des dossiers.',A08:'Un canal alternatif et un point d’information sont organisés.',A09:'La qualification des conséquences sur les données est organisée ; aucune fuite n’est présumée.',A10:'Un avis externe est demandé, sans capacité supplémentaire.',A11:'La relève des équipes est organisée.',A12:'Question transmise à l’animateur. La réponse peut rester inconnue.'};
export function finishTurn(team,turn){for(const a of team.actions.filter(a=>a.turn===turn)){if(!team.results.some(r=>r.actionIndex===team.actions.indexOf(a)))team.results.push({actionIndex:team.actions.indexOf(a),turn,id:a.id,text:results[a.id]});}}
export function startTurn(team,turn){team.budget=6;if(turn===3){
 const first=team.done.A03?'E02':team.done.A07?'E03':'E04';
 const second=team.done.A11?'E07':'E06';
 for(const e of [first,second])if(!team.events.includes(e))team.events.push(e);
 if(second==='E06'){team.budget=5;team.fatigue=true;}
}}
export function advance(session){assert(session.phase<6,'La partie est déjà au débriefing.');
 const oldTurn=session.phase-2;if(oldTurn>=1&&oldTurn<=3)for(const t of Object.values(session.teams))finishTurn(t,oldTurn);
 session.phase++;const turn=session.phase-2;if(turn>=1&&turn<=3)for(const t of Object.values(session.teams))startTurn(t,turn);
}
export function reportStatus(team){return team.reportDecision&&team.done.A03&&team.done.A08?'Report de 48 heures validé et communiqué.':'Échéance initiale conservée ; aucun report validé et communiqué.';}
