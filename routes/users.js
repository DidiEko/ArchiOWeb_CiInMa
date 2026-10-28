import { Router } from 'express';
import argon2 from 'argon2';
import User from '../models/User.js';

const router = Router();

router.post('/', async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      message: 'Le pseudo, l’email et le mot de passe sont obligatoires.'
    });
  }

  if (password.length < 12 || password.length > 128) {
    return res.status(400).json({
      message: 'Le mot de passe doit contenir entre 12 et 128 caractères.'
    });
  }

  try {
    const user = new User({
      username,
      email,
      role: 'player'
    });

    // Vérifier les autres champs avant de hacher le mot de passe.
    await user.validate(['username', 'email', 'role']);

    user.passwordHash = await argon2.hash(password);
    await user.save();

    return res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Cet email est déjà utilisé.'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Le pseudo ou l’email est invalide.'
      });
    }

    return res.status(500).json({
      message: 'Impossible de créer le compte.'
    });
  }
});

export default router;