import { initDatabase, dbRun, dbGet } from './db';

async function main() {
  await initDatabase();

  const existing = dbGet('SELECT COUNT(*) as cnt FROM matches') as any;
  if (existing && existing.cnt > 0) {
    console.log('Matchs déjà présents, seed ignoré.');
    return;
  }

  const matches: any[] = [
    {
      home_team: 'Mexique', away_team: 'Afrique du Sud',
      odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00,
      status: 'finished', home_score: 2, away_score: 0,
      start_time: '2026-06-11 21:00:00',
    },
    {
      home_team: 'Corée du Sud', away_team: 'Rép. Tchèque',
      odds_home: 2.50, odds_draw: 3.20, odds_away: 2.90,
      status: 'finished', home_score: 2, away_score: 1,
      start_time: '2026-06-12 02:00:00',
    },
    {
      home_team: 'Canada', away_team: 'Bosnie-Herzégovine',
      odds_home: 1.95, odds_draw: 3.40, odds_away: 3.80,
      status: 'finished', home_score: 2, away_score: 0,
      start_time: '2026-06-12 21:00:00',
    },
    {
      home_team: 'États-Unis', away_team: 'Paraguay',
      odds_home: 1.50, odds_draw: 4.00, odds_away: 6.50,
      status: 'finished', home_score: 2, away_score: 1,
      start_time: '2026-06-13 03:00:00',
    },
    // Cotes réelles bookmakers ↓
    {
      home_team: 'Qatar', away_team: 'Suisse',
      odds_home: 6.00, odds_draw: 4.20, odds_away: 1.55,
      start_time: '2026-06-13 21:00:00',
    },
    {
      home_team: 'Brésil', away_team: 'Maroc',
      odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50,
      start_time: '2026-06-14 00:00:00',
    },
    {
      home_team: 'Haïti', away_team: 'Écosse',
      odds_home: 7.00, odds_draw: 4.50, odds_away: 1.45,
      start_time: '2026-06-14 03:00:00',
    },
    {
      home_team: 'Allemagne', away_team: 'Curaçao',
      odds_home: 1.08, odds_draw: 12.00, odds_away: 30.00,
      start_time: '2026-06-14 19:00:00',
    },
    {
      home_team: 'Pays-Bas', away_team: 'Japon',
      odds_home: 1.55, odds_draw: 3.80, odds_away: 6.00,
      start_time: '2026-06-14 22:00:00',
    },
    {
      home_team: 'France', away_team: 'Sénégal',
      odds_home: 1.48, odds_draw: 4.60, odds_away: 7.25,
      start_time: '2026-06-16 21:00:00',
    },
    {
      home_team: 'Belgique', away_team: 'Iran',
      odds_home: 1.30, odds_draw: 5.00, odds_away: 10.00,
      start_time: '2026-06-17 18:00:00',
    },
    {
      home_team: 'Angleterre', away_team: 'Croatie',
      odds_home: 1.60, odds_draw: 3.80, odds_away: 5.50,
      start_time: '2026-06-18 21:00:00',
    },
    {
      home_team: 'Argentine', away_team: 'Autriche',
      odds_home: 1.40, odds_draw: 4.50, odds_away: 7.00,
      start_time: '2026-06-22 17:00:00',
    },
    {
      home_team: 'Portugal', away_team: 'Colombie',
      odds_home: 1.43, odds_draw: 4.20, odds_away: 3.40,
      start_time: '2026-06-27 22:00:00',
    },
  ];

  for (const m of matches) {
    dbRun(
      'INSERT INTO matches (home_team, away_team, odds_home, odds_draw, odds_away, status, home_score, away_score, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [m.home_team, m.away_team, m.odds_home, m.odds_draw, m.odds_away, m.status || 'upcoming', m.home_score ?? null, m.away_score ?? null, m.start_time]
    );
  }

  console.log('Matchs Coupe du Monde 2026 ajoutés !');
}

main().catch(console.error);
