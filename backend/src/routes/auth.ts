import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet } from '../db';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Tous les champs sont requis' });
    return;
  }

  const existing = dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    res.status(409).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = dbRun('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

  const token = generateToken(result.lastInsertRowid as number, username);

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, username, email, balance: 1000 },
  });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' });
    return;
  }

  const user = dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    return;
  }

  const token = generateToken(user.id, user.username);

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, balance: user.balance },
  });
});

router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = dbGet<any>('SELECT id, username, email, balance, created_at FROM users WHERE id = ?', [req.userId]);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur non trouvé' });
    return;
  }
  res.json(user);
});

export default router;
