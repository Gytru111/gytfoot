import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="navbar-brand">GytFoot</Link>
          <div className="navbar-nav">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Matchs
            </Link>
            <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
              Historique
            </Link>
            <span className="balance">{user?.balance.toFixed(2)} €</span>
            <span style={{ color: '#94a3b8' }}>{user?.username}</span>
            <button className="btn btn-danger" style={{ padding: '0.5rem 1rem' }} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
