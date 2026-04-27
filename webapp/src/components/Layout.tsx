import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ flex: 1 }}>
          <Link to="/">
            <h1 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Validasi Kurikulum TRR 2025</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Politeknik Negeri Batam</p>
          </Link>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <img
            src={theme === 'dark' ? "/assets/logo-polibatam-light.png" : "/assets/logo-polibatam-dark.png"}
            alt="Polibatam Logo"
            style={{ height: '40px', objectFit: 'contain' }}
          />
          <img
            src={theme === 'dark' ? "/assets/logo-cdio-light.png" : "/assets/logo-cdio-dark.png"}
            alt="CDIO Logo"
            style={{ height: '35px', objectFit: 'contain' }}
          />
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main style={{
        flex: 1,
        padding: '2rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>

      <footer style={{
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        <p>&copy; 2025 Program Studi Teknologi Rekayasa Robotika - Politeknik Negeri Batam. All rights reserved.</p>
      </footer>
    </>
  );
};

export default Layout;
