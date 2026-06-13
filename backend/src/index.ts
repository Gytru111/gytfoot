import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase, dbRun, dbGet, dbAll } from './db';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import betRoutes from './routes/bets';

const app = express();
const PORT = process.env.PORT || 3001;
console.log(`Port configuré: ${PORT}`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`GytFoot API listening on port ${PORT}`);
});

async function seedMatches() {
  const existing = await dbGet('SELECT COUNT(*)::int as cnt FROM matches') as any;
  if (existing && existing.cnt > 0) {
    console.log('Matchs déjà présents, seed ignoré.');
    return;
  }

  const matches: any[] = [
    { home_team: 'Mexique', away_team: 'Afrique du Sud', odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00, status: 'finished', home_score: 2, away_score: 0, start_time: '2026-06-11 21:00:00' },
    { home_team: 'Corée du Sud', away_team: 'Rép. Tchèque', odds_home: 2.50, odds_draw: 3.20, odds_away: 2.90, status: 'finished', home_score: 2, away_score: 1, start_time: '2026-06-12 02:00:00' },
    { home_team: 'Canada', away_team: 'Bosnie-Herzégovine', odds_home: 1.95, odds_draw: 3.40, odds_away: 3.80, status: 'finished', home_score: 2, away_score: 0, start_time: '2026-06-12 21:00:00' },
    { home_team: 'États-Unis', away_team: 'Paraguay', odds_home: 1.50, odds_draw: 4.00, odds_away: 6.50, status: 'finished', home_score: 2, away_score: 1, start_time: '2026-06-13 03:00:00' },
    { home_team: 'Qatar', away_team: 'Suisse', odds_home: 6.00, odds_draw: 4.20, odds_away: 1.55, start_time: '2026-06-13 21:00:00' },
    { home_team: 'Brésil', away_team: 'Maroc', odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50, start_time: '2026-06-14 00:00:00' },
    { home_team: 'Haïti', away_team: 'Écosse', odds_home: 7.00, odds_draw: 4.50, odds_away: 1.45, start_time: '2026-06-14 03:00:00' },
    { home_team: 'Allemagne', away_team: 'Curaçao', odds_home: 1.08, odds_draw: 12.00, odds_away: 30.00, start_time: '2026-06-14 19:00:00' },
    { home_team: 'Pays-Bas', away_team: 'Japon', odds_home: 1.55, odds_draw: 3.80, odds_away: 6.00, start_time: '2026-06-14 22:00:00' },
    { home_team: 'France', away_team: 'Sénégal', odds_home: 1.48, odds_draw: 4.60, odds_away: 7.25, start_time: '2026-06-16 21:00:00' },
    { home_team: 'Belgique', away_team: 'Iran', odds_home: 1.30, odds_draw: 5.00, odds_away: 10.00, start_time: '2026-06-17 18:00:00' },
    { home_team: 'Angleterre', away_team: 'Croatie', odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50, start_time: '2026-06-18 21:00:00' },
    { home_team: 'Argentine', away_team: 'Autriche', odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00, start_time: '2026-06-22 17:00:00' },
    { home_team: 'Portugal', away_team: 'Colombie', odds_home: 1.43, odds_draw: 4.20, odds_away: 3.40, start_time: '2026-06-27 22:00:00' },
  ];

  for (const m of matches) {
    await dbRun(
      'INSERT INTO matches (home_team, away_team, odds_home, odds_draw, odds_away, status, home_score, away_score, start_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [m.home_team, m.away_team, m.odds_home, m.odds_draw, m.odds_away, m.status || 'upcoming', m.home_score ?? null, m.away_score ?? null, m.start_time]
    );
  }

  console.log(`${matches.length} matchs Coupe du Monde 2026 ajoutés !`);
}

async function updateOdds() {
  try {
    const matches = await dbAll<any>('SELECT id, odds_home, odds_draw, odds_away FROM matches WHERE status = $1', ['upcoming']);
    for (const m of matches) {
      const fluctuation = () => {
        const change = (Math.random() - 0.5) * 0.1;
        return 1 + change;
      };
      const newHome = Math.max(1.01, Math.min(50, +(m.odds_home * fluctuation()).toFixed(2)));
      const newDraw = Math.max(1.01, Math.min(50, +(m.odds_draw * fluctuation()).toFixed(2)));
      const newAway = Math.max(1.01, Math.min(50, +(m.odds_away * fluctuation()).toFixed(2)));
      await dbRun('UPDATE matches SET odds_home = $1, odds_draw = $2, odds_away = $3 WHERE id = $4', [newHome, newDraw, newAway, m.id]);
    }
  } catch (e) {
    console.error('Odds update error:', e);
  }
}

function startOddsUpdater() {
  setInterval(updateOdds, 30000);
  console.log('Service de mise à jour des cotes démarré (30s)');
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

initDatabase().then(() => {
  console.log('Base de données initialisée');
  return seedMatches();
}).then(() => {
  startOddsUpdater();
}).catch((err) => {
  console.error('Startup error:', err);
});
