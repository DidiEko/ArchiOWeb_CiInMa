import express from 'express';
import usersRouter from './routes/users.js';
import miniGamesRouter from './routes/minigames.js';
import gamesRouter from './routes/games.js';

const app = express();

app.use(express.json());
app.use('/users', usersRouter);
app.use('/minigames', miniGamesRouter);
app.use('/games', gamesRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur notre API !' });
});

export default app;