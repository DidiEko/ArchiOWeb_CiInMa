import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const email = `joueur-${randomUUID()}@example.com`;
const duplicateEmail = `doublon-${randomUUID()}@example.com`;
const invalidEmail = `invalide-${randomUUID()}@example.com`;
const loginEmail = `connexion-${randomUUID()}@example.com`;
const loginPassword = 'MotDePasse-De-Test-2026!';

before(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/archioweb_ciinma_test');
    await User.init();
    process.env.JWT_SECRET = randomUUID();

await User.create({
  username: 'JoueurConnexion',
  email: loginEmail,
  passwordHash: await argon2.hash(loginPassword)
});
});

after(async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await User.deleteMany({
                email: { $in: [email, duplicateEmail, invalidEmail] }
            });
        }
    } finally {
        await mongoose.disconnect();
    }
});

test('POST /users crée un joueur et hache son mot de passe', async () => {
    const password = 'MotDePasse-De-Test-2026!';

    const response = await request(app)
        .post('/users')
        .send({ username: 'JoueurTest', email, password })
        .expect(201);

    assert.equal(response.body.username, 'JoueurTest');
    assert.equal(response.body.role, 'player');
    assert.equal('password' in response.body, false);
    assert.equal('passwordHash' in response.body, false);

    const user = await User.findOne({ email }).select('+passwordHash');
    assert.ok(user, 'Le compte doit être enregistré');
    assert.equal(response.body.id, user.id);
    assert.equal(await argon2.verify(user.passwordHash, password), true);
});

test('POST /users refuse un mot de passe trop court', async () => {
    await request(app)
        .post('/users')
        .send({
            username: 'JoueurTest',
            email: invalidEmail,
            password: 'court'
        })
        .expect(400);

    assert.equal(await User.findOne({ email: invalidEmail }), null);
});

test('POST /users refuse un email déjà utilisé', async () => {
    const password = 'MotDePasse-De-Test-2026!';

    await User.create({
        username: 'JoueurExistant',
        email: duplicateEmail,
        passwordHash: await argon2.hash(password)
    });

    await request(app)
        .post('/users')
        .send({ username: 'AutreJoueur', email: duplicateEmail, password })
        .expect(409);

    assert.equal(await User.countDocuments({ email: duplicateEmail }), 1);
});

test('POST /users/login renvoie un JWT avec les bons identifiants', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({ email: loginEmail, password: loginPassword })
    .expect(200);

  assert.equal(response.body.user.username, 'JoueurConnexion');
  assert.equal(typeof response.body.token, 'string');
  assert.ok(response.body.token.length > 0);
});

test('POST /users/login refuse un mauvais mot de passe', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({ email: loginEmail, password: 'MauvaisMotDePasse!' })
    .expect(401);

  assert.equal('token' in response.body, false);
});

test('GET /users/me renvoie le profil avec un JWT valide', async () => {
  const user = await User.findOne({ email: loginEmail });
  assert.ok(user, 'Le compte de test doit exister');

  const token = jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: '5m'
  });

  const response = await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body.id, user.id);
  assert.equal(response.body.username, 'JoueurConnexion');
  assert.equal('passwordHash' in response.body, false);
});

test('GET /users/me refuse une requête sans JWT', async () => {
  await request(app)
    .get('/users/me')
    .expect(401);
});

test('GET /users/me refuse un JWT invalide', async () => {
  await request(app)
    .get('/users/me')
    .set('Authorization', 'Bearer faux-token')
    .expect(401);
});