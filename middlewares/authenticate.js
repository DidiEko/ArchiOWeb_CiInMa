import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export default async function authenticate(req, res, next) {
  const authorization = req.get('Authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    return res.status(401).json({
      message: 'Un jeton de connexion est nécessaire.'
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: 'Authentification indisponible.'
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
  } catch {
    return res.status(401).json({
      message: 'Jeton invalide ou expiré.'
    });
  }

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !mongoose.isObjectIdOrHexString(payload.sub)
  ) {
    return res.status(401).json({
      message: 'Jeton invalide.'
    });
  }

  try {
    const user = await User.findById(payload.sub)
      .select('_id username role createdAt');

    if (!user) {
      return res.status(401).json({
        message: 'Compte introuvable.'
      });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(500).json({
      message: 'Impossible de vérifier le compte.'
    });
  }
}