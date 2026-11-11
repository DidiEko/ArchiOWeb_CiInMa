import { Router } from 'express';
import mongoose from 'mongoose';
import authenticate from '../middlewares/authenticate.js';
import Game from '../models/Game.js';
import MiniGame from '../models/MiniGame.js';

const router = Router();

router.post('/', authenticate, async (req, res) => {
    const { miniGameIds } = req.body ?? {};

    if (
        !Array.isArray(miniGameIds) ||
        miniGameIds.length < 1 ||
        miniGameIds.length > 3 ||
        !miniGameIds.every((id) => mongoose.isObjectIdOrHexString(id))
    ) {
        return res.status(400).json({
            message: 'Fournis entre 1 et 3 identifiants de mini-jeux valides.'
        });
    }

    const ids = miniGameIds.map((id) => id.toLowerCase());

    if (new Set(ids).size !== ids.length) {
        return res.status(400).json({
            message: 'Un mini-jeu ne peut être sélectionné qu’une fois.'
        });
    }

    try {
        const count = await MiniGame.countDocuments({
            _id: { $in: ids },
            archivedAt: null
        });

        if (count !== ids.length) {
            return res.status(404).json({
                message: 'Au moins un des mini-jeux sélectionnés est introuvable.'
            });
        }

        const game = await Game.create({
            createdBy: req.user._id,
            players: [req.user._id],
            miniGames: ids
        });

        return res.status(201).json({
            id: game.id,
            createdBy: game.createdBy,
            players: game.players,
            miniGames: game.miniGames,
            status: game.status
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible de créer la partie.'
        });
    }
});

router.post('/:id/join', authenticate, async (req, res) => {
    const { id } = req.params;
    const playerId = req.user._id;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: 'Identifiant de partie invalide.'
        });
    }

    try {
        const game = await Game.findOneAndUpdate(
            {
                _id: id,
                status: 'waiting',
                players: { $ne: playerId },
                'players.3': { $exists: false }
            },
            { $addToSet: { players: playerId } },
            { returnDocument: 'after' }
        );

        if (!game) {
            if (!(await Game.exists({ _id: id }))) {
                return res.status(404).json({
                    message: 'Partie introuvable.'
                });
            }

            return res.status(409).json({
                message: 'Le salon est fermé ou complet, ou tu en fais déjà partie.'
            });
        }

        return res.json({
            id: game.id,
            createdBy: game.createdBy,
            players: game.players,
            miniGames: game.miniGames,
            status: game.status
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible de rejoindre la partie.'
        });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: 'Identifiant de partie invalide.'
        });
    }

    try {
        const game = await Game.findById(id);

        if (!game) {
            return res.status(404).json({
                message: 'Partie introuvable.'
            });
        }

        return res.json({
            id: game.id,
            createdBy: game.createdBy,
            players: game.players,
            miniGames: game.miniGames,
            status: game.status
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible de récupérer la partie.'
        });
    }
});

router.get('/', authenticate, async (req, res) => {
    const {
        page = '1',
        limit = '20',
        status,
        miniGameId
    } = req.query;

    if (
        typeof page !== 'string' || !/^[1-9]\d*$/.test(page) ||
        typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit)
    ) {
        return res.status(400).json({
            message: 'page et limit doivent être des entiers positifs.'
        });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const offset = (pageNumber - 1) * pageSize;

    if (!Number.isSafeInteger(pageNumber) || !Number.isSafeInteger(offset) || pageSize > 50) {
        return res.status(400).json({
            message: 'La pagination est invalide. La limite maximale est de 50.'
        });
    }

    const filter = {};

    if (status !== undefined) {
        if (!['waiting', 'in_progress', 'finished'].includes(status)) {
            return res.status(400).json({ message: 'Statut de partie invalide.' });
        }

        filter.status = status;
    }

    if (miniGameId !== undefined) {
        if (!mongoose.isObjectIdOrHexString(miniGameId)) {
            return res.status(400).json({ message: 'Identifiant de mini-jeu invalide.' });
        }

        filter.miniGames = miniGameId;
    }

    try {
        const [games, total] = await Promise.all([
            Game.find(filter).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(pageSize),
            Game.countDocuments(filter)
        ]);

        return res.json({
            items: games.map((game) => ({
                id: game.id,
                createdBy: game.createdBy,
                players: game.players,
                miniGames: game.miniGames,
                status: game.status
            })),
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible de récupérer les parties.'
        });
    }
});

