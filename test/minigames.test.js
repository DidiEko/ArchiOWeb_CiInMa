import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import MiniGame from '../models/MiniGame.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const slug = `jeu-test-${randomUUID()}`;

before(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/archioweb_ciinma_test');
    process.env.JWT_SECRET = randomUUID();
});

after(async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await MiniGame.deleteOne({ slug });
        }
    } finally {
        await mongoose.disconnect();
    }
});

test('GET /minigames renvoie un mini-jeu enregistré', async () => {
    const miniGame = await MiniGame.create({
        name: 'Conquête de couleurs',
        slug,
        description: 'Peins le plus de surface possible.'
    });

    const response = await request(app).get('/minigames').expect(200);

    const result = response.body.find((game) => game.slug === slug);

    assert.deepEqual(result, {
        id: miniGame.id,
        name: miniGame.name,
        slug,
        description: miniGame.description
    });
});

test('GET /minigames/:id renvoie le mini-jeu demandé', async (t) => {
    const miniGame = await MiniGame.create({
        name: 'Réflexes colorés',
        slug: `${slug}-detail`,
        description: 'Touche la bonne couleur.'
    });

    t.after(async () => {
        await MiniGame.deleteOne({ _id: miniGame.id });
    });

    const response = await request(app)
        .get(`/minigames/${miniGame.id}`)
        .expect(200);

    assert.deepEqual(response.body, {
        id: miniGame.id,
        name: miniGame.name,
        slug: miniGame.slug,
        description: miniGame.description
    });
});

test('GET /minigames/:id refuse un identifiant mal formé', async () => {
    await request(app).get('/minigames/abc').expect(400);
});

test('GET /minigames/:id renvoie 404 si le jeu est absent', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();

    await request(app).get(`/minigames/${missingId}`).expect(404);
});

async function createTokenForRole(t, role) {
    const user = await User.create({
        username: `Test ${role}`,
        email: `${role}-${randomUUID()}@example.com`,
        passwordHash: 'non-utilise-dans-ce-test',
        role
    });

    t.after(async () => {
        await User.deleteOne({ _id: user.id });
    });

    return jwt.sign({}, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        subject: user.id,
        expiresIn: '5m'
    });
}

test('POST /minigames refuse la création à un joueur connecté', async (t) => {
    const token = await createTokenForRole(t, 'player');
    const gameSlug = `jeu-test-${randomUUID()}`;

    t.after(async () => {
        await MiniGame.deleteOne({ slug: gameSlug });
    });

    await request(app)
        .post('/minigames')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Réflexes colorés',
            slug: gameSlug,
            description: 'Touche le mot écrit dans la bonne couleur.'
        })
        .expect(403);

    assert.equal(await MiniGame.findOne({ slug: gameSlug }), null);
});

test('POST /minigames permet à un administrateur de créer un jeu', async (t) => {
    const token = await createTokenForRole(t, 'admin');
    const gameSlug = `jeu-test-${randomUUID()}`;

    t.after(async () => {
        await MiniGame.deleteOne({ slug: gameSlug });
    });

    const response = await request(app)
        .post('/minigames')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Réflexes colorés',
            slug: gameSlug,
            description: 'Touche le mot écrit dans la bonne couleur.'
        })
        .expect(201);

    const miniGame = await MiniGame.findOne({ slug: gameSlug });
    assert.ok(miniGame, 'Le mini-jeu doit être enregistré');
    assert.equal(response.body.id, miniGame.id);
    assert.equal(response.headers.location, `/minigames/${miniGame.id}`);
});

test('PATCH /minigames/:id modifie uniquement le champ envoyé', async (t) => {
  const token = await createTokenForRole(t, 'admin');
  const miniGame = await MiniGame.create({
    name: 'Réflexes colorés',
    slug: `jeu-test-${randomUUID()}`,
    description: 'Description initiale.'
  });

  t.after(async () => {
    await MiniGame.deleteOne({ _id: miniGame.id });
  });

  const response = await request(app)
    .patch(`/minigames/${miniGame.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ description: 'Touche le mot écrit dans la bonne couleur.' })
    .expect(200);

  const updated = await MiniGame.findById(miniGame.id);
  assert.ok(updated);
  assert.equal(updated.description, 'Touche le mot écrit dans la bonne couleur.');
  assert.equal(updated.name, miniGame.name);
  assert.equal(updated.slug, miniGame.slug);
  assert.equal(response.body.description, updated.description);
});

test('DELETE /minigames/:id supprime le jeu pour un administrateur', async (t) => {
  const token = await createTokenForRole(t, 'admin');
  const miniGame = await MiniGame.create({
    name: 'Réflexes colorés',
    slug: `jeu-test-${randomUUID()}`,
    description: 'Touche le mot écrit dans la bonne couleur.'
  });

  t.after(async () => {
    await MiniGame.deleteOne({ _id: miniGame.id });
  });

  await request(app)
    .delete(`/minigames/${miniGame.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  assert.equal(await MiniGame.findById(miniGame.id), null);
});