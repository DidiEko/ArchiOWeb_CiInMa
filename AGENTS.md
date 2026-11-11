# ArchiOWeb_CiInMa — Guide de reprise du projet

## Par où commencer

Ce fichier s’adresse aux membres du groupe et aux assistants IA qui travaillent dans le dépôt [DidiEko/ArchiOWeb_CiInMa](https://github.com/DidiEko/ArchiOWeb_CiInMa). Placez les trois fichiers Markdown côte à côte à la racine du dépôt. Lisez ensuite [ETAT_DU_PROJET.md](ETAT_DU_PROJET.md) pour connaître l’existant et [A_FAIRE.md](A_FAIRE.md) pour choisir une tâche.

Les consignes officielles du cours font foi pour l’évaluation. Ce guide reprend les attentes identifiées dans la fiche de concept du 28 octobre 2026 et les complète avec l’état du code. Le groupe doit vérifier le barème, les échéances, le format de rendu et le périmètre exact auprès de l’enseignant.

## Objectif et vocabulaire

Créer un tournoi mobile en temps réel autour des couleurs. Deux à quatre joueurs se retrouvent dans un salon. Le créateur lance la partie. Les mêmes joueurs enchaînent les manches et consultent leur classement. Une **partie** est le tournoi entier. Une **manche** correspond à un mini-jeu joué au sein de cette partie.

| Mini-jeu | Règle de base | Mesure brute |
| --- | --- | --- |
| Conquête de couleurs | Chaque appui peint une zone. Un joueur peut repeindre les zones de ses adversaires. | Surface ou nombre de cellules contrôlées à la fin du chrono. |
| Réflexes colorés | Parmi plusieurs mots colorés, toucher celui dont le mot correspond à sa couleur d’affichage. | Bonnes réponses et pénalité éventuelle pour les erreurs. |
| Mémoire des couleurs | Proposition à valider. Reproduire une suite de couleurs de plus en plus longue. | Nombre de séquences réussies. |

Le scénario cible comprend trois manches. L’API accepte déjà une à trois manches pour pouvoir développer et tester Conquête de couleurs seule. La fiche de concept propose un classement provisoire entre les manches et un classement final. Le barème commun et les égalités de manche restent à décider. Le mode 2 contre 2 est une extension possible après la version chacun pour soi.

## Attentes identifiées

| Domaine | Attente de travail |
| --- | --- |
| API REST | Express et MongoDB avec trois ressources liées. `/users` gère les comptes, `/minigames` le catalogue et `/games` les salons, parties et résultats. Une partie référence ses joueurs et ses mini-jeux. |
| Comptes et autorisations | Hacher les mots de passe avec Argon2 et authentifier par JWT. L’inscription attribue le rôle `player`. Les écritures sur le catalogue sont réservées aux admins. Le créateur gère le lancement et l’annulation de son salon. Le périmètre de modification du profil et des paramètres du salon doit être confirmé. |
| CRUD et cohérence | Couvrir les opérations de création, lecture, modification et suppression prévues par le brief. Archiver un mini-jeu retiré du catalogue pour préserver les parties qui le référencent. Valider les entrées, les références, la capacité du salon et les transitions de statut. |
| Pagination et filtres | Paginer la liste des parties. Les filtres par statut et par mini-jeu existent. La fiche de concept prévoit aussi un filtre par participant. |
| Classements | Calculer le classement d’une partie à partir des manches. Préparer un classement général des joueurs à partir des parties terminées avec une agrégation MongoDB. |
| Développement mobile et temps réel | Synchroniser le salon, le démarrage, les actions, la fin de manche et les classements. Le serveur valide les actions et calcule les scores du jeu. |
| Tests | Couvrir les opérations REST en succès et en erreur, avec des données indépendantes et reproductibles. La fiche de concept reprend un objectif de couverture d’au moins 75 %. Confirmer la métrique et le périmètre exacts dans le brief officiel. |
| Documentation et déploiement | Documenter l’installation, les variables, les routes, les corps et réponses, les droits et les codes HTTP. Code sur GitHub, déploiement API sur Render prévu par la fiche de concept. Gérer les secrets via les variables d’environnement. |

## Préparer son poste

Prévoir Git, l’accès au dépôt GitHub avec droit de pousser une branche, Node.js 24 et npm 11 comme versions de référence, ainsi qu’un serveur MongoDB local. MongoDB Community 8.0 a été utilisé côté Mac. La commande de démarrage et les dépendances sont définies dans `package.json`.

```bash
git clone https://github.com/DidiEko/ArchiOWeb_CiInMa.git
cd ArchiOWeb_CiInMa
npm ci
```

Si MongoDB Community 8.0 est déjà installé via Homebrew sur Mac, démarrez-le avec `brew services start mongodb-community@8.0`. Sur les autres installations, démarrez le service MongoDB selon la méthode utilisée sur votre poste. Les tests se connectent à `127.0.0.1:27017`.

Créez un fichier local `.env` à la racine, ou complétez celui qui existe. Remplacez la valeur de `JWT_SECRET` par un secret local. Pour en générer un, utilisez `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

```dotenv
DATABASE_URL=mongodb://127.0.0.1:27017/archioweb_ciinma
JWT_SECRET=remplacer_par_un_secret_local
PORT=3000
```

La base de développement ci-dessus est un exemple. Les tests se connectent directement à `archioweb_ciinma_test` et utilisent leur propre clé JWT. Gardez `.env`, identifiants, jetons et mots de passe hors des commits, captures, issues et PR.

```bash
npm start
```

Dans un deuxième terminal, vérifiez le démarrage, le catalogue et la suite de tests.

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/minigames
npm test
node --test --experimental-test-coverage
```

Une liste `[]` est normale sur une base neuve. Pour jouer manuellement, créez au moins un mini-jeu dans votre base de développement via un compte admin local ou un seed de développement. La procédure de seed partageable figure dans les actions restantes. Pour tester une route protégée, inscrivez un compte local avec `POST /users`, connectez-vous via `POST /users/login` et envoyez le jeton de réponse dans l’en-tête `Authorization: Bearer <token>`.

## Travailler en groupe avec GitHub

### 1. Attribuer une tâche et créer une branche

Créez ou prenez une issue. Indiquez le résultat attendu, les fichiers ou routes concernés, les critères de validation et les dépendances à une autre PR. Mettez-vous d’accord avant de modifier le même fichier sensible, par exemple `routes/games.js` ou `models/Game.js`.

Chaque tâche démarre depuis `main` à jour. Vérifiez d’abord `git status -sb`. Si votre branche courante contient des changements en cours, identifiez-les et enregistrez-les avant de changer de branche.

```bash
git switch main
git pull --ff-only
git switch -c feature/lobby-realtime
```

Exemples de noms de branches `feature/...`, `fix/...`, `test/...` et `docs/...`. Si une tâche dépend d’une PR en attente, convenez en groupe de l’ordre de fusion et indiquez la dépendance dans la PR. Les branches de travail passent par une PR avant d’arriver dans `main`.

### 2. Faire un commit dès qu’une étape fonctionne

À chaque étape qui fonctionne, lancez les tests et relisez le diff. Ajoutez les fichiers concernés explicitement et faites un commit avant d’attaquer l’étape suivante.

```bash
npm test
git status -sb
git diff
git add chemin/du/fichier.js chemin/du/test.js
git diff --cached
git commit -m "Sync lobby players when someone joins"
git push -u origin feature/lobby-realtime
```

Remplacez les chemins par les fichiers réellement modifiés. Après le premier push de la branche, `git push` suffit. Regroupez dans un même commit le code, ses tests et la documentation directement liée. Les messages de commit existants sont en anglais et décrivent l’action.

### 3. Ouvrir, relire et fusionner une PR

Sur GitHub, ouvrez une PR de votre branche vers `main`. Incluez le lien vers l’issue, le comportement ajouté, les commandes ou scénarios de test, les éventuels changements de contrat REST ou temps réel et les dépendances. Si la PR est en cours, utilisez le statut brouillon.

Faites relire la PR par un membre du groupe. Vérifiez les tests et les conflits avant la fusion. Si `main` a avancé, suivez la méthode convenue par le groupe pour synchroniser votre branche, puis relancez les tests. Après la fusion, mettez votre `main` local à jour avec `git switch main` puis `git pull --ff-only`. Fermez l’issue et mettez à jour les fichiers de suivi si le changement modifie l’état du projet.

## Consignes pour l’IA et les personnes qui reprennent une tâche

1. Lis les trois Markdown, vérifie la branche et inspecte `package.json`, les routes, les modèles et les tests concernés. Utilise le code de la branche de travail comme référence pour le comportement réel.
2. Choisis une seule tâche identifiée. Réutilise les modèles et middlewares existants, garde les modifications liées à la tâche et préserve les contrats actuels sauf changement convenu avec le groupe.
3. Si une règle de jeu ou une consigne scolaire est marquée à confirmer, présente-la comme une décision à prendre. Rends explicite toute hypothèse nécessaire pour avancer.
4. Teste via les points d’entrée normaux. Donne les résultats réellement obtenus, les vérifications manuelles restantes et les fichiers modifiés.
5. À la fin d’une étape qui passe, propose la commande de commit avec les chemins concernés, ou exécute-la si la tâche te demande de le faire. Fais passer les changements par la branche et la PR du groupe.

Exemple de demande à l’IA

> Lis AGENTS.md, ETAT_DU_PROJET.md et A_FAIRE.md. Vérifie ma branche. Aide-moi à réaliser la tâche P1.1. Réutilise les routes existantes, ajoute le test lié à cette étape et donne-moi les commandes pour vérifier et committer le changement.

## Sources du projet

- Dépôt GitHub et code de la branche `main`, état détaillé dans [ETAT_DU_PROJET.md](ETAT_DU_PROJET.md).
- `Projet_jeu_couleurs.pdf`, fiche de concept du 28 octobre 2026. Elle synthétise des consignes d’évaluation et des pistes du groupe.
- `Projet app mobile – fiche de synthèse.pdf`, fiche initiale du 7 octobre 2026. Elle indique que le principe de peinture multijoueur a été validé. La conception a ensuite évolué vers un catalogue de mini-jeux et un tournoi.
