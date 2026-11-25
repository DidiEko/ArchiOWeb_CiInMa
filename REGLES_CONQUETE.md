# Conquête de couleurs — Règles et logique serveur

Étape 03 du calendrier en relais. Le code est dans [`game/conquest.js`](game/conquest.js) et les tests dans [`test/conquest.test.js`](test/conquest.test.js).

## Règles proposées (à valider par le groupe)

| Règle | Valeur | Où la changer |
| --- | --- | --- |
| Tailles de plateau | Petit 8 × 10, moyen 10 × 14 (par défaut), grand 14 × 20 | `BOARD_SIZES` |
| Taille personnalisée | Largeur et hauteur entières, de 6 à 20 cases | `MIN_SIDE`, `MAX_SIDE` |
| Durée de la manche | 30 secondes | `ROUND_DURATION_MS` |
| Joueurs | 2 à 4, tous différents | `createRound` |
| Couleurs | Une par joueur, dans l’ordre d’arrivée dans le salon. Palette Okabe-Ito, lisible par les daltoniens | `PLAYER_COLORS` |
| Zone peinte par appui | La case touchée et ses 4 voisines (croix). Au bord, seules les cases dans la grille sont peintes | `PAINT_PATTERN` |
| Appuis autorisés | Par un joueur de la manche, dans la grille, entre le début et la fin du chrono | `applyTap` |
| Cases adverses | Un appui repeint les cases des autres joueurs | `applyTap` |

À décider : qui choisit la taille du plateau et à quel moment. Proposition : le créateur, à la création du salon.

## Utilisation

```js
import { applyTap, createRound } from './game/conquest.js';

// Au lancement de la manche, avec les joueurs dans l’ordre du salon
const round = createRound({ playerIds: game.players.map(String), size: 'medium' });

// À chaque appui reçu ; playerId vient du JWT, jamais du client
const result = applyTap(round, socket.data.userId, tap);
```

`size` accepte `'small'`, `'medium'`, `'large'` ou `{ width, height }`. Pour valider un choix de taille dans une route, `resolveBoardSize(size)` renvoie `{ width, height }` ou `null`.

## Format d’un appui

Le client envoie seulement la case touchée. `x` est la colonne et `y` la ligne, en partant de 0 en haut à gauche.

```json
{ "x": 4, "y": 4 }
```

`applyTap` répond dans le même format que les réponses Socket.IO du salon :

```json
{
  "ok": true,
  "changedCells": [
    { "x": 4, "y": 4, "playerId": "6650…a1" },
    { "x": 5, "y": 4, "playerId": "6650…a1" }
  ]
}
```

```json
{ "ok": false, "message": "La manche n’est pas en cours." }
```

Seules les cases qui changent de propriétaire sont renvoyées, ce sont elles qu’il faut diffuser aux joueurs. La grille de la manche est modifiée directement.

## Exemple de grille

État renvoyé par `createRound`, sur un petit plateau de 8 × 10 et après deux appuis : A (Alice) en `{ x: 1, y: 1 }`, puis B (Bob) en `{ x: 2, y: 1 }`.

```
   x: 0 1 2 3 4 5 6 7
y 0   . A B . . . . .
y 1   A B B B . . . .
y 2   . A B . . . . .
y 3   . . . . . . . .
…
```

Dans le code, chaque case vaut `null` (vide) ou l’identifiant du joueur. La couleur se lit dans `round.colors[playerId]`.

```js
{
  width: 8,
  height: 10,
  grid: [[null, 'alice', 'bob', null, …], …],
  colors: { alice: '#E69F00', bob: '#56B4E9' },
  startsAt: 1764060000000,
  endsAt: 1764060030000
}
```

## Pour l’étape 04 (Cindy)

- Créer la manche au lancement, la garder en mémoire par `gameId`, et envoyer `round` en entier à la reconnexion pour restaurer la grille.
- Appeler `applyTap` à chaque appui et diffuser `changedCells` dans la salle `game:<id>`.
- À `round.endsAt`, déclencher la finalisation. Le calcul du score à partir de `round.grid` sera fait à l’étape 05.
