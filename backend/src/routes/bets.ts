import { Router, Response } from 'express';
import { dbRun, dbGet, dbAll } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response) => {
  const { match_id, bet_type, amount } = req.body;
  if (!match_id || !bet_type || !amount) {
    res.status(400).json({ error: 'Tous les champs sont requis' });
    return;
  }
  if (!['home', 'draw', 'away'].includes(bet_type)) {
    res.status(400).json({ error: 'Type de pari invalide' });
    return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: 'Le montant doit être positif' });
    return;
  }
  const match = await dbGet<any>('SELECT * FROM matches WHERE id = $1', [match_id]);
  if (!match) {
    res.status(404).json({ error: 'Match non trouvé' });
    return;
  }
  if (match.status !== 'upcoming' && match.status !== 'live') {
    res.status(400).json({ error: "Ce match n'est plus disponible pour les paris" });
    return;
  }
  const user = await dbGet<any>('SELECT * FROM users WHERE id = $1', [req.userId]);
  if (user.balance < amount) {
    res.status(400).json({ error: 'Solde insuffisant' });
    return;
  }

  const oddsMap: Record<string, string> = { home: 'odds_home', draw: 'odds_draw', away: 'odds_away' };
  const odds = match[oddsMap[bet_type]];

  await dbRun('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.userId]);
  const result = await dbRun(
    'INSERT INTO bets (user_id, match_id, bet_type, amount, odds) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [req.userId, match_id, bet_type, amount, odds]
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    match_id,
    bet_type,
    amount,
    odds,
    status: 'pending',
    message: 'Pari placé avec succès !',
  });
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const bets = await dbAll(`
    SELECT b.*, m.home_team, m.away_team, m.status as match_status, m.home_score, m.away_score
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    WHERE b.user_id = $1
    ORDER BY b.created_at DESC
  `, [req.userId]);
  res.json(bets);
});

export default router;
