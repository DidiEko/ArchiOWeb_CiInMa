import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Game from '../models/Game.js';
import MiniGame from '../models/MiniGame.js';
import User from '../models/User.js';

let player;
let miniGame;
let token;

before(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/archioweb_ciinma_test');
    process.env.JWT_SECRET = randomUUID();

    player = await User.create({
        username: 'JoueurSalon',
        email: `salon-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test',
        role: 'player'
    });

    miniGame = await MiniGame.create({
        name: 'Conquête de couleurs',
        slug: `jeu-test-${randomUUID()}`,
        description: 'Peins le plus de surface possible.'
    });

    token = jwt.sign({}, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        subject: player.id,
        expiresIn: '5m'
    });
});

after(async () => {
    try {
        if (player) {
            await Game.deleteMany({ createdBy: player._id });
            await User.deleteOne({ _id: player._id });
        }

        if (miniGame) {
            await MiniGame.deleteOne({ _id: miniGame._id });
        }
    } finally {
        await mongoose.disconnect();
    }
});

test('POST /games crée un salon avec son créateur comme seul joueur', async () => {
    const response = await request(app)
        .post('/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ miniGameIds: [miniGame.id] })
        .expect(201);

    const game = await Game.findById(response.body.id);
    assert.ok(game, 'Le salon doit être enregistré dans MongoDB');
    assert.equal(game.status, 'waiting');
    assert.equal(game.createdBy.toString(), player.id);
    assert.deepEqual(game.players.map(String), [player.id]);
    assert.deepEqual(game.miniGames.map(String), [miniGame.id]);
});

test('POST /games refuse un mini-jeu introuvable', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();

    await request(app)
        .post('/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ miniGameIds: [missingId] })
        .expect(404);
});

test('POST /games refuse un mini-jeu sélectionné deux fois', async () => {
    await request(app)
        .post('/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ miniGameIds: [miniGame.id, miniGame.id] })
        .expect(400);
});

test('POST /games/:id/join ajoute un deuxième joueur au salon', async (t) => {
    const secondPlayer = await User.create({
        username: 'DeuxiemeJoueur',
        email: `joueur-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test',
        role: 'player'
    });

    t.after(async () => {
        await User.deleteOne({ _id: secondPlayer._id });
    });

    const secondToken = jwt.sign({}, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        subject: secondPlayer.id,
        expiresIn: '5m'
    });

    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    const response = await request(app)
        .post(`/games/${game.id}/join`)
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);

    assert.deepEqual(response.body.players, [player.id, secondPlayer.id]);
});

test('POST /games/:id/join refuse un joueur déjà dans le salon', async () => {
    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    await request(app)
        .post(`/games/${game.id}/join`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

    const savedGame = await Game.findById(game.id);
    assert.deepEqual(savedGame.players.map(String), [player.id]);
});

test('GET /games/:id renvoie le salon demandé', async () => {
    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    const response = await request(app)
        .get(`/games/${game.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.deepEqual(response.body, {
        id: game.id,
        createdBy: player.id,
        players: [player.id],
        miniGames: [miniGame.id],
        status: 'waiting'
    });
});

test('GET /games/:id renvoie 404 si la partie est absente', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();

    await request(app)
        .get(`/games/${missingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
});

test('GET /games filtre les parties et renvoie la page demandée', async () => {
    const gameData = {
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    };

    const older = await Game.create({
        ...gameData,
        status: 'finished',
        createdAt: new Date('2026-01-01T10:00:00Z')
    });

    await Game.create({
        ...gameData,
        status: 'finished',
        createdAt: new Date('2026-01-01T11:00:00Z')
    });

    await Game.create({ ...gameData, status: 'waiting' });

    const { body } = await request(app)
        .get('/games')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'finished', miniGameId: miniGame.id, page: 2, limit: 1 })
        .expect(200);

    assert.deepEqual(body.items.map((game) => game.id), [older.id]);
    assert.equal(body.page, 2);
    assert.equal(body.limit, 1);
    assert.equal(body.total, 2);
    assert.equal(body.totalPages, 2);
});

test('GET /games refuse une page égale à zéro', async () => {
    await request(app)
        .get('/games?page=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
});

test('POST /games/:id/start permet au créateur de démarrer à deux', async (t) => {
    const guest = await User.create({
        username: 'JoueurInvite',
        email: `invite-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test'
    });

    const game = await Game.create({
        createdBy: player._id,
        players: [player._id, guest._id],
        miniGames: [miniGame._id]
    });

    t.after(async () => {
        await Game.deleteOne({ _id: game._id });
        await User.deleteOne({ _id: guest._id });
    });

    const { body } = await request(app)
        .post(`/games/${game.id}/start`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.equal(body.status, 'in_progress');
    const savedGame = await Game.findById(game.id);
    assert.equal(savedGame.status, 'in_progress');
});

test('DELETE /games/:id permet au créateur d’annuler un salon en attente', async () => {
    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    await request(app)
        .delete(`/games/${game.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

    assert.equal(await Game.findById(game.id), null);
});

test('DELETE /games/:id refuse l’annulation par un autre joueur', async (t) => {
    const otherPlayer = await User.create({
        username: 'AutreJoueur',
        email: `autre-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test'
    });

    t.after(async () => {
        await User.deleteOne({ _id: otherPlayer._id });
    });

    const otherToken = jwt.sign({}, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        subject: otherPlayer.id,
        expiresIn: '5m'
    });

    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    await request(app)
        .delete(`/games/${game.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

    assert.ok(await Game.exists({ _id: game.id }));
});

test('POST /games/:id/start refuse un salon avec un seul joueur', async () => {
    const game = await Game.create({
        createdBy: player._id,
        players: [player._id],
        miniGames: [miniGame._id]
    });

    await request(app)
        .post(`/games/${game.id}/start`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

    const savedGame = await Game.findById(game.id);
    assert.equal(savedGame.status, 'waiting');
});

test('POST /games/:id/results enregistre la dernière manche une seule fois', async (t) => {
    const guest = await User.create({
        username: 'JoueurResultat',
        email: `resultat-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test'
    });

    t.after(async () => {
        await User.deleteOne({ _id: guest._id });
    });

    const game = await Game.create({
        createdBy: player._id,
        players: [player._id, guest._id],
        miniGames: [miniGame._id],
        status: 'in_progress'
    });

    const payload = {
        miniGameId: miniGame.id,
        scores: [
            { playerId: player.id, points: 42 },
            { playerId: guest.id, points: 31 }
        ]
    };

    const { body } = await request(app)
        .post(`/games/${game.id}/results`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

    assert.equal(body.status, 'finished');

    await request(app)
        .post(`/games/${game.id}/results`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(409);

    const saved = await Game.findById(game.id);
    assert.equal(saved.status, 'finished');
    assert.equal(saved.results.length, 1);
    assert.deepEqual(
        saved.results[0].scores.map(({ points }) => points),
        [42, 31]
    );
    const leaderboardResponse = await request(app)
        .get(`/games/${game.id}/leaderboard`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.deepEqual(leaderboardResponse.body, {
        id: game.id,
        leaderboard: [
            { rank: 1, playerId: player.id, totalPoints: '42' },
            { rank: 2, playerId: guest.id, totalPoints: '31' }
        ]
    });
});