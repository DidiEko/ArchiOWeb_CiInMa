// Logique d'une manche de Conquête de couleurs, côté serveur.
// Ce fichier ne dépend ni d'Express, ni de MongoDB, ni de Socket.IO :
// il reçoit des données simples et renvoie des données simples.

// Réglages de la manche (à faire valider par le groupe).
export const BOARD_SIZES = {
    small: { width: 8, height: 10 },
    medium: { width: 10, height: 14 },
    large: { width: 14, height: 20 }
};

export const MIN_SIDE = 6;
export const MAX_SIDE = 20;
export const ROUND_DURATION_MS = 30_000;

// Couleurs bien distinctes, y compris pour les daltoniens (palette Okabe-Ito).
export const PLAYER_COLORS = ['#E69F00', '#56B4E9', '#009E73', '#CC79A7'];

// Un appui peint la case touchée et ses 4 voisines (une croix).
const PAINT_PATTERN = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
];

// Transforme le choix de taille en { width, height }.
// Accepte 'small', 'medium', 'large' ou { width, height }.
// Renvoie null si la taille n'est pas valable.
export function resolveBoardSize(size) {
    if (typeof size === 'string') {
        return BOARD_SIZES[size] ?? null;
    }

    if (typeof size !== 'object' || size === null) {
        return null;
    }

    const { width, height } = size;

    if (!isValidSide(width) || !isValidSide(height)) {
        return null;
    }

    return { width, height };
}

function isValidSide(value) {
    return Number.isInteger(value) && value >= MIN_SIDE && value <= MAX_SIDE;
}

// Crée l'état de départ d'une manche : grille vide, couleurs et chrono.
// playerIds : identifiants des joueurs, dans l'ordre d'arrivée dans le salon.
export function createRound({ playerIds, size = 'medium', now = Date.now() }) {
    if (
        !Array.isArray(playerIds) ||
        playerIds.length < 2 ||
        playerIds.length > PLAYER_COLORS.length ||
        new Set(playerIds).size !== playerIds.length
    ) {
        throw new Error('Une manche demande entre 2 et 4 joueurs différents.');
    }

    const board = resolveBoardSize(size);

    if (!board) {
        throw new Error('Taille de plateau invalide.');
    }

    // Chaque case vaut null (vide) ou l'identifiant du joueur qui l'a peinte.
    const grid = Array.from({ length: board.height }, () =>
        Array(board.width).fill(null)
    );

    const colors = {};
    playerIds.forEach((playerId, index) => {
        colors[playerId] = PLAYER_COLORS[index];
    });

    return {
        width: board.width,
        height: board.height,
        grid,
        colors,
        startsAt: now,
        endsAt: now + ROUND_DURATION_MS
    };
}

// Vérifie un appui et met à jour la grille de la manche.
// tap : { x, y }, avec x la colonne et y la ligne, à partir de 0.
// Renvoie { ok: true, changedCells } ou { ok: false, message }.
export function applyTap(round, playerId, tap, now = Date.now()) {
    if (!(playerId in round.colors)) {
        return { ok: false, message: 'Tu ne participes pas à cette manche.' };
    }

    if (now < round.startsAt || now >= round.endsAt) {
        return { ok: false, message: 'La manche n’est pas en cours.' };
    }

    if (!isInsideGrid(round, tap?.x, tap?.y)) {
        return { ok: false, message: 'Appui hors de la grille.' };
    }

    const changedCells = [];

    for (const { dx, dy } of PAINT_PATTERN) {
        const x = tap.x + dx;
        const y = tap.y + dy;

        if (isInsideGrid(round, x, y) && round.grid[y][x] !== playerId) {
            round.grid[y][x] = playerId;
            changedCells.push({ x, y, playerId });
        }
    }

    return { ok: true, changedCells };
}

function isInsideGrid(round, x, y) {
    return (
        Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 0 &&
        x < round.width &&
        y >= 0 &&
        y < round.height
    );
}