import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Bet {
  id: number;
  match_id: number;
  bet_type: string;
  amount: number;
  odds: number;
  status: string;
  payout: number | null;
  created_at: string;
  home_team: string;
  away_team: string;
  match_status: string;
  home_score: number | null;
  away_score: number | null;
}

const betTypeLabel: Record<string, string> = {
  home: 'Domicile',
  draw: 'Nul',
  away: 'Extérieur',
};

export default function BetHistory() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.bets.history()
      .then(setBets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Chargement...</p>;
  }

  if (bets.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: '1.5rem' }}>Historique des paris</h2>
        <div className="empty-state">
          <h3>Aucun pari</h3>
          <p>Vous n'avez pas encore placé de pari.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Historique des paris</h2>

      <div style={{ overflowX: 'auto' }}>
        <table className="bet-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Pari</th>
              <th>Mise</th>
              <th>Cote</th>
              <th>Gain potentiel</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => {
              const potentialWin = bet.status === 'pending'
                ? (bet.amount * bet.odds).toFixed(2)
                : bet.payout?.toFixed(2) || '-';
              const scoreStr = bet.home_score !== null
                ? `${bet.home_score} - ${bet.away_score}`
                : '-';

              return (
                <tr key={bet.id}>
                  <td>
                    {bet.home_team} vs {bet.away_team}
                    {bet.match_status === 'finished' && (
                      <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                        ({scoreStr})
                      </span>
                    )}
                  </td>
                  <td>{betTypeLabel[bet.bet_type]}</td>
                  <td>{bet.amount.toFixed(2)} €</td>
                  <td>{bet.odds.toFixed(2)}</td>
                  <td>{potentialWin} €</td>
                  <td>
                    <span className={`status-${bet.status}`}>
                      {{ pending: 'En attente', won: 'Gagné', lost: 'Perdu' }[bet.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {new Date(bet.created_at + 'Z').toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
