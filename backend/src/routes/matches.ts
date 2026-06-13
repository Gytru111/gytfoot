import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { status } = req.query;
  let matches;
  if (status) {
    matches = await dbAll('SELECT * FROM matches WHERE status = $1 ORDER BY start_time ASC', [status as string]);
  } else {
    matches = await dbAll('SELECT * FROM matches ORDER BY start_time ASC');
  }
  res.json(matches);
});

router.get('/:id', async (req: Request, res: Response) => {
  const match = await dbGet('SELECT * FROM matches WHERE id = $1', [Number(req.params.id)]);
  if (!match) {
    res.status(404).json({ error: 'Match non trouvé' });
    return;
  }
  res.json(match);
});

function isBetWon(betType: string, homeScore: number, awayScore: number): boolean {
  const total = homeScore + awayScore;
  switch (betType) {
    case 'home': return homeScore > awayScore;
    case 'draw': return homeScore === awayScore;
    case 'away': return awayScore > homeScore;
    case 'double_home': return homeScore >= awayScore;
    case 'double_away': return awayScore >= homeScore;
    case 'double_both': return homeScore !== awayScore;
    case 'over': return total > 2.5;
    case 'under': return total < 2.5;
    case 'btts_yes': return homeScore > 0 && awayScore > 0;
    case 'btts_no': return homeScore === 0 || awayScore === 0;
    default: return false;
  }
}

router.patch('/:id/result', async (req: Request, res: Response) => {
  const { home_score, away_score } = req.body;
  if (home_score === undefined || away_score === undefined || home_score < 0 || away_score < 0) {
    res.status(400).json({ error: 'Scores requis (nombres positifs)' });
    return;
  }
  const match = await dbGet<any>('SELECT * FROM matches WHERE id = $1', [Number(req.params.id)]);
  if (!match) {
    res.status(404).json({ error: 'Match non trouvé' });
    return;
  }
  if (match.status !== 'live') {
    res.status(400).json({ error: 'Seuls les matchs en direct peuvent être terminés' });
    return;
  }

  await dbRun('UPDATE matches SET status = $1, home_score = $2, away_score = $3 WHERE id = $4', ['finished', home_score, away_score, match.id]);
  const pendingBets = await dbAll<any>('SELECT * FROM bets WHERE match_id = $1 AND status = $2', [match.id, 'pending']);

  for (const bet of pendingBets) {
    if (isBetWon(bet.bet_type, home_score, away_score)) {
      const payout = bet.amount * bet.odds;
      await dbRun('UPDATE bets SET status = $1, payout = $2 WHERE id = $3', ['won', payout, bet.id]);
      await dbRun('UPDATE users SET balance = balance + $1 WHERE id = $2', [payout, bet.user_id]);
    } else {
      await dbRun('UPDATE bets SET status = $1, payout = $2 WHERE id = $3', ['lost', 0, bet.id]);
    }
  }

  res.json({
    message: 'Résultat enregistré',
    match_id: match.id,
    home_team: match.home_team,
    away_team: match.away_team,
    score: `${home_score} - ${away_score}`,
    bets_settled: true,
  });
});

export default router;
