import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase, dbRun, dbGet, dbAll } from './db';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import betRoutes from './routes/bets';
import { fetchSxBetOdds } from './sxBetService';

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
  if (existing && existing.cnt >= 72) {
    console.log('Matchs déjà présents, seed ignoré.');
    return;
  }
  if (existing && existing.cnt > 0) {
    console.log(`Suppression des ${existing.cnt} anciens matchs pour ré-amorcer...`);
    await dbRun('DELETE FROM bets');
    await dbRun('DELETE FROM matches');
  }

  const calcOdds = (h: number, d: number, a: number) => {
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

  const M = (hR: number, aR: number): {ch: number; cd: number; ca: number} => {
    const drawConst = 35;
    const t = hR + aR + drawConst;
    const margin = 1.06;
    const hO = +(1 / ((hR / t) * margin)).toFixed(2);
    const dO = +(1 / ((drawConst / t) * margin)).toFixed(2);
    const aO = +(1 / ((aR / t) * margin)).toFixed(2);
    return {ch: Math.max(1.01, hO), cd: Math.max(1.01, dO), ca: Math.max(1.01, aO)};
  };

  const matchDefs: any[] = [
    { home: 'Mexique', away: 'Afrique du Sud', ...M(75, 45), status: 'finished', hs: 2, as: 0, start: '2026-06-11 19:00:00' },
    { home: 'Corée du Sud', away: 'République tchèque', ...M(68, 55), status: 'finished', hs: 2, as: 1, start: '2026-06-12 02:00:00' },
    { home: 'Canada', away: 'Bosnie-herzégovine', ...M(72, 50), status: 'finished', hs: 2, as: 0, start: '2026-06-12 19:00:00' },
    { home: 'USA', away: 'Paraguay', ...M(78, 55), status: 'finished', hs: 2, as: 1, start: '2026-06-13 01:00:00' },
    { home: 'Qatar', away: 'Suisse', ...M(45, 80), start: '2026-06-13 19:00:00' },
    { home: 'Brésil', away: 'Maroc', ...M(95, 68), start: '2026-06-13 22:00:00' },
    { home: 'Haïti', away: 'Écosse', ...M(35, 70), start: '2026-06-14 01:00:00' },
    { home: 'Australie', away: 'Turquie', ...M(60, 62), start: '2026-06-14 04:00:00' },
    { home: 'Allemagne', away: 'Curaçao', ...M(98, 20), start: '2026-06-14 17:00:00' },
    { home: 'Pays-Bas', away: 'Japon', ...M(88, 65), start: '2026-06-14 20:00:00' },
    { home: 'Côte d\'ivoire', away: 'Équateur', ...M(58, 60), start: '2026-06-14 23:00:00' },
    { home: 'Suède', away: 'Tunisie', ...M(72, 50), start: '2026-06-15 02:00:00' },
    { home: 'Espagne', away: 'Cap-Vert', ...M(92, 35), start: '2026-06-15 16:00:00' },
    { home: 'Belgique', away: 'Égypte', ...M(85, 55), start: '2026-06-15 19:00:00' },
    { home: 'Arabie Saoudite', away: 'Uruguay', ...M(48, 78), start: '2026-06-15 22:00:00' },
    { home: 'Iran', away: 'Nouvelle-Zélande', ...M(58, 45), start: '2026-06-16 01:00:00' },
    { home: 'France', away: 'Sénégal', ...M(92, 60), start: '2026-06-16 19:00:00' },
    { home: 'Irak', away: 'Norvège', ...M(50, 65), start: '2026-06-16 22:00:00' },
    { home: 'Argentine', away: 'Algérie', ...M(90, 62), start: '2026-06-17 01:00:00' },
    { home: 'Autriche', away: 'Jordanie', ...M(65, 45), start: '2026-06-17 04:00:00' },
    { home: 'Portugal', away: 'RD Congo', ...M(82, 40), start: '2026-06-17 17:00:00' },
    { home: 'Angleterre', away: 'Croatie', ...M(90, 72), start: '2026-06-17 20:00:00' },
    { home: 'Ghana', away: 'Panama', ...M(62, 42), start: '2026-06-17 23:00:00' },
    { home: 'Ouzbékistan', away: 'Colombie', ...M(48, 55), start: '2026-06-18 02:00:00' },
    { home: 'République tchèque', away: 'Afrique du Sud', ...M(55, 45), start: '2026-06-18 16:00:00' },
    { home: 'Suisse', away: 'Bosnie-herzégovine', ...M(80, 50), start: '2026-06-18 19:00:00' },
    { home: 'Canada', away: 'Qatar', ...M(72, 45), start: '2026-06-18 22:00:00' },
    { home: 'Mexique', away: 'Corée du Sud', ...M(75, 68), start: '2026-06-19 01:00:00' },
    { home: 'USA', away: 'Australie', ...M(78, 60), start: '2026-06-19 19:00:00' },
    { home: 'Écosse', away: 'Maroc', ...M(70, 68), start: '2026-06-19 22:00:00' },
    { home: 'Brésil', away: 'Haïti', ...M(95, 35), start: '2026-06-20 01:00:00' },
    { home: 'Turquie', away: 'Paraguay', ...M(62, 55), start: '2026-06-20 04:00:00' },
    { home: 'Pays-Bas', away: 'Suède', ...M(88, 72), start: '2026-06-20 17:00:00' },
    { home: 'Allemagne', away: 'Côte d\'ivoire', ...M(98, 58), start: '2026-06-20 20:00:00' },
    { home: 'Équateur', away: 'Curaçao', ...M(60, 20), start: '2026-06-21 00:00:00' },
    { home: 'Tunisie', away: 'Japon', ...M(50, 65), start: '2026-06-21 04:00:00' },
    { home: 'Espagne', away: 'Arabie Saoudite', ...M(92, 48), start: '2026-06-21 16:00:00' },
    { home: 'Belgique', away: 'Iran', ...M(85, 58), start: '2026-06-21 19:00:00' },
    { home: 'Uruguay', away: 'Cap-Vert', ...M(78, 35), start: '2026-06-21 22:00:00' },
    { home: 'Nouvelle-Zélande', away: 'Égypte', ...M(45, 55), start: '2026-06-22 01:00:00' },
    { home: 'Argentine', away: 'Autriche', ...M(90, 65), start: '2026-06-22 17:00:00' },
    { home: 'France', away: 'Irak', ...M(92, 50), start: '2026-06-22 21:00:00' },
    { home: 'Norvège', away: 'Sénégal', ...M(65, 60), start: '2026-06-23 00:00:00' },
    { home: 'Jordanie', away: 'Algérie', ...M(45, 62), start: '2026-06-23 03:00:00' },
    { home: 'Portugal', away: 'Ouzbékistan', ...M(82, 48), start: '2026-06-23 17:00:00' },
    { home: 'Angleterre', away: 'Ghana', ...M(90, 62), start: '2026-06-23 20:00:00' },
    { home: 'Panama', away: 'Croatie', ...M(42, 72), start: '2026-06-23 23:00:00' },
    { home: 'Colombie', away: 'RD Congo', ...M(55, 40), start: '2026-06-24 02:00:00' },
    { home: 'Suisse', away: 'Canada', ...M(80, 72), start: '2026-06-24 19:00:00' },
    { home: 'Bosnie-herzégovine', away: 'Qatar', ...M(50, 45), start: '2026-06-24 19:00:00' },
    { home: 'Écosse', away: 'Brésil', ...M(70, 95), start: '2026-06-24 22:00:00' },
    { home: 'Maroc', away: 'Haïti', ...M(68, 35), start: '2026-06-24 22:00:00' },
    { home: 'République tchèque', away: 'Mexique', ...M(55, 75), start: '2026-06-25 01:00:00' },
    { home: 'Afrique du Sud', away: 'Corée du Sud', ...M(45, 68), start: '2026-06-25 01:00:00' },
    { home: 'Équateur', away: 'Allemagne', ...M(60, 98), start: '2026-06-25 20:00:00' },
    { home: 'Curaçao', away: 'Côte d\'ivoire', ...M(20, 58), start: '2026-06-25 20:00:00' },
    { home: 'Japon', away: 'Suède', ...M(65, 72), start: '2026-06-25 23:00:00' },
    { home: 'Tunisie', away: 'Pays-Bas', ...M(50, 88), start: '2026-06-25 23:00:00' },
    { home: 'Turquie', away: 'USA', ...M(62, 78), start: '2026-06-26 02:00:00' },
    { home: 'Paraguay', away: 'Australie', ...M(55, 60), start: '2026-06-26 02:00:00' },
    { home: 'Norvège', away: 'France', ...M(65, 92), start: '2026-06-26 19:00:00' },
    { home: 'Sénégal', away: 'Irak', ...M(60, 50), start: '2026-06-26 19:00:00' },
    { home: 'Cap-Vert', away: 'Arabie Saoudite', ...M(35, 48), start: '2026-06-27 00:00:00' },
    { home: 'Uruguay', away: 'Espagne', ...M(78, 92), start: '2026-06-27 00:00:00' },
    { home: 'Égypte', away: 'Iran', ...M(55, 58), start: '2026-06-27 03:00:00' },
    { home: 'Nouvelle-Zélande', away: 'Belgique', ...M(45, 85), start: '2026-06-27 03:00:00' },
    { home: 'Panama', away: 'Angleterre', ...M(42, 90), start: '2026-06-27 21:00:00' },
    { home: 'Croatie', away: 'Ghana', ...M(72, 62), start: '2026-06-27 21:00:00' },
    { home: 'Colombie', away: 'Portugal', ...M(55, 82), start: '2026-06-27 23:30:00' },
    { home: 'RD Congo', away: 'Ouzbékistan', ...M(40, 48), start: '2026-06-27 23:30:00' },
    { home: 'Algérie', away: 'Autriche', ...M(62, 65), start: '2026-06-28 02:00:00' },
    { home: 'Jordanie', away: 'Argentine', ...M(45, 90), start: '2026-06-28 02:00:00' },
  ];

  for (const def of matchDefs) {
    let oh = def.ch, od = def.cd, oa = def.ca;
    try {
      const sx = await fetchSxBetOdds(def.home, def.away);
      if (sx) {
        console.log(`  ${def.home} vs ${def.away}: cotes SX Bet [${sx.odds_home}, ${sx.odds_draw}, ${sx.odds_away}]`);
        oh = sx.odds_home; od = sx.odds_draw; oa = sx.odds_away;
      }
    } catch (_) {}
    const rest = calcOdds(oh, od, oa);
    await dbRun(
      'INSERT INTO matches (home_team, away_team, odds_home, odds_draw, odds_away, odds_double_home, odds_double_away, odds_double_both, odds_over, odds_under, odds_btts_yes, odds_btts_no, status, home_score, away_score, start_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
      [def.home, def.away, oh, od, oa, rest.odds_double_home, rest.odds_double_away, rest.odds_double_both, rest.odds_over, rest.odds_under, rest.odds_btts_yes, rest.odds_btts_no, def.status || 'upcoming', def.hs ?? null, def.as ?? null, def.start]
    );
  }

  console.log(`${matchDefs.length} matchs Coupe du Monde 2026 ajoutés !`);
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

async function syncSxBetOdds() {
  try {
    const pairs = [
      ['Allemagne', 'Curaçao'],
      ['Belgique', 'Iran'],
      ["Côte d'ivoire", 'Équateur'],
      ['Brésil', 'Maroc'],
      ['Argentine', 'Autriche'],
      ['Espagne', 'Cap-Vert'],
      ['Belgique', 'Égypte'],
      ['Iran', 'Nouvelle-Zélande'],
      ['Angleterre', 'Croatie'],
      ['Ghana', 'Panama'],
      ['Portugal', 'RD Congo'],
    ];
    for (const [home, away] of pairs) {
      try {
        const sx = await fetchSxBetOdds(home, away);
        if (!sx) continue;
        const match = await dbGet<any>('SELECT id, odds_home, odds_draw, odds_away FROM matches WHERE home_team=$1 AND away_team=$2', [home, away]);
        if (!match) continue;
        const changed = match.odds_home !== sx.odds_home || match.odds_draw !== sx.odds_draw || match.odds_away !== sx.odds_away;
        if (!changed) continue;
        await dbRun('UPDATE matches SET odds_home=$1, odds_draw=$2, odds_away=$3 WHERE id=$4', [sx.odds_home, sx.odds_draw, sx.odds_away, match.id]);
        const base = baseProbs.get(match.id);
        if (base) {
          const total = 1/sx.odds_home + 1/sx.odds_draw + 1/sx.odds_away;
          base.h = (1/sx.odds_home)/total;
          base.d = (1/sx.odds_draw)/total;
          base.a = (1/sx.odds_away)/total;
        }
        console.log(`  SX Bet sync: ${home} vs ${away} → ${sx.odds_home}/${sx.odds_draw}/${sx.odds_away}`);
      } catch (e) {}
    }
  } catch (e) {
    console.error('SX Bet sync error:', e);
  }
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
}).then(async () => {
  await syncSxBetOdds();
  setInterval(syncSxBetOdds, 300000);
  console.log('Service de synchronisation SX Bet démarré (5min)');
  startOddsUpdater();
}).catch((err) => {
  console.error('Startup error:', err);
});
