import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { status } = req.query;
  let matches;

  if (status) {
    matches = dbAll('SELECT * FROM matches WHERE status = ? ORDER BY start_time ASC', [status as string]);
  } else {
    matches = dbAll('SELECT * FROM matches ORDER BY start_time ASC');
  }

  res.json(matches);
});

router.get('/:id', (req: Request, res: Response) => {
  const match = dbGet('SELECT * FROM matches WHERE id = ?', [Number(req.params.id)]);
  if (!match) {
    res.status(404).json({ error: 'Match non trouvé' });
    return;
  }
  res.json(match);
});

router.patch('/:id/result', (req: Request, res: Response) => {
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined || home_score < 0 || away_score < 0) {
    res.status(400).json({ error: 'Scores requis (nombres positifs)' });
    return;
  }

  const match = dbGet<any>('SELECT * FROM matches WHERE id = ?', [Number(req.params.id)]);
  if (!match) {
    res.status(404).json({ error: 'Match non trouvé' });
    return;
  }

  if (match.status !== 'upcoming') {
    res.status(400).json({ error: 'Ce match a déjà été joué' });
    return;
  }

  let result: string;
  if (home_score > away_score) result = 'home';
  else if (away_score > home_score) result = 'away';
  else result = 'draw';

  dbRun('UPDATE matches SET status = ?, home_score = ?, away_score = ? WHERE id = ?', ['finished', home_score, away_score, match.id]);

  const pendingBets = dbAll<any>('SELECT * FROM bets WHERE match_id = ? AND status = ?', [match.id, 'pending']);

  for (const bet of pendingBets) {
    if (bet.bet_type === result) {
      const payout = bet.amount * bet.odds;
      dbRun('UPDATE bets SET status = ?, payout = ? WHERE id = ?', ['won', payout, bet.id]);
      dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, bet.user_id]);
    } else {
      dbRun('UPDATE bets SET status = ?, payout = ? WHERE id = ?', ['lost', 0, bet.id]);
    }
  }

  res.json({
    message: 'Résultat enregistré',
    match_id: match.id,
    home_team: match.home_team,
    away_team: match.away_team,
    score: `${home_score} - ${away_score}`,
    result,
    bets_settled: true,
  });
});

export default router;
