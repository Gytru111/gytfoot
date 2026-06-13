import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import betRoutes from './routes/bets';

async function main() {
  console.log('Initialisation de la base de données...');
  await initDatabase();
  console.log('Base de données initialisée');

  const app = express();
  const PORT = process.env.PORT || 3001;
  console.log(`Port configuré: ${PORT}`);

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/bets', betRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`GytFoot API running on port ${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

main().catch((err) => {
  console.error('MAIN ERROR:', err);
  process.exit(1);
});
