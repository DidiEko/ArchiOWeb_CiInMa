import mongoose from 'mongoose';
import MiniGame from '../models/MiniGame.js';

// Mini-jeux de départ pour une base de développement neuve.
// Le script est relançable : un mini-jeu déjà présent n'est pas modifié.
const SEED_MINI_GAMES = [
  {
    name: 'Conquête de couleurs',
    slug: 'conquete-de-couleurs',
    description: 'Chaque appui peint une zone. Le joueur qui contrôle le plus de surface à la fin du chrono gagne la manche.'
  }
];

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est manquante. Vérifie ton fichier .env.');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.DATABASE_URL);

  for (const miniGame of SEED_MINI_GAMES) {
    const alreadyExists = await MiniGame.exists({ slug: miniGame.slug });

    if (alreadyExists) {
      console.log(`Mini-jeu déjà présent : ${miniGame.name}`);
    } else {
      await MiniGame.create(miniGame);
      console.log(`Mini-jeu créé : ${miniGame.name}`);
    }
  }
} catch (error) {
  console.error('Seed impossible :', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}