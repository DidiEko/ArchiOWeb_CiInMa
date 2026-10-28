import express from 'express';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur notre API !' });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});