import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyTap,
    createRound,
    resolveBoardSize,
    ROUND_DURATION_MS
} from '../game/conquest.js';

// Heure fixe pour que les tests donnent toujours le même résultat.
const NOW = 1_000_000;
const ALICE = 'alice';
const BOB = 'bob';

function createTestRound(size = 'medium') {
    return createRound({ playerIds: [ALICE, BOB], size, now: NOW });
}

// Taille du plateau

test('resolveBoardSize accepte les trois tailles proposées', () => {
    assert.deepEqual(resolveBoardSize('small'), { width: 8, height: 10 });
    assert.deepEqual(resolveBoardSize('medium'), { width: 10, height: 14 });
    assert.deepEqual(resolveBoardSize('large'), { width: 14, height: 20 });
});

test('resolveBoardSize accepte une taille personnalisée', () => {
    assert.deepEqual(resolveBoardSize({ width: 12, height: 6 }), {
        width: 12,
        height: 6
    });
});

test('resolveBoardSize refuse un plateau trop petit', () => {
    assert.equal(resolveBoardSize({ width: 5, height: 10 }), null);
});

test('resolveBoardSize refuse un plateau trop grand', () => {
    assert.equal(resolveBoardSize({ width: 10, height: 21 }), null);
});

test('resolveBoardSize refuse une taille mal formée', () => {
    assert.equal(resolveBoardSize('huge'), null);
    assert.equal(resolveBoardSize({ width: 10.5, height: 10 }), null);
    assert.equal(resolveBoardSize({ width: '10', height: 10 }), null);
    assert.equal(resolveBoardSize(null), null);
});

// Création de la manche

test('createRound crée une grille vide à la bonne taille', () => {
    const round = createTestRound('small');

    assert.equal(round.width, 8);
    assert.equal(round.height, 10);
    assert.equal(round.grid.length, 10);
    assert.ok(round.grid.every((row) => row.length === 8));
    assert.ok(round.grid.flat().every((cell) => cell === null));
});

test('createRound attribue une couleur par joueur dans l’ordre d’arrivée', () => {
    const round = createTestRound();

    assert.deepEqual(round.colors, {
        [ALICE]: '#E69F00',
        [BOB]: '#56B4E9'
    });
});

test('createRound fixe la fin de la manche après la durée prévue', () => {
    const round = createTestRound();

    assert.equal(round.startsAt, NOW);
    assert.equal(round.endsAt, NOW + ROUND_DURATION_MS);
});

test('createRound refuse un nombre de joueurs invalide', () => {
    assert.throws(() => createRound({ playerIds: [ALICE] }));
    assert.throws(() => createRound({ playerIds: ['a', 'b', 'c', 'd', 'e'] }));
    assert.throws(() => createRound({ playerIds: [ALICE, ALICE] }));
});

test('createRound refuse une taille de plateau invalide', () => {
    assert.throws(() =>
        createRound({ playerIds: [ALICE, BOB], size: { width: 3, height: 50 } })
    );
});

// Appuis

test('applyTap peint une croix de 5 cases au milieu de la grille', () => {
    const round = createTestRound();

    const result = applyTap(round, ALICE, { x: 4, y: 4 }, NOW + 1000);

    assert.equal(result.ok, true);
    assert.equal(result.changedCells.length, 5);
    assert.equal(round.grid[4][4], ALICE);
    assert.equal(round.grid[4][5], ALICE);
    assert.equal(round.grid[4][3], ALICE);
    assert.equal(round.grid[5][4], ALICE);
    assert.equal(round.grid[3][4], ALICE);
});

test('applyTap ne peint que les cases dans la grille au bord', () => {
    const round = createTestRound();

    const result = applyTap(round, ALICE, { x: 0, y: 0 }, NOW + 1000);

    assert.deepEqual(result.changedCells, [
        { x: 0, y: 0, playerId: ALICE },
        { x: 1, y: 0, playerId: ALICE },
        { x: 0, y: 1, playerId: ALICE }
    ]);
});

test('applyTap repeint les cases d’un adversaire', () => {
    const round = createTestRound();
    applyTap(round, ALICE, { x: 4, y: 4 }, NOW + 1000);

    const result = applyTap(round, BOB, { x: 4, y: 4 }, NOW + 2000);

    assert.equal(result.ok, true);
    assert.equal(result.changedCells.length, 5);
    assert.equal(round.grid[4][4], BOB);
});

test('applyTap ne renvoie aucune case si elles sont déjà au joueur', () => {
    const round = createTestRound();
    applyTap(round, ALICE, { x: 4, y: 4 }, NOW + 1000);

    const result = applyTap(round, ALICE, { x: 4, y: 4 }, NOW + 2000);

    assert.deepEqual(result, { ok: true, changedCells: [] });
});

test('applyTap refuse un joueur qui ne participe pas à la manche', () => {
    const round = createTestRound();

    const result = applyTap(round, 'intrus', { x: 4, y: 4 }, NOW + 1000);

    assert.equal(result.ok, false);
    assert.ok(round.grid.flat().every((cell) => cell === null));
});

test('applyTap refuse un appui après la fin de la manche', () => {
    const round = createTestRound();

    const result = applyTap(
        round,
        ALICE,
        { x: 4, y: 4 },
        NOW + ROUND_DURATION_MS
    );

    assert.equal(result.ok, false);
    assert.equal(round.grid[4][4], null);
});

test('applyTap refuse un appui avant le début de la manche', () => {
    const round = createTestRound();

    const result = applyTap(round, ALICE, { x: 4, y: 4 }, NOW - 1);

    assert.equal(result.ok, false);
});

test('applyTap refuse un appui hors de la grille', () => {
    const round = createTestRound();

    assert.equal(applyTap(round, ALICE, { x: 10, y: 0 }, NOW).ok, false);
    assert.equal(applyTap(round, ALICE, { x: 0, y: -1 }, NOW).ok, false);
});

test('applyTap refuse un appui mal formé', () => {
    const round = createTestRound();

    assert.equal(applyTap(round, ALICE, { x: '4', y: 4 }, NOW).ok, false);
    assert.equal(applyTap(round, ALICE, null, NOW).ok, false);
});