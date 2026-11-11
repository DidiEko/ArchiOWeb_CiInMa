import mongoose from 'mongoose';
import app from './app.js';

const port = process.env.PORT ?? 3000;

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