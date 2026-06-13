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
  status: string;
  home_score: number | null;
  away_score: number | null;
  start_time: string;
}

export default function MatchCard({ match, onBetPlaced }: { match: Match; onBetPlaced?: () => void }) {
  const { user, refreshUser } = useAuth();
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

  const oddsMap: Record<string, { label: string; value: number }> = {
    home: { label: match.home_team, value: match.odds_home },
    draw: { label: 'Nul', value: match.odds_draw },
    away: { label: match.away_team, value: match.odds_away },
  };

  async function handlePlaceBet() {
    if (!selectedBet || !amount || parseFloat(amount) <= 0) return;
    setPlacing(true);
    setError('');
    setSuccess('');

    try {
      await api.bets.place({
        match_id: match.id,
        bet_type: selectedBet,
        amount: parseFloat(amount),
      });
      setSuccess('Pari placé avec succès !');
      setSelectedBet(null);
      setAmount('10');
      await refreshUser();
      onBetPlaced?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  async function handleSetResult() {
    setSettingResult(true);
    setError('');
    try {
      await api.matches.setResult(match.id, {
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
      });
      setSuccess('Résultat enregistré ! Paris résolus.');
      await refreshUser();
      onBetPlaced?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSettingResult(false);
    }
  }

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

      {match.status === 'upcoming' && (
        <div>
          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            {Object.entries(oddsMap).map(([key, { label, value }]) => (
              <button
                key={key}
                className={`odds-btn ${selectedBet === key ? 'selected' : ''}`}
                onClick={() => setSelectedBet(key)}
              >
                <span className="label">{label}</span>
                <span className="value">{value.toFixed(2)}</span>
              </button>
            ))}
          </div>

          {selectedBet && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Montant (€)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Montant"
                />
              </div>
              <button
                className="btn btn-success"
                onClick={handlePlaceBet}
                disabled={placing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (user?.balance || 0)}
              >
                {placing ? 'En cours...' : 'Parier'}
              </button>
            </div>
          )}

          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.875rem' }}>
              Simuler le résultat du match
            </summary>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', marginTop: '0.5rem' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>{match.home_team}</label>
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>{match.away_team}</label>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleSetResult} disabled={settingResult}>
                {settingResult ? '...' : 'Valider'}
              </button>
            </div>
          </details>

          {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>{success}</div>}
        </div>
      )}

      {match.status === 'finished' && (
        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
          {match.home_score !== null ? `${match.home_score} - ${match.away_score}` : 'Match terminé'}
        </div>
      )}

      {match.status === 'live' && (
        <div style={{ fontSize: '0.875rem', color: '#f87171', fontWeight: 600 }}>
          Match en cours - Paris suspendus
        </div>
      )}
    </div>
  );
}
