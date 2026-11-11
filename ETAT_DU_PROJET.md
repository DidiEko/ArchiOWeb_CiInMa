# ArchiOWeb_CiInMa — État du projet

Vérification du dépôt le 11 novembre 2026. La branche distante [`main`](https://github.com/DidiEko/ArchiOWeb_CiInMa/tree/main) pointe sur `b91c325`. Les éléments ci-dessous correspondent au code présent sur ce commit.

| Intégration | État |
| --- | --- |
| [PR #1 — Mini-jeux](https://github.com/DidiEko/ArchiOWeb_CiInMa/pull/1) | Fusionnée dans `main`, commit de fusion `d214a63`. |
| [PR #2 — Parties](https://github.com/DidiEko/ArchiOWeb_CiInMa/pull/2) | Fusionnée dans `main`, commit de fusion `b91c325`. Le commit `686b6be` comprend les parties, les résultats, le classement final et l’archivage. |

## Structure du dépôt

| Fichier ou dossier | Rôle |
| --- | --- |
| `server.js` | Connecte MongoDB avec `DATABASE_URL` et démarre le serveur sur `PORT` ou 3000. |
| `app.js` | Crée et exporte l’application Express, active JSON et monte les trois routeurs. |
| `models/` | Schémas Mongoose `User`, `MiniGame` et `Game`. Les scores sont enregistrés dans `Game.results`. |
| `routes/` | Routes REST pour les comptes, le catalogue et les parties. |
| `middlewares/` | `authenticate.js` vérifie le JWT et charge le compte. `requireAdmin.js` contrôle le rôle. |
| `test/` | Tests d’intégration HTTP avec `node:test`, Supertest et MongoDB local. |

## Routes présentes

| Route | Accès | Comportement |
| --- | --- | --- |
| `GET /` | Public | Réponse de bienvenue JSON. |
| `POST /users` | Public | Crée un compte `player` avec `username`, `email` et `password`. Mot de passe de 12 à 128 caractères, haché avec Argon2. Email unique. |
| `POST /users/login` | Public | Vérifie email et mot de passe. Renvoie un JWT valable une heure et un résumé du compte. |
| `GET /users/me` | Connecté | Renvoie le profil du compte authentifié. |
| `GET /minigames` | Public | Liste les mini-jeux actifs. |
| `GET /minigames/:id` | Public | Consulte un mini-jeu par ID, y compris s’il est archivé. |
| `POST /minigames` | Admin | Crée un mini-jeu avec `name`, `slug` unique et `description`. |
| `PATCH /minigames/:id` | Admin | Modifie les champs fournis parmi `name`, `slug` et `description`. |
| `DELETE /minigames/:id` | Admin | Renseigne `archivedAt` et renvoie `204`. Le document reste disponible par ID pour l’historique. |
| `POST /games` | Connecté | Crée un salon `waiting`. Reçoit `miniGameIds`, de un à trois IDs actifs et distincts, et ajoute le créateur comme premier joueur. |
| `GET /games` | Connecté | Liste paginée du plus récent au plus ancien. `page` vaut 1 et `limit` vaut 20 par défaut, avec un maximum de 50. Filtres `status` et `miniGameId`. |
| `GET /games/:id` | Connecté | Renvoie le créateur, les participants, les mini-jeux sélectionnés et le statut. |
| `POST /games/:id/join` | Connecté | Ajoute un joueur si le salon attend, qu’une place est libre et que le joueur n’y figure pas déjà. Maximum de quatre joueurs. |
| `POST /games/:id/start` | Créateur | Passe le salon de `waiting` à `in_progress` dès deux joueurs. |
| `DELETE /games/:id` | Créateur | Annule un salon `waiting` et renvoie `204`. |
| `POST /games/:id/results` | Créateur | Enregistre une fois le résultat de la prochaine manche, avec un score entier positif ou nul par joueur. Passe à `finished` à la dernière manche. |
| `GET /games/:id/leaderboard` | Connecté | Renvoie le classement final de cette partie, avec `rank`, `playerId` et `totalPoints` sous forme de chaîne. Les totaux identiques partagent le même rang. |

Le corps de la route de résultats suit la forme `{ miniGameId, scores: [{ playerId, points }] }`. Aujourd’hui, les points sont soumis par le créateur. Le classement final additionne les points enregistrés. Les règles de calcul côté serveur à partir du jeu sont dans [A_FAIRE.md](A_FAIRE.md).

Codes courants du contrat REST. `400` pour une entrée invalide, `401` si l’authentification manque ou échoue, `403` si le compte authentifié n’a pas le droit, `404` pour une ressource introuvable ou indisponible et `409` en cas de conflit d’état ou de doublon, selon la route.

## Tests et données locales

| Suite | Tests déclarés | Cas couverts |
| --- | ---: | --- |
| `test/users.test.js` | 8 | Inscription, hash, validations, doublon, connexion et accès au profil. |
| `test/minigames.test.js` | 8 | Lecture, ID invalide ou absent, création admin, refus pour un joueur, modification et archivage. |
| `test/games.test.js` | 14 | Création, sélection de mini-jeux, arrivée dans un salon, consultation, filtres et pagination, lancement, annulation, résultat final et classement. |
| **Total** | **30** | Déclarations relevées dans le code. |

La suite utilise une instance MongoDB locale sur `127.0.0.1:27017`, dans `archioweb_ciinma_test`. Le dépôt ne fournit pas encore de seed versionné. Conquête de couleurs a été ajoutée manuellement sur le poste de Cindy. Une base de développement neuve peut donc afficher un catalogue vide.

Le dépôt a été inspecté pour cette passation. Le résultat complet de `npm test` et la couverture actuelle sont à relever sur un poste avec MongoDB. Voir [AGENTS.md](AGENTS.md) pour les commandes.
