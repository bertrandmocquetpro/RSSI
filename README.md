# Valmont sous tension

Jeu en ligne de décision collective destiné aux responsables universitaires. Formation animée de trois heures, avec un écran partagé par équipe et un poste animateur. Versions pilotes à expérimenter avant diffusion large.

## Fonctionnalités réalisées

- Création d’une formation, code de session et clé commune d’équipe.
- Postes animateur et équipes séparés, contrôle des droits côté serveur.
- Sept étapes pilotées par l’animateur ; suspension et reprise.
- Cinquante cartes révélées progressivement : rôles, missions, informations, actions, événements et repères.
- Trois tours, six jetons par tour, prérequis techniques, une reprise complexe maximum par tour, fatigue et relève.
- Plateau de raisonnement, attribution des rôles, décisions initiale et révisée.
- Journal, réponses ciblées de l’animateur, bilan et exports texte/JSON.
- Sauvegarde des sessions sur le serveur et fichier d’accès individuel pour reprendre sur un autre navigateur.
- Synchronisation par interrogation du serveur toutes les trois secondes. Un écran représente une équipe ; ce n’est pas un éditeur collaboratif simultané pour plusieurs membres d’une même équipe.

## Jouer avec GitHub Pages sans serveur

Le dossier `docs/` contient une version autonome destinée à GitHub Pages. Elle conserve le moteur, les cartes, les arbitrages, le plateau et le débriefing. Chaque navigateur joue une partie indépendante. L’animateur annonce oralement les changements d’étape ; chaque table avance sur son écran. Aucun compte, clé commune ou partage automatique entre appareils.

Les données de jeu sont enregistrées uniquement dans le navigateur, pas dans GitHub. Le bouton « Sauvegarder ma partie » exporte un fichier JSON réimportable sur l’accueil. Le bilan texte permet une restitution collective. Effacer les données du navigateur efface la partie locale. Une nouvelle partie remplace la précédente ; exporter avant de recommencer. Un seul onglet de jeu par navigateur est recommandé.

### Activer la publication

Dans GitHub : Settings → Pages → Build and deployment → Source « Deploy from a branch » → branche `main` → dossier `/docs` → Save. Le dépôt doit être public avec GitHub Free, ou disposer d’une offre autorisant Pages sur dépôt privé. Après publication, utiliser l’URL affichée par GitHub Pages.

### Développer cette version

```sh
npm run build:pages
npm test
```

Le script régénère les ressources de `docs/` depuis le moteur, les cartes et l’interface partagés. Le stockage autonome se trouve dans `docs/local-store.js`. Les variantes E05 et E08 ne sont pas déclenchables dans cette version ; les questions A12 sont posées oralement à l’animateur. Les informations techniques restent des conventions d’exercice.

La version serveur multiéquipes reste disponible dans `server.js` et `public/` pour un hébergement ultérieur.

## Démarrer sur votre ordinateur

Prérequis : Node.js 22 ou plus récent et Git. Aucune bibliothèque tierce à installer.

```sh
npm start
```

Ouvrir `http://localhost:3000`. Pour tester animateur et équipe sur le même ordinateur, utiliser deux profils de navigateur ou une fenêtre privée. Créer la session côté animateur, conserver son accès privé, puis rejoindre côté équipe avant le premier arbitrage.

Pour une séance sur un réseau local, ouvrir le port 3000 selon la politique de votre établissement et utiliser l’adresse réseau du serveur. Pour une utilisation sur Internet, placer le serveur derrière HTTPS.

## Tests

```sh
npm run check
npm test
```

Les tests couvrent le budget, les dépendances, les événements, la clôture des tours, la séparation entre équipes, les commandes réservées à l’animateur, les accès refusés et la persistance après redémarrage. Un workflow GitHub Actions exécute ces contrôles.

## Dépôt GitHub

Dépôt privé de développement : https://github.com/bertrandmocquetpro/RSSI

```sh
git clone https://github.com/bertrandmocquetpro/RSSI.git
cd RSSI
npm start
```

Le projet reste portable : aucune dépendance à un service ChatGPT ou à une API d’intelligence artificielle. Ne pas inclure le dossier `data`, les fichiers d’accès ou des secrets dans le dépôt. Le `.gitignore` les exclut.

