import express from 'express';
import mongoose from 'mongoose';

import usersRouter from './routes/users.js';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());
app.use('/users', usersRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur notre API !' });
});

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquante.');
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connexion à MongoDB réussie.');

  app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });
} catch {
  console.error('Connexion à MongoDB impossible. Vérifie la configuration.');
  process.exit(1);
}