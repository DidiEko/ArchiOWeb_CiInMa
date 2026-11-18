import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import { authenticateToken } from './middlewares/authenticate.js';

const port = process.env.PORT ?? 3000;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquante.');
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connexion à MongoDB réussie.');

  const httpServer = createServer(app);
  const io = new Server(httpServer);

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

  httpServer.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });
} catch {
  console.error('Connexion à MongoDB impossible. Vérifie la configuration.');
  process.exit(1);
}