## Mettre le jeu en ligne

Le code est prêt pour un serveur Node.js ou un conteneur Docker. GitHub conserve le code ; GitHub Pages ne peut pas exécuter ce serveur multiéquipes. Aucun hébergement payant n’a été souscrit et le dépôt du code sur GitHub ne déploie pas automatiquement l’application.

### Docker

```sh
docker build -t valmont .
docker run --rm -p 3000:3000 --mount source=valmont-data,target=/app/data -e CREATE_KEY=REMPLACER_PAR_UN_SECRET valmont
```

Configurer `PUBLIC_ORIGIN` avec l’origine HTTPS exacte en production (par exemple l’origine de votre hébergement, sans slash final). Le stockage persistant `/app/data` est nécessaire pour conserver les parties lors d’un redéploiement.

### Variables

| Variable | Utilisation |
| --- | --- |
| `PORT` | Port HTTP, 3000 par défaut |
| `HOST` | Adresse d’écoute, 0.0.0.0 par défaut |
| `DATA_DIR` | Répertoire persistant des sessions, `./data` par défaut |
| `CREATE_KEY` | Secret d’accès à la création de sessions ; recommandé sur Internet |
| `PUBLIC_ORIGIN` | Origine HTTPS publique exacte derrière un reverse proxy |

Vérification de service : `GET /health` doit renvoyer `{"ok":true}`.

## Animer une partie

1. Prévoir 10 minutes d’accueil, puis 20 minutes de découverte, 25 de qualification et 25 de confrontation.
2. Distribuer le code et la clé d’équipe. Les équipes doivent rejoindre avant l’étape Premier arbitrage. À cinq participants, cumuler présidence et direction générale.
3. Pause de 10 minutes. Trois tours de 15, 20 et 25 minutes. La progression est manuelle et définitive ; les résultats apparaissent à la clôture du tour.
4. Les capacités et conséquences sont des conventions d’exercice. Les informations du dossier ne prouvent ni une compromission générale ni la sûreté des services.
5. A01 doit avoir été réalisée à un tour antérieur avant A04, A05 ou A06 ; A04 exige aussi A02. Le report d’inscription demande A03, une décision explicite de présidence dans la fiche et A08.
6. Le troisième tour révèle deux événements selon les actions déjà réalisées. Les variantes E05 et E08 restent facultatives.
7. Débriefing de 30 minutes. Comparer les décisions, expliciter une objection et recueillir une pratique transférable. Aucun score global ni classement unique attendu.

## Sources et contenus

Les cartes sont issues du kit Valmont V1 préparé à partir du dossier d’audit fictif Université de Valmont et du parcours Moodle Manager le risque cyber (Module 03, pièces A à E et devoir final). Les pièces originales ne sont pas incluses dans le dépôt. Le champ `origin` distingue les synthèses du socle, les adaptations et les ajouts de conception. Les coûts et résultats du moteur sont fictifs.

Modifier `cards.json` pour les textes ; modifier `engine.js` et les tests pour les règles. Les identifiants des cartes font partie du contrat du moteur : ne pas les renommer sans adapter les règles.

## Données et accès

Les clés des équipes sont dérivées par scrypt ; les jetons d’accès aléatoires sont secrets et envoyés dans l’en-tête Authorization. Les fichiers de reprise donnent accès à l’écran concerné : les conserver privés. Les exports de bilan excluent les secrets d’accès. Les données de session et les jetons sont conservés sur disque serveur ; protéger et sauvegarder le volume. Utiliser des pseudonymes si une identification des participants n’est pas nécessaire.

La version pilote utilise un fichier JSON et une seule instance serveur. Elle n’est pas adaptée au déploiement horizontal. Limite prévue : 30 équipes par session, non validée par un test de charge. La limitation de débit est en mémoire. Il n’existe pas encore de compte nominatif, de suppression par l’interface, de révocation individuelle d’accès ou d’historique d’édition complet. L’administrateur doit prévoir une durée de conservation et une purge hors séance.

## Licence

Aucune licence de redistribution n’est attribuée dans cette version : elle reste à choisir par le titulaire des droits avant ouverture du dépôt. La publication du dépôt ne vaut pas attribution d’une licence de redistribution.
