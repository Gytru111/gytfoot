import { useState, useEffect } from 'react';
import { api } from '../api/client';
import MatchCard from '../components/MatchCard';

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

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  async function loadMatches() {
    setLoading(true);
    try {
      const data = await api.matches.list(filter);
      setMatches(data);
    } catch (err) {
      console.error('Erreur chargement matchs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [filter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Matchs de football</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 'auto', padding: '0.5rem 1rem' }}
        >
          <option value="upcoming">À venir</option>
          <option value="live">En direct</option>
          <option value="finished">Terminés</option>
          <option value="">Tous</option>
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Chargement...</p>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun match</h3>
          <p>Aucun match {filter === 'upcoming' ? 'à venir' : filter === 'live' ? 'en direct' : 'terminé'} pour le moment.</p>
        </div>
      ) : (
        matches.map((match) => (
          <MatchCard key={match.id} match={match} onBetPlaced={loadMatches} />
        ))
      )}
    </div>
  );
}
