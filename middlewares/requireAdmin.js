export default function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Cette action est réservée aux administrateurs.'
    });
  }

  return next();
}