router.post('/:id/start', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: 'Identifiant de partie invalide.'
        });
    }

    try {
        const game = await Game.findOneAndUpdate(
            {
                _id: id,
                createdBy: req.user._id,
                status: 'waiting',
                'players.1': { $exists: true }
            },
            { $set: { status: 'in_progress' } },
            { returnDocument: 'after' }
        );

        if (game) {
            return res.json({
                id: game.id,
                createdBy: game.createdBy,
                players: game.players,
                miniGames: game.miniGames,
                status: game.status
            });
        }

        const existing = await Game.findById(id).select('createdBy');

        if (!existing) {
            return res.status(404).json({ message: 'Partie introuvable.' });
        }

        if (!existing.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                message: 'Seul le créateur peut démarrer la partie.'
            });
        }

        return res.status(409).json({
            message: 'Le salon doit être en attente et compter au moins deux joueurs.'
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible de démarrer la partie.'
        });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: 'Identifiant de partie invalide.'
        });
    }

    try {
        const deletedGame = await Game.findOneAndDelete({
            _id: id,
            createdBy: req.user._id,
            status: 'waiting'
        });

        if (deletedGame) {
            return res.status(204).end();
        }

        const game = await Game.findById(id).select('createdBy');

        if (!game) {
            return res.status(404).json({ message: 'Partie introuvable.' });
        }

        if (!game.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                message: 'Seul le créateur peut annuler le salon.'
            });
        }

        return res.status(409).json({
            message: 'Seul un salon en attente peut être annulé.'
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible d’annuler le salon.'
        });
    }
});

router.post('/:id/results', authenticate, async (req, res) => {
    const { id } = req.params;
    const { miniGameId, scores } = req.body ?? {};

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({ message: 'Identifiant de partie invalide.' });
    }

    if (
        typeof miniGameId !== 'string' ||
        !mongoose.isObjectIdOrHexString(miniGameId) ||
        !Array.isArray(scores) ||
        scores.length < 2 ||
        scores.length > 4 ||
        !scores.every((score) =>
            typeof score?.playerId === 'string' &&
            mongoose.isObjectIdOrHexString(score.playerId) &&
            Number.isSafeInteger(score.points) &&
            score.points >= 0
        )
    ) {
        return res.status(400).json({
            message: 'Fournis un mini-jeu valide et des scores entiers positifs ou nuls.'
        });
    }

    try {
        const game = await Game.findById(id);

        if (!game) {
            return res.status(404).json({ message: 'Partie introuvable.' });
        }

        if (!game.createdBy.equals(req.user._id)) {
            return res.status(403).json({
                message: 'Seul le créateur peut enregistrer les résultats.'
            });
        }

        const roundIndex = game.results.length;
        const expectedMiniGame = game.miniGames[roundIndex];

        if (game.status !== 'in_progress' || !expectedMiniGame?.equals(miniGameId)) {
            return res.status(409).json({
                message: 'Seul le résultat de la prochaine manche peut être enregistré.'
            });
        }

        const submittedPlayers = new Set(
            scores.map(({ playerId }) => playerId.toLowerCase())
        );

        if (
            scores.length !== game.players.length ||
            submittedPlayers.size !== scores.length ||
            !game.players.every((playerId) => submittedPlayers.has(playerId.toString()))
        ) {
            return res.status(400).json({
                message: 'Fournis exactement un score pour chaque joueur de la partie.'
            });
        }

        const isLastRound = roundIndex === game.miniGames.length - 1;

        const updatedGame = await Game.findOneAndUpdate(
            {
                _id: id,
                status: 'in_progress',
                'results.miniGame': { $ne: expectedMiniGame }
            },
            {
                $push: {
                    results: {
                        miniGame: expectedMiniGame,
                        scores: scores.map(({ playerId, points }) => ({
                            player: playerId,
                            points
                        }))
                    }
                },
                $set: { status: isLastRound ? 'finished' : 'in_progress' }
            },
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedGame) {
            return res.status(409).json({
                message: 'Le résultat de cette manche a déjà été enregistré.'
            });
        }

        return res.status(201).json({
            id: updatedGame.id,
            status: updatedGame.status,
            results: updatedGame.results
        });
    } catch {
        return res.status(500).json({
            message: 'Impossible d’enregistrer les résultats.'
        });
    }
});

router.get('/:id/leaderboard', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({ message: 'Identifiant de partie invalide.' });
    }

    try {
        const game = await Game.findById(id)
            .select('status players miniGames results');

        if (!game) {
            return res.status(404).json({ message: 'Partie introuvable.' });
        }

        if (
            game.status !== 'finished' ||
            game.results.length === 0 ||
            game.results.length !== game.miniGames.length
        ) {
            return res.status(409).json({
                message: 'Le classement est disponible après la dernière manche.'
            });
        }

        const totals = new Map(
            game.players.map((playerId) => [playerId.toString(), 0n])
        );

        for (const round of game.results) {
            for (const { player, points } of round.scores) {
                const playerId = player.toString();
                totals.set(playerId, totals.get(playerId) + BigInt(points));
            }
        }

        const sorted = [...totals.entries()].sort(([, a], [, b]) => {
            if (a === b) return 0;
            return a > b ? -1 : 1;
        });

        let rank = 0;
        const leaderboard = sorted.map(([playerId, totalPoints], index) => {
            if (index === 0 || totalPoints !== sorted[index - 1][1]) {
                rank = index + 1;
            }

            return { rank, playerId, totalPoints: totalPoints.toString() };
        });

        return res.json({ id: game.id, leaderboard });
    } catch {
        return res.status(500).json({
            message: 'Impossible de récupérer le classement.'
        });
    }
});

export default router;