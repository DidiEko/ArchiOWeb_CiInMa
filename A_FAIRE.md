# ArchiOWeb_CiInMa — Actions restantes

Point de départ vérifié le 11 novembre 2026. Lisez [AGENTS.md](AGENTS.md) pour l’installation et le workflow Git, puis [ETAT_DU_PROJET.md](ETAT_DU_PROJET.md) pour les routes disponibles. Chaque ligne peut devenir une issue. Le groupe attribue les responsables et fait un commit après chaque étape fonctionnelle et testée.

## P0 — Mettre le groupe en route

| ID | Action | Critère de validation |
| --- | --- | --- |
| P0.1 | Récupérer `main`, démarrer MongoDB, installer les dépendances et lancer l’API et les tests sur chaque poste. | Chaque membre peut ouvrir l’API locale et exécuter la suite. Les éventuels écarts de configuration sont consignés. |
| P0.2 | Ajouter un `.env.example` avec des valeurs d’exemple et un seed de développement réexécutable pour Conquête de couleurs. Documenter comment préparer deux comptes joueur et, si nécessaire, un admin local. | Deux collègues repartent d’une base neuve, trouvent le même mini-jeu dans le catalogue et peuvent créer un salon. |
| P0.3 | Comparer ces fichiers aux consignes officielles et répartir les issues. | Échéances, critères de couverture, opérations CRUD attendues, livrables par cours et format de rendu sont confirmés et documentés. |

## P1 — Synchroniser le salon en temps réel

**Prochaine tâche de développement — P1.1.** Partez de `main` avec une branche `feature/lobby-realtime`.

| ID | Action | Critère de validation |
| --- | --- | --- |
| P1.1 | Brancher Socket.IO, option de travail proposée, sur le serveur HTTP démarré dans `server.js`. Authentifier la connexion avec le JWT, vérifier l’appartenance à la partie et synchroniser la liste du salon après un `POST /games/:id/join` réussi. Réutiliser la logique REST existante. | Deux sessions avec deux comptes distincts. Quand la deuxième rejoint via REST, la première voit les deux joueurs sans actualiser. Une session extérieure ne reçoit pas les mises à jour de ce salon. Les tests REST passent. |
| P1.2 | Diffuser le démarrage après `POST /games/:id/start`. Relier les écrans au statut renvoyé. | Le créateur lance avec deux joueurs, les deux écrans changent d’état, et le serveur continue d’appliquer les droits actuels. |
| P1.3 | Définir et tester l’état initial, la reconnexion et la déconnexion. Documenter les événements et leur contenu. | Après une reconnexion, le joueur retrouve l’état courant. Le groupe a une règle explicite sur les places et le chrono quand un joueur se déconnecte. |

## P2 — Jouer à Conquête de couleurs de bout en bout

| ID | Action | Critère de validation |
| --- | --- | --- |
| P2.1 | Fixer les règles de la première manche. Définir la taille de la grille, la zone peinte par appui, la durée, l’attribution des couleurs et la lisibilité des joueurs. | Les règles tiennent dans l’issue et deux personnes calculent le même gagnant à partir d’une grille donnée. |
| P2.2 | Construire l’écran de jeu et l’état de manche côté serveur. Synchroniser le chrono et les actions validées. Le serveur connaît la partie, la manche, le joueur et les cellules modifiées. | Les deux écrans affichent le même plateau et la même fin de manche. Les actions hors grille, hors manche ou d’une personne extérieure sont refusées. |
| P2.3 | Calculer le score depuis le plateau serveur, enregistrer la manche une seule fois et afficher le classement sur les deux écrans. Adapter la soumission actuelle des scores pour que le résultat officiel provienne du serveur. | Deux joueurs créent un salon, le rejoignent, jouent une manche et voient le même classement. Le résultat persiste après actualisation et une double finalisation ne le duplique pas. |

## P3 — Compléter le tournoi et les écrans

| ID | Action | Critère de validation |
| --- | --- | --- |
| P3.1 | Valider le barème de tournoi, les égalités, l’ordre des manches et le troisième mini-jeu. La fiche propose N à 1 point par manche. L’API actuelle additionne les points reçus. | Les mesures brutes de chaque jeu et les points du tournoi sont définis, y compris les cas d’égalité. Les exemples de score sont testables. |
| P3.2 | Ajouter Réflexes colorés, puis le troisième mini-jeu retenu. Relier l’enchaînement des manches et afficher le classement provisoire entre elles. | Les mêmes participants parcourent le tournoi complet, dans l’ordre prévu, jusqu’au classement final. |
| P3.3 | Compléter le parcours mobile. Prévoir connexion, accès au salon, attente, lancement, jeu, résultats et historique selon le périmètre validé. Prévoir des repères visuels en complément des couleurs. | Le groupe peut reproduire le parcours de démonstration sur les appareils retenus. |
| P3.4 | Définir les paramètres configurables des mini-jeux et les figer par partie si le scénario validé le demande. | L’historique peut expliquer les règles appliquées à une ancienne manche après une modification du catalogue. |

## P4 — Compléter le périmètre REST et préparer le rendu

| ID | Action | Critère de validation |
| --- | --- | --- |
| P4.1 | Ajouter le filtre par participant à l’historique et décider qui peut voir quelles parties. Vérifier avec le brief si la modification du profil et des paramètres d’un salon en attente doit être ajoutée. | Les filtres se combinent avec la pagination. Le périmètre CRUD est justifié et les nouvelles écritures éventuelles sont protégées et testées. |
| P4.2 | Construire le classement général via une pipeline MongoDB sur les parties terminées. Valider les statistiques, le traitement des égalités et le chemin HTTP avec le groupe. | Sur un jeu de données connu, les statistiques par joueur correspondent aux résultats attendus. Les salons en attente ou en cours sont exclus du calcul. |
| P4.3 | Compléter les tests REST et temps réel. Prioriser les permissions, les salons pleins, les accès concurrents, les mini-jeux archivés, les manches multiples et les égalités. Mesurer la couverture finale selon le brief. | La suite est reproductible. Le groupe peut présenter les résultats de tests et la couverture exigée. |
| P4.4 | Rédiger la documentation API et temps réel. Décrire routes, droits, paramètres, en-têtes, requêtes, réponses, codes HTTP, événements et scénario de démo. | Une personne extérieure lance le projet et reproduit le scénario sans lire l’implémentation. |
| P4.5 | Préparer et vérifier le déploiement Render prévu dans la fiche de concept. Configurer la base et les secrets du service, puis tester l’API et le temps réel depuis le client. Adapter le démarrage aux variables du service si nécessaire. | Une URL de démonstration fonctionne avec deux sessions et les éléments demandés pour le rendu sont prêts. |

## Répartition possible

| Lot | Peut commencer avec |
| --- | --- |
| Salon et temps réel | P1.1 sur une branche issue de `main`. |
| Jeu et interface | Règles de P2.1 et premier écran de grille. Convenir du contrat des événements avec le lot salon avant de relier les deux. |
| Installation, qualité et documentation | P0.2, vérification du brief et documentation des routes existantes. |
| Classement général et historique | Définir la visibilité et les métriques avec le groupe, puis convenir des fichiers et contrats à modifier pour éviter les conflits avec le lot salon. |

Une issue passe à « terminé » après validation de son scénario, commit, relecture et fusion de la PR. Mettez ensuite à jour [ETAT_DU_PROJET.md](ETAT_DU_PROJET.md) et marquez la tâche comme terminée ici.
