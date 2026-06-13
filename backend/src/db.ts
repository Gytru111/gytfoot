import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:bSbEwLROxKvRPgRyFAcwiJRorifuQhuW@zephyr.proxy.rlwy.net:53802/railway',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export function getDb() {
  return pool;
}

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 1000,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        odds_home REAL NOT NULL,
        odds_draw REAL NOT NULL,
        odds_away REAL NOT NULL,
        odds_double_home REAL,
        odds_double_away REAL,
        odds_double_both REAL,
        odds_over REAL,
        odds_under REAL,
        odds_btts_yes REAL,
        odds_btts_no REAL,
        status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'finished')),
        home_score INTEGER,
        away_score INTEGER,
        start_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    try {
      await client.query("ALTER TABLE matches ADD COLUMN odds_double_home REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_double_away REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_double_both REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_over REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_under REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_btts_yes REAL");
      await client.query("ALTER TABLE matches ADD COLUMN odds_btts_no REAL");
    } catch (e) {}

    try {
      await client.query(`
        UPDATE matches SET
          odds_double_home = ROUND((1.0 / (((1.0/odds_home) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away) + (1.0/odds_draw) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away)) * 1.06)::numeric, 2),
          odds_double_away = ROUND((1.0 / (((1.0/odds_draw) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away) + (1.0/odds_away) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away)) * 1.06)::numeric, 2),
          odds_double_both = ROUND((1.0 / (((1.0/odds_home) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away) + (1.0/odds_away) / (1.0/odds_home+1.0/odds_draw+1.0/odds_away)) * 1.06)::numeric, 2)
        WHERE odds_double_home IS NULL
      `);
      await client.query("UPDATE matches SET odds_over = 1.85 WHERE odds_over IS NULL");
      await client.query("UPDATE matches SET odds_under = 1.95 WHERE odds_under IS NULL");
      await client.query("UPDATE matches SET odds_btts_yes = 1.90 WHERE odds_btts_yes IS NULL");
      await client.query("UPDATE matches SET odds_btts_no = 1.90 WHERE odds_btts_no IS NULL");
    } catch (e) {}
    await client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        match_id INTEGER NOT NULL REFERENCES matches(id),
        bet_type TEXT NOT NULL CHECK(bet_type IN ('home', 'draw', 'away', 'double_home', 'double_away', 'double_both', 'over', 'under', 'btts_yes', 'btts_no')),
        amount REAL NOT NULL,
        odds REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'lost')),
        payout REAL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bets_match ON bets(match_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)');
    console.log('Tables PostgreSQL créées');
  } finally {
    client.release();
  }
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  const result = await pool.query(sql, params);
  return {
    lastInsertRowid: (result.rows[0]?.id as number) || 0,
    changes: result.rowCount || 0,
  };
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const result = await pool.query(sql, params);
  return result.rows[0] as T | undefined;
}

export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function dbTransaction(fn: () => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn();
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
