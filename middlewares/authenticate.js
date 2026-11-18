import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export async function authenticateToken(token) {
  if (typeof token !== 'string' || !token) {
    return { status: 401, message: 'Un jeton de connexion est nécessaire.' };
  }

  if (!process.env.JWT_SECRET) {
    return { status: 500, message: 'Authentification indisponible.' };
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
  } catch {
    return { status: 401, message: 'Jeton invalide ou expiré.' };
  }

  if (
    typeof payload?.sub !== 'string' ||
    !mongoose.isObjectIdOrHexString(payload.sub)
  ) {
    return { status: 401, message: 'Jeton invalide.' };
  }

  try {
    const user = await User.findById(payload.sub)
      .select('_id username role createdAt');

    if (!user) {
      return { status: 401, message: 'Compte introuvable.' };
    }

    return { user };
  } catch {
    return { status: 500, message: 'Impossible de vérifier le compte.' };
  }
}

export default async function authenticate(req, res, next) {
  const match = req.get('Authorization')?.match(/^Bearer ([^\s]+)$/i);
  const { user, status, message } = await authenticateToken(match?.[1]);

  if (!user) {
    return res.status(status).json({ message });
  }

  req.user = user;
  return next();
}