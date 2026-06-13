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

  const calc = (h: number, d: number, a: number) => {
    const tp = 1/h + 1/d + 1/a;
    const th = (1/h) / tp, td = (1/d) / tp, ta = (1/a) / tp;
    const m = 1.06;
    const favWins = Math.min(h, a);
    const spread = Math.abs(h - a);
    const likelyOver = spread < 1.5;
    return {
      odds_double_home: +((1 / ((th + td) * m))).toFixed(2),
      odds_double_away: +((1 / ((td + ta) * m))).toFixed(2),
      odds_double_both: +((1 / ((th + ta) * m))).toFixed(2),
      odds_over: +(likelyOver ? 1.75 + Math.random()*0.2 : 2.0 + Math.random()*0.4).toFixed(2),
      odds_under: +(likelyOver ? 2.0 + Math.random()*0.3 : 1.65 + Math.random()*0.2).toFixed(2),
      odds_btts_yes: +(favWins < 1.5 ? 2.1 + Math.random()*0.3 : 1.7 + Math.random()*0.2).toFixed(2),
      odds_btts_no: +(favWins < 1.5 ? 1.55 + Math.random()*0.15 : 1.8 + Math.random()*0.2).toFixed(2),
    };
  };

  const matches: any[] = [
    { ...calc(1.40, 4.50, 7.00), home_team: 'Mexique', away_team: 'Afrique du Sud', odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00, status: 'finished', home_score: 2, away_score: 0, start_time: '2026-06-11 19:00:00' },
    { ...calc(2.50, 3.20, 2.90), home_team: 'Corée du Sud', away_team: 'Rép. Tchèque', odds_home: 2.50, odds_draw: 3.20, odds_away: 2.90, status: 'finished', home_score: 2, away_score: 1, start_time: '2026-06-12 00:00:00' },
    { ...calc(1.95, 3.40, 3.80), home_team: 'Canada', away_team: 'Bosnie-Herzégovine', odds_home: 1.95, odds_draw: 3.40, odds_away: 3.80, status: 'finished', home_score: 2, away_score: 0, start_time: '2026-06-12 19:00:00' },
    { ...calc(1.50, 4.00, 6.50), home_team: 'États-Unis', away_team: 'Paraguay', odds_home: 1.50, odds_draw: 4.00, odds_away: 6.50, status: 'finished', home_score: 2, away_score: 1, start_time: '2026-06-13 01:00:00' },
    { ...calc(6.00, 4.20, 1.55), home_team: 'Qatar', away_team: 'Suisse', odds_home: 6.00, odds_draw: 4.20, odds_away: 1.55, start_time: '2026-06-13 19:00:00' },
    { ...calc(1.60, 3.80, 5.50), home_team: 'Brésil', away_team: 'Maroc', odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50, start_time: '2026-06-13 22:00:00' },
    { ...calc(7.00, 4.50, 1.45), home_team: 'Haïti', away_team: 'Écosse', odds_home: 7.00, odds_draw: 4.50, odds_away: 1.45, start_time: '2026-06-14 01:00:00' },
    { ...calc(1.08, 12.00, 30.00), home_team: 'Allemagne', away_team: 'Curaçao', odds_home: 1.08, odds_draw: 12.00, odds_away: 30.00, start_time: '2026-06-14 17:00:00' },
    { ...calc(1.55, 3.80, 6.00), home_team: 'Pays-Bas', away_team: 'Japon', odds_home: 1.55, odds_draw: 3.80, odds_away: 6.00, start_time: '2026-06-14 20:00:00' },
    { ...calc(1.48, 4.60, 7.25), home_team: 'France', away_team: 'Sénégal', odds_home: 1.48, odds_draw: 4.60, odds_away: 7.25, start_time: '2026-06-16 19:00:00' },
    { ...calc(1.30, 5.00, 10.00), home_team: 'Belgique', away_team: 'Iran', odds_home: 1.30, odds_draw: 5.00, odds_away: 10.00, start_time: '2026-06-17 16:00:00' },
    { ...calc(1.60, 3.80, 5.50), home_team: 'Angleterre', away_team: 'Croatie', odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50, start_time: '2026-06-18 19:00:00' },
    { ...calc(1.40, 4.50, 7.00), home_team: 'Argentine', away_team: 'Autriche', odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00, start_time: '2026-06-22 15:00:00' },
    { ...calc(1.43, 4.20, 3.40), home_team: 'Portugal', away_team: 'Colombie', odds_home: 1.43, odds_draw: 4.20, odds_away: 3.40, start_time: '2026-06-27 20:00:00' },
  ];

  for (const m of matches) {
    await dbRun(
      'INSERT INTO matches (home_team, away_team, odds_home, odds_draw, odds_away, odds_double_home, odds_double_away, odds_double_both, odds_over, odds_under, odds_btts_yes, odds_btts_no, status, home_score, away_score, start_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
      [m.home_team, m.away_team, m.odds_home, m.odds_draw, m.odds_away, m.odds_double_home, m.odds_double_away, m.odds_double_both, m.odds_over, m.odds_under, m.odds_btts_yes, m.odds_btts_no, m.status || 'upcoming', m.home_score ?? null, m.away_score ?? null, m.start_time]
    );
  }

  console.log(`${matches.length} matchs Coupe du Monde 2026 ajoutés !`);
}

