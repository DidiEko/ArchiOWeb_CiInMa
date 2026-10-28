import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authenticate from '../middlewares/authenticate.js';

const router = Router();

// Inscription : POST /users
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

    // Valider les autres champs avant de hacher le mot de passe.
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

    console.error('Erreur d’inscription :', error.message);

    return res.status(500).json({
      message: 'Impossible de créer le compte.'
    });
  }
});

// Connexion : POST /users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    password.length === 0 ||
    password.length > 128
  ) {
    return res.status(400).json({
      message: 'Un email et un mot de passe valides sont obligatoires.'
    });
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect.'
      });
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      password
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect.'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET est manquante.');
    }

    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: user.id,
        expiresIn: '1h'
      }
    );

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur de connexion :', error.message);

    return res.status(500).json({
      message: 'Impossible de se connecter.'
    });
  }
});

// Autgentifiicaation
router.get('/me', authenticate, (req, res) => {
  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    createdAt: req.user.createdAt
  });
});
 /* 
.select('+passwordHash') récupère exceptionnellement le hash pour vérifier le mot de passe.

argon2.verify() compare le mot de passe reçu au hash enregistré.
Si les identifiants sont corrects, le serveur délivre un JWT valable une heure, contenant l’identifiant du joueur.

Un email inconnu et un mauvais mot de passe donnent le même message d’erreur.
 */

export default router;