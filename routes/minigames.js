import { Router } from 'express';
import MiniGame from '../models/MiniGame.js';
import mongoose from 'mongoose';
import authenticate from '../middlewares/authenticate.js';
import requireAdmin from '../middlewares/requireAdmin.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const miniGames = await MiniGame.find()
      .select('name slug description')
      .sort({ name: 1 });

    return res.json(miniGames.map((miniGame) => ({
      id: miniGame.id,
      name: miniGame.name,
      slug: miniGame.slug,
      description: miniGame.description
    })));
  } catch {
    return res.status(500).json({
      message: 'Impossible de récupérer les mini-jeux.'
    });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      message: 'Identifiant de mini-jeu invalide.'
    });
  }

  try {
    const miniGame = await MiniGame.findById(id)
      .select('name slug description');

    if (!miniGame) {
      return res.status(404).json({
        message: 'Mini-jeu introuvable.'
      });
    }

    return res.json({
      id: miniGame.id,
      name: miniGame.name,
      slug: miniGame.slug,
      description: miniGame.description
    });
  } catch {
    return res.status(500).json({
      message: 'Impossible de récupérer le mini-jeu.'
    });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, slug, description } = req.body ?? {};

  if (
    typeof name !== 'string' ||
    typeof slug !== 'string' ||
    typeof description !== 'string'
  ) {
    return res.status(400).json({
      message: 'Le nom, le slug et la description sont obligatoires.'
    });
  }

  try {
    const miniGame = await MiniGame.create({ name, slug, description });

    return res.status(201).location(`/minigames/${miniGame.id}`).json({
      id: miniGame.id,
      name: miniGame.name,
      slug: miniGame.slug,
      description: miniGame.description
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Ce slug est déjà utilisé.'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Le nom, le slug ou la description est invalide.'
      });
    }

    return res.status(500).json({
      message: 'Impossible de créer le mini-jeu.'
    });
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      message: 'Identifiant de mini-jeu invalide.'
    });
  }

  const { name, slug, description } = req.body ?? {};
  const updates = Object.fromEntries(
    Object.entries({ name, slug, description })
      .filter(([, value]) => value !== undefined)
  );

  if (
    Object.keys(updates).length === 0 ||
    Object.values(updates).some((value) => typeof value !== 'string')
  ) {
    return res.status(400).json({
      message: 'Fournis au moins un champ valide : nom, slug ou description.'
    });
  }

  try {
    const miniGame = await MiniGame.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!miniGame) {
      return res.status(404).json({
        message: 'Mini-jeu introuvable.'
      });
    }

    return res.json({
      id: miniGame.id,
      name: miniGame.name,
      slug: miniGame.slug,
      description: miniGame.description
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Ce slug est déjà utilisé.'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Le nom, le slug ou la description est invalide.'
      });
    }

    return res.status(500).json({
      message: 'Impossible de modifier le mini-jeu.'
    });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      message: 'Identifiant de mini-jeu invalide.'
    });
  }

  try {
    const miniGame = await MiniGame.findByIdAndDelete(id);

    if (!miniGame) {
      return res.status(404).json({
        message: 'Mini-jeu introuvable.'
      });
    }

    return res.status(204).end();
  } catch {
    return res.status(500).json({
      message: 'Impossible de supprimer le mini-jeu.'
    });
  }
});

export default router;