const baseProbs = new Map<number, { h: number; d: number; a: number; o: number; u: number; by: number; bn: number }>();

function anchorOdds(id: number, m: any) {
  const { odds_home: h, odds_draw: d, odds_away: a, odds_over: o, odds_under: u, odds_btts_yes: by, odds_btts_no: bn } = m;
  if (!h || !d || !a) return null;
  const total = 1/h + 1/d + 1/a;
  if (!baseProbs.has(id)) {
    baseProbs.set(id, {
      h: (1/h)/total, d: (1/d)/total, a: (1/a)/total,
      o: o ?? 1.85, u: u ?? 1.95, by: by ?? 1.90, bn: bn ?? 1.90,
    });
  }
  return baseProbs.get(id)!;
}

async function updateOdds() {
  try {
    await dbRun("UPDATE matches SET status = 'live' WHERE status = 'upcoming' AND start_time <= NOW()");

    await dbRun("UPDATE matches SET status = 'finished' WHERE status = 'live' AND start_time + INTERVAL '2 hours' <= NOW()");

    const matches = await dbAll<any>('SELECT * FROM matches WHERE status = $1 OR status = $2', ['upcoming', 'live']);
    for (const m of matches) {
      const base = anchorOdds(m.id, m);
      if (!base) continue;
      const delta = (Math.random() - 0.5) * 0.004;
      const nh = Math.max(base.h - 0.02, Math.min(base.h + 0.02, base.h + delta));
      const rem = 1 - nh;
      const df = base.d / (base.d + base.a);
      const nd = rem * df;
      const na = rem * (1 - df);

      const margin = 1.06;
      const calc = (p: number) => Math.max(1.01, Math.min(50, +(1 / (p * margin)).toFixed(2)));
      const oh = calc(nh), od = calc(nd), oa = calc(na);
      const odh = calc(nh + nd), oda = calc(nd + na), odb = calc(nh + na);

      const oo = Math.max(1.2, Math.min(5.0, +(base.o + (Math.random() - 0.5) * 0.08).toFixed(2)));
      const ou = Math.max(1.2, Math.min(5.0, +(base.u + (Math.random() - 0.5) * 0.08).toFixed(2)));
      const by = Math.max(1.2, Math.min(5.0, +(base.by + (Math.random() - 0.5) * 0.08).toFixed(2)));
      const bn = Math.max(1.2, Math.min(5.0, +(base.bn + (Math.random() - 0.5) * 0.08).toFixed(2)));

      await dbRun(
        'UPDATE matches SET odds_home=$1, odds_draw=$2, odds_away=$3, odds_double_home=$4, odds_double_away=$5, odds_double_both=$6, odds_over=$7, odds_under=$8, odds_btts_yes=$9, odds_btts_no=$10 WHERE id=$11',
        [oh, od, oa, odh, oda, odb, oo, ou, by, bn, m.id]
      );
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
