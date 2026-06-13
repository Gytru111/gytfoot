import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet } from '../db';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Tous les champs sont requis' });
    return;
  }
  const existing = await dbGet('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
  if (existing) {
    res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé" });
    return;
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await dbRun('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedPassword]);
  const token = generateToken(result.lastInsertRowid, username);
  res.status(201).json({ token, user: { id: result.lastInsertRowid, username, email, balance: 1000 } });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' });
    return;
  }
  const user = await dbGet<any>('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    return;
  }
  const token = generateToken(user.id, user.username);
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, balance: user.balance } });
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await dbGet<any>('SELECT id, username, email, balance, created_at FROM users WHERE id = $1', [req.userId]);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur non trouvé' });
    return;
  }
  res.json(user);
});

export default router;
