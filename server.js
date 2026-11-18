import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import { authenticateToken } from './middlewares/authenticate.js';
import Game from './models/Game.js';

const port = process.env.PORT ?? 3000;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquante.');
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connexion à MongoDB réussie.');

  const httpServer = createServer(app);
  const io = new Server(httpServer);
  app.set('io', io);

  io.use(async (socket, next) => {
    const { user, message } = await authenticateToken(
      socket.handshake.auth.token
    );

    if (!user) {
      return next(new Error(message));
    }

    socket.data.userId = user.id;
    return next();
  });

  io.on('connection', (socket) => {
    socket.on('lobby:subscribe', async (gameId, reply) => {
      if (typeof reply !== 'function') return;

      if (typeof gameId !== 'string' || !mongoose.isObjectIdOrHexString(gameId)) {
        return reply({ ok: false, message: 'Identifiant de partie invalide.' });
      }

      try {
        const game = await Game.exists({
          _id: gameId,
          players: socket.data.userId
        });

        if (!game) {
          return reply({ ok: false, message: 'Tu ne fais pas partie de ce salon.' });
        }

        await socket.join(`game:${game._id}`);
        return reply({ ok: true });
      } catch {
        return reply({ ok: false, message: 'Impossible de s’abonner au salon.' });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });
} catch {
  console.error('Connexion à MongoDB impossible. Vérifie la configuration.');
  process.exit(1);
}