import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_double_home: number;
  odds_double_away: number;
  odds_double_both: number;
  odds_over: number;
  odds_under: number;
  odds_btts_yes: number;
  odds_btts_no: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  start_time: string;
}

const TABS = [
  { key: '1n2', label: '1 / N / 2' },
  { key: 'double', label: 'Double chance' },
  { key: 'overunder', label: 'Over/Under 2.5' },
  { key: 'btts', label: 'Les deux marquent' },
];

const ODDS_DEF: Record<string, { key: string; label: string }[]> = {
  '1n2': [
    { key: 'home', label: '1' },
    { key: 'draw', label: 'N' },
    { key: 'away', label: '2' },
  ],
  double: [
    { key: 'double_home', label: '1 ou N' },
    { key: 'double_away', label: 'N ou 2' },
    { key: 'double_both', label: '1 ou 2' },
  ],
  overunder: [
    { key: 'over', label: 'Plus de 2.5' },
    { key: 'under', label: 'Moins de 2.5' },
  ],
  btts: [
    { key: 'btts_yes', label: 'Oui' },
    { key: 'btts_no', label: 'Non' },
  ],
};

export default function MatchCard({ match, onBetPlaced }: { match: Match; onBetPlaced?: () => void }) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('1n2');
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [amount, setAmount] = useState('10');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [settingResult, setSettingResult] = useState(false);

  const statusBadge = {
    upcoming: 'badge-upcoming',
    live: 'badge-live',
    finished: 'badge-finished',
  }[match.status] || '';

  const statusLabel = {
    upcoming: 'À venir',
    live: 'EN DIRECT',
    finished: 'Terminé',
  }[match.status] || match.status;

  const matchDate = new Date(match.start_time + 'Z');
  const dateStr = matchDate.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = matchDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  const getOdds = (key: string): number => ({
    home: match.odds_home, draw: match.odds_draw, away: match.odds_away,
    double_home: match.odds_double_home, double_away: match.odds_double_away, double_both: match.odds_double_both,
    over: match.odds_over, under: match.odds_under,
    btts_yes: match.odds_btts_yes, btts_no: match.odds_btts_no,
  }[key] || 1);

  async function handlePlaceBet() {
    if (!selectedBet || !amount || parseFloat(amount) <= 0) return;
    setPlacing(true); setError(''); setSuccess('');
    try {
      await api.bets.place({ match_id: match.id, bet_type: selectedBet, amount: parseFloat(amount) });
      setSuccess('Pari placé avec succès !');
      setSelectedBet(null); setAmount('10');
      await refreshUser(); onBetPlaced?.();
    } catch (err: any) { setError(err.message); }
    finally { setPlacing(false); }
  }

  async function handleSetResult() {
    setSettingResult(true); setError('');
    try {
      await api.matches.setResult(match.id, { home_score: parseInt(homeScore), away_score: parseInt(awayScore) });
      setSuccess('Résultat enregistré ! Paris résolus.');
      await refreshUser(); onBetPlaced?.();
    } catch (err: any) { setError(err.message); }
    finally { setSettingResult(false); }
  }

  const showBetting = match.status === 'upcoming' || match.status === 'live';
  const canSetResult = match.status === 'live';

  return (
    <div className="card match-card">
      <div className="match-teams">
        <span>{match.home_team} vs {match.away_team}</span>
        <span className={`badge ${statusBadge}`}>{statusLabel}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span className="match-time">{dateStr} à {timeStr}</span>
        {match.status === 'finished' && match.home_score !== null && (
          <span className="match-score">{match.home_score} - {match.away_score}</span>
        )}
      </div>

      {showBetting && (
        <div>
          <div className="grid-3" style={{ marginBottom: '0.75rem', gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
            {TABS.map((t) => (
              <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key); setSelectedBet(null); }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            {ODDS_DEF[activeTab]?.map(({ key, label }) => {
              const odds = getOdds(key);
              return (
                <button key={key} className={`odds-btn ${selectedBet === key ? 'selected' : ''} ${!odds ? 'disabled' : ''}`}
                  onClick={() => odds && setSelectedBet(key)}>
                  <span className="label">{label}</span>
                  <span className="value">{odds ? odds.toFixed(2) : '-'}</span>
                </button>
              );
            })}
          </div>

          {selectedBet && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Montant (€)</label>
                <input type="number" min="1" step="0.5" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="Montant" />
              </div>
              <button className="btn btn-success" onClick={handlePlaceBet}
                disabled={placing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (user?.balance || 0)}>
                {placing ? 'En cours...' : 'Parier'}
              </button>
            </div>
          )}

          {canSetResult && (
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.875rem' }}>
                Entrer le score final
              </summary>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', marginTop: '0.5rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{match.home_team}</label>
                  <input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{match.away_team}</label>
                  <input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleSetResult} disabled={settingResult}>
                  {settingResult ? '...' : 'Valider'}
                </button>
              </div>
            </details>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>{success}</div>}
        </div>
      )}

      {match.status === 'finished' && (
        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
          {match.home_score !== null ? `${match.home_score} - ${match.away_score}` : 'Match terminé'}
        </div>
      )}
    </div>
  );